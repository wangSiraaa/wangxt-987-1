import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDb } from '../db/index.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import scheduleValidator from '../services/scheduleValidator.js'

const router = Router()

function logChange(
  db: any,
  scheduleId: string,
  changeType: string,
  registrationId: string | null,
  candidateId: string | null,
  oldValue: string | null,
  newValue: string | null,
  reason: string,
  changedBy: string,
  now: string
): void {
  db.prepare(`
    INSERT INTO exam_change_logs (
      id, schedule_id, change_type, registration_id, candidate_id,
      old_value, new_value, reason, changed_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(), scheduleId, changeType, registrationId, candidateId,
    oldValue, newValue, reason, changedBy, now
  )
}

router.post('/late-payment-reschedule', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { schedule_id, registration_ids, reason } = req.body
    if (!schedule_id || !registration_ids || !Array.isArray(registration_ids) || registration_ids.length === 0) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const db = getDb()
    const schedule = db.prepare('SELECT * FROM exam_schedules WHERE id = ?').get(schedule_id) as any
    if (!schedule) {
      res.status(404).json({ success: false, error: '排考不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const target = {
      schedule_id: schedule.id,
      batch_id: schedule.batch_id,
      exam_room_id: schedule.exam_room_id,
      proctor_id: schedule.proctor_id,
      subject_id: schedule.subject_id,
      skill_level_id: schedule.skill_level_id,
      exam_date: schedule.exam_date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      capacity: schedule.capacity,
    }

    const placeholders = registration_ids.map(() => '?').join(',')
    const candidates = db.prepare(`
      SELECT
        r.id as registration_id,
        r.candidate_id,
        c.name as candidate_name,
        c.id_card,
        r.subject_id,
        s.name as subject_name,
        s.type as subject_type,
        r.skill_level_id,
        sl.name as skill_level_name,
        r.payment_status,
        r.is_frozen,
        r.freeze_reason
      FROM registrations r
      JOIN candidates c ON r.candidate_id = c.id
      JOIN subjects s ON r.subject_id = s.id
      JOIN skill_levels sl ON r.skill_level_id = sl.id
      WHERE r.id IN (${placeholders})
    `).all(...registration_ids) as any[]

    const validation = scheduleValidator.validateAll(candidates, target, {
      allowLatePayment: true,
      isReschedule: true,
      skipDuplicateSeat: true,
    })
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: '临考补缴排考校验失败',
        errors: validation.errors,
        warnings: validation.warnings,
      })
      return
    }

    const checkedInStmt = db.prepare(`
      SELECT sa.candidate_id, sa.seat_no
      FROM seat_arrangements sa
      WHERE sa.schedule_id = ? AND sa.status != 'cancelled' AND sa.checkin_status = 'checked_in'
    `)
    const checkedIn = checkedInStmt.all(schedule_id) as any[]
    const checkedInIds = checkedIn.map((s: any) => s.candidate_id)
    const checkedInSeats = checkedIn.map((s: any) => s.seat_no)

    const currentSeats = db.prepare(`
      SELECT MAX(CAST(seat_no AS INTEGER)) as max_seat
      FROM seat_arrangements
      WHERE schedule_id = ? AND status != 'cancelled'
    `).get(schedule_id) as any
    let nextSeat = (currentSeats?.max_seat || 0) + 1

    const tx = db.transaction(() => {
      let assignedCount = 0
      candidates.forEach((c: any) => {
        if (checkedInIds.includes(c.candidate_id)) {
          return
        }

        let seatNo = String(nextSeat++)
        while (checkedInSeats.includes(seatNo)) {
          seatNo = String(nextSeat++)
        }

        const existingSeat = db.prepare(`
          SELECT id FROM seat_arrangements
          WHERE schedule_id = ? AND registration_id = ? AND status != 'cancelled'
        `).get(schedule_id, c.registration_id) as { id: string } | undefined

        if (existingSeat) {
          db.prepare(`
            UPDATE seat_arrangements
            SET status = 'cancelled', updated_at = ?
            WHERE id = ?
          `).run(now, existingSeat.id)
        }

        db.prepare(`
          INSERT INTO seat_arrangements (
            id, schedule_id, registration_id, candidate_id, seat_no,
            status, checkin_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'assigned', 'pending', ?, ?)
        `).run(uuidv4(), schedule_id, c.registration_id, c.candidate_id, seatNo, now, now)

        if (c.payment_status !== 'paid') {
          db.prepare(`
            UPDATE registrations
            SET payment_status = 'paid', status = 'paid',
                exam_status = 'scheduled', updated_at = ?
            WHERE id = ?
          `).run(now, c.registration_id)

          db.prepare(`
            INSERT INTO payment_records (
              id, registration_id, institution_id, amount, payment_method,
              transaction_no, status, paid_at, remark, created_at
            ) VALUES (?, ?, (SELECT institution_id FROM registrations WHERE id = ?),
                    200, 'late_cash', ?, 'success', ?, '临考补缴', ?)
          `).run(uuidv4(), c.registration_id, c.registration_id,
                  `LATE-${Date.now()}`, now, now)
        } else {
          db.prepare(`
            UPDATE registrations
            SET exam_status = 'scheduled', updated_at = ?
            WHERE id = ?
          `).run(now, c.registration_id)
        }

        logChange(db, schedule_id, 'late_payment', c.registration_id, c.candidate_id,
          null, `座位${seatNo}`, reason || '临考补缴后排座', req.user?.id || 'system', now)
        assignedCount++
      })

      db.prepare(`
        UPDATE exam_schedules
        SET assigned_count = (SELECT COUNT(*) FROM seat_arrangements
                              WHERE schedule_id = ? AND status != 'cancelled'),
            updated_at = ?
        WHERE id = ?
      `).run(schedule_id, now, schedule_id)
    })

    tx()

    res.json({
      success: true,
      data: {
        assigned_count: candidates.filter((c: any) => !checkedInIds.includes(c.candidate_id)).length,
        preserved_count: candidates.filter((c: any) => checkedInIds.includes(c.candidate_id)).length,
        warnings: validation.warnings,
      },
    })
  } catch (error) {
    console.error('Late payment reschedule error:', error)
    res.status(500).json({ success: false, error: '临考补缴排考失败' })
  }
})

router.post('/deferral-request', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { registration_id, original_schedule_id, reason, evidence } = req.body
    if (!registration_id || !original_schedule_id || !reason) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const db = getDb()
    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id) as any
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    db.prepare(`
      INSERT INTO deferral_requests (
        id, registration_id, candidate_id, original_schedule_id,
        reason, evidence, requested_by, requested_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      id, registration_id, registration.candidate_id, original_schedule_id,
      reason, evidence, req.user?.id || 'system', now, now, now
    )

    logChange(db, original_schedule_id, 'deferral', registration_id, registration.candidate_id,
      'scheduled', 'deferral_requested', reason, req.user?.id || 'system', now)

    res.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Deferral request error:', error)
    res.status(500).json({ success: false, error: '提交缓考申请失败' })
  }
})

