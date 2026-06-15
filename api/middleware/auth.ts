import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getDb } from '../db/index.js'

const JWT_SECRET = process.env.JWT_SECRET || 'exam-system-secret-key-2024'

interface AuthUser {
  id: string
  username: string
  role: string
  name: string
  institutionId: string | null
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string }
    const db = getDb()
    const user = db.prepare('SELECT id, username, role, name, institution_id FROM users WHERE id = ?').get(decoded.id) as any
    if (!user) {
      res.status(401).json({ success: false, error: '用户不存在' })
      return
    }
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      institutionId: user.institution_id,
    }
    next()
  } catch (err) {
    res.status(403).json({ success: false, error: '认证令牌无效' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未登录' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '权限不足' })
      return
    }
    next()
  }
}

export function generateToken(user: object): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}
