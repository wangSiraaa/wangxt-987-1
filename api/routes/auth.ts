import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../db/index.js'
import { generateToken, authenticateToken } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' })
      return
    }
    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any
    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }
    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }
    const token = generateToken({ id: user.id, username: user.username, role: user.role })
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          phone: user.phone,
          institution_id: user.institution_id,
        },
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.get('/me', authenticateToken, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const user = db.prepare('SELECT id, username, role, name, phone, institution_id FROM users WHERE id = ?').get((req as any).user?.id) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        phone: user.phone,
        institution_id: user.institution_id,
      },
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

export default router
