import { getDb } from '../db/index.js'
import dayjs from 'dayjs'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface CandidateInfo {
  registration_id: string
  candidate_id: string
  candidate_name: string
  id_card: string
  subject_id: string
  subject_name: string
  subject_type: string
  skill_level_id: string
  skill_level_name: string
  payment_status: string
  is_frozen: number
  freeze_reason: string | null
}

interface ScheduleTarget {
  schedule_id?: string
  batch_id: string
  exam_room_id: string
  proctor_id: string
  subject_id: string
  skill_level_id: string
  exam_date: string
  start_time: string
  end_time: string
  capacity: number
}

interface ValidateAllOptions {
  skipPayment?: boolean
  skipIdCard?: boolean
  skipSubject?: boolean
  skipCapacity?: boolean
  skipProctor?: boolean
  skipCrossBatch?: boolean
  skipFrozen?: boolean
  skipDuplicateSeat?: boolean
}

class ScheduleValidator {
  db = getDb()

  validatePayment(candidates: CandidateInfo[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    candidates.forEach((c) => {
      if (c.payment_status !== 'paid') {
        errors.push(`考生 ${c.candidate_name} (${c.id_card}) 尚未缴费，无法安排考试`)
      }
    })
    return { valid: errors.length === 0, errors, warnings }
  }

  validateIdCardDuplicate(candidates: CandidateInfo[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const idCardMap = new Map<string, CandidateInfo[]>()
    candidates.forEach((c) => {
      const existing = idCardMap.get(c.id_card) || []
      existing.push(c)
      idCardMap.set(c.id_card, existing)
    })
    idCardMap.forEach((list, idCard) => {
      if (list.length > 1) {
        const names = list.map((c) => c.candidate_name).join('、')
        errors.push(`身份证号 ${idCard} 存在重复报名：${names}`)
      }
    })
    const checkExistingStmt = this.db.prepare(`
      SELECT r.id, c.name, c.id_card, r.subject_id
      FROM registrations r
      JOIN candidates c ON r.candidate_id = c.id
      WHERE c.id_card = ? AND r.id != ? AND r.exam_status IN ('scheduled', 'not_scheduled')
    `)
    candidates.forEach((c) => {
      const existing = checkExistingStmt.all(c.id_card, c.registration_id) as any[]
      if (existing.length > 0) {
        existing.forEach(() => {
          errors.push(`考生 ${c.candidate_name} (${c.id_card}) 已在其他报名中存在，可能存在重复报考`)
        })
      }
    })
    return { valid: errors.length === 0, errors, warnings }
  }

  validateSubjectConflict(candidates: CandidateInfo[], target: ScheduleTarget, excludeScheduleId?: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const subjectStmt = this.db.prepare('SELECT name, type FROM subjects WHERE id = ?')
    const targetSubject = subjectStmt.get(target.subject_id) as any
    candidates.forEach((c) => {
      if (c.subject_id !== target.subject_id) {
        errors.push(`考生 ${c.candidate_name} 报考科目为 ${c.subject_name}，与目标场次科目 ${targetSubject?.name} 不匹配`)
      }
      if (c.skill_level_id !== target.skill_level_id) {
        const levelStmt = this.db.prepare('SELECT name FROM skill_levels WHERE id = ?')
        const targetLevel = levelStmt.get(target.skill_level_id) as any
        errors.push(`考生 ${c.candidate_name} 报考等级为 ${c.skill_level_name}，与目标场次等级 ${targetLevel?.name} 不匹配`)
      }
    })

    const targetStart = dayjs(`${target.exam_date} ${target.start_time}`)
    const targetEnd = dayjs(`${target.exam_date} ${target.end_time}`)

    const conflictStmt = this.db.prepare(`
      SELECT sa.id, s.id as schedule_id, s.exam_date, s.start_time, s.end_time, sub.name as subject_name, sub.type as subject_type, r.name as room_name
      FROM seat_arrangements sa
      JOIN exam_schedules s ON sa.schedule_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN exam_rooms r ON s.exam_room_id = r.id
      WHERE sa.candidate_id = ?
        AND sa.status != 'cancelled'
        AND s.exam_date = ?
        AND s.status = 'confirmed'
    `)
    candidates.forEach((c) => {
      const conflicts = conflictStmt.all(c.candidate_id, target.exam_date) as any[]
      conflicts.forEach((conflict) => {
        const conflictStart = dayjs(`${conflict.exam_date} ${conflict.start_time}`)
        const conflictEnd = dayjs(`${conflict.exam_date} ${conflict.end_time}`)
        const hasOverlap = targetStart.isBefore(conflictEnd) && targetEnd.isAfter(conflictStart)

        if (hasOverlap && conflict.subject_type === targetSubject?.type) {
          const isSameSchedule = conflict.schedule_id === target.schedule_id
          if (isSameSchedule) {
            errors.push(`考生 ${c.candidate_name} 在目标场次 (${conflict.room_name}) 已有 ${conflict.subject_name} 座位安排，不可重复安排`)
          } else {
            errors.push(`考生 ${c.candidate_name} 在 ${target.exam_date} ${conflict.start_time}-${conflict.end_time} ` +
              `已有 ${conflict.subject_name} (${conflict.room_name}) 考试安排，与目标场次时间完全重叠`)
          }
        }
      })
    })
    return { valid: errors.length === 0, errors, warnings }
  }

  validateRoomCapacity(target: ScheduleTarget, candidates: CandidateInfo[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const currentCountStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM seat_arrangements
      WHERE schedule_id = ? AND status != 'cancelled'
    `)
    const current = currentCountStmt.get(target.schedule_id || '') as any
    const currentCount = current?.count || 0
    if (currentCount + candidates.length > target.capacity) {
      errors.push(`考场容量不足：当前已安排 ${currentCount} 人，新增 ${candidates.length} 人，` +
        `超出容量 ${target.capacity - currentCount - candidates.length} 人`)
    }
    const roomStmt = this.db.prepare(`
      SELECT capacity, equipment FROM exam_rooms WHERE id = ?
    `)
    const room = roomStmt.get(target.exam_room_id) as any
    if (room && target.capacity > room.capacity) {
      errors.push(`安排容量 ${target.capacity} 超过考场实际容量 ${room.capacity}`)
    }
    const subjectStmt = this.db.prepare(`
      SELECT required_equipment, type FROM subjects WHERE id = ?
    `)
    const subject = subjectStmt.get(target.subject_id) as any
    if (subject && room) {
      if (subject.type === 'practical' && !room.equipment) {
        warnings.push('该考场未配置实操设备，请确认是否满足考试要求')
      }
    }
    return { valid: errors.length === 0, errors, warnings }
  }

  validateProctorQualification(target: ScheduleTarget): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const proctorStmt = this.db.prepare(`
      SELECT p.name, p.certified_skill_levels, p.status
      FROM proctors p
      WHERE p.id = ?
    `)
    const proctor = proctorStmt.get(target.proctor_id) as any
    if (!proctor) {
      errors.push('监考老师不存在')
      return { valid: false, errors, warnings }
    }
    if (proctor.status !== 'active') {
      errors.push(`监考老师 ${proctor.name} 状态为非激活，无法监考`)
    }
    try {
      const certifiedLevels = JSON.parse(proctor.certified_skill_levels || '[]')
      if (!certifiedLevels.includes(target.skill_level_id)) {
        const levelStmt = this.db.prepare('SELECT name FROM skill_levels WHERE id = ?')
        const level = levelStmt.get(target.skill_level_id) as any
        errors.push(`监考老师 ${proctor.name} 未取得 ${level?.name} 的监考资质`)
      }
    } catch {
      warnings.push(`监考老师 ${proctor.name} 的资质数据格式异常，请检查`)
    }
    const conflictStmt = this.db.prepare(`
      SELECT s.id, s.exam_date, s.start_time, s.end_time, sub.name as subject_name
      FROM exam_schedules s
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE s.proctor_id = ?
        AND s.exam_date = ?
        AND s.status = 'confirmed'
        AND s.id != COALESCE(?, '')
        AND (
          (s.start_time < ? AND s.end_time > ?) OR
          (s.start_time < ? AND s.end_time > ?) OR
          (s.start_time >= ? AND s.end_time <= ?)
        )
    `)
    const conflicts = conflictStmt.all(target.proctor_id, target.exam_date, target.schedule_id || '', target.end_time, target.start_time, target.end_time, target.start_time, target.start_time, target.end_time) as any[]
    conflicts.forEach((conflict) => {
      errors.push(`监考老师在 ${target.exam_date} ${conflict.start_time}-${conflict.end_time} ` +
        `已有 ${conflict.subject_name} 监考任务，时间冲突`)
    })
    return { valid: errors.length === 0, errors, warnings }
  }

  validateCrossBatchConflict(candidates: CandidateInfo[], target: ScheduleTarget): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const targetStart = dayjs(`${target.exam_date} ${target.start_time}`)
    const targetEnd = dayjs(`${target.exam_date} ${target.end_time}`)
    const stmt = this.db.prepare(`
      SELECT sa.id, s.id as schedule_id, s.exam_date, s.start_time, s.end_time, sub.name as subject_name, b.name as batch_name, r.name as room_name
      FROM seat_arrangements sa
      JOIN exam_schedules s ON sa.schedule_id = s.id
      JOIN exam_batches b ON s.batch_id = b.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN exam_rooms r ON s.exam_room_id = r.id
      WHERE sa.candidate_id = ?
        AND sa.status != 'cancelled'
        AND s.exam_date = ?
        AND s.status = 'confirmed'
    `)
    candidates.forEach((c) => {
      const existing = stmt.all(c.candidate_id, target.exam_date) as any[]
      existing.forEach((e) => {
        const eStart = dayjs(`${e.exam_date} ${e.start_time}`)
        const eEnd = dayjs(`${e.exam_date} ${e.end_time}`)
        const diffMinutes = Math.abs(targetStart.diff(eEnd, 'minute'))
        const isSameSchedule = e.schedule_id === target.schedule_id

        if (!isSameSchedule && diffMinutes < 30 && diffMinutes > 0) {
          warnings.push(`考生 ${c.candidate_name} 在 ${e.batch_name} 结束时间 ${e.end_time} ` +
            `与本场次开始时间间隔不足30分钟，请注意转场时间`)
        }
        if (targetStart.isBefore(eEnd) && targetEnd.isAfter(eStart)) {
          if (isSameSchedule) {
            errors.push(`考生 ${c.candidate_name} 在目标场次 (${e.room_name}) 已有 ${e.subject_name} 座位安排，不可重复安排`)
          } else {
            errors.push(`考生 ${c.candidate_name} 在 ${e.exam_date} ${e.start_time}-${e.end_time} ` +
              `已有 ${e.subject_name} (${e.batch_name}, ${e.room_name}) 考试，与本场次时间完全冲突`)
          }
        }
      })
    })
    return { valid: errors.length === 0, errors, warnings }
  }

  validateCandidateFrozen(candidates: CandidateInfo[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    candidates.forEach((c) => {
      if (c.is_frozen === 1) {
        errors.push(`考生 ${c.candidate_name} (${c.id_card}) 已被冻结，原因：${c.freeze_reason || '未知'}，无法安排考试`)
      }
    })
    return { valid: errors.length === 0, errors, warnings }
  }

  validateDuplicateSeat(candidates: CandidateInfo[], target: ScheduleTarget): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const targetStart = dayjs(`${target.exam_date} ${target.start_time}`)
    const targetEnd = dayjs(`${target.exam_date} ${target.end_time}`)

    const targetScheduleStmt = this.db.prepare(`
      SELECT sa.id, sa.registration_id, sa.candidate_id, sa.seat_no,
             c.name as candidate_name, sub.name as subject_name
      FROM seat_arrangements sa
      JOIN candidates c ON sa.candidate_id = c.id
      JOIN exam_schedules s ON sa.schedule_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE sa.schedule_id = ?
        AND sa.status != 'cancelled'
        AND (sa.registration_id = ? OR sa.candidate_id = ?)
    `)

    const sameTimeStmt = this.db.prepare(`
      SELECT sa.id, sa.registration_id, sa.candidate_id, sa.seat_no,
             s.id as schedule_id, s.exam_date, s.start_time, s.end_time,
             c.name as candidate_name, sub.name as subject_name, r.name as room_name
      FROM seat_arrangements sa
      JOIN candidates c ON sa.candidate_id = c.id
      JOIN exam_schedules s ON sa.schedule_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN exam_rooms r ON s.exam_room_id = r.id
      WHERE sa.status != 'cancelled'
        AND s.exam_date = ?
        AND s.id != ?
        AND (sa.registration_id = ? OR sa.candidate_id = ?)
    `)

    candidates.forEach((c) => {
      const targetConflicts = targetScheduleStmt.all(target.schedule_id || '', c.registration_id, c.candidate_id) as any[]
      targetConflicts.forEach((conflict) => {
        if (conflict.registration_id === c.registration_id) {
          errors.push(`报名 ${c.registration_id} (${c.candidate_name}) 在目标场次中已有座位 ${conflict.seat_no}，不可重复安排`)
        }
        if (conflict.candidate_id === c.candidate_id && conflict.registration_id !== c.registration_id) {
          errors.push(`考生 ${c.candidate_name} 在目标场次中已有座位 ${conflict.seat_no}（报名号 ${conflict.registration_id}），同一考生不可重复安排`)
        }
      })

      const sameTimeConflicts = sameTimeStmt.all(target.exam_date, target.schedule_id || '', c.registration_id, c.candidate_id) as any[]
      sameTimeConflicts.forEach((conflict) => {
        const conflictStart = dayjs(`${conflict.exam_date} ${conflict.start_time}`)
        const conflictEnd = dayjs(`${conflict.exam_date} ${conflict.end_time}`)
        const hasOverlap = targetStart.isBefore(conflictEnd) && targetEnd.isAfter(conflictStart)

        if (hasOverlap) {
          if (conflict.registration_id === c.registration_id) {
            errors.push(`报名 ${c.registration_id} (${c.candidate_name}) 在 ${conflict.exam_date} ${conflict.start_time}-${conflict.end_time} ` +
              `已有 ${conflict.subject_name} (${conflict.room_name} 座位 ${conflict.seat_no}) 考试安排，时间重叠，不可重复安排`)
          }
          if (conflict.candidate_id === c.candidate_id && conflict.registration_id !== c.registration_id) {
            errors.push(`考生 ${c.candidate_name} 在 ${conflict.exam_date} ${conflict.start_time}-${conflict.end_time} ` +
              `已有 ${conflict.subject_name} (${conflict.room_name} 座位 ${conflict.seat_no}) 考试安排，时间重叠，不可重复安排`)
          }
        }
      })
    })

    const regIdMap = new Map<string, number>()
    const candIdMap = new Map<string, number>()
    candidates.forEach((c) => {
      regIdMap.set(c.registration_id, (regIdMap.get(c.registration_id) || 0) + 1)
      candIdMap.set(c.candidate_id, (candIdMap.get(c.candidate_id) || 0) + 1)
    })
    regIdMap.forEach((count, regId) => {
      if (count > 1) {
        const c = candidates.find(x => x.registration_id === regId)!
        errors.push(`本次分配中报名 ${regId} (${c.candidate_name}) 被重复选择 ${count} 次`)
      }
    })
    candIdMap.forEach((count, candId) => {
      if (count > 1) {
        const c = candidates.find(x => x.candidate_id === candId)!
        errors.push(`本次分配中考生 ${c.candidate_name} (${candId}) 被重复选择 ${count} 次`)
      }
    })

    return { valid: errors.length === 0, errors, warnings }
  }

  validateAll(candidates: CandidateInfo[], target: ScheduleTarget, options: ValidateAllOptions = {}): ValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []
    const validators = [
      { name: 'payment', fn: () => this.validatePayment(candidates), skip: options.skipPayment },
      { name: 'idCard', fn: () => this.validateIdCardDuplicate(candidates), skip: options.skipIdCard },
      { name: 'subject', fn: () => this.validateSubjectConflict(candidates, target), skip: options.skipSubject },
      { name: 'capacity', fn: () => this.validateRoomCapacity(target, candidates), skip: options.skipCapacity },
      { name: 'proctor', fn: () => this.validateProctorQualification(target), skip: options.skipProctor },
      { name: 'crossBatch', fn: () => this.validateCrossBatchConflict(candidates, target), skip: options.skipCrossBatch },
      { name: 'frozen', fn: () => this.validateCandidateFrozen(candidates), skip: options.skipFrozen },
      { name: 'duplicateSeat', fn: () => this.validateDuplicateSeat(candidates, target), skip: options.skipDuplicateSeat },
    ]
    validators.forEach(({ name, fn, skip }) => {
      if (!skip) {
        const result = fn()
        allErrors.push(...result.errors.map((e) => `[${name}] ${e}`))
        allWarnings.push(...result.warnings.map((w) => `[${name}] ${w}`))
      }
    })
    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    }
  }

  validateScheduleCreation(target: ScheduleTarget): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const roomStmt = this.db.prepare('SELECT status FROM exam_rooms WHERE id = ?')
    const room = roomStmt.get(target.exam_room_id) as any
    if (!room) {
      errors.push('考场不存在')
    } else if (room.status !== 'available') {
      errors.push(`考场状态为 ${room.status}，不可用于安排考试`)
    }
    const proctorResult = this.validateProctorQualification(target)
    errors.push(...proctorResult.errors)
    warnings.push(...proctorResult.warnings)
    const roomConflictStmt = this.db.prepare(`
      SELECT s.id, s.start_time, s.end_time, sub.name as subject_name
      FROM exam_schedules s
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE s.exam_room_id = ?
        AND s.exam_date = ?
        AND s.status = 'confirmed'
        AND s.id != COALESCE(?, '')
        AND (
          (s.start_time < ? AND s.end_time > ?) OR
          (s.start_time < ? AND s.end_time > ?) OR
          (s.start_time >= ? AND s.end_time <= ?)
        )
    `)
    const roomConflicts = roomConflictStmt.all(target.exam_room_id, target.exam_date, target.schedule_id || '', target.end_time, target.start_time, target.end_time, target.start_time, target.start_time, target.end_time) as any[]
    roomConflicts.forEach((conflict) => {
      errors.push(`该考场在 ${target.exam_date} ${conflict.start_time}-${conflict.end_time} ` +
        `已有 ${conflict.subject_name} 考试安排，时间冲突`)
    })
    return { valid: errors.length === 0, errors, warnings }
  }
}

export default new ScheduleValidator()
