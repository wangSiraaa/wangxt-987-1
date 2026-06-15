/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import institutionRoutes from './routes/institution.js'
import registrationRoutes from './routes/registration.js'
import scheduleRoutes from './routes/schedule.js'
import checkinRoutes from './routes/checkin.js'
import examDayChangesRoutes from './routes/examDayChanges.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/institutions', institutionRoutes)
app.use('/api/registrations', registrationRoutes)
app.use('/api/schedules', scheduleRoutes)
app.use('/api/checkin', checkinRoutes)
app.use('/api/exam-day-changes', examDayChangesRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

const distPath = path.join(process.cwd(), 'dist')
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  console.log('Serving static files from:', distPath)
  app.use(express.static(distPath))
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })
}

app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

export default app