router.post('/deferral/:id/approve', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { new_schedule_id, remarks } = req.body

    const db = getDb()
    const deferral = db.prepare('SELECT * FROM deferral_requests WHERE id = ?').get(id) as any
    if (!deferral) {
      res.status(404).json({ success: false, error: '缓考申请不存在' })
      return
    }
    if (deferral.status !== 'pending') {
      res.status(400).json({ success: false, error: '该申请已处理' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE deferral_requests
        SET status = 'approved', new_schedule_id = ?, remarks = ?,
            approved_by = ?, approved_at = ?, updated_at = ?
        WHERE id = ?
      `).run(new_schedule_id || null, remarks, req.user?.id, now, now, id)

      db.prepare(`
        UPDATE registrations
        SET exam_status = 'deferred', updated_at = ?
        WHERE id = ?
      `).run(now, deferral.registration_id)

      db.prepare(`
        UPDATE seat_arrangements
        SET status = 'cancelled', updated_at = ?
        WHERE registration_id = ? AND schedule_id = ?
      `).run(now, deferral.registration_id, deferral.original_schedule_id)

      db.prepare(`
        UPDATE exam_schedules
        SET assigned_count = assigned_count - 1, updated_at = ?
        WHERE id = ?
      `).run(now, deferral.original_schedule_id)

      logChange(db, deferral.original_schedule_id, 'deferral', deferral.registration_id, deferral.candidate_id,
        'scheduled', 'deferred', remarks || '缓考申请通过', req.user?.id || 'system', now)

      if (new_schedule_id) {
        const schedule = db.prepare('SELECT * FROM exam_schedules WHERE id = ?').get(new_schedule_id) as any
        const currentSeats = db.prepare(`
          SELECT MAX(CAST(seat_no AS INTEGER)) as max_seat
          FROM seat_arrangements
          WHERE schedule_id = ? AND status != 'cancelled'
        `).get(new_schedule_id) as any
        const nextSeat = (currentSeats?.max_seat || 0) + 1

        db.prepare(`
          INSERT INTO seat_arrangements (
            id, schedule_id, registration_id, candidate_id, seat_no,
            status, checkin_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'assigned', 'pending', ?, ?)
        `).run(uuidv4(), new_schedule_id, deferral.registration_id, deferral.candidate_id, String(nextSeat), now, now)

        db.prepare(`
          UPDATE exam_schedules
          SET assigned_count = assigned_count + 1, updated_at = ?
          WHERE id = ?
        `).run(now, new_schedule_id)

        db.prepare(`
          UPDATE registrations
          SET exam_status = 'scheduled', updated_at = ?
          WHERE id = ?
        `).run(now, deferral.registration_id)

        logChange(db, new_schedule_id, 'deferral', deferral.registration_id, deferral.candidate_id,
          null, `缓考安排座位${nextSeat}`, remarks || '缓考安排', req.user?.id || 'system', now)
      }
    })

    tx()
    res.json({ success: true, message: '缓考申请已批准' })
  } catch (error) {
    console.error('Approve deferral error:', error)
    res.status(500).json({ success: false, error: '批准缓考申请失败' })
  }
})

router.post('/equipment-failure', authenticateToken, requireRole('proctor', 'exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { exam_room_id, schedule_id, equipment_name, failure_description } = req.body
    if (!exam_room_id || !equipment_name || !failure_description) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const db = getDb()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    const affectedCount = schedule_id ? (
      db.prepare(`
        SELECT COUNT(*) as count FROM seat_arrangements
        WHERE schedule_id = ? AND status != 'cancelled' AND checkin_status != 'checked_in'
      `).get(schedule_id) as any
    ).count : 0

    db.prepare(`
      INSERT INTO equipment_failures (
        id, exam_room_id, schedule_id, equipment_name, failure_description,
        reported_by, reported_at, status, affected_candidate_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'reported', ?, ?, ?)
    `).run(
      id, exam_room_id, schedule_id || null, equipment_name, failure_description,
      req.user?.id || 'system', now, affectedCount, now, now
    )

    if (schedule_id) {
      logChange(db, schedule_id, 'equipment_failure', null, null,
        equipment_name, 'failed', failure_description, req.user?.id || 'system', now)
    }

    res.json({ success: true, data: { id, affected_candidate_count: affectedCount } })
  } catch (error) {
    console.error('Report equipment failure error:', error)
    res.status(500).json({ success: false, error: '上报设备故障失败' })
  }
})

router.post('/equipment-failure/:id/transfer', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { transfer_to_room_id, new_schedule_id, resolution } = req.body
    if (!transfer_to_room_id || !new_schedule_id) {
      res.status(400).json({ success: false, error: '缺少目标考场或排考信息' })
      return
    }

    const db = getDb()
    const failure = db.prepare('SELECT * FROM equipment_failures WHERE id = ?').get(id) as any
    if (!failure) {
      res.status(404).json({ success: false, error: '设备故障记录不存在' })
      return
    }
    if (!failure.schedule_id) {
      res.status(400).json({ success: false, error: '该故障未关联排考，无法转场' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const oldScheduleId = failure.schedule_id

    const checkedInStmt = db.prepare(`
      SELECT sa.*, c.name as candidate_name
      FROM seat_arrangements sa
      JOIN candidates c ON sa.candidate_id = c.id
      WHERE sa.schedule_id = ? AND sa.status != 'cancelled'
    `)
    const allSeats = checkedInStmt.all(oldScheduleId) as any[]
    const checkedInSeats = allSeats.filter((s: any) => s.checkin_status === 'checked_in')
    const notCheckedInSeats = allSeats.filter((s: any) => s.checkin_status !== 'checked_in')

    const targetSchedule = db.prepare('SELECT * FROM exam_schedules WHERE id = ?').get(new_schedule_id) as any
    if (!targetSchedule) {
      res.status(404).json({ success: false, error: '目标排考不存在' })
      return
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE equipment_failures
        SET status = 'transferred', transfer_to_room_id = ?,
            handled_by = ?, handled_at = ?, resolution = ?, updated_at = ?
        WHERE id = ?
      `).run(transfer_to_room_id, req.user?.id, now, resolution || '设备故障转场', now, id)

      const currentMaxSeat = (db.prepare(`
        SELECT MAX(CAST(seat_no AS INTEGER)) as max_seat
        FROM seat_arrangements WHERE schedule_id = ? AND status != 'cancelled'
      `).get(new_schedule_id) as any)?.max_seat || 0
      let nextSeat = currentMaxSeat + 1

      notCheckedInSeats.forEach((seat: any) => {
        const target = {
          schedule_id: new_schedule_id,
          batch_id: targetSchedule.batch_id,
          exam_room_id: targetSchedule.exam_room_id,
          proctor_id: targetSchedule.proctor_id,
          subject_id: targetSchedule.subject_id,
          skill_level_id: targetSchedule.skill_level_id,
          exam_date: targetSchedule.exam_date,
          start_time: targetSchedule.start_time,
          end_time: targetSchedule.end_time,
          capacity: targetSchedule.capacity,
        }
        const candidate = [{
          registration_id: seat.registration_id,
          candidate_id: seat.candidate_id,
          candidate_name: seat.candidate_name,
          id_card: '',
          subject_id: targetSchedule.subject_id,
          subject_name: '',
          subject_type: 'theory' as const,
          skill_level_id: targetSchedule.skill_level_id,
          skill_level_name: '',
          payment_status: 'paid',
          is_frozen: 0,
          freeze_reason: null,
        }]
        const validation = scheduleValidator.validateAll(candidate, target, {
          skipIdCard: true, skipPayment: true, skipFrozen: true,
          skipDuplicateSeat: true,
        })
        if (!validation.valid) {
          throw new Error(`考生 ${seat.candidate_name} 转场校验失败: ${validation.errors[0]}`)
        }

        db.prepare(`
          UPDATE seat_arrangements
          SET status = 'transferred', updated_at = ?
          WHERE id = ?
        `).run(now, seat.id)

        const newSeatNo = String(nextSeat++)
        db.prepare(`
          INSERT INTO seat_arrangements (
            id, schedule_id, registration_id, candidate_id, seat_no,
            status, checkin_status, original_schedule_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'transferred', 'pending', ?, ?, ?)
        `).run(uuidv4(), new_schedule_id, seat.registration_id, seat.candidate_id, newSeatNo, oldScheduleId, now, now)

        db.prepare(`
          INSERT INTO seat_adjustments (
            id, seat_arrangement_id, old_schedule_id, new_schedule_id,
            old_seat_no, new_seat_no, reason, changed_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), seat.id, oldScheduleId, new_schedule_id, seat.seat_no, newSeatNo,
                '设备故障转场', req.user?.id || 'system', now)

        logChange(db, new_schedule_id, 'room_transfer', seat.registration_id, seat.candidate_id,
          `原座位${seat.seat_no}`, `新座位${newSeatNo}`, '设备故障转场', req.user?.id || 'system', now)
      })

      checkedInSeats.forEach((seat: any) => {
        logChange(db, oldScheduleId, 'equipment_failure', seat.registration_id, seat.candidate_id,
          `座位${seat.seat_no}`, '保留原座位(已签到)', '已签到考生保留原考场', req.user?.id || 'system', now)
      })

      db.prepare(`
        UPDATE exam_schedules
        SET assigned_count = (SELECT COUNT(*) FROM seat_arrangements WHERE schedule_id = ? AND status != 'cancelled'),
            updated_at = ?
        WHERE id IN (?, ?)
      `).run(oldScheduleId, now, oldScheduleId, new_schedule_id)
      db.prepare(`
        UPDATE exam_schedules
        SET assigned_count = (SELECT COUNT(*) FROM seat_arrangements WHERE schedule_id = ? AND status != 'cancelled'),
            updated_at = ?
        WHERE id = ?
      `).run(new_schedule_id, now, new_schedule_id)
    })

    tx()

    res.json({
      success: true,
      data: {
        transferred_count: notCheckedInSeats.length,
        preserved_count: checkedInSeats.length,
      },
    })
  } catch (error) {
    console.error('Equipment failure transfer error:', error)
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '设备故障转场失败' })
  }
})

router.post('/proctor-replace', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { schedule_id, original_proctor_id, new_proctor_id, reason, conflict_type, related_candidate_id } = req.body
    if (!schedule_id || !original_proctor_id || !new_proctor_id || !reason || !conflict_type) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const db = getDb()
    const schedule = db.prepare('SELECT * FROM exam_schedules WHERE id = ?').get(schedule_id) as any
    if (!schedule) {
      res.status(404).json({ success: false, error: '排考不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const target = {
      schedule_id,
      batch_id: schedule.batch_id,
      exam_room_id: schedule.exam_room_id,
      proctor_id: new_proctor_id,
      subject_id: schedule.subject_id,
      skill_level_id: schedule.skill_level_id,
      exam_date: schedule.exam_date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      capacity: schedule.capacity,
    }
    const proctorValidation = scheduleValidator.validateProctorQualification(target)
    if (!proctorValidation.valid) {
      res.status(400).json({
        success: false,
        error: '新监考老师资格校验失败',
        errors: proctorValidation.errors,
      })
      return
    }

    const oldProctor = db.prepare('SELECT name FROM proctors WHERE id = ?').get(original_proctor_id) as any
    const newProctor = db.prepare('SELECT name FROM proctors WHERE id = ?').get(new_proctor_id) as any

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO proctor_replacements (
          id, schedule_id, original_proctor_id, new_proctor_id,
          reason, conflict_type, related_candidate_id, replaced_by, replaced_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), schedule_id, original_proctor_id, new_proctor_id, reason, conflict_type,
              related_candidate_id || null, req.user?.id || 'system', now, now)

      db.prepare(`
        UPDATE exam_schedules
        SET proctor_id = ?, updated_at = ?
        WHERE id = ?
      `).run(new_proctor_id, now, schedule_id)

      logChange(db, schedule_id, 'proctor_replace', null, related_candidate_id || null,
        oldProctor?.name || original_proctor_id, newProctor?.name || new_proctor_id,
        reason, req.user?.id || 'system', now)
    })

    tx()
    res.json({ success: true, message: '监考替换成功' })
  } catch (error) {
    console.error('Proctor replace error:', error)
    res.status(500).json({ success: false, error: '监考替换失败' })
  }
})

router.post('/proctor-conflict', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { proctor_id, candidate_id, conflict_type, relationship } = req.body
    if (!proctor_id || !candidate_id || !conflict_type || !relationship) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const db = getDb()
    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const existing = db.prepare(`
      SELECT id FROM proctor_conflicts 
      WHERE proctor_id = ? AND candidate_id = ?
    `).get(proctor_id, candidate_id)

    if (existing) {
      res.status(400).json({ success: false, error: '该监考老师与考生的回避关系已存在' })
      return
    }

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO proctor_conflicts (
          id, proctor_id, candidate_id, conflict_type, relationship, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(id, proctor_id, candidate_id, conflict_type, relationship, now, now)

      const proctor = db.prepare('SELECT name FROM proctors WHERE id = ?').get(proctor_id) as any
      const candidate = db.prepare('SELECT name FROM candidates WHERE id = ?').get(candidate_id) as any

      logChange(db, '', 'proctor_conflict', null, candidate_id,
        null, `${proctor?.name || proctor_id} - ${candidate?.name || candidate_id}`,
        `添加回避关系: ${relationship}`, req.user?.id || 'system', now)
    })

    tx()
    res.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Add proctor conflict error:', error)
    res.status(500).json({ success: false, error: '添加回避关系失败' })
  }
})

router.post('/accessibility-arrangement', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { registration_id, schedule_id, arrangement_type, description, requirements, seat_no } = req.body
    if (!registration_id || !arrangement_type) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const db = getDb()
    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id) as any
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()
    const status = schedule_id ? 'scheduled' : 'pending'

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO accessibility_arrangements (
          id, registration_id, candidate_id, schedule_id, arrangement_type, description,
          requirements, status, seat_no, requested_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, registration_id, registration.candidate_id, schedule_id || null, arrangement_type, description || null,
        requirements || null, status, seat_no || null, req.user?.id || 'system', now, now
      )

      if (schedule_id) {
        logChange(db, schedule_id, 'accessibility', registration_id, registration.candidate_id,
          null, `无障碍安排: ${arrangement_type}`, description || '创建无障碍安排', req.user?.id || 'system', now)
      }
    })

    tx()
    res.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Add accessibility arrangement error:', error)
    res.status(500).json({ success: false, error: '添加无障碍安排失败' })
  }
})

router.put('/accessibility-arrangement/:id', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { schedule_id, arrangement_type, description, requirements, seat_no, status } = req.body

    const db = getDb()
    const arrangement = db.prepare('SELECT * FROM accessibility_arrangements WHERE id = ?').get(id) as any
    if (!arrangement) {
      res.status(404).json({ success: false, error: '无障碍安排不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const tx = db.transaction(() => {
      const oldScheduleId = arrangement.schedule_id
      const newScheduleId = schedule_id || arrangement.schedule_id

      db.prepare(`
        UPDATE accessibility_arrangements
        SET schedule_id = COALESCE(?, schedule_id),
            arrangement_type = COALESCE(?, arrangement_type),
            description = COALESCE(?, description),
            requirements = COALESCE(?, requirements),
            seat_no = COALESCE(?, seat_no),
            status = COALESCE(?, status),
            updated_at = ?
        WHERE id = ?
      `).run(
        schedule_id || null,
        arrangement_type || null,
        description || null,
        requirements || null,
        seat_no || null,
        status || null,
        now,
        id
      )

      if (newScheduleId) {
        const oldVal = oldScheduleId ? `原排考: ${oldScheduleId}` : null
        const newVal = schedule_id ? `新排考: ${schedule_id}` : `更新安排: ${arrangement_type || arrangement.arrangement_type}`
        logChange(db, newScheduleId, 'accessibility', arrangement.registration_id, arrangement.candidate_id,
          oldVal, newVal, description || '更新无障碍安排', req.user?.id || 'system', now)
      }
    })

    tx()
    res.json({ success: true, message: '无障碍安排已更新' })
  } catch (error) {
    console.error('Update accessibility arrangement error:', error)
    res.status(500).json({ success: false, error: '更新无障碍安排失败' })
  }
})

router.post('/accessibility-arrangement/:id/complete', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { remarks } = req.body

    const db = getDb()
    const arrangement = db.prepare('SELECT * FROM accessibility_arrangements WHERE id = ?').get(id) as any
    if (!arrangement) {
      res.status(404).json({ success: false, error: '无障碍安排不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE accessibility_arrangements
        SET status = 'completed',
            remarks = ?,
            updated_at = ?
        WHERE id = ?
      `).run(remarks || null, now, id)

      if (arrangement.schedule_id) {
        logChange(db, arrangement.schedule_id, 'accessibility', arrangement.registration_id, arrangement.candidate_id,
          arrangement.status, 'completed', remarks || '无障碍安排已完成', req.user?.id || 'system', now)
      }
    })

    tx()
    res.json({ success: true, message: '无障碍安排已标记完成' })
  } catch (error) {
    console.error('Complete accessibility arrangement error:', error)
    res.status(500).json({ success: false, error: '标记无障碍安排完成失败' })
  }
})

