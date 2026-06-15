export interface User {
  id: string
  username: string
  password_hash: string
  real_name: string
  role: 'admin' | 'institution' | 'proctor' | 'candidate'
  institution_id: string | null
  phone: string | null
  email: string | null
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

export interface Institution {
  id: string
  name: string
  code: string
  contact_person: string
  contact_phone: string
  address: string | null
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

export interface SkillLevel {
  id: string
  code: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
}

export interface Subject {
  id: string
  code: string
  name: string
  category: 'theory' | 'practical'
  skill_level_id: string
  duration_minutes: number
  passing_score: number
  description: string | null
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

export interface ExamRoom {
  id: string
  name: string
  code: string
  room_type: 'theory' | 'practical'
  capacity: number
  location: string | null
  equipment_info: string | null
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

export interface Proctor {
  id: string
  user_id: string
  name: string
  phone: string | null
  certified_skill_levels: string
  institution_id: string | null
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

export interface Candidate {
  id: string
  user_id: string
  name: string
  id_card: string
  phone: string | null
  institution_id: string
  skill_level_id: string
  photo_url: string | null
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

export interface Registration {
  id: string
  registration_no: string
  candidate_id: string
  institution_id: string
  subject_id: string
  skill_level_id: string
  exam_batch_id: string | null
  status: 'pending' | 'paid' | 'scheduled' | 'checked_in' | 'exam_completed' | 'scored' | 'cancelled'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  amount: number
  registered_at: string
  paid_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface RegistrationVersion {
  id: string
  registration_id: string
  version: number
  snapshot: string
  changed_by: string
  change_reason: string | null
  created_at: string
}

export interface PaymentRecord {
  id: string
  registration_id: string
  payment_no: string
  amount: number
  payment_method: 'online' | 'offline' | 'transfer'
  payment_status: 'pending' | 'success' | 'failed' | 'refunded'
  transaction_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface ExamBatch {
  id: string
  batch_name: string
  batch_code: string
  start_date: string
  end_date: string
  registration_deadline: string
  status: 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
  description: string | null
  created_at: string
  updated_at: string
}

export interface ExamSchedule {
  id: string
  exam_batch_id: string
  subject_id: string
  exam_room_id: string
  exam_date: string
  start_time: string
  end_time: string
  proctor_ids: string
  max_candidates: number
  registered_count: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface ExamSnapshot {
  id: string
  registration_id: string
  exam_schedule_id: string
  candidate_snapshot: string
  subject_snapshot: string
  room_snapshot: string
  created_at: string
}

export interface SeatArrangement {
  id: string
  exam_schedule_id: string
  registration_id: string
  seat_number: number
  seat_code: string
  status: 'assigned' | 'checked_in' | 'absent' | 'excused'
  assigned_at: string
  updated_at: string
}

export interface SeatAdjustment {
  id: string
  seat_arrangement_id: string
  original_seat_number: number
  new_seat_number: number
  reason: string
  adjusted_by: string
  created_at: string
}

export interface CheckinRecord {
  id: string
  exam_schedule_id: string
  candidate_id: string
  registration_id: string
  checkin_time: string | null
  checkin_method: 'face' | 'id_card' | 'manual'
  checkin_status: 'pending' | 'success' | 'failed'
  verified_by: string | null
  remarks: string | null
  created_at: string
}

export interface ExceptionAudit {
  id: string
  exam_schedule_id: string
  candidate_id: string
  registration_id: string
  exception_type: 'identity_mismatch' | 'late_arrival' | 'equipment_failure' | 'health_issue' | 'other'
  description: string
  status: 'pending' | 'approved' | 'rejected'
  handled_by: string | null
  handle_result: string | null
  created_at: string
  updated_at: string
}

export interface MakeupExam {
  id: string
  original_registration_id: string
  candidate_id: string
  subject_id: string
  reason: string
  approved_by: string | null
  exam_schedule_id: string | null
  status: 'pending' | 'approved' | 'scheduled' | 'completed' | 'rejected'
  created_at: string
  updated_at: string
}

export interface ScoreUnlock {
  id: string
  registration_id: string
  candidate_id: string
  subject_id: string
  original_score: number | null
  unlock_reason: string
  requested_by: string
  approved_by: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}
