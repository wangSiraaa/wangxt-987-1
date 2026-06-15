import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDb } from '../db/index.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import scheduleValidator from '../services/scheduleValidator.js'

const router = Router()

router.get('/batches', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { status, skill_level_id, subject_id } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT b.*,
             s.name as subject_name, s.type as subject_type,
             sl.name as skill_level_name,
             (SELECT COUNT(*) FROM exam_schedules sc WHERE sc.batch_id = b.id) as schedule_count
      FROM exam_batches b
      JOIN subjects s ON b.subject_id = s.id
      JOIN skill_levels sl ON b.skill_level_id = sl.id
      WHERE 1=1
    `
    const params: string[] = []
    if (status) {
      sql += ' AND b.status = ?'
      params.push(status)
    }
    if (skill_level_id) {
      sql += ' AND b.skill_level_id = ?'
      params.push(skill_level_id)
    }
    if (subject_id) {
      sql += ' AND b.subject_id = ?'
      params.push(subject_id)
    }
    sql += ' ORDER BY b.exam_date DESC, b.start_time ASC'
    const batches = db.prepare(sql).all(...params)
    res.json({ success: true, data: batches })
  } catch (error) {
    console.error('Get batches error:', error)
    res.status(500).json({ success: false, error: '获取批次列表失败' })
  }
})

router.post('/batches', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { code, name, skill_level_id, subject_id, exam_date, start_time, end_time, total_capacity } = req.body
    if (!code || !name || !skill_level_id || !subject_id || !exam_date || !start_time || !end_time) {
      res.status(400).json({ success: false, error: '必填字段不能为空' })
      return
    }
    const db = getDb()
    const existing = db.prepare('SELECT id FROM exam_batches WHERE code = ?').get(code)
    if (existing) {
      res.status(400).json({ success: false, error: '批次编码已存在' })
      return
    }
    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    db.prepare(`
      INSERT INTO exam_batches (
        id, code, name, skill_level_id, subject_id, exam_date, start_time, end_time,
        status, total_capacity, registered_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0, ?, ?)
    `).run(id, code, name, skill_level_id, subject_id, exam_date, start_time, end_time, total_capacity || 0, now, now)
    res.json({ success: true, data: { id, code, name } })
  } catch (error) {
    console.error('Create batch error:', error)
    res.status(500).json({ success: false, error: '创建批次失败' })
  }
})

router.put('/batches/:id', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { name, exam_date, start_time, end_time, status, total_capacity } = req.body
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const db = getDb()
    const result = db.prepare(`
      UPDATE exam_batches
      SET name = COALESCE(?, name),
          exam_date = COALESCE(?, exam_date),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          status = COALESCE(?, status),
          total_capacity = COALESCE(?, total_capacity),
          updated_at = ?
      WHERE id = ?
    `).run(name, exam_date, start_time, end_time, status, total_capacity, now, id)
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: '批次不存在' })
      return
    }
    res.json({ success: true, message: '更新成功' })
  } catch (error) {
    console.error('Update batch error:', error)
    res.status(500).json({ success: false, error: '更新批次失败' })
  }
})

router.get('/', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { batch_id, exam_room_id, proctor_id, exam_date, status } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT s.*,
             b.name as batch_name, b.code as batch_code,
             er.name as room_name, er.code as room_code, er.capacity as room_capacity, er.location,
             p.name as proctor_name, p.qualifications,
             sub.name as subject_name, sub.type as subject_type,
             sl.name as skill_level_name
      FROM exam_schedules s
      JOIN exam_batches b ON s.batch_id = b.id
      JOIN exam_rooms er ON s.exam_room_id = er.id
      JOIN proctors p ON s.proctor_id = p.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN skill_levels sl ON s.skill_level_id = sl.id
      WHERE 1=1
    `
    const params: string[] = []
    if (batch_id) {
      sql += ' AND s.batch_id = ?'
      params.push(batch_id)
    }
    if (exam_room_id) {
      sql += ' AND s.exam_room_id = ?'
      params.push(exam_room_id)
    }
    if (proctor_id) {
      sql += ' AND s.proctor_id = ?'
      params.push(proctor_id)
    }
    if (exam_date) {
      sql += ' AND s.exam_date = ?'
      params.push(exam_date)
    }
    if (status) {
      sql += ' AND s.status = ?'
      params.push(status)
    }
    sql += ' ORDER BY s.exam_date ASC, s.start_time ASC'
    const schedules = db.prepare(sql).all(...params)
    res.json({ success: true, data: schedules })
  } catch (error) {
    console.error('Get schedules error:', error)
    res.status(500).json({ success: false, error: '获取排考列表失败' })
  }
})

