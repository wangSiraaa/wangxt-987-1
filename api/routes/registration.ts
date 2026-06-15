import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDb } from '../db/index.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { institution_id, status, payment_status, exam_status, subject_id, skill_level_id } = req.query as Record<string, string>
    const db = getDb()
    let sql = `
      SELECT r.*,
             c.name as candidate_name, c.id_card, c.phone,
             i.name as institution_name,
             s.name as subject_name, s.type as subject_type,
             sl.name as skill_level_name
      FROM registrations r
      JOIN candidates c ON r.candidate_id = c.id
      JOIN institutions i ON r.institution_id = i.id
      JOIN subjects s ON r.subject_id = s.id
      JOIN skill_levels sl ON r.skill_level_id = sl.id
      WHERE 1=1
    `
    const params: string[] = []
    if (req.user?.role === 'institution') {
      sql += ' AND r.institution_id = ?'
      params.push(req.user.institutionId!)
    } else if (institution_id) {
      sql += ' AND r.institution_id = ?'
      params.push(institution_id)
    }
    if (status) {
      sql += ' AND r.status = ?'
      params.push(status)
    }
    if (payment_status) {
      sql += ' AND r.payment_status = ?'
      params.push(payment_status)
    }
    if (exam_status) {
      sql += ' AND r.exam_status = ?'
      params.push(exam_status)
    }
    if (subject_id) {
      sql += ' AND r.subject_id = ?'
      params.push(subject_id)
    }
    if (skill_level_id) {
      sql += ' AND r.skill_level_id = ?'
      params.push(skill_level_id)
    }
    sql += ' ORDER BY r.created_at DESC'
    const registrations = db.prepare(sql).all(...params)
    res.json({ success: true, data: registrations })
  } catch (error) {
    console.error('Get registrations error:', error)
    res.status(500).json({ success: false, error: '获取报名列表失败' })
  }
})

router.get('/pending', authenticateToken, requireRole('exam_admin', 'system'), (_req: Request, res: Response): void => {
  try {
    const db = getDb()
    const pending = db.prepare(`
      SELECT r.*,
             c.name as candidate_name, c.id_card, c.phone,
             i.name as institution_name,
             s.name as subject_name, s.type as subject_type,
             sl.name as skill_level_name,
             pr.status as payment_record_status
      FROM registrations r
      JOIN candidates c ON r.candidate_id = c.id
      JOIN institutions i ON r.institution_id = i.id
      JOIN subjects s ON r.subject_id = s.id
      JOIN skill_levels sl ON r.skill_level_id = sl.id
      LEFT JOIN payment_records pr ON pr.registration_id = r.id
      WHERE r.payment_status = 'paid'
        AND r.exam_status = 'not_scheduled'
        AND r.is_frozen = 0
        AND r.status = 'paid'
      ORDER BY r.created_at ASC
    `).all()
    res.json({ success: true, data: pending })
  } catch (error) {
    console.error('Get pending registrations error:', error)
    res.status(500).json({ success: false, error: '获取待分配名单失败' })
  }
})

router.get('/:id', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const db = getDb()
    const registration = db.prepare(`
      SELECT r.*,
             c.name as candidate_name, c.id_card, c.phone, c.gender, c.birth_date,
             i.name as institution_name,
             s.name as subject_name, s.type as subject_type, s.duration_minutes,
             sl.name as skill_level_name
      FROM registrations r
      JOIN candidates c ON r.candidate_id = c.id
      JOIN institutions i ON r.institution_id = i.id
      JOIN subjects s ON r.subject_id = s.id
      JOIN skill_levels sl ON r.skill_level_id = sl.id
      WHERE r.id = ?
    `).get(id) as any
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }
    if (req.user?.role === 'institution' && req.user.institutionId !== registration.institution_id) {
      res.status(403).json({ success: false, error: '只能查看本机构报名' })
      return
    }
    const versions = db.prepare(`
      SELECT * FROM registration_versions
      WHERE registration_id = ?
      ORDER BY version DESC
    `).all(id)
    const payments = db.prepare(`
      SELECT * FROM payment_records
      WHERE registration_id = ?
      ORDER BY created_at DESC
    `).all(id)
    const seatArrangement = db.prepare(`
      SELECT sa.*,
             s.exam_date, s.start_time, s.end_time,
             er.name as room_name, er.code as room_code,
             p.name as proctor_name
      FROM seat_arrangements sa
      JOIN exam_schedules s ON sa.schedule_id = s.id
      JOIN exam_rooms er ON s.exam_room_id = er.id
      JOIN proctors p ON s.proctor_id = p.id
      WHERE sa.registration_id = ? AND sa.status != 'cancelled'
    `).get(id)
    res.json({
      success: true,
      data: {
        ...registration,
        versions,
        payments,
        seat_arrangement: seatArrangement || null,
      }
    })
  } catch (error) {
    console.error('Get registration error:', error)
    res.status(500).json({ success: false, error: '获取报名详情失败' })
  }
})

