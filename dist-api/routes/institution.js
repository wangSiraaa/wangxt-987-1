import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { getDb } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
const router = Router();
router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDb();
        if (req.user?.role === 'institution') {
            const institution = db.prepare(`
        SELECT i.*, 
               (SELECT COUNT(*) FROM candidates c WHERE c.institution_id = i.id) as candidate_count,
               (SELECT COUNT(*) FROM registrations r WHERE r.institution_id = i.id) as registration_count
        FROM institutions i
        WHERE i.id = ?
      `).get(req.user.institutionId);
            res.json({ success: true, data: institution ? [institution] : [] });
        }
        else {
            const institutions = db.prepare(`
        SELECT i.*, 
               (SELECT COUNT(*) FROM candidates c WHERE c.institution_id = i.id) as candidate_count,
               (SELECT COUNT(*) FROM registrations r WHERE r.institution_id = i.id) as registration_count
        FROM institutions i
        ORDER BY i.created_at DESC
      `).all();
            res.json({ success: true, data: institutions });
        }
    }
    catch (error) {
        console.error('Get institutions error:', error);
        res.status(500).json({ success: false, error: '获取机构列表失败' });
    }
});
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?.role === 'institution' && req.user.institutionId !== id) {
            res.status(403).json({ success: false, error: '只能查看本机构信息' });
            return;
        }
        const db = getDb();
        const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(id);
        if (!institution) {
            res.status(404).json({ success: false, error: '机构不存在' });
            return;
        }
        res.json({ success: true, data: institution });
    }
    catch (error) {
        console.error('Get institution error:', error);
        res.status(500).json({ success: false, error: '获取机构信息失败' });
    }
});
router.post('/', authenticateToken, requireRole('exam_admin', 'system'), (req, res) => {
    try {
        const { name, code, contact_person, contact_phone, address } = req.body;
        if (!name || !code || !contact_person || !contact_phone) {
            res.status(400).json({ success: false, error: '必填字段不能为空' });
            return;
        }
        const db = getDb();
        const existing = db.prepare('SELECT id FROM institutions WHERE code = ? OR name = ?').get(code, name);
        if (existing) {
            res.status(400).json({ success: false, error: '机构名称或编码已存在' });
            return;
        }
        const id = uuidv4();
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        db.prepare(`
      INSERT INTO institutions (id, name, code, contact_person, contact_phone, address, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(id, name, code, contact_person, contact_phone, address, now, now);
        res.json({ success: true, data: { id, name, code } });
    }
    catch (error) {
        console.error('Create institution error:', error);
        res.status(500).json({ success: false, error: '创建机构失败' });
    }
});
router.get('/:id/candidates', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?.role === 'institution' && req.user.institutionId !== id) {
            res.status(403).json({ success: false, error: '只能查看本机构考生' });
            return;
        }
        const db = getDb();
        const candidates = db.prepare(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM registrations r WHERE r.candidate_id = c.id) as registration_count
      FROM candidates c
      WHERE c.institution_id = ?
      ORDER BY c.created_at DESC
    `).all(id);
        res.json({ success: true, data: candidates });
    }
    catch (error) {
        console.error('Get candidates error:', error);
        res.status(500).json({ success: false, error: '获取考生列表失败' });
    }
});
router.post('/:id/candidates', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?.role === 'institution' && req.user.institutionId !== id) {
            res.status(403).json({ success: false, error: '只能为本机构添加考生' });
            return;
        }
        const { name, id_card, phone, gender, birth_date, address } = req.body;
        if (!name || !id_card) {
            res.status(400).json({ success: false, error: '姓名和身份证号不能为空' });
            return;
        }
        const db = getDb();
        const existing = db.prepare('SELECT id FROM candidates WHERE institution_id = ? AND id_card = ?').get(id, id_card);
        if (existing) {
            res.status(400).json({ success: false, error: '该考生已在本机构存在' });
            return;
        }
        const candidateId = uuidv4();
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        db.prepare(`
      INSERT INTO candidates (id, institution_id, name, id_card, phone, gender, birth_date, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(candidateId, id, name, id_card, phone, gender, birth_date, address, now, now);
        res.json({ success: true, data: { id: candidateId, name, id_card } });
    }
    catch (error) {
        console.error('Create candidate error:', error);
        res.status(500).json({ success: false, error: '添加考生失败' });
    }
});
router.put('/:institutionId/candidates/:candidateId', authenticateToken, (req, res) => {
    try {
        const { institutionId, candidateId } = req.params;
        if (req.user?.role === 'institution' && req.user.institutionId !== institutionId) {
            res.status(403).json({ success: false, error: '只能修改本机构考生' });
            return;
        }
        const { name, id_card, phone, gender, birth_date, address } = req.body;
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const db = getDb();
        const result = db.prepare(`
      UPDATE candidates 
      SET name = ?, id_card = ?, phone = ?, gender = ?, birth_date = ?, address = ?, updated_at = ?
      WHERE id = ? AND institution_id = ?
    `).run(name, id_card, phone, gender, birth_date, address, now, candidateId, institutionId);
        if (result.changes === 0) {
            res.status(404).json({ success: false, error: '考生不存在' });
            return;
        }
        res.json({ success: true, message: '更新成功' });
    }
    catch (error) {
        console.error('Update candidate error:', error);
        res.status(500).json({ success: false, error: '更新考生失败' });
    }
});
router.delete('/:institutionId/candidates/:candidateId', authenticateToken, (req, res) => {
    try {
        const { institutionId, candidateId } = req.params;
        if (req.user?.role === 'institution' && req.user.institutionId !== institutionId) {
            res.status(403).json({ success: false, error: '只能删除本机构考生' });
            return;
        }
        const db = getDb();
        const hasRegistrations = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE candidate_id = ?').get(candidateId);
        if (hasRegistrations.count > 0) {
            res.status(400).json({ success: false, error: '该考生已有报名记录，无法删除' });
            return;
        }
        const result = db.prepare('DELETE FROM candidates WHERE id = ? AND institution_id = ?').run(candidateId, institutionId);
        if (result.changes === 0) {
            res.status(404).json({ success: false, error: '考生不存在' });
            return;
        }
        res.json({ success: true, message: '删除成功' });
    }
    catch (error) {
        console.error('Delete candidate error:', error);
        res.status(500).json({ success: false, error: '删除考生失败' });
    }
});
export default router;