router.get('/:id/today', authenticateToken, requireRole('proctor', 'exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const today = dayjs().format('YYYY-MM-DD')
    const db = getDb()
    const schedules = db.prepare(`
      SELECT s.*,
             b.name as batch_name, b.code as batch_code,
             er.name as room_name, er.code as room_code, er.location,
             p.name as proctor_name,
             sub.name as subject_name, sub.type as subject_type,
             sl.name as skill_level_name
      FROM exam_schedules s
      JOIN exam_batches b ON s.batch_id = b.id
      JOIN exam_rooms er ON s.exam_room_id = er.id
      JOIN proctors p ON s.proctor_id = p.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN skill_levels sl ON s.skill_level_id = sl.id
      WHERE s.exam_date = ? AND s.status = 'confirmed'
        AND (p.user_id = ? OR ? IN ('exam_admin', 'system'))
      ORDER BY s.start_time ASC
    `).all(today, id, req.user?.role)
    res.json({ success: true, data: schedules })
  } catch (error) {
    console.error('Get today schedules error:', error)
    res.status(500).json({ success: false, error: '获取今日考试失败' })
  }
})

router.get('/:id', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const db = getDb()
    const schedule = db.prepare(`
      SELECT s.*,
             b.name as batch_name, b.code as batch_code,
             er.name as room_name, er.code as room_code, er.capacity as room_capacity, er.location, er.equipment,
             p.name as proctor_name, p.qualifications, p.phone as proctor_phone,
             sub.name as subject_name, sub.type as subject_type, sub.duration_minutes, sub.required_equipment,
             sl.name as skill_level_name
      FROM exam_schedules s
      JOIN exam_batches b ON s.batch_id = b.id
      JOIN exam_rooms er ON s.exam_room_id = er.id
      JOIN proctors p ON s.proctor_id = p.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN skill_levels sl ON s.skill_level_id = sl.id
      WHERE s.id = ?
    `).get(id)
    if (!schedule) {
      res.status(404).json({ success: false, error: '排考不存在' })
      return
    }
    const seats = db.prepare(`
      SELECT sa.*,
             c.name as candidate_name, c.id_card, c.phone,
             i.name as institution_name,
             r.payment_status, r.exam_status, r.is_frozen
      FROM seat_arrangements sa
      JOIN candidates c ON sa.candidate_id = c.id
      JOIN institutions i ON c.institution_id = i.id
      JOIN registrations r ON sa.registration_id = r.id
      WHERE sa.schedule_id = ? AND sa.status != 'cancelled'
      ORDER BY CAST(sa.seat_no AS INTEGER) ASC
    `).all(id)
    const snapshots = db.prepare(`
      SELECT * FROM exam_snapshots
      WHERE schedule_id = ?
      ORDER BY created_at DESC
    `).all(id)
    res.json({
      success: true,
      data: Object.assign({}, schedule, {
        seats,
        snapshots,
      })
    })
  } catch (error) {
    console.error('Get schedule error:', error)
    res.status(500).json({ success: false, error: '获取排考详情失败' })
  }
})

router.post('/validate', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const body = req.body
    const registration_ids = body.registration_ids || body.registrationIds
    const rawTarget = body.target || {}
    const target: any = {
      exam_room_id: rawTarget.exam_room_id || rawTarget.examRoom || rawTarget.exam_room,
      exam_date: rawTarget.exam_date || rawTarget.examDate,
      start_time: rawTarget.start_time || rawTarget.examTime || rawTarget.startTime,
      end_time: rawTarget.end_time || rawTarget.endTime,
      subject_id: rawTarget.subject_id || rawTarget.subject,
      skill_level_id: rawTarget.skill_level_id || rawTarget.skill_level || rawTarget.skillLevel,
      proctor_id: rawTarget.proctor_id || rawTarget.proctorId || rawTarget.proctor,
    }
    if (!registration_ids || !target) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }
    const db = getDb()
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
    const result = scheduleValidator.validateAll(candidates, target, body.options || {})
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Validate schedule error:', error)
    res.status(500).json({ success: false, error: '校验失败' })
  }
})

