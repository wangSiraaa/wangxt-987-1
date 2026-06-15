import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { getDb } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
const router = Router();
router.post('/', authenticateToken, requireRole('proctor', 'exam_admin', 'system'), (req, res) => {
    try {
        const { seat_arrangement_id, id_card, checkin_method, exception_type, exception_remark } = req.body;
        if (!seat_arrangement_id) {
            res.status(400).json({ success: false, error: '请选择考生' });
            return;
        }
        const db = getDb();
        const seat = db.prepare(`
      SELECT sa.*, 
             c.name, c.id_card, c.phone,
             r.is_frozen, r.freeze_reason, r.exam_status,
             s.exam_date, s.start_time, s.end_time, s.proctor_id
      FROM seat_arrangements sa
      JOIN candidates c ON sa.candidate_id = c.id
      JOIN registrations r ON sa.registration_id = r.id
      JOIN exam_schedules s ON sa.schedule_id = s.id
      WHERE sa.id = ? AND sa.status != 'cancelled'
    `).get(seat_arrangement_id);
        if (!seat) {
            res.status(404).json({ success: false, error: '座位安排不存在' });
            return;
        }
        if (seat.checkin_status === 'checked_in') {
            res.status(400).json({ success: false, error: '该考生已签到' });
            return;
        }
        if (id_card && seat.id_card !== id_card) {
            res.status(400).json({ success: false, error: '身份证号不匹配' });
            return;
        }
        if (seat.is_frozen === 1) {
            res.status(400).json({ success: false, error: `该考生已被冻结：${seat.freeze_reason}` });
            return;
        }
        const proctor = db.prepare('SELECT id FROM proctors WHERE user_id = ?').get(req.user?.id);
        if (!proctor) {
            res.status(400).json({ success: false, error: '监考信息不存在' });
            return;
        }
        const now = dayjs();
        const examStart = dayjs(`${seat.exam_date} ${seat.start_time}`);
        const examEnd = dayjs(`${seat.exam_date} ${seat.end_time}`);
        const status = exception_type ? 'exception' : 'success';
        if (now.isAfter(examEnd)) {
            res.status(400).json({ success: false, error: '考试已结束，无法签到' });
            return;
        }
        const tx = db.transaction(() => {
            db.prepare(`
        INSERT INTO checkin_records (
          id, seat_arrangement_id, candidate_id, schedule_id, proctor_id,
          checkin_time, checkin_method, status, exception_type, exception_remark, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), seat_arrangement_id, seat.candidate_id, seat.schedule_id, proctor.id, now.format('YYYY-MM-DD HH:mm:ss'), checkin_method || 'manual', status, exception_type, exception_remark, now.format('YYYY-MM-DD HH:mm:ss'));
            db.prepare(`
        UPDATE seat_arrangements 
        SET checkin_status = 'checked_in', checkin_time = ?, updated_at = ? 
        WHERE id = ?
      `).run(now.format('YYYY-MM-DD HH:mm:ss'), now.format('YYYY-MM-DD HH:mm:ss'), seat_arrangement_id);
            if (exception_type === 'cheating') {
                db.prepare(`
          UPDATE registrations 
          SET exam_status = 'cheating', updated_at = ? 
          WHERE id = ?
        `).run(now.format('YYYY-MM-DD HH:mm:ss'), seat.registration_id);
                db.prepare(`
          INSERT INTO exception_audits (
            id, type, registration_id, candidate_id, schedule_id, seat_arrangement_id,
            reporter_id, description, status, created_at, updated_at
          ) VALUES (?, 'cheating', ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).run(uuidv4(), seat.registration_id, seat.candidate_id, seat.schedule_id, seat_arrangement_id, proctor.id, `签到时发现作弊：${exception_remark || '无'}`, now.format('YYYY-MM-DD HH:mm:ss'), now.format('YYYY-MM-DD HH:mm:ss'));
            }
        });
        tx();
        res.json({
            success: true,
            data: {
                checkin_time: now.format('YYYY-MM-DD HH:mm:ss'),
                is_late: now.isAfter(examStart),
                late_minutes: now.isAfter(examStart) ? now.diff(examStart, 'minute') : 0
            }
        });
    }
    catch (error) {
        console.error('Checkin error:', error);
        res.status(500).json({ success: false, error: '签到失败' });
    }
});
router.post('/mark-absent', authenticateToken, requireRole('proctor', 'exam_admin', 'system'), (req, res) => {
    try {
        const { seat_arrangement_ids } = req.body;
        if (!seat_arrangement_ids || !Array.isArray(seat_arrangement_ids) || seat_arrangement_ids.length === 0) {
            res.status(400).json({ success: false, error: '请选择考生' });
            return;
        }
        const db = getDb();
        const proctor = db.prepare('SELECT id FROM proctors WHERE user_id = ?').get(req.user?.id);
        if (!proctor) {
            res.status(400).json({ success: false, error: '监考信息不存在' });
            return;
        }
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const placeholders = seat_arrangement_ids.map(() => '?').join(',');
        const tx = db.transaction(() => {
            seat_arrangement_ids.forEach((id) => {
                const seat = db.prepare(`
          SELECT sa.*, s.exam_date, s.end_time
          FROM seat_arrangements sa
          JOIN exam_schedules s ON sa.schedule_id = s.id
          WHERE sa.id = ? AND sa.status != 'cancelled'
        `).get(id);
                if (seat && seat.checkin_status === 'pending') {
                    db.prepare(`
            UPDATE seat_arrangements 
            SET checkin_status = 'absent', updated_at = ? 
            WHERE id = ?
          `).run(now, id);
                    db.prepare(`
            UPDATE registrations 
            SET exam_status = 'absent', updated_at = ? 
            WHERE id = ?
          `).run(now, seat.registration_id);
                    db.prepare(`
            INSERT INTO exception_audits (
              id, type, registration_id, candidate_id, schedule_id, seat_arrangement_id,
              reporter_id, description, status, created_at, updated_at
            ) VALUES (?, 'absent', ?, ?, ?, ?, ?, '缺考', 'pending', ?, ?)
          `).run(uuidv4(), seat.registration_id, seat.candidate_id, seat.schedule_id, id, proctor.id, now, now);
                }
            });
        });
        tx();
        res.json({ success: true, message: `已标记 ${seat_arrangement_ids.length} 名考生缺考` });
    }
    catch (error) {
        console.error('Mark absent error:', error);
        res.status(500).json({ success: false, error: '标记缺考失败' });
    }
});
router.get('/records/:scheduleId', authenticateToken, (req, res) => {
    try {
        const { scheduleId } = req.params;
        const db = getDb();
        const records = db.prepare(`
      SELECT cr.*,
             c.name as candidate_name, c.id_card,
             sa.seat_no,
             p.name as proctor_name
      FROM checkin_records cr
      JOIN candidates c ON cr.candidate_id = c.id
      JOIN seat_arrangements sa ON cr.seat_arrangement_id = sa.id
      JOIN proctors p ON cr.proctor_id = p.id
      WHERE cr.schedule_id = ?
      ORDER BY cr.checkin_time DESC
    `).all(scheduleId);
        const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN checkin_status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
        SUM(CASE WHEN checkin_status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN checkin_status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM seat_arrangements
      WHERE schedule_id = ? AND status != 'cancelled'
    `).get(scheduleId);
        res.json({ success: true, data: { records, stats } });
    }
    catch (error) {
        console.error('Get checkin records error:', error);
        res.status(500).json({ success: false, error: '获取签到记录失败' });
    }
});
router.post('/exception', authenticateToken, (req, res) => {
    try {
        const { type, registration_id, candidate_id, schedule_id, seat_arrangement_id, description, evidence } = req.body;
        if (!type || !description) {
            res.status(400).json({ success: false, error: '异常类型和描述不能为空' });
            return;
        }
        const validTypes = ['checkin', 'cheating', 'absent', 'other'];
        if (!validTypes.includes(type)) {
            res.status(400).json({ success: false, error: '无效的异常类型' });
            return;
        }
        const db = getDb();
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const id = uuidv4();
        const reporterId = req.user?.role === 'proctor'
            ? db.prepare('SELECT id FROM proctors WHERE user_id = ?').get(req.user?.id)?.id
            : req.user?.id;
        db.prepare(`
      INSERT INTO exception_audits (
        id, type, registration_id, candidate_id, schedule_id, seat_arrangement_id,
        reporter_id, description, evidence, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, type, registration_id, candidate_id, schedule_id, seat_arrangement_id, reporterId, description, evidence, now, now);
        if (type === 'cheating' && registration_id) {
            db.prepare(`
        UPDATE registrations 
        SET is_frozen = 1, freeze_reason = ?, updated_at = ? 
        WHERE id = ?
      `).run('作弊待处理', now, registration_id);
        }
        res.json({ success: true, data: { id } });
    }
    catch (error) {
        console.error('Create exception error:', error);
        res.status(500).json({ success: false, error: '登记异常失败' });
    }
});
router.get('/exceptions', authenticateToken, (req, res) => {
    try {
        const { status, type, candidate_id } = req.query;
        const db = getDb();
        let sql = `
      SELECT e.*,
             c.name as candidate_name, c.id_card,
             r.payment_status, r.exam_status, r.is_frozen,
             u.name as reporter_name
      FROM exception_audits e
      LEFT JOIN candidates c ON e.candidate_id = c.id
      LEFT JOIN registrations r ON e.registration_id = r.id
      LEFT JOIN users u ON e.reporter_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (status) {
            sql += ' AND e.status = ?';
            params.push(status);
        }
        if (type) {
            sql += ' AND e.type = ?';
            params.push(type);
        }
        if (candidate_id) {
            sql += ' AND e.candidate_id = ?';
            params.push(candidate_id);
        }
        sql += ' ORDER BY e.created_at DESC';
        const exceptions = db.prepare(sql).all(...params);
        res.json({ success: true, data: exceptions });
    }
    catch (error) {
        console.error('Get exceptions error:', error);
        res.status(500).json({ success: false, error: '获取异常列表失败' });
    }
});
router.put('/exceptions/:id/handle', authenticateToken, requireRole('exam_admin', 'system'), (req, res) => {
    try {
        const { id } = req.params;
        const { status, handling_result, should_freeze } = req.body;
        if (!status) {
            res.status(400).json({ success: false, error: '请选择处理结果' });
            return;
        }
        const validStatuses = ['confirmed', 'dismissed'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ success: false, error: '无效的状态' });
            return;
        }
        const db = getDb();
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const exception = db.prepare('SELECT * FROM exception_audits WHERE id = ?').get(id);
        if (!exception) {
            res.status(404).json({ success: false, error: '异常记录不存在' });
            return;
        }
        const tx = db.transaction(() => {
            db.prepare(`
        UPDATE exception_audits 
        SET status = ?, handled_by = ?, handled_at = ?, handling_result = ?, updated_at = ?
        WHERE id = ?
      `).run(status, req.user?.id, now, handling_result, now, id);
            if (exception.registration_id) {
                if (status === 'confirmed' && should_freeze) {
                    db.prepare(`
            UPDATE registrations 
            SET is_frozen = 1, freeze_reason = ?, updated_at = ? 
            WHERE id = ?
          `).run(handling_result || '异常处理冻结', now, exception.registration_id);
                }
                else if (status === 'dismissed') {
                    db.prepare(`
            UPDATE registrations 
            SET is_frozen = 0, freeze_reason = NULL, updated_at = ? 
            WHERE id = ? AND freeze_reason = '作弊待处理'
          `).run(now, exception.registration_id);
                }
            }
        });
        tx();
        res.json({ success: true, message: '处理完成' });
    }
    catch (error) {
        console.error('Handle exception error:', error);
        res.status(500).json({ success: false, error: '处理失败' });
    }
});
router.post('/makeup', authenticateToken, requireRole('exam_admin', 'system'), (req, res) => {
    try {
        const { registration_id, reason } = req.body;
        if (!registration_id || !reason) {
            res.status(400).json({ success: false, error: '报名ID和补考原因不能为空' });
            return;
        }
        const db = getDb();
        const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
        if (!registration) {
            res.status(404).json({ success: false, error: '报名记录不存在' });
            return;
        }
        const existing = db.prepare(`
      SELECT id FROM makeup_exams 
      WHERE original_registration_id = ? AND status IN ('pending', 'scheduled')
    `).get(registration_id);
        if (existing) {
            res.status(400).json({ success: false, error: '该考生已有待处理的补考申请' });
            return;
        }
        const id = uuidv4();
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        db.prepare(`
      INSERT INTO makeup_exams (
        id, original_registration_id, candidate_id, subject_id, skill_level_id,
        reason, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, registration_id, registration.candidate_id, registration.subject_id, registration.skill_level_id, reason, now);
        res.json({ success: true, data: { id } });
    }
    catch (error) {
        console.error('Create makeup exam error:', error);
        res.status(500).json({ success: false, error: '创建补考申请失败' });
    }
});
router.get('/makeups', authenticateToken, (req, res) => {
    try {
        const { status } = req.query;
        const db = getDb();
        let sql = `
      SELECT m.*,
             c.name as candidate_name, c.id_card,
             s.name as subject_name,
             sl.name as skill_level_name,
             r.exam_status as original_exam_status
      FROM makeup_exams m
      JOIN candidates c ON m.candidate_id = c.id
      JOIN subjects s ON m.subject_id = s.id
      JOIN skill_levels sl ON m.skill_level_id = sl.id
      JOIN registrations r ON m.original_registration_id = r.id
      WHERE 1=1
    `;
        const params = [];
        if (status) {
            sql += ' AND m.status = ?';
            params.push(status);
        }
        sql += ' ORDER BY m.created_at DESC';
        const makeupExams = db.prepare(sql).all(...params);
        res.json({ success: true, data: makeupExams });
    }
    catch (error) {
        console.error('Get makeup exams error:', error);
        res.status(500).json({ success: false, error: '获取补考列表失败' });
    }
});
router.get('/makeup', authenticateToken, (req, res) => {
    try {
        const { status } = req.query;
        const db = getDb();
        let sql = `
      SELECT m.*,
             c.name as candidate_name, c.id_card,
             s.name as subject_name,
             sl.name as skill_level_name,
             r.exam_status as original_exam_status
      FROM makeup_exams m
      JOIN candidates c ON m.candidate_id = c.id
      JOIN subjects s ON m.subject_id = s.id
      JOIN skill_levels sl ON m.skill_level_id = sl.id
      JOIN registrations r ON m.original_registration_id = r.id
      WHERE 1=1
    `;
        const params = [];
        if (status) {
            sql += ' AND m.status = ?';
            params.push(status);
        }
        sql += ' ORDER BY m.created_at DESC';
        const makeupExams = db.prepare(sql).all(...params);
        res.json({ success: true, data: makeupExams });
    }
    catch (error) {
        console.error('Get makeup exams error:', error);
        res.status(500).json({ success: false, error: '获取补考列表失败' });
    }
});
router.post('/score-unlock', authenticateToken, requireRole('exam_admin', 'system'), (req, res) => {
    try {
        const { registration_id, reason } = req.body;
        if (!registration_id || !reason) {
            res.status(400).json({ success: false, error: '报名ID和解锁原因不能为空' });
            return;
        }
        const db = getDb();
        const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
        if (!registration) {
            res.status(404).json({ success: false, error: '报名记录不存在' });
            return;
        }
        const existing = db.prepare(`
      SELECT id FROM score_unlocks 
      WHERE registration_id = ? AND status = 'pending'
    `).get(registration_id);
        if (existing) {
            res.status(400).json({ success: false, error: '该考生已有待处理的成绩解锁申请' });
            return;
        }
        const id = uuidv4();
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        db.prepare(`
      INSERT INTO score_unlocks (
        id, registration_id, candidate_id, reason, requested_by, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, registration_id, registration.candidate_id, reason, req.user?.id, now);
        res.json({ success: true, data: { id } });
    }
    catch (error) {
        console.error('Create score unlock error:', error);
        res.status(500).json({ success: false, error: '创建成绩解锁申请失败' });
    }
});
router.get('/score-unlocks', authenticateToken, requireRole('exam_admin', 'system'), (req, res) => {
    try {
        const { status } = req.query;
        const db = getDb();
        let sql = `
      SELECT su.*,
             c.name as candidate_name, c.id_card,
             s.name as subject_name,
             sl.name as skill_level_name,
             r.exam_status,
             ru.name as requester_name
      FROM score_unlocks su
      JOIN candidates c ON su.candidate_id = c.id
      JOIN registrations r ON su.registration_id = r.id
      JOIN subjects s ON r.subject_id = s.id
      JOIN skill_levels sl ON r.skill_level_id = sl.id
      JOIN users ru ON su.requested_by = ru.id
      LEFT JOIN users au ON su.approved_by = au.id
      WHERE 1=1
    `;
        const params = [];
        if (status) {
            sql += ' AND su.status = ?';
            params.push(status);
        }
        sql += ' ORDER BY su.created_at DESC';
        const unlocks = db.prepare(sql).all(...params);
        res.json({ success: true, data: unlocks });
    }
    catch (error) {
        console.error('Get score unlocks error:', error);
        res.status(500).json({ success: false, error: '获取成绩解锁列表失败' });
    }
});
router.put('/score-unlocks/:id/approve', authenticateToken, requireRole('exam_admin', 'system'), (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const unlock = db.prepare('SELECT * FROM score_unlocks WHERE id = ?').get(id);
        if (!unlock) {
            res.status(404).json({ success: false, error: '解锁申请不存在' });
            return;
        }
        if (unlock.status !== 'pending') {
            res.status(400).json({ success: false, error: '该申请已处理' });
            return;
        }
        const tx = db.transaction(() => {
            db.prepare(`
        UPDATE score_unlocks 
        SET status = 'approved', approved_by = ?, approved_at = ?
        WHERE id = ?
      `).run(req.user?.id, now, id);
            db.prepare(`
        UPDATE registrations 
        SET exam_status = 'not_scheduled', updated_at = ? 
        WHERE id = ?
      `).run(now, unlock.registration_id);
        });
        tx();
        res.json({ success: true, message: '已批准成绩解锁' });
    }
    catch (error) {
        console.error('Approve score unlock error:', error);
        res.status(500).json({ success: false, error: '批准失败' });
    }
});
router.get('/master-data', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        const skillLevels = db.prepare('SELECT * FROM skill_levels ORDER BY code').all();
        const subjects = db.prepare(`
      SELECT s.*, sl.name as skill_level_name 
      FROM subjects s
      JOIN skill_levels sl ON s.skill_level_id = sl.id
      ORDER BY s.code
    `).all();
        const examRooms = db.prepare("SELECT * FROM exam_rooms WHERE status = 'available' ORDER BY code").all();
        const proctors = db.prepare(`
      SELECT p.*, u.username
      FROM proctors p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'active'
      ORDER BY p.name
    `).all();
        res.json({
            success: true,
            data: { skillLevels, subjects, examRooms, proctors }
        });
    }
    catch (error) {
        console.error('Get master data error:', error);
        res.status(500).json({ success: false, error: '获取基础数据失败' });
    }
});
export default router;