router.post('/cheating-report', authenticateToken, requireRole('proctor', 'exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { registration_id, schedule_id, description, evidence } = req.body
    if (!registration_id || !schedule_id || !description) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const db = getDb()
    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id) as any
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const id = uuidv4()

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO cheating_reviews (
          id, registration_id, candidate_id, schedule_id, reported_by, reported_at,
          description, evidence, initial_freeze, freeze_reason, review_result,
          final_decision, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'pending', 'null', ?, ?)
      `).run(
        id, registration_id, registration.candidate_id, schedule_id,
        req.user?.id || 'system', now, description, evidence || null,
        description, now, now
      )

      db.prepare(`
        UPDATE registrations
        SET is_frozen = 1, freeze_reason = ?, is_cheating = 1,
            cheating_notes = ?, cheating_review_id = ?, updated_at = ?
        WHERE id = ?
      `).run(`涉嫌作弊: ${description}`, description, id, now, registration_id)

      logChange(db, schedule_id, 'cheating', registration_id, registration.candidate_id,
        'normal', 'frozen', `涉嫌作弊: ${description}`, req.user?.id || 'system', now)
    })

    tx()

    res.json({ success: true, data: { id }, message: '作弊已上报，成绩已冻结' })
  } catch (error) {
    console.error('Cheating report error:', error)
    res.status(500).json({ success: false, error: '上报作弊失败' })
  }
})

router.post('/cheating-review/:id', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { review_result, final_decision, decision_notes } = req.body
    if (!review_result || !final_decision) {
      res.status(400).json({ success: false, error: '缺少复核结果或最终决定' })
      return
    }

    const db = getDb()
    const review = db.prepare('SELECT * FROM cheating_reviews WHERE id = ?').get(id) as any
    if (!review) {
      res.status(404).json({ success: false, error: '作弊复核记录不存在' })
      return
    }
    if (review.review_result !== 'pending') {
      res.status(400).json({ success: false, error: '该记录已复核' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const tx = db.transaction(() => {
      let scoreUnlockId = null
      if (final_decision === 'unfreeze') {
        const unlockId = uuidv4()
        db.prepare(`
          INSERT INTO score_unlocks (
            id, registration_id, candidate_id, reason, requested_by,
            status, approved_by, approved_at, created_at
          ) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?)
        `).run(unlockId, review.registration_id, review.candidate_id,
                decision_notes || '复核通过，解除冻结', req.user?.id || 'system',
                req.user?.id || 'system', now, now)
        scoreUnlockId = unlockId

        db.prepare(`
          UPDATE registrations
          SET is_frozen = 0, freeze_reason = NULL, is_cheating = 0,
              cheating_notes = NULL, cheating_review_id = NULL, updated_at = ?
          WHERE id = ?
        `).run(now, review.registration_id)
      } else if (final_decision === 'disqualify') {
        db.prepare(`
          UPDATE registrations
          SET exam_status = 'cheating', is_frozen = 1, updated_at = ?
          WHERE id = ?
        `).run(now, review.registration_id)
      }

      db.prepare(`
        UPDATE cheating_reviews
        SET review_result = ?, final_decision = ?, decision_notes = ?,
            reviewer_id = ?, reviewed_at = ?, score_unlock_id = ?, updated_at = ?
        WHERE id = ?
      `).run(review_result, final_decision, decision_notes || null,
              req.user?.id, now, scoreUnlockId, now, id)

      logChange(db, review.schedule_id, 'cheating', review.registration_id, review.candidate_id,
        'frozen', final_decision, decision_notes || '作弊复核完成', req.user?.id || 'system', now)
    })

    tx()

    res.json({
      success: true,
      message: final_decision === 'unfreeze' ? '复核通过，成绩已解冻' :
               final_decision === 'disqualify' ? '已判定作弊，成绩取消' :
               '已记录复核结果',
    })
  } catch (error) {
    console.error('Cheating review error:', error)
    res.status(500).json({ success: false, error: '作弊复核失败' })
  }
})

router.post('/cheating-review/:id/unlock', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { review_notes, reviewer } = req.body

    const db = getDb()
    const review = db.prepare('SELECT * FROM cheating_reviews WHERE id = ?').get(id) as any
    if (!review) {
      res.status(404).json({ success: false, error: '作弊复核记录不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const tx = db.transaction(() => {
      const unlockId = uuidv4()
      db.prepare(`
        INSERT INTO score_unlocks (
          id, registration_id, candidate_id, reason, requested_by,
          status, approved_by, approved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?)
      `).run(unlockId, review.registration_id, review.candidate_id,
              review_notes || '申诉成功，解除成绩冻结', req.user?.id || 'system',
              req.user?.id || reviewer || 'system', now, now)

      db.prepare(`
        UPDATE registrations
        SET is_frozen = 0, freeze_reason = NULL, is_cheating = 0,
            cheating_notes = NULL, cheating_review_id = NULL,
            score_status = 'final', updated_at = ?
        WHERE id = ?
      `).run(now, review.registration_id)

      db.prepare(`
        UPDATE cheating_reviews
        SET review_result = 'false_alarm', final_decision = 'unfreeze',
            decision_notes = ?, review_notes = ?, score_unlocked = 1,
            reviewer_id = ?, reviewed_at = ?, score_unlock_id = ?,
            final_reviewed_by = ?, final_review_remarks = ?,
            final_reviewed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(review_notes || null, review_notes || null,
              req.user?.id || reviewer || 'system', now, unlockId,
              reviewer || req.user?.id || 'system', review_notes || null,
              now, now, id)

      logChange(db, review.schedule_id, 'cheating', review.registration_id, review.candidate_id,
        'frozen', 'unlocked', review_notes || '申诉成功，成绩解冻', req.user?.id || 'system', now)
    })

    tx()

    res.json({ success: true, message: '成绩已解冻' })
  } catch (error) {
    console.error('Unlock score error:', error)
    res.status(500).json({ success: false, error: '成绩解锁失败' })
  }
})

