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
  candidate_name?: string
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
  exam_status: string
  is_cheating: number
  cheating_notes: string | null
  cheating_review_id: string | null
  half_exam_state_id: string | null
  original_registration_id: string | null
  is_makeup: number
  disciplinary_record: string | null
  score: number | null
  score_status: 'normal' | 'frozen' | 'final' | 'null'
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
  capacity: number
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
  seat_no: number
  candidate_name?: string
  payment_status: string
  is_checked_in: number
  status: 'assigned' | 'checked_in' | 'absent' | 'excused' | 'transferred'
  is_accessibility: number
  accessibility_type: string | null
  original_schedule_id: string | null
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

export interface DeferralRequest {
  id: string
  registration_id: string
  candidate_id: string
  original_schedule_id: string
  reason: string
  evidence: string | null
  requested_by: string
  requested_at: string
  approved_by: string | null
  approved_at: string | null
  status: 'pending' | 'approved' | 'rejected'
  new_schedule_id: string | null
  remarks: string | null
  created_at: string
  updated_at: string
}

export interface EquipmentFailure {
  id: string
  exam_room_id: string
  schedule_id: string | null
  equipment_name: string
  failure_description: string
  reported_by: string
  reported_at: string
  handled_by: string | null
  handled_at: string | null
  resolution: string | null
  status: 'reported' | 'investigating' | 'transferred' | 'resolved' | 'cancelled'
  affected_candidate_count: number
  transfer_to_room_id: string | null
  created_at: string
  updated_at: string
}

export interface ProctorReplacement {
  id: string
  schedule_id: string
  original_proctor_id: string
  new_proctor_id: string
  reason: string
  conflict_type: 'relationship' | 'institution' | 'other'
  related_candidate_id: string | null
  replaced_by: string
  replaced_at: string
  created_at: string
}

export interface ProctorConflict {
  id: string
  proctor_id: string
  proctor_name?: string
  candidate_id: string
  candidate_name?: string
  conflict_type: 'family' | 'colleague' | 'student' | 'institution' | 'other'
  relationship: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface AccessibilityArrangement {
  id: string
  registration_id: string
  candidate_id: string
  candidate_name?: string
  schedule_id: string | null
  arrangement_type: 'wheelchair' | 'visual_impairment' | 'hearing_impairment' | 'learning_disability' | 'extra_time' | 'reader' | 'scribe' | 'other'
  description: string | null
  requirements: string | null
  seat_no: string | null
  remarks: string | null
  equipment_required: string | null
  extra_time_minutes: number
  status: 'requested' | 'approved' | 'provided' | 'completed' | 'pending' | 'scheduled' | 'cancelled'
  requested_by: string
  requested_at: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface MakeupInheritance {
  id: string
  original_registration_id: string
  makeup_registration_id: string
  new_registration_id?: string
  candidate_id: string
  subject_id: string
  reason: 'deferral' | 'absent' | 'failed' | 'equipment_failure' | 'other' | string
  inheritance_type?: 'deferral' | 'absence' | 'failure' | 'other'
  inherited_fields: string
  has_disciplinary_record: number
  preserves_disciplinary_record?: number | boolean
  disciplinary_notes: string | null
  created_at: string
}

export interface HalfExamState {
  id: string
  registration_id: string
  candidate_id: string
  candidate_name?: string
  subject_id: string
  schedule_id: string
  theory_exam_status: 'not_started' | 'in_progress' | 'completed' | 'absent' | 'cheating'
  theory_status: 'completed' | 'absent' | 'cheating'
  theory_score: number | null
  theory_exam_date: string
  practical_exam_status: 'not_started' | 'in_progress' | 'completed' | 'absent' | 'cheating' | 'deferred'
  practical_status: 'pending' | 'completed' | 'absent' | 'cheating'
  practical_score: number | null
  practical_exam_date: string | null
  practical_schedule_id: string | null
  overall_status: 'theory_done' | 'practical_pending' | 'both_done' | 'incomplete' | 'in_progress' | 'completed'
  last_updated_by: string
  created_at: string
  updated_at: string
}

export interface CheatingReview {
  id: string
  registration_id: string
  candidate_id: string
  candidate_name?: string
  schedule_id: string
  reported_by: string
  reported_at: string
  description: string
  report_reason?: string
  evidence: string | null
  initial_freeze: number
  freeze_reason: string
  reviewer_id: string | null
  reviewed_by?: string | null
  reviewed_at: string | null
  review_result: 'pending' | 'confirmed_cheating' | 'false_alarm' | 'needs_investigation'
  status?: 'pending' | 'reviewing' | 'sustained' | 'dismissed'
  review_notes: string | null
  review_remarks?: string | null
  decision_notes: string | null
  final_decision: 'unfreeze' | 'maintain_freeze' | 'disqualify' | 'null'
  penalty?: string | null
  score_unlocked?: boolean
  score_unlock_id: string | null
  appeal_remark?: string | null
  appeal_evidence?: string | null
  appeal_at?: string | null
  final_reviewed_by?: string | null
  final_review_remarks?: string | null
  final_reviewed_at?: string | null
  created_at: string
  updated_at: string
}

export interface ExamChangeLog {
  id: string
  schedule_id: string
  change_type: 'seat_adjust' | 'proctor_replace' | 'room_transfer' | 'deferral' | 'accessibility' | 'equipment_failure' | 'late_payment' | 'half_exam' | 'cheating' | 'other'
  registration_id: string | null
  candidate_id: string | null
  old_value: string | null
  new_value: string | null
  reason: string
  changed_by: string
  created_at: string
}
