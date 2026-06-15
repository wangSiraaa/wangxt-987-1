import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/exam_scheduler.db');
let dbInstance = null;
function getDb() {
    if (!dbInstance) {
        const dataDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        dbInstance = new Database(DB_PATH);
        dbInstance.pragma('journal_mode = WAL');
        dbInstance.pragma('foreign_keys = ON');
        initDatabase(dbInstance);
    }
    return dbInstance;
}
function initDatabase(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('institution', 'exam_admin', 'proctor', 'system')),
      name TEXT NOT NULL,
      phone TEXT,
      institution_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      contact_person TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      address TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skill_levels (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('theory', 'practical')),
      skill_level_id TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 120,
      required_equipment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id)
    );

    CREATE TABLE IF NOT EXISTS exam_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 30,
      equipment TEXT,
      location TEXT,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proctors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      id_card TEXT UNIQUE NOT NULL,
      phone TEXT,
      qualifications TEXT,
      certified_skill_levels TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      name TEXT NOT NULL,
      id_card TEXT NOT NULL,
      phone TEXT,
      gender TEXT CHECK(gender IN ('male', 'female')),
      birth_date TEXT,
      address TEXT,
      photo_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id),
      UNIQUE(institution_id, id_card)
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      skill_level_id TEXT NOT NULL,
      registration_version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'rejected', 'cancelled')),
      payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid', 'refunded')),
      payment_amount REAL DEFAULT 0,
      exam_status TEXT DEFAULT 'not_scheduled' CHECK(exam_status IN ('not_scheduled', 'scheduled', 'absent', 'cheating', 'passed', 'failed')),
      is_frozen INTEGER DEFAULT 0,
      freeze_reason TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (institution_id) REFERENCES institutions(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id)
    );

    CREATE TABLE IF NOT EXISTS registration_versions (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot_data TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      change_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_no TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'success', 'failed', 'refunded')),
      paid_at TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id),
      FOREIGN KEY (institution_id) REFERENCES institutions(id)
    );

    CREATE TABLE IF NOT EXISTS exam_batches (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      skill_level_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'ongoing', 'completed', 'cancelled')),
      total_capacity INTEGER DEFAULT 0,
      registered_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS exam_schedules (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      exam_room_id TEXT NOT NULL,
      proctor_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      skill_level_id TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 30,
      assigned_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'completed')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES exam_batches(id),
      FOREIGN KEY (exam_room_id) REFERENCES exam_rooms(id),
      FOREIGN KEY (proctor_id) REFERENCES proctors(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id)
    );

    CREATE TABLE IF NOT EXISTS exam_snapshots (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      snapshot_type TEXT NOT NULL CHECK(snapshot_type IN ('create', 'update', 'seat_adjust', 'capacity_change')),
      snapshot_data TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      change_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES exam_schedules(id)
    );

    CREATE TABLE IF NOT EXISTS seat_arrangements (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      seat_no TEXT NOT NULL,
      status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned', 'adjusted', 'cancelled')),
      checkin_status TEXT DEFAULT 'pending' CHECK(checkin_status IN ('pending', 'checked_in', 'absent')),
      checkin_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES exam_schedules(id),
      FOREIGN KEY (registration_id) REFERENCES registrations(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      UNIQUE(schedule_id, seat_no)
    );

    CREATE TABLE IF NOT EXISTS seat_adjustments (
      id TEXT PRIMARY KEY,
      seat_arrangement_id TEXT NOT NULL,
      old_schedule_id TEXT NOT NULL,
      new_schedule_id TEXT NOT NULL,
      old_seat_no TEXT NOT NULL,
      new_seat_no TEXT NOT NULL,
      reason TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seat_arrangement_id) REFERENCES seat_arrangements(id)
    );

    CREATE TABLE IF NOT EXISTS checkin_records (
      id TEXT PRIMARY KEY,
      seat_arrangement_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      proctor_id TEXT NOT NULL,
      checkin_time TEXT NOT NULL,
      checkin_method TEXT NOT NULL CHECK(checkin_method IN ('id_card', 'face', 'manual')),
      status TEXT DEFAULT 'success' CHECK(status IN ('success', 'exception')),
      exception_type TEXT,
      exception_remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seat_arrangement_id) REFERENCES seat_arrangements(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (schedule_id) REFERENCES exam_schedules(id),
      FOREIGN KEY (proctor_id) REFERENCES proctors(id)
    );

    CREATE TABLE IF NOT EXISTS exception_audits (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('checkin', 'cheating', 'absent', 'other')),
      registration_id TEXT,
      candidate_id TEXT,
      schedule_id TEXT,
      seat_arrangement_id TEXT,
      reporter_id TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'dismissed')),
      handled_by TEXT,
      handled_at TEXT,
      handling_result TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS makeup_exams (
      id TEXT PRIMARY KEY,
      original_registration_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      skill_level_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'completed')),
      scheduled_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS score_unlocks (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_registrations_institution ON registrations(institution_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_candidate ON registrations(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_subject ON registrations(subject_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
    CREATE INDEX IF NOT EXISTS idx_registrations_payment ON registrations(payment_status);
    CREATE INDEX IF NOT EXISTS idx_registrations_exam ON registrations(exam_status);
    CREATE INDEX IF NOT EXISTS idx_candidates_idcard ON candidates(id_card);
    CREATE INDEX IF NOT EXISTS idx_schedules_batch ON exam_schedules(batch_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_room ON exam_schedules(exam_room_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_date ON exam_schedules(exam_date);
    CREATE INDEX IF NOT EXISTS idx_seats_schedule ON seat_arrangements(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_seats_registration ON seat_arrangements(registration_id);
    CREATE INDEX IF NOT EXISTS idx_checkin_schedule ON checkin_records(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_checkin_candidate ON checkin_records(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exception_audits(status);
    CREATE INDEX IF NOT EXISTS idx_payments_registration ON payment_records(registration_id);
  `);
    seedData();
}
function seedData() {
    const db = getDb();
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count > 0)
        return;
    const salt = bcrypt.genSaltSync(10);
    const defaultPassword = bcrypt.hashSync('123456', salt);
    const insertUser = db.prepare('INSERT INTO users (id, username, password, role, name, phone, institution_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertInstitution = db.prepare('INSERT INTO institutions (id, name, code, contact_person, contact_phone, address) VALUES (?, ?, ?, ?, ?, ?)');
    const insertSkillLevel = db.prepare('INSERT INTO skill_levels (id, code, name, description) VALUES (?, ?, ?, ?)');
    const insertSubject = db.prepare('INSERT INTO subjects (id, code, name, type, skill_level_id, duration_minutes, required_equipment) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertExamRoom = db.prepare('INSERT INTO exam_rooms (id, name, code, capacity, equipment, location, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertProctor = db.prepare('INSERT INTO proctors (id, user_id, name, id_card, phone, qualifications, certified_skill_levels, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertCandidate = db.prepare('INSERT INTO candidates (id, institution_id, name, id_card, phone, gender, birth_date, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertRegistration = db.prepare('INSERT INTO registrations (id, institution_id, candidate_id, subject_id, skill_level_id, registration_version, status, payment_status, payment_amount, exam_status, is_frozen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertPayment = db.prepare('INSERT INTO payment_records (id, registration_id, institution_id, amount, payment_method, transaction_no, status, paid_at, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertBatch = db.prepare('INSERT INTO exam_batches (id, code, name, skill_level_id, subject_id, exam_date, start_time, end_time, status, total_capacity, registered_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const tx = db.transaction(() => {
        const adminId = uuidv4();
        insertUser.run(adminId, 'admin', defaultPassword, 'exam_admin', '系统管理员', '13800000000', null);
        const proctorUserId1 = uuidv4();
        const proctorUserId2 = uuidv4();
        const proctorUserId3 = uuidv4();
        const proctorUserId4 = uuidv4();
        insertUser.run(proctorUserId1, 'proctor1', defaultPassword, 'proctor', '监考老师张', '13900000001', null);
        insertUser.run(proctorUserId2, 'proctor2', defaultPassword, 'proctor', '监考老师李', '13900000002', null);
        insertUser.run(proctorUserId3, 'proctor3', defaultPassword, 'proctor', '监考老师王', '13900000003', null);
        insertUser.run(proctorUserId4, 'proctor4', defaultPassword, 'proctor', '监考老师赵', '13900000004', null);
        const inst1Id = uuidv4();
        const inst2Id = uuidv4();
        const instUserId1 = uuidv4();
        const instUserId2 = uuidv4();
        insertInstitution.run(inst1Id, '华夏职业培训学校', 'HX001', '王校长', '13800000001', '北京市朝阳区建国路88号');
        insertInstitution.run(inst2Id, '东方技能培训中心', 'DF001', '李主任', '13800000002', '上海市浦东新区世纪大道100号');
        insertUser.run(instUserId1, 'inst1', defaultPassword, 'institution', '华夏培训学校', '13800000001', inst1Id);
        insertUser.run(instUserId2, 'inst2', defaultPassword, 'institution', '东方培训中心', '13800000002', inst2Id);
        const level5Id = uuidv4();
        const level4Id = uuidv4();
        const level3Id = uuidv4();
        insertSkillLevel.run(level5Id, 'LV5', '初级工（五级）', '国家职业资格五级');
        insertSkillLevel.run(level4Id, 'LV4', '中级工（四级）', '国家职业资格四级');
        insertSkillLevel.run(level3Id, 'LV3', '高级工（三级）', '国家职业资格三级');
        const elecTheoryId = uuidv4();
        const elecPracticalId = uuidv4();
        const weldTheoryId = uuidv4();
        const weldPracticalId = uuidv4();
        insertSubject.run(elecTheoryId, 'ELEC-TH-04', '电工理论知识', 'theory', level4Id, 120, '电脑、考试系统');
        insertSubject.run(elecPracticalId, 'ELEC-PR-04', '电工实操技能', 'practical', level4Id, 180, '电工操作台、工具、仪表');
        insertSubject.run(weldTheoryId, 'WELD-TH-04', '焊工理论知识', 'theory', level4Id, 120, '电脑、考试系统');
        insertSubject.run(weldPracticalId, 'WELD-PR-04', '焊工实操技能', 'practical', level4Id, 240, '焊接设备、防护用具、材料');
        const room1Id = uuidv4();
        const room2Id = uuidv4();
        const room3Id = uuidv4();
        const room4Id = uuidv4();
        insertExamRoom.run(room1Id, '第一理论考场', 'RM-TH-01', 40, '电脑40台、投影仪、监控系统', '教学楼3层301室', 'available');
        insertExamRoom.run(room2Id, '第二理论考场', 'RM-TH-02', 35, '电脑35台、投影仪、监控系统', '教学楼3层302室', 'available');
        insertExamRoom.run(room3Id, '电工实操考场', 'RM-PR-EL', 20, '电工操作台20套、工具仪表、安全防护', '实训楼1层101室', 'available');
        insertExamRoom.run(room4Id, '焊工实操考场', 'RM-PR-WD', 15, '焊接设备15台、通风系统、防护装备', '实训楼1层102室', 'available');
        const proctor1Id = uuidv4();
        const proctor2Id = uuidv4();
        const proctor3Id = uuidv4();
        const proctor4Id = uuidv4();
        insertProctor.run(proctor1Id, proctorUserId1, '张监考', '110101198001011234', '13900000001', '高级考评员', JSON.stringify([level4Id, level3Id]), 'active');
        insertProctor.run(proctor2Id, proctorUserId2, '李监考', '110101198002022345', '13900000002', '考评员', JSON.stringify([level4Id, level5Id]), 'active');
        insertProctor.run(proctor3Id, proctorUserId3, '王监考', '110101198003033456', '13900000003', '高级考评员', JSON.stringify([level4Id, level3Id, level5Id]), 'active');
        insertProctor.run(proctor4Id, proctorUserId4, '赵监考', '110101198004044567', '13900000004', '考评员', JSON.stringify([level4Id]), 'active');
        const candidates = [
            { name: '张三', idCard: '110101199501010001', phone: '13600000001', gender: 'male', birthDate: '1995-01-01', address: '北京市朝阳区' },
            { name: '李四', idCard: '110101199502020002', phone: '13600000002', gender: 'male', birthDate: '1995-02-02', address: '北京市海淀区' },
            { name: '王五', idCard: '110101199503030003', phone: '13600000003', gender: 'female', birthDate: '1995-03-03', address: '北京市西城区' },
            { name: '赵六', idCard: '110101199504040004', phone: '13600000004', gender: 'male', birthDate: '1995-04-04', address: '北京市东城区' },
            { name: '钱七', idCard: '110101199505050005', phone: '13600000005', gender: 'female', birthDate: '1995-05-05', address: '北京市丰台区' },
            { name: '孙八', idCard: '110101199506060006', phone: '13600000006', gender: 'male', birthDate: '1995-06-06', address: '北京市石景山区' },
            { name: '周九', idCard: '110101199507070007', phone: '13600000007', gender: 'male', birthDate: '1995-07-07', address: '北京市通州区' },
            { name: '吴十', idCard: '110101199508080008', phone: '13600000008', gender: 'female', birthDate: '1995-08-08', address: '北京市顺义区' },
        ];
        const candidateIds = [];
        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            const cid = uuidv4();
            candidateIds.push(cid);
            insertCandidate.run(cid, i < 5 ? inst1Id : inst2Id, c.name, c.idCard, c.phone, c.gender, c.birthDate, c.address);
        }
        const examDate = dayjs().add(7, 'day').format('YYYY-MM-DD');
        const batch1Id = uuidv4();
        const batch2Id = uuidv4();
        insertBatch.run(batch1Id, `BATCH-${dayjs().format('YYYYMM')}-001`, `2024年${dayjs().format('M')}月电工中级理论考试`, level4Id, elecTheoryId, examDate, '09:00', '11:00', 'published', 40, 0);
        insertBatch.run(batch2Id, `BATCH-${dayjs().format('YYYYMM')}-002`, `2024年${dayjs().format('M')}月电工中级实操考试`, level4Id, elecPracticalId, examDate, '14:00', '17:00', 'published', 20, 0);
        for (let i = 0; i < 5; i++) {
            const regId = uuidv4();
            const paid = i < 3;
            insertRegistration.run(regId, inst1Id, candidateIds[i], elecTheoryId, level4Id, 1, paid ? 'paid' : 'pending', paid ? 'paid' : 'unpaid', 200, 'not_scheduled', 0);
            if (paid) {
                insertPayment.run(uuidv4(), regId, inst1Id, 200, 'bank_transfer', `TXN${Date.now()}${i}`, 'success', dayjs().format('YYYY-MM-DD HH:mm:ss'), '报名费');
            }
        }
        for (let i = 5; i < 8; i++) {
            const regId = uuidv4();
            const paid = i < 7;
            insertRegistration.run(regId, inst2Id, candidateIds[i], elecTheoryId, level4Id, 1, paid ? 'paid' : 'pending', paid ? 'paid' : 'unpaid', 200, 'not_scheduled', 0);
            if (paid) {
                insertPayment.run(uuidv4(), regId, inst2Id, 200, 'bank_transfer', `TXN${Date.now()}${i}`, 'success', dayjs().format('YYYY-MM-DD HH:mm:ss'), '报名费');
            }
        }
    });
    tx();
    console.log('Database initialized with sample data');
}
function closeDatabase() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
export { getDb, initDatabase, closeDatabase };