router.post('/half-exam-state', authenticateToken, requireRole('proctor', 'exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { registration_id, theory_exam_status, theory_score, practical_exam_status } = req.body
    if (!registration_id) {
      res.status(400).json({ success: false, error: '缺少报名记录ID' })
      return
    }

    const db = getDb()
    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id) as any
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const existing = db.prepare('SELECT * FROM half_exam_states WHERE registration_id = ?').get(registration_id) as any

    let overallStatus = 'incomplete'
    if (theory_exam_status === 'completed' && (practical_exam_status === 'not_started' || practical_exam_status === 'deferred')) {
      overallStatus = 'theory_done'
    } else if (theory_exam_status === 'completed' && practical_exam_status === 'completed') {
      overallStatus = 'both_done'
    } else if (theory_exam_status === 'completed' && practical_exam_status !== 'completed') {
      overallStatus = 'practical_pending'
    }

    const tx = db.transaction(() => {
      if (existing) {
        db.prepare(`
          UPDATE half_exam_states
          SET theory_exam_status = COALESCE(?, theory_exam_status),
              theory_score = COALESCE(?, theory_score),
              theory_exam_date = CASE WHEN ? IS NOT NULL THEN ? ELSE theory_exam_date END,
              practical_exam_status = COALESCE(?, practical_exam_status),
              overall_status = ?,
              last_updated_by = ?,
              updated_at = ?
          WHERE id = ?
        `).run(theory_exam_status || null, theory_score || null,
                theory_exam_status === 'completed' ? 1 : null,
                theory_exam_status === 'completed' ? now : null,
                practical_exam_status || null, overallStatus,
                req.user?.id || 'system', now, existing.id)

        if (overallStatus === 'theory_done') {
          db.prepare(`
            UPDATE registrations
            SET exam_status = 'half_completed', half_exam_state_id = ?, updated_at = ?
            WHERE id = ?
          `).run(existing.id, now, registration_id)
        }

        logChange(db, existing.practical_schedule_id || registration_id, 'half_exam', registration_id, registration.candidate_id,
          existing.overall_status, overallStatus, '半程状态更新', req.user?.id || 'system', now)
      } else {
        const id = uuidv4()
        db.prepare(`
          INSERT INTO half_exam_states (
            id, registration_id, candidate_id, subject_id,
            theory_exam_status, theory_score, theory_exam_date,
            practical_exam_status, overall_status, last_updated_by,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, registration_id, registration.candidate_id, registration.subject_id,
          theory_exam_status || 'not_started', theory_score || null,
          theory_exam_status === 'completed' ? now : null,
          practical_exam_status || 'not_started',
          overallStatus, req.user?.id || 'system', now, now
        )

        if (overallStatus === 'theory_done') {
          db.prepare(`
            UPDATE registrations
            SET exam_status = 'half_completed', half_exam_state_id = ?, updated_at = ?
            WHERE id = ?
          `).run(id, now, registration_id)
        }

        logChange(db, registration_id, 'half_exam', registration_id, registration.candidate_id,
          null, overallStatus, '半程状态创建', req.user?.id || 'system', now)
      }
    })

    tx()
    res.json({ success: true, message: '半程状态已更新', data: { overall_status: overallStatus } })
  } catch (error) {
    console.error('Half exam state update error:', error)
    res.status(500).json({ success: false, error: '更新半程状态失败' })
  }
})

router.post('/makeup-exam-with-inheritance', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { original_registration_id, reason, new_schedule_id } = req.body
    if (!original_registration_id || !reason) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const db = getDb()
    const original = db.prepare(`
      SELECT r.*, c.name as candidate_name
      FROM registrations r
      JOIN candidates c ON r.candidate_id = c.id
      WHERE r.id = ?
    `).get(original_registration_id) as any
    if (!original) {
      res.status(404).json({ success: false, error: '原始报名记录不存在' })
      return
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const newRegId = uuidv4()
    const inheritanceId = uuidv4()

    const inheritedFields = JSON.stringify({
      candidate_id: original.candidate_id,
      subject_id: original.subject_id,
      skill_level_id: original.skill_level_id,
      institution_id: original.institution_id,
      payment_amount: original.payment_amount,
      original_exam_status: original.exam_status,
      disciplinary_record: original.disciplinary_record,
    })

    const hasDisciplinary = original.disciplinary_record ? 1 : 0

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO registrations (
          id, institution_id, candidate_id, subject_id, skill_level_id,
          registration_version, status, payment_status, payment_amount,
          exam_status, is_frozen, is_makeup, original_registration_id,
          disciplinary_record, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, 'paid', 'paid', ?, 'not_scheduled',
                  0, 1, ?, ?, ?, ?, ?)
      `).run(
        newRegId, original.institution_id, original.candidate_id,
        original.subject_id, original.skill_level_id, original.payment_amount,
        original_registration_id, original.disciplinary_record,
        `补考(原始报名: ${original_registration_id})`, now, now
      )

      db.prepare(`
        INSERT INTO makeup_inheritances (
          id, original_registration_id, makeup_registration_id,
          candidate_id, subject_id, reason, inherited_fields,
          has_disciplinary_record, disciplinary_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        inheritanceId, original_registration_id, newRegId,
        original.candidate_id, original.subject_id, reason,
        inheritedFields, hasDisciplinary, original.disciplinary_record, now
      )

      if (new_schedule_id) {
        const schedule = db.prepare('SELECT * FROM exam_schedules WHERE id = ?').get(new_schedule_id) as any
        const currentSeats = db.prepare(`
          SELECT MAX(CAST(seat_no AS INTEGER)) as max_seat
          FROM seat_arrangements WHERE schedule_id = ? AND status != 'cancelled'
        `).get(new_schedule_id) as any
        const nextSeat = (currentSeats?.max_seat || 0) + 1

        db.prepare(`
          INSERT INTO seat_arrangements (
            id, schedule_id, registration_id, candidate_id, seat_no,
            status, checkin_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'assigned', 'pending', ?, ?)
        `).run(uuidv4(), new_schedule_id, newRegId, original.candidate_id, String(nextSeat), now, now)

        db.prepare(`
          UPDATE registrations
          SET exam_status = 'scheduled', updated_at = ?
          WHERE id = ?
        `).run(now, newRegId)

        db.prepare(`
          UPDATE exam_schedules
          SET assigned_count = assigned_count + 1, updated_at = ?
          WHERE id = ?
        `).run(now, new_schedule_id)
      }

      logChange(db, new_schedule_id || original_registration_id, 'other', newRegId, original.candidate_id,
        original_registration_id, newRegId, `补考继承: ${reason}`, req.user?.id || 'system', now)
    })

    tx()

    res.json({
      success: true,
      data: {
        new_registration_id: newRegId,
        inheritance_id: inheritanceId,
        has_disciplinary_record: hasDisciplinary === 1,
      },
    })
  } catch (error) {
    console.error('Makeup exam with inheritance error:', error)
    res.status(500).json({ success: false, error: '创建补考继承链失败' })
  }
})

router.get('/deferrals', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { status } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT d.*,
             c.name as candidate_name, c.id_card,
             s.name as subject_name,
             b.name as original_batch_name,
             nb.name as new_batch_name
      FROM deferral_requests d
      JOIN candidates c ON d.candidate_id = c.id
      JOIN registrations r ON d.registration_id = r.id
      JOIN subjects s ON r.subject_id = s.id
      LEFT JOIN exam_schedules os ON d.original_schedule_id = os.id
      LEFT JOIN exam_batches b ON os.batch_id = b.id
      LEFT JOIN exam_schedules ns ON d.new_schedule_id = ns.id
      LEFT JOIN exam_batches nb ON ns.batch_id = nb.id
      WHERE 1=1
    `
    const params: string[] = []
    if (status) {
      sql += ' AND d.status = ?'
      params.push(status)
    }
    sql += ' ORDER BY d.created_at DESC'
    const deferrals = db.prepare(sql).all(...params)
    res.json({ success: true, data: deferrals })
  } catch (error) {
    console.error('Get deferrals error:', error)
    res.status(500).json({ success: false, error: '获取缓考列表失败' })
  }
})

router.get('/equipment-failures', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { status, schedule_id } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT ef.*,
             er.name as room_name,
             ter.name as transfer_room_name,
             s.start_time, s.end_time, s.exam_date
      FROM equipment_failures ef
      JOIN exam_rooms er ON ef.exam_room_id = er.id
      LEFT JOIN exam_rooms ter ON ef.transfer_to_room_id = ter.id
      LEFT JOIN exam_schedules s ON ef.schedule_id = s.id
      WHERE 1=1
    `
    const params: string[] = []
    if (status) {
      sql += ' AND ef.status = ?'
      params.push(status)
    }
    if (schedule_id) {
      sql += ' AND ef.schedule_id = ?'
      params.push(schedule_id)
    }
    sql += ' ORDER BY ef.created_at DESC'
    const failures = db.prepare(sql).all(...params)
    res.json({ success: true, data: failures })
  } catch (error) {
    console.error('Get equipment failures error:', error)
    res.status(500).json({ success: false, error: '获取设备故障列表失败' })
  }
})

router.get('/cheating-reviews', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { review_result } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT cr.*,
             c.name as candidate_name, c.id_card,
             s.name as subject_name,
             er.name as room_name,
             es.exam_date, es.start_time
      FROM cheating_reviews cr
      JOIN candidates c ON cr.candidate_id = c.id
      JOIN subjects s ON cr.registration_id IN (SELECT id FROM registrations WHERE subject_id = s.id)
      JOIN exam_schedules es ON cr.schedule_id = es.id
      JOIN exam_rooms er ON es.exam_room_id = er.id
      WHERE 1=1
    `
    const params: string[] = []
    if (review_result) {
      sql += ' AND cr.review_result = ?'
      params.push(review_result)
    }
    sql += ' ORDER BY cr.created_at DESC'
    const reviews = db.prepare(sql).all(...params)
    res.json({ success: true, data: reviews })
  } catch (error) {
    console.error('Get cheating reviews error:', error)
    res.status(500).json({ success: false, error: '获取作弊复核列表失败' })
  }
})

