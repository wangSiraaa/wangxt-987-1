import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import fs from 'fs'
import path from 'path'

function initDemoDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      batch_name TEXT,
      exam_room_id TEXT,
      room_name TEXT,
      exam_date TEXT,
      start_time TEXT,
      end_time TEXT,
      capacity INTEGER DEFAULT 30,
      status TEXT DEFAULT 'confirmed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      registration_no TEXT,
      candidate_id TEXT,
      candidate_name TEXT,
      candidate_id_card TEXT,
      institution_id TEXT,
      subject_id TEXT,
      subject_name TEXT,
      skill_level_id TEXT,
      exam_batch_id TEXT,
      schedule_id TEXT,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      amount REAL DEFAULT 0,
      registered_at TEXT,
      paid_at TEXT,
      cancelled_at TEXT,
      cancel_reason TEXT,
      version INTEGER DEFAULT 1,
      exam_status TEXT,
      is_cheating INTEGER DEFAULT 0,
      cheating_notes TEXT,
      cheating_review_id TEXT,
      half_exam_state_id TEXT,
      original_registration_id TEXT,
      is_makeup INTEGER DEFAULT 0,
      disciplinary_record TEXT,
      score REAL,
      score_status TEXT DEFAULT 'normal',
      is_frozen INTEGER DEFAULT 0,
      freeze_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seat_arrangements (
      id TEXT PRIMARY KEY,
      registration_id TEXT,
      schedule_id TEXT,
      seat_no INTEGER,
      row_no INTEGER,
      col_no INTEGER,
      candidate_name TEXT,
      payment_status TEXT,
      is_checked_in INTEGER DEFAULT 0,
      checked_in_at TEXT,
      status TEXT DEFAULT 'assigned',
      is_accessibility INTEGER DEFAULT 0,
      accessibility_type TEXT,
      original_schedule_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deferral_requests (
      id TEXT PRIMARY KEY,
      registration_id TEXT,
      candidate_id TEXT,
      candidate_name TEXT,
      schedule_id TEXT,
      reason TEXT,
      evidence TEXT,
      status TEXT DEFAULT 'pending',
      requested_by TEXT,
      requested_at TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      new_schedule_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS equipment_failures (
      id TEXT PRIMARY KEY,
      schedule_id TEXT,
      room_id TEXT,
      room_name TEXT,
      equipment_type TEXT,
      equipment_no TEXT,
      description TEXT,
      reported_by TEXT,
      reported_at TEXT,
      status TEXT DEFAULT 'reported',
      priority TEXT DEFAULT 'high',
      target_room_id TEXT,
      target_room_name TEXT,
      transfer_schedule_id TEXT,
      transferred_at TEXT,
      resolved_by TEXT,
      resolved_at TEXT,
      resolution_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proctor_conflicts (
      id TEXT PRIMARY KEY,
      schedule_id TEXT,
      proctor_id TEXT,
      proctor_name TEXT,
      candidate_id TEXT,
      candidate_name TEXT,
      conflict_type TEXT,
      relationship TEXT,
      detected_at TEXT,
      detected_by TEXT,
      status TEXT DEFAULT 'pending',
      resolved_by TEXT,
      resolved_at TEXT,
      resolution_notes TEXT,
      replacement_proctor_id TEXT,
      replacement_proctor_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accessibility_arrangements (
      id TEXT PRIMARY KEY,
      registration_id TEXT,
      candidate_id TEXT,
      candidate_name TEXT,
      schedule_id TEXT,
      arrangement_type TEXT,
      description TEXT,
      requirements TEXT,
      seat_no INTEGER,
      remarks TEXT,
      status TEXT DEFAULT 'requested',
      requested_by TEXT,
      requested_at TEXT,
      approved_by TEXT,
      approved_at TEXT,
      completed_by TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS half_exam_states (
      id TEXT PRIMARY KEY,
      registration_id TEXT,
      candidate_id TEXT,
      candidate_name TEXT,
      schedule_id TEXT,
      theory_exam_date TEXT,
      theory_score REAL,
      theory_status TEXT DEFAULT 'pending',
      practical_status TEXT DEFAULT 'pending',
      overall_status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cheating_reviews (
      id TEXT PRIMARY KEY,
      registration_id TEXT,
      candidate_id TEXT,
      candidate_name TEXT,
      schedule_id TEXT,
      report_reason TEXT,
      evidence TEXT,
      reported_by TEXT,
      reported_at TEXT,
      description TEXT,
      initial_freeze INTEGER DEFAULT 1,
      freeze_reason TEXT,
      reviewer_id TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_result TEXT DEFAULT 'pending',
      status TEXT DEFAULT 'pending',
      review_notes TEXT,
      review_remarks TEXT,
      decision_notes TEXT,
      final_decision TEXT,
      penalty TEXT,
      score_unlocked INTEGER DEFAULT 0,
      score_unlock_id TEXT,
      appeal_remark TEXT,
      appeal_evidence TEXT,
      appeal_at TEXT,
      final_reviewed_by TEXT,
      final_review_remarks TEXT,
      final_reviewed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS makeup_inheritances (
      id TEXT PRIMARY KEY,
      original_registration_id TEXT,
      makeup_registration_id TEXT,
      new_registration_id TEXT,
      candidate_id TEXT,
      subject_id TEXT,
      reason TEXT,
      inheritance_type TEXT,
      inherited_fields TEXT,
      has_disciplinary_record INTEGER DEFAULT 0,
      preserves_disciplinary_record INTEGER DEFAULT 1,
      disciplinary_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS score_unlocks (
      id TEXT PRIMARY KEY,
      registration_id TEXT,
      candidate_id TEXT,
      reason TEXT,
      requested_by TEXT,
      status TEXT,
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exam_change_logs (
      id TEXT PRIMARY KEY,
      schedule_id TEXT,
      change_type TEXT,
      registration_id TEXT,
      candidate_id TEXT,
      old_status TEXT,
      new_status TEXT,
      old_value TEXT,
      new_value TEXT,
      change_reason TEXT,
      reason TEXT,
      changed_by TEXT,
      change_time TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

export function getDb() {
  const dataDir = './data'
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  const db = new Database('./data/exam.db')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initDemoDb(db)
  return db
}

export function logStep(scenario: string, step: number, description: string, data?: any) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`【${scenario}】步骤 ${step}: ${description}`)
  console.log(`${'='.repeat(60)}`)
  if (data) {
    console.log(JSON.stringify(data, null, 2))
  }
}

export function logResult(success: boolean, message: string, data?: any) {
  if (success) {
    console.log(`✅ ${message}`)
  } else {
    console.log(`❌ ${message}`)
  }
  if (data) {
    console.log(JSON.stringify(data, null, 2))
  }
}

export function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function createTestSchedule(db: any, batchName: string, roomId: string, examDate: string, capacity: number = 30) {
  const id = uuidv4()
  db.prepare(`
    INSERT INTO schedules (
      id, batch_id, batch_name, exam_room_id, room_name, exam_date,
      start_time, end_time, capacity, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, 'batch-' + Date.now(), batchName, roomId, '考场A-' + roomId.slice(-4), examDate,
    '09:00', '11:00', capacity, 'confirmed', dayjs().toISOString()
  )
  return id
}

export function createTestRegistration(db: any, candidateId: string, scheduleId: string, paymentStatus: string = 'paid', examStatus: string = 'scheduled') {
  const id = uuidv4()
  db.prepare(`
    INSERT INTO registrations (
      id, candidate_id, candidate_name, candidate_id_card, schedule_id,
      subject_id, subject_name, payment_status, exam_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, candidateId, '考生' + candidateId.slice(-4), '1101011990' + Math.floor(Math.random() * 10000000),
    scheduleId, 'sub-001', '计算机基础', paymentStatus, examStatus, dayjs().toISOString()
  )
  return id
}

export function createTestSeatArrangement(db: any, registrationId: string, scheduleId: string, seatNo: number, isCheckedIn: boolean = false) {
  const id = uuidv4()
  db.prepare(`
    INSERT INTO seat_arrangements (
      id, registration_id, schedule_id, seat_no, row_no, col_no,
      is_checked_in, checked_in_at, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, registrationId, scheduleId, seatNo, Math.ceil(seatNo / 6), (seatNo - 1) % 6 + 1,
    isCheckedIn ? 1 : 0, isCheckedIn ? dayjs().toISOString() : null, 'assigned', dayjs().toISOString()
  )
  return id
}

export function queryTable(db: any, tableName: string, where?: string, params?: any[]) {
  const sql = `SELECT * FROM ${tableName} ${where ? 'WHERE ' + where : ''} ORDER BY created_at DESC`
  return db.prepare(sql).all(...(params || []))
}
