import jwt from 'jsonwebtoken';
import { getDb } from '../db/index.js';
const JWT_SECRET = process.env.JWT_SECRET || 'exam-system-secret-key-2024';
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        res.status(401).json({ success: false, error: '未提供认证令牌' });
        return;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const db = getDb();
        const user = db.prepare('SELECT id, username, role, name, institution_id FROM users WHERE id = ?').get(decoded.id);
        if (!user) {
            res.status(401).json({ success: false, error: '用户不存在' });
            return;
        }
        req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            institutionId: user.institution_id,
        };
        next();
    }
    catch (err) {
        res.status(403).json({ success: false, error: '认证令牌无效' });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: '未登录' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ success: false, error: '权限不足' });
            return;
        }
        next();
    };
}
export function generateToken(user) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}