router.post('/', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { candidate_id, subject_id, skill_level_id, payment_amount, remark } = req.body
    const institutionId = req.user?.institutionId
    if (req.user?.role === 'institution' && !institutionId) {
      res.status(403).json({ success: false, error: '机构用户必须关联机构' })
      return
    }
    if (!candidate_id || !subject_id || !skill_level_id) {
      res.status(400).json({ success: false, error: '必填字段不能为空' })
      return
    }
    const db = getDb()
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ? AND institution_id = ?').get(candidate_id, institutionId)
    if (!candidate) {
      res.status(404).json({ success: false, error: '考生不存在或不属于本机构' })
      return
    }
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subject_id)
    if (!subject) {
      res.status(404).json({ success: false, error: '科目不存在' })
      return
    }
    const existing = db.prepare(`
      SELECT id FROM registrations
      WHERE candidate_id = ? AND subject_id = ? AND skill_level_id = ? AND status != 'cancelled'
    `).get(candidate_id, subject_id, skill_level_id)
    if (existing) {
      res.status(400).json({ success: false, error: '该考生已报考此科目等级' })
      return
    }
    const id = uuidv4()
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO registrations (
          id, institution_id, candidate_id, subject_id, skill_level_id,
          registration_version, status, payment_status, payment_amount,
          exam_status, is_frozen, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, 'pending', 'unpaid', ?, 'not_scheduled', 0, ?, ?, ?)
      `).run(id, institutionId, candidate_id, subject_id, skill_level_id, payment_amount || 200, remark, now, now)
      db.prepare(`
        INSERT INTO registration_versions (
          id, registration_id, version, snapshot_data, changed_by, change_reason, created_at
        ) VALUES (?, ?, 1, ?, ?, '创建报名', ?)
      `).run(uuidv4(), id, JSON.stringify({ candidate_id, subject_id, skill_level_id, payment_amount }), req.user?.id, now)
    })
    tx()
    res.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Create registration error:', error)
    res.status(500).json({ success: false, error: '创建报名失败' })
  }
})

router.post('/:id/pay', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { payment_method, transaction_no, amount } = req.body
    const db = getDb()
    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id) as any
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }
    if (req.user?.role === 'institution' && req.user.institutionId !== registration.institution_id) {
      res.status(403).json({ success: false, error: '只能为本机构报名缴费' })
      return
    }
    if (registration.payment_status === 'paid') {
      res.status(400).json({ success: false, error: '该报名已缴费' })
      return
    }
    if (!payment_method || !transaction_no || !amount) {
      res.status(400).json({ success: false, error: '缴费信息不完整' })
      return
    }
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const paymentId = uuidv4()
    const newVersion = registration.registration_version + 1
    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO payment_records (
          id, registration_id, institution_id, amount, payment_method,
          transaction_no, status, paid_at, remark, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'success', ?, '报名费', ?)
      `).run(paymentId, id, registration.institution_id, amount, payment_method, transaction_no, now, now)
      db.prepare(`
        UPDATE registrations
        SET status = 'paid', payment_status = 'paid', registration_version = ?, updated_at = ?
        WHERE id = ?
      `).run(newVersion, now, id)
      db.prepare(`
        INSERT INTO registration_versions (
          id, registration_id, version, snapshot_data, changed_by, change_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, '缴费完成', ?)
      `).run(uuidv4(), id, newVersion, JSON.stringify({ payment_id: paymentId, amount, payment_method, transaction_no }), req.user?.id, now)
    })
    tx()
    res.json({ success: true, data: { payment_id: paymentId } })
  } catch (error) {
    console.error('Payment error:', error)
    res.status(500).json({ success: false, error: '缴费失败' })
  }
})

router.post('/:id/freeze', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const db = getDb()
    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id) as any
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const newVersion = registration.registration_version + 1
    db.prepare(`
      UPDATE registrations
      SET is_frozen = 1, freeze_reason = ?, registration_version = ?, updated_at = ?
      WHERE id = ?
    `).run(reason || '违规冻结', newVersion, now, id)
    res.json({ success: true, message: '冻结成功' })
  } catch (error) {
    console.error('Freeze registration error:', error)
    res.status(500).json({ success: false, error: '冻结失败' })
  }
})

router.post('/:id/unfreeze', authenticateToken, requireRole('exam_admin', 'system'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const db = getDb()
    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id) as any
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const newVersion = registration.registration_version + 1
    db.prepare(`
      UPDATE registrations
      SET is_frozen = 0, freeze_reason = NULL, registration_version = ?, updated_at = ?
      WHERE id = ?
    `).run(newVersion, now, id)
    res.json({ success: true, message: '解冻成功' })
  } catch (error) {
    console.error('Unfreeze registration error:', error)
    res.status(500).json({ success: false, error: '解冻失败' })
  }
})

router.put('/:id/exam-status', authenticateToken, requireRole('exam_admin', 'system', 'proctor'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { exam_status, remark } = req.body
    const db = getDb()
    const validStatuses = ['not_scheduled', 'scheduled', 'absent', 'cheating', 'passed', 'failed']
    if (!validStatuses.includes(exam_status)) {
      res.status(400).json({ success: false, error: '无效的考试状态' })
      return
    }
    const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id) as any
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const newVersion = registration.registration_version + 1
    db.prepare(`
      UPDATE registrations
      SET exam_status = ?, remark = COALESCE(?, remark), registration_version = ?, updated_at = ?
      WHERE id = ?
    `).run(exam_status, remark, newVersion, now, id)
    res.json({ success: true, message: '状态更新成功' })
  } catch (error) {
    console.error('Update exam status error:', error)
    res.status(500).json({ success: false, error: '状态更新失败' })
  }
})

export default router