router.get('/change-logs/:schedule_id', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { schedule_id } = req.params
    const db = getDb()
    const logs = db.prepare(`
      SELECT cl.*,
             c.name as candidate_name,
             u.username as changed_by_name
      FROM exam_change_logs cl
      LEFT JOIN candidates c ON cl.candidate_id = c.id
      LEFT JOIN users u ON cl.changed_by = u.id
      WHERE cl.schedule_id = ?
      ORDER BY cl.created_at DESC
    `).all(schedule_id)
    res.json({ success: true, data: logs })
  } catch (error) {
    console.error('Get change logs error:', error)
    res.status(500).json({ success: false, error: '获取变更日志失败' })
  }
})

router.get('/proctor-conflicts', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const conflicts = db.prepare(`
      SELECT pc.*,
             p.name as proctor_name,
             c.name as candidate_name, c.id_card
      FROM proctor_conflicts pc
      JOIN proctors p ON pc.proctor_id = p.id
      JOIN candidates c ON pc.candidate_id = c.id
      ORDER BY pc.created_at DESC
    `).all()
    res.json({ success: true, data: conflicts })
  } catch (error) {
    console.error('Get proctor conflicts error:', error)
    res.status(500).json({ success: false, error: '获取回避关系列表失败' })
  }
})