router.post('/', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const body = req.body
    const target: any = {
      batch_id: body.batch_id,
      exam_room_id: body.exam_room_id,
      proctor_id: body.proctor_id,
      subject_id: body.subject_id || body.subject,
      skill_level_id: body.skill_level_id || body.skill_level,
      exam_date: body.exam_date,
      start_time: body.start_time,
      end_time: body.end_time,
      capacity: body.capacity,
    }
    if (!target.batch_id || !target.exam_room_id || !target.proctor_id || !target.subject_id ||
        !target.skill_level_id || !target.exam_date || !target.start_time || !target.end_time || !target.capacity) {
      res.status(400).json({ success: false, error: '必填字段不能为空' })
      return
    }
    const validation = scheduleValidator.validateScheduleCreation(target)
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.errors[0], errors: validation.errors })
      return
    }
    const db = getDb()
    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO exam_schedules (
          id, batch_id, exam_room_id, proctor_id, subject_id, skill_level_id,
          exam_date, start_time, end_time, capacity, assigned_count, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'draft', ?, ?)
      `).run(id, target.batch_id, target.exam_room_id, target.proctor_id, target.subject_id, target.skill_level_id, target.exam_date, target.start_time, target.end_time, target.capacity, now, now)
      db.prepare(`
        INSERT INTO exam_snapshots (
          id, schedule_id, snapshot_type, snapshot_data, changed_by, change_reason, created_at
        ) VALUES (?, ?, 'create', ?, ?, '创建排考', ?)
      `).run(uuidv4(), id, JSON.stringify(target), req.user?.id, now)
    })
    tx()
    res.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Create schedule error:', error)
    res.status(500).json({ success: false, error: '创建排考失败' })
  }
})

router.post('/:id/assign', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { registration_ids } = req.body
    if (!registration_ids || !Array.isArray(registration_ids) || registration_ids.length === 0) {
      res.status(400).json({ success: false, error: '请选择要安排的考生' })
      return
    }
    const db = getDb()
    const schedule = db.prepare('SELECT * FROM exam_schedules WHERE id = ?').get(id) as any
    if (!schedule) {
      res.status(404).json({ success: false, error: '排考不存在' })
      return
    }
    const target = {
      schedule_id: id,
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
    const validation = scheduleValidator.validateAll(candidates, target)
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: '排考校验失败',
        errors: validation.errors,
        warnings: validation.warnings
      })
      return
    }
    const currentSeats = db.prepare(`
      SELECT MAX(CAST(seat_no AS INTEGER)) as max_seat
      FROM seat_arrangements
      WHERE schedule_id = ? AND status != 'cancelled'
    `).get(id) as any
    let nextSeat = (currentSeats?.max_seat || 0) + 1
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const tx = db.transaction(() => {
      candidates.forEach((c: any) => {
        const seatNo = String(nextSeat++)
        db.prepare(`
          INSERT INTO seat_arrangements (
            id, schedule_id, registration_id, candidate_id, seat_no,
            status, checkin_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'assigned', 'pending', ?, ?)
        `).run(uuidv4(), id, c.registration_id, c.candidate_id, seatNo, now, now)
        db.prepare(`
          UPDATE registrations
          SET exam_status = 'scheduled', updated_at = ?
          WHERE id = ?
        `).run(now, c.registration_id)
      })
      db.prepare(`
        UPDATE exam_schedules
        SET assigned_count = assigned_count + ?, status = 'confirmed', updated_at = ?
        WHERE id = ?
      `).run(candidates.length, now, id)
      db.prepare(`
        INSERT INTO exam_snapshots (
          id, schedule_id, snapshot_type, snapshot_data, changed_by, change_reason, created_at
        ) VALUES (?, ?, 'seat_adjust', ?, ?, '安排考生座位', ?)
      `).run(uuidv4(), id, JSON.stringify({ assigned_count: candidates.length, registration_ids }), req.user?.id, now)
    })
    tx()
    res.json({
      success: true,
      data: { assigned_count: candidates.length, warnings: validation.warnings }
    })
  } catch (error) {
    console.error('Assign seats error:', error)
    res.status(500).json({ success: false, error: '安排座位失败' })
  }
})

router.post('/:id/expand', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { new_capacity, reason } = req.body
    if (!new_capacity || new_capacity <= 0) {
      res.status(400).json({ success: false, error: '请输入有效的容量' })
      return
    }
    const db = getDb()
    const schedule = db.prepare('SELECT * FROM exam_schedules WHERE id = ?').get(id) as any
    if (!schedule) {
      res.status(404).json({ success: false, error: '排考不存在' })
      return
    }
    const room = db.prepare('SELECT capacity FROM exam_rooms WHERE id = ?').get(schedule.exam_room_id) as any
    if (new_capacity > room.capacity) {
      res.status(400).json({ success: false, error: `扩容后容量不能超过考场实际容量 ${room.capacity}` })
      return
    }
    if (new_capacity < schedule.assigned_count) {
      res.status(400).json({ success: false, error: `容量不能小于已安排人数 ${schedule.assigned_count}` })
      return
    }
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const oldCapacity = schedule.capacity
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE exam_schedules
        SET capacity = ?, updated_at = ?
        WHERE id = ?
      `).run(new_capacity, now, id)
      db.prepare(`
        INSERT INTO exam_snapshots (
          id, schedule_id, snapshot_type, snapshot_data, changed_by, change_reason, created_at
        ) VALUES (?, ?, 'capacity_change', ?, ?, ?, ?)
      `).run(uuidv4(), id, JSON.stringify({ old_capacity: oldCapacity, new_capacity, reason }), req.user?.id, reason || '考场扩容', now)
    })
    tx()
    res.json({ success: true, message: '扩容成功' })
  } catch (error) {
    console.error('Expand schedule error:', error)
    res.status(500).json({ success: false, error: '扩容失败' })
  }
})

