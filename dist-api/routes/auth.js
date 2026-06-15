import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
const router = Router();
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ success: false, error: '用户名和密码不能为空' });
            return;
        }
        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            res.status(401).json({ success: false, error: '用户名或密码错误' });
            return;
        }
        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            res.status(401).json({ success: false, error: '用户名或密码错误' });
            return;
        }
        const authUser = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            institutionId: user.institution_id,
        };
        const token = generateToken(authUser);
        res.json({
            success: true,
            data: {
                token,
                user: authUser,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: '登录失败' });
    }
});
router.post('/logout', authenticateToken, (req, res) => {
    res.json({ success: true, message: '登出成功' });
});
router.get('/me', authenticateToken, (req, res) => {
    res.json({
        success: true,
        data: req.user,
    });
});
export default router;