router.get('/proctor-conflicts/check', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { proctor_id, candidate_id } = req.query as Record<string, string>
    if (!proctor_id || !candidate_id) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const db = getDb()

    const existingConflict = db.prepare(`
      SELECT pc.*, p.name as proctor_name, c.name as candidate_name
      FROM proctor_conflicts pc
      JOIN proctors p ON pc.proctor_id = p.id
      JOIN candidates c ON pc.candidate_id = c.id
      WHERE pc.proctor_id = ? AND pc.candidate_id = ? AND pc.status = 'active'
    `).get(proctor_id, candidate_id) as { relationship: string } | undefined

    if (existingConflict) {
      res.json({ 
        success: true, 
        data: { 
          hasConflict: true, 
          conflictType: 'existing_relationship',
          message: `已存在回避关系：${existingConflict.relationship}`
        } 
      })
      return
    }

    const scheduleConflicts = db.prepare(`
      SELECT DISTINCT 
        s.id as schedule_id,
        b.name as batch_name,
        er.name as room_name,
        s.exam_date,
        s.start_time,
        c.name as candidate_name
      FROM seat_arrangements sa
      JOIN exam_schedules s ON sa.schedule_id = s.id
      JOIN exam_batches b ON s.batch_id = b.id
      JOIN exam_rooms er ON s.exam_room_id = er.id
      JOIN candidates c ON sa.candidate_id = c.id
      WHERE s.proctor_id = ? 
        AND sa.candidate_id = ? 
        AND sa.status != 'cancelled'
        AND s.status IN ('scheduled', 'in_progress')
    `).all(proctor_id, candidate_id) as any[]

    if (scheduleConflicts.length > 0) {
      const conflict = scheduleConflicts[0]
      res.json({ 
        success: true, 
        data: { 
          hasConflict: true, 
          conflictType: 'schedule_conflict',
          message: `该监考老师已安排监考考生 ${conflict.candidate_name} 的考试：${conflict.batch_name} - ${conflict.room_name} (${conflict.exam_date} ${conflict.start_time})`,
          schedules: scheduleConflicts
        } 
      })
      return
    }

    res.json({ success: true, data: { hasConflict: false } })
  } catch (error) {
    console.error('Check proctor conflict error:', error)
    res.status(500).json({ success: false, error: '冲突检测失败' })
  }
})