router.post('/seat-adjust', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { seat_arrangement_id, new_schedule_id, new_seat_no, reason } = req.body
    if (!seat_arrangement_id || !new_schedule_id || !new_seat_no) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }
    const db = getDb()
    const oldSeat = db.prepare('SELECT * FROM seat_arrangements WHERE id = ?').get(seat_arrangement_id) as any
    if (!oldSeat) {
      res.status(404).json({ success: false, error: '座位安排不存在' })
      return
    }
    const newSchedule = db.prepare('SELECT * FROM exam_schedules WHERE id = ?').get(new_schedule_id) as any
    if (!newSchedule) {
      res.status(404).json({ success: false, error: '目标排考不存在' })
      return
    }
    const existingSeat = db.prepare(`
      SELECT id FROM seat_arrangements
      WHERE schedule_id = ? AND seat_no = ? AND status != 'cancelled' AND id != ?
    `).get(new_schedule_id, new_seat_no, seat_arrangement_id)
    if (existingSeat) {
      res.status(400).json({ success: false, error: '目标座位号已被占用' })
      return
    }
    const registration = db.prepare(`
      SELECT r.*, c.name, c.id_card, s.name as subject_name, sl.name as skill_level_name
      FROM registrations r
      JOIN candidates c ON r.candidate_id = c.id
      JOIN subjects s ON r.subject_id = s.id
      JOIN skill_levels sl ON r.skill_level_id = sl.id
      WHERE r.id = ?
    `).get(oldSeat.registration_id) as any
    const target = {
      schedule_id: new_schedule_id,
      batch_id: newSchedule.batch_id,
      exam_room_id: newSchedule.exam_room_id,
      proctor_id: newSchedule.proctor_id,
      subject_id: newSchedule.subject_id,
      skill_level_id: newSchedule.skill_level_id,
      exam_date: newSchedule.exam_date,
      start_time: newSchedule.start_time,
      end_time: newSchedule.end_time,
      capacity: newSchedule.capacity,
    }
    const candidate = {
      registration_id: registration.id,
      candidate_id: registration.candidate_id,
      candidate_name: registration.name,
      id_card: registration.id_card,
      subject_id: registration.subject_id,
      subject_name: registration.subject_name,
      subject_type: 'theory' as const,
      skill_level_id: registration.skill_level_id,
      skill_level_name: registration.skill_level_name,
      payment_status: registration.payment_status,
      is_frozen: registration.is_frozen,
      freeze_reason: registration.freeze_reason,
    }
    const validation = scheduleValidator.validateAll([candidate], target, { skipIdCard: true })
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.errors[0], errors: validation.errors })
      return
    }
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO seat_adjustments (
          id, seat_arrangement_id, old_schedule_id, new_schedule_id,
          old_seat_no, new_seat_no, reason, changed_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), seat_arrangement_id, oldSeat.schedule_id, new_schedule_id, oldSeat.seat_no, new_seat_no, reason || '调考', req.user?.id, now)
      db.prepare(`
        UPDATE seat_arrangements
        SET status = 'cancelled', updated_at = ?
        WHERE id = ?
      `).run(now, seat_arrangement_id)
      db.prepare(`
        UPDATE exam_schedules
        SET assigned_count = assigned_count - 1, updated_at = ?
        WHERE id = ?
      `).run(now, oldSeat.schedule_id)
      db.prepare(`
        INSERT INTO seat_arrangements (
          id, schedule_id, registration_id, candidate_id, seat_no,
          status, checkin_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'adjusted', 'pending', ?, ?)
      `).run(uuidv4(), new_schedule_id, oldSeat.registration_id, oldSeat.candidate_id, new_seat_no, now, now)
      db.prepare(`
        UPDATE exam_schedules
        SET assigned_count = assigned_count + 1, updated_at = ?
        WHERE id = ?
      `).run(now, new_schedule_id)
      db.prepare(`
        INSERT INTO exam_snapshots (
          id, schedule_id, snapshot_type, snapshot_data, changed_by, change_reason, created_at
        ) VALUES (?, ?, 'seat_adjust', ?, ?, ?, ?)
      `).run(uuidv4(), new_schedule_id, JSON.stringify({
        action: 'adjust_seat',
        seat_arrangement_id,
        old_schedule_id: oldSeat.schedule_id,
        old_seat_no: oldSeat.seat_no,
        new_seat_no
      }), req.user?.id, reason || '调考', now)
    })
    tx()
    res.json({ success: true, message: '调考成功' })
  } catch (error) {
    console.error('Seat adjust error:', error)
    res.status(500).json({ success: false, error: '调考失败' })
  }
})

export default router