router.delete('/proctor-conflicts/:id', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const db = getDb()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const conflict = db.prepare(`
      SELECT pc.*, p.name as proctor_name, c.name as candidate_name
      FROM proctor_conflicts pc
      JOIN proctors p ON pc.proctor_id = p.id
      JOIN candidates c ON pc.candidate_id = c.id
      WHERE pc.id = ?
    `).get(id) as any

    if (!conflict) {
      res.status(404).json({ success: false, error: '回避关系不存在' })
      return
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE proctor_conflicts 
        SET status = 'inactive', updated_at = ? 
        WHERE id = ?
      `).run(now, id)

      logChange(db, '', 'proctor_conflict', null, conflict.candidate_id,
        `${conflict.proctor_name} - ${conflict.candidate_name}`, null,
        `删除回避关系: ${conflict.relationship}`, req.user?.id || 'system', now)
    })

    tx()
    res.json({ success: true, message: '回避关系已删除' })
  } catch (error) {
    console.error('Delete proctor conflict error:', error)
    res.status(500).json({ success: false, error: '删除回避关系失败' })
  }
})

router.get('/accessibility-arrangements', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { status, registration_id } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT aa.*,
             c.name as candidate_name, c.id_card,
             s.name as subject_name
      FROM accessibility_arrangements aa
      JOIN candidates c ON aa.candidate_id = c.id
      JOIN registrations r ON aa.registration_id = r.id
      JOIN subjects s ON r.subject_id = s.id
      WHERE 1=1
    `
    const params: string[] = []
    if (status) {
      sql += ' AND aa.status = ?'
      params.push(status)
    }
    if (registration_id) {
      sql += ' AND aa.registration_id = ?'
      params.push(registration_id)
    }
    sql += ' ORDER BY aa.created_at DESC'
    const arrangements = db.prepare(sql).all(...params)
    res.json({ success: true, data: arrangements })
  } catch (error) {
    console.error('Get accessibility arrangements error:', error)
    res.status(500).json({ success: false, error: '获取无障碍安排列表失败' })
  }
})

router.get('/half-exam-states', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { overall_status, registration_id } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT h.*,
             c.name as candidate_name, c.id_card,
             s.name as subject_name
      FROM half_exam_states h
      JOIN candidates c ON h.candidate_id = c.id
      JOIN subjects s ON h.subject_id = s.id
      WHERE 1=1
    `
    const params: string[] = []
    if (overall_status) {
      sql += ' AND h.overall_status = ?'
      params.push(overall_status)
    }
    if (registration_id) {
      sql += ' AND h.registration_id = ?'
      params.push(registration_id)
    }
    sql += ' ORDER BY h.updated_at DESC'
    const states = db.prepare(sql).all(...params)
    res.json({ success: true, data: states })
  } catch (error) {
    console.error('Get half exam states error:', error)
    res.status(500).json({ success: false, error: '获取半程状态列表失败' })
  }
})

router.get('/makeup-inheritances', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { candidate_id } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT mi.*,
             c.name as candidate_name, c.id_card,
             s.name as subject_name,
             r1.exam_status as original_status,
             r2.exam_status as makeup_status,
             r1.registration_no as original_reg_no,
             r2.registration_no as makeup_reg_no
      FROM makeup_inheritances mi
      JOIN candidates c ON mi.candidate_id = c.id
      JOIN subjects s ON mi.subject_id = s.id
      JOIN registrations r1 ON mi.original_registration_id = r1.id
      JOIN registrations r2 ON mi.makeup_registration_id = r2.id
      WHERE 1=1
    `
    const params: string[] = []
    if (candidate_id) {
      sql += ' AND mi.candidate_id = ?'
      params.push(candidate_id)
    }
    sql += ' ORDER BY mi.created_at DESC'
    const inheritances = db.prepare(sql).all(...params)
    res.json({ success: true, data: inheritances })
  } catch (error) {
    console.error('Get makeup inheritances error:', error)
    res.status(500).json({ success: false, error: '获取补考继承链列表失败' })
  }
})

router.get('/proctor-replacements', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { schedule_id } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT pr.*,
             op.name as original_proctor_name,
             np.name as new_proctor_name,
             c.name as related_candidate_name,
             s.exam_date, s.start_time
      FROM proctor_replacements pr
      JOIN proctors op ON pr.original_proctor_id = op.id
      JOIN proctors np ON pr.new_proctor_id = np.id
      JOIN exam_schedules s ON pr.schedule_id = s.id
      LEFT JOIN candidates c ON pr.related_candidate_id = c.id
      WHERE 1=1
    `
    const params: string[] = []
    if (schedule_id) {
      sql += ' AND pr.schedule_id = ?'
      params.push(schedule_id)
    }
    sql += ' ORDER BY pr.created_at DESC'
    const replacements = db.prepare(sql).all(...params)
    res.json({ success: true, data: replacements })
  } catch (error) {
    console.error('Get proctor replacements error:', error)
    res.status(500).json({ success: false, error: '获取监考替换记录失败' })
  }
})

export default router
