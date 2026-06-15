import { create } from 'zustand'
import { api } from '@/lib/api.js'

export interface Institution {
  id: string
  name: string
  code: string
  contact_person: string
  contact_phone: string
  address: string
  status: string
}

export interface Candidate {
  id: string
  name: string
  id_card?: string
  id_number: string
  phone: string
  gender: string
  birth_date?: string
  address?: string
  institution_id: string
  institution_name?: string
  registration_count?: number
  status: string
  created_at?: string
}

export interface Registration {
  id: string
  candidate_id: string
  candidate_name?: string
  candidate_id_number?: string
  candidate_id_card?: string
  institution_id: string
  institution_name?: string
  skill_level: string
  skill_level_name?: string
  subject: string
  subject_name?: string
  status: string
  exam_status: string
  batch_id: string | null
  schedule_id: string | null
  seat_number: string | null
  exam_room: string | null
  exam_date: string | null
  exam_time: string | null
  payment_status: string
  payment_method?: string
  payment_amount?: number
  transaction_no?: string
  frozen: boolean
  freeze_reason: string | null
  created_at: string
}

export interface Batch {
  id: string
  code?: string
  name: string
  skill_level: string
  skill_level_name?: string
  subject: string
  subject_name?: string
  exam_date: string
  start_time?: string
  end_time?: string
  status: string
  total_capacity?: number
  registration_count: number
  schedule_count?: number
  created_at: string
}

export interface Schedule {
  id: string
  batch_id: string
  batch_name?: string
  exam_room: string
  exam_room_id?: string
  room_name?: string
  subject_id?: string
  subject?: string
  subject_name?: string
  skill_level_id?: string
  skill_level?: string
  skill_level_name?: string
  exam_date: string
  exam_time: string
  start_time?: string
  end_time?: string
  capacity: number
  registered_count: number
  assigned_count?: number
  status: string
  proctor_id: string | null
  proctor_name?: string
}

export interface ScheduleDetail extends Schedule {
  registrations: Registration[]
}

export interface ExamException {
  id: string
  registration_id: string
  candidate_name?: string
  type: string
  description: string
  status: string
  result: string | null
  handler_id: string | null
  handler_name?: string
  created_at: string
  handled_at: string | null
}

export interface MakeupExam {
  id: string
  registration_id: string
  candidate_name?: string
  reason: string
  status: string
  schedule_id: string | null
  created_at: string
}

export interface ScoreUnlock {
  id: string
  registration_id: string
  candidate_name?: string
  reason: string
  status: string
  approver_id: string | null
  approver_name?: string
  created_at: string
  approved_at: string | null
}

export interface CheckinRecord {
  id: string
  registration_id: string
  candidate_name?: string
  schedule_id: string
  checkin_time: string
  checkin_type: string
  status: string
}

export interface DeferralRequest {
  id: string
  registration_id: string
  candidate_id: string
  candidate_name?: string
  original_schedule_id: string
  original_schedule_name?: string
  reason: string
  evidence: string | null
  requested_by: string
  requested_at: string
  approved_by: string | null
  approved_at: string | null
  status: 'pending' | 'approved' | 'rejected'
  new_schedule_id: string | null
  remarks: string | null
}

export interface EquipmentFailure {
  id: string
  schedule_id: string
  schedule_name?: string
  room_id: string
  room_name?: string
  equipment_type: string
  description: string
  reported_by: string
  reported_at: string
  status: 'reported' | 'confirmed' | 'transferred' | 'resolved'
  transfer_to_room_id: string | null
  transfer_to_room_name?: string
  transferred_at: string | null
  resolved_at: string | null
  resolved_by: string | null
  remarks: string | null
}

export interface ProctorReplacement {
  id: string
  schedule_id: string
  schedule_name?: string
  original_proctor_id: string
  original_proctor_name?: string
  new_proctor_id: string
  new_proctor_name?: string
  reason: string
  conflict_type?: string
  replaced_by: string
  replaced_at: string
}

export interface ProctorConflict {
  id: string
  proctor_id: string
  proctor_name?: string
  candidate_id: string
  candidate_name?: string
  conflict_type: 'family' | 'colleague' | 'institution' | 'other'
  relationship: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface ProctorConflictCheckResult {
  hasConflict: boolean
  conflictType?: 'existing_relationship' | 'schedule_conflict'
  message?: string
  schedules?: any[]
}

export interface AccessibilityArrangement {
  id: string
  schedule_id: string | null
  registration_id: string
  candidate_id: string
  candidate_name?: string
  arrangement_type: 'wheelchair' | 'visual_impairment' | 'hearing_impairment' | 'learning_disability' | 'extra_time' | 'reader' | 'scribe' | 'other'
  description: string | null
  requirements: string | null
  seat_no: string | null
  remarks: string | null
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'requested' | 'approved' | 'provided'
  requested_by: string
  requested_at: string
  approved_by: string | null
  approved_at: string | null
  equipment_required: string | null
  extra_time_minutes: number
  created_at: string
  updated_at: string
}

export interface CheatingReview {
  id: string
  registration_id: string
  candidate_id: string
  candidate_name?: string
  schedule_id: string
  schedule_name?: string
  report_reason: string
  evidence: string | null
  reported_by: string
  reported_at: string
  status: 'pending' | 'reviewing' | 'sustained' | 'dismissed'
  review_notes: string | null
  review_remarks?: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  penalty: string | null
  score_unlocked: boolean
}

export interface HalfExamState {
  id: string
  registration_id: string
  candidate_id: string
  candidate_name?: string
  schedule_id: string
  theory_exam_date: string
  theory_score: number | null
  theory_status: 'completed' | 'absent' | 'cheating'
  practical_schedule_id: string | null
  practical_exam_date: string | null
  practical_status: 'pending' | 'completed' | 'absent' | 'cheating'
  practical_score: number | null
  overall_status: 'theory_done' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface MakeupInheritance {
  id: string
  original_registration_id: string
  makeup_registration_id: string
  candidate_id: string
  candidate_name?: string
  reason: string
  inheritance_type: 'deferral' | 'absence' | 'failure' | 'other'
  preserves_disciplinary_record: boolean
  disciplinary_notes: string | null
  created_at: string
}

export interface ExamChangeLog {
  id: string
  schedule_id: string
  schedule_name?: string
  change_type: string
  registration_id: string | null
  candidate_id: string | null
  candidate_name?: string
  old_value: string | null
  new_value: string | null
  reason: string
  changed_by: string
  created_at: string
}

export interface MasterData {
  skillLevels: { value: string; label: string }[]
  subjects: { value: string; label: string }[]
  examRooms: { id: string; name: string; capacity: number }[]
  proctors: { id: string; name: string; phone: string }[]
}

interface DataState {
  institutions: Institution[]
  candidates: Candidate[]
  registrations: Registration[]
  pendingRegistrations: Registration[]
  batches: Batch[]
  schedules: Schedule[]
  scheduleDetail: ScheduleDetail | null
  exceptions: ExamException[]
  makeupExams: MakeupExam[]
  scoreUnlocks: ScoreUnlock[]
  masterData: MasterData
  checkinRecords: CheckinRecord[]
  checkinStats: { total: number; checkedIn: number; absent: number } | null
  deferralRequests: DeferralRequest[]
  equipmentFailures: EquipmentFailure[]
  proctorReplacements: ProctorReplacement[]
  proctorConflicts: ProctorConflict[]
  accessibilityArrangements: AccessibilityArrangement[]
  cheatingReviews: CheatingReview[]
  halfExamStates: HalfExamState[]
  makeupInheritances: MakeupInheritance[]
  examChangeLogs: ExamChangeLog[]
  loading: boolean
  error: string | null

  unlockScore: (id: string, reviewNotes: string, reviewer?: string) => Promise<boolean>

  fetchInstitutions: () => Promise<void>
  fetchCandidates: (instId: string) => Promise<void>
  fetchRegistrations: (filters?: Record<string, string>) => Promise<void>
  fetchPendingRegistrations: () => Promise<void>
  fetchBatches: (filters?: Record<string, string>) => Promise<void>
  fetchSchedules: (filters?: Record<string, string>) => Promise<void>
  fetchTodaySchedules: (proctorUserId: string) => Promise<void>
  fetchScheduleDetail: (id: string) => Promise<ScheduleDetail | null>
  createBatch: (data: Partial<Batch>) => Promise<boolean>
  updateBatch: (id: string, data: Partial<Batch>) => Promise<boolean>
  createSchedule: (data: Partial<Schedule>) => Promise<boolean>
  assignSeats: (scheduleId: string, registrationIds: string[]) => Promise<{ success: boolean; errors?: string[]; warnings?: string[] }>
  expandCapacity: (scheduleId: string, newCapacity: number, reason: string) => Promise<boolean>
  adjustSeat: (data: any) => Promise<boolean>
  validateSchedule: (registrationIds: string[], target: any, options?: any) => Promise<{ valid: boolean; errors: string[]; warnings: string[] } | null>
  fetchExceptions: (filters?: Record<string, string>) => Promise<void>
  handleException: (id: string, status: string, result: string, shouldFreeze: boolean) => Promise<boolean>
  fetchMakeupExams: (filters?: Record<string, string>) => Promise<void>
  createMakeupExam: (regId: string, reason: string) => Promise<boolean>
  fetchScoreUnlocks: (filters?: Record<string, string>) => Promise<void>
  createScoreUnlock: (regId: string, reason: string) => Promise<boolean>
  approveScoreUnlock: (id: string) => Promise<boolean>
  rejectScoreUnlock: (id: string) => Promise<boolean>
  checkin: (data: any) => Promise<boolean>
  markAbsent: (ids: string[]) => Promise<boolean>
  fetchCheckinRecords: (scheduleId: string) => Promise<void>
  registerException: (data: any) => Promise<boolean>
  fetchMasterData: () => Promise<void>
  payRegistration: (id: string, data: Record<string, any>) => Promise<boolean>
  freezeRegistration: (id: string, reason: string) => Promise<boolean>
  unfreezeRegistration: (id: string) => Promise<boolean>
  updateExamStatus: (id: string, status: string, remark: string) => Promise<boolean>
  addCandidate: (instId: string, data: Partial<Candidate>) => Promise<boolean>
  updateCandidate: (instId: string, candidateId: string, data: Partial<Candidate>) => Promise<boolean>
  deleteCandidate: (instId: string, candidateId: string) => Promise<boolean>
  createInstitution: (data: Partial<Institution>) => Promise<boolean>

  latePaymentReschedule: (scheduleId: string, registrationIds: string[], reason: string) => Promise<{ success: boolean; data?: any; errors?: string[]; warnings?: string[] }>
  submitDeferralRequest: (data: Partial<DeferralRequest>) => Promise<boolean>
  approveDeferral: (id: string, newScheduleId: string, remarks: string) => Promise<boolean>
  rejectDeferral: (id: string, remarks: string) => Promise<boolean>
  fetchDeferralRequests: (filters?: Record<string, string>) => Promise<void>
  reportEquipmentFailure: (data: Partial<EquipmentFailure>) => Promise<boolean>
  confirmEquipmentFailure: (id: string) => Promise<boolean>
  transferEquipmentFailure: (id: string, toRoomId: string, reason: string) => Promise<boolean>
  resolveEquipmentFailure: (id: string, remarks: string) => Promise<boolean>
  fetchEquipmentFailures: (filters?: Record<string, string>) => Promise<void>
  replaceProctor: (scheduleId: string, originalProctorId: string, newProctorId: string, reason: string, conflictType?: string) => Promise<boolean>
  recordProctorConflict: (proctorId: string, candidateId: string, conflictType: string, relationship: string) => Promise<boolean>
  deleteProctorConflict: (id: string) => Promise<boolean>
  checkProctorConflict: (proctorId: string, candidateId: string) => Promise<ProctorConflictCheckResult | null>
  fetchProctorConflicts: (filters?: Record<string, string>) => Promise<void>
  fetchProctorReplacements: (filters?: Record<string, string>) => Promise<void>
  createAccessibilityArrangement: (data: Partial<AccessibilityArrangement>) => Promise<boolean>
  updateAccessibilityArrangement: (id: string, data: Partial<AccessibilityArrangement>) => Promise<boolean>
  completeAccessibilityArrangement: (id: string, remarks?: string) => Promise<boolean>
  fetchAccessibilityArrangements: (filters?: Record<string, string>) => Promise<void>
  reportCheating: (data: Partial<CheatingReview>) => Promise<boolean>
  reviewCheating: (id: string, status: string, reviewNotes: string, penalty?: string) => Promise<boolean>
  fetchCheatingReviews: (filters?: Record<string, string>) => Promise<void>
  updateHalfExamState: (data: Partial<HalfExamState>) => Promise<boolean>
  fetchHalfExamStates: (filters?: Record<string, string>) => Promise<void>
  createMakeupExamWithInheritance: (originalRegistrationId: string, reason: string, inheritanceType: string) => Promise<boolean>
  fetchMakeupInheritances: (filters?: Record<string, string>) => Promise<void>
  fetchExamChangeLogs: (filters?: Record<string, string>) => Promise<void>
}

const initialMasterData: MasterData = {
  skillLevels: [],
  subjects: [],
  examRooms: [],
  proctors: [],
}

export const useDataStore = create<DataState>((set, get) => ({
  institutions: [],
  candidates: [],
  registrations: [],
  pendingRegistrations: [],
  batches: [],
  schedules: [],
  scheduleDetail: null,
  exceptions: [],
  makeupExams: [],
  scoreUnlocks: [],
  masterData: initialMasterData,
  checkinRecords: [],
  checkinStats: null,
  deferralRequests: [],
  equipmentFailures: [],
  proctorReplacements: [],
  proctorConflicts: [],
  accessibilityArrangements: [],
  cheatingReviews: [],
  halfExamStates: [],
  makeupInheritances: [],
  examChangeLogs: [],
  loading: false,
  error: null,

  fetchInstitutions: async () => {
    set({ loading: true, error: null })
    const res = await api.get<Institution[]>('/institutions')
    if (res.success && res.data) set({ institutions: res.data, loading: false })
    else set({ error: res.error || '获取机构列表失败', loading: false })
  },

  fetchCandidates: async (instId) => {
    set({ loading: true, error: null })
    const res = await api.get<Candidate[]>(`/institutions/${instId}/candidates`)
    if (res.success && res.data) set({ candidates: res.data, loading: false })
    else set({ error: res.error || '获取考生列表失败', loading: false })
  },

  fetchRegistrations: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<Registration[]>(`/registrations${qs}`)
    if (res.success && res.data) set({ registrations: res.data, loading: false })
    else set({ error: res.error || '获取报名列表失败', loading: false })
  },

  fetchPendingRegistrations: async () => {
    set({ loading: true, error: null })
    const res = await api.get<Registration[]>('/registrations/pending')
    if (res.success && res.data) set({ pendingRegistrations: res.data, loading: false })
    else set({ error: res.error || '获取待分配报名失败', loading: false })
  },

  fetchBatches: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<Batch[]>(`/schedules/batches${qs}`)
    if (res.success && res.data) set({ batches: res.data, loading: false })
    else set({ error: res.error || '获取批次列表失败', loading: false })
  },

  fetchSchedules: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<Schedule[]>(`/schedules${qs}`)
    if (res.success && res.data) set({ schedules: res.data, loading: false })
    else set({ error: res.error || '获取排考列表失败', loading: false })
  },

  fetchTodaySchedules: async (proctorUserId) => {
    set({ loading: true, error: null })
    const res = await api.get<Schedule[]>(`/schedules/${proctorUserId}/today`)
    if (res.success && res.data) set({ schedules: res.data, loading: false })
    else set({ error: res.error || '获取今日考试失败', loading: false })
  },

  fetchScheduleDetail: async (id) => {
    set({ loading: true, error: null })
    const res = await api.get<ScheduleDetail>(`/schedules/${id}`)
    if (res.success && res.data) { set({ scheduleDetail: res.data, loading: false }); return res.data }
    set({ error: res.error || '获取排考详情失败', loading: false })
    return null
  },

  createBatch: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<Batch>('/schedules/batches', data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '创建批次失败', loading: false }); return false
  },

  updateBatch: async (id, data) => {
    set({ loading: true, error: null })
    const res = await api.put<Batch>(`/schedules/batches/${id}`, data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '更新批次失败', loading: false }); return false
  },

  createSchedule: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<Schedule>('/schedules', data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '创建排考失败', loading: false }); return false
  },

  assignSeats: async (scheduleId, registrationIds) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/schedules/${scheduleId}/assign`, { registration_ids: registrationIds })
    if (res.success) {
      set({ loading: false })
      return { success: true, warnings: res.data?.warnings || [] }
    }
    set({ error: res.error || '分配座位失败', loading: false })
    return {
      success: false,
      errors: res.errors || [res.error || '分配座位失败'],
      warnings: res.warnings || []
    }
  },

  expandCapacity: async (scheduleId, newCapacity, reason) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/schedules/${scheduleId}/expand`, { new_capacity: newCapacity, reason })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '扩容失败', loading: false }); return false
  },

  adjustSeat: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<any>('/schedules/seat-adjust', {
      seat_arrangement_id: data.seatArrangementId,
      new_schedule_id: data.toScheduleId,
      new_seat_no: data.newSeatNo || '1',
      reason: data.reason
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '调座失败', loading: false }); return false
  },

  validateSchedule: async (registrationIds, target, options) => {
    set({ loading: true, error: null })
    const res = await api.post<{ valid: boolean; errors: string[]; warnings: string[] }>('/schedules/validate', {
      registration_ids: registrationIds,
      target: {
        exam_date: target.examDate,
        start_time: target.examTime,
        exam_room_id: target.examRoom,
        ...target
      },
      options
    })
    if (res.success && res.data) {
      set({ loading: false })
      return {
        valid: res.data.valid,
        errors: res.data.errors || [],
        warnings: res.data.warnings || [],
      }
    }
    set({ error: res.error || '校验失败', loading: false })
    return null
  },

  fetchExceptions: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<ExamException[]>(`/checkin/exceptions${qs}`)
    if (res.success && res.data) set({ exceptions: res.data, loading: false })
    else set({ error: res.error || '获取异常列表失败', loading: false })
  },

  handleException: async (id, status, result, shouldFreeze) => {
    set({ loading: true, error: null })
    const res = await api.put<any>(`/checkin/exceptions/${id}/handle`, { status, handling_result: result, should_freeze: shouldFreeze })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '处理异常失败', loading: false }); return false
  },

  fetchMakeupExams: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<MakeupExam[]>(`/checkin/makeups${qs}`)
    if (res.success && res.data) set({ makeupExams: res.data, loading: false })
    else set({ error: res.error || '获取补考列表失败', loading: false })
  },

  createMakeupExam: async (regId, reason) => {
    set({ loading: true, error: null })
    const res = await api.post<MakeupExam>('/checkin/makeup', { registration_id: regId, reason })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '创建补考失败', loading: false }); return false
  },

  fetchScoreUnlocks: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<ScoreUnlock[]>(`/checkin/score-unlocks${qs}`)
    if (res.success && res.data) set({ scoreUnlocks: res.data, loading: false })
    else set({ error: res.error || '获取成绩解锁列表失败', loading: false })
  },

  createScoreUnlock: async (regId, reason) => {
    set({ loading: true, error: null })
    const res = await api.post<ScoreUnlock>('/checkin/score-unlock', { registration_id: regId, reason })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '申请成绩解锁失败', loading: false }); return false
  },

  approveScoreUnlock: async (id) => {
    set({ loading: true, error: null })
    const res = await api.put<any>(`/checkin/score-unlocks/${id}/approve`, {})
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '审批成绩解锁失败', loading: false }); return false
  },

  rejectScoreUnlock: async (id) => {
    set({ loading: true, error: null })
    const res = await api.put<any>(`/checkin/score-unlocks/${id}/approve`, { status: 'rejected' })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '驳回成绩解锁失败', loading: false }); return false
  },

  checkin: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<CheckinRecord>('/checkin', {
      seat_arrangement_id: data.seatArrangementId || data.registrationId,
      checkin_method: data.type || 'manual',
      id_card: data.idCard
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '签到失败', loading: false }); return false
  },

  markAbsent: async (ids) => {
    set({ loading: true, error: null })
    const res = await api.post<any>('/checkin/mark-absent', { seat_arrangement_ids: ids })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '标记缺考失败', loading: false }); return false
  },

  fetchCheckinRecords: async (scheduleId) => {
    set({ loading: true, error: null })
    const res = await api.get<CheckinRecord[]>(`/checkin/records/${scheduleId}`)
    if (res.success && res.data) {
      set({
        checkinRecords: (res.data as any)?.records || res.data,
        checkinStats: (res.data as any)?.stats || null,
        loading: false
      })
    } else set({ error: res.error || '获取签到记录失败', loading: false })
  },

  registerException: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<ExamException>('/checkin/exception', {
      type: data.type,
      registration_id: data.registrationId,
      candidate_id: data.candidateId,
      schedule_id: data.scheduleId,
      seat_arrangement_id: data.seatArrangementId,
      description: data.description,
      evidence: data.evidence
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '登记异常失败', loading: false }); return false
  },

  fetchMasterData: async () => {
    set({ loading: true, error: null })
    const res = await api.get<MasterData>('/checkin/master-data')
    if (res.success && res.data) set({ masterData: res.data, loading: false })
    else set({ error: res.error || '获取基础数据失败', loading: false })
  },

  payRegistration: async (id, data) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/registrations/${id}/pay`, data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '缴费失败', loading: false }); return false
  },

  freezeRegistration: async (id, reason) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/registrations/${id}/freeze`, { reason })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '冻结失败', loading: false }); return false
  },

  unfreezeRegistration: async (id) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/registrations/${id}/unfreeze`, {})
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '解冻失败', loading: false }); return false
  },

  updateExamStatus: async (id, status, remark) => {
    set({ loading: true, error: null })
    const res = await api.put<any>(`/registrations/${id}/exam-status`, { status, remark })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '更新考试状态失败', loading: false }); return false
  },

  addCandidate: async (instId, data) => {
    set({ loading: true, error: null })
    const res = await api.post<Candidate>(`/institutions/${instId}/candidates`, data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '添加考生失败', loading: false }); return false
  },

  updateCandidate: async (instId, candidateId, data) => {
    set({ loading: true, error: null })
    const res = await api.put<Candidate>(`/institutions/${instId}/candidates/${candidateId}`, data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '更新考生失败', loading: false }); return false
  },

  deleteCandidate: async (instId, candidateId) => {
    set({ loading: true, error: null })
    const res = await api.del<any>(`/institutions/${instId}/candidates/${candidateId}`)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '删除考生失败', loading: false }); return false
  },

  createInstitution: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<Institution>('/institutions', data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '创建机构失败', loading: false }); return false
  },

  latePaymentReschedule: async (scheduleId, registrationIds, reason) => {
    set({ loading: true, error: null })
    const res = await api.post<any>('/exam-day-changes/late-payment-reschedule', {
      schedule_id: scheduleId,
      registration_ids: registrationIds,
      reason
    })
    if (res.success) {
      set({ loading: false })
      return { success: true, data: res.data, warnings: res.data?.warnings || [] }
    }
    set({ error: res.error || '临考补缴排考失败', loading: false })
    return { success: false, errors: res.errors || [res.error || '临考补缴排考失败'], warnings: res.warnings || [] }
  },

  submitDeferralRequest: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<DeferralRequest>('/exam-day-changes/deferral-request', data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '提交缓考申请失败', loading: false }); return false
  },

  approveDeferral: async (id, newScheduleId, remarks) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/exam-day-changes/deferral/${id}/approve`, {
      new_schedule_id: newScheduleId,
      remarks
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '审批缓考申请失败', loading: false }); return false
  },

  rejectDeferral: async (id, remarks) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/exam-day-changes/deferral/${id}/approve`, {
      status: 'rejected',
      remarks
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '驳回缓考申请失败', loading: false }); return false
  },

  fetchDeferralRequests: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<DeferralRequest[]>(`/exam-day-changes/deferral-requests${qs}`)
    if (res.success && res.data) set({ deferralRequests: res.data, loading: false })
    else set({ error: res.error || '获取缓考申请列表失败', loading: false })
  },

  reportEquipmentFailure: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<EquipmentFailure>('/exam-day-changes/equipment-failure', data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '上报设备故障失败', loading: false }); return false
  },

  confirmEquipmentFailure: async (id) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/exam-day-changes/equipment-failure/${id}/confirm`, {})
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '确认设备故障失败', loading: false }); return false
  },

  transferEquipmentFailure: async (id, toRoomId, reason) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/exam-day-changes/equipment-failure/${id}/transfer`, {
      to_room_id: toRoomId,
      reason
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '设备故障转场失败', loading: false }); return false
  },

  resolveEquipmentFailure: async (id, remarks) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/exam-day-changes/equipment-failure/${id}/resolve`, { remarks })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '解决设备故障失败', loading: false }); return false
  },

  fetchEquipmentFailures: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<EquipmentFailure[]>(`/exam-day-changes/equipment-failures${qs}`)
    if (res.success && res.data) set({ equipmentFailures: res.data, loading: false })
    else set({ error: res.error || '获取设备故障列表失败', loading: false })
  },

  replaceProctor: async (scheduleId, originalProctorId, newProctorId, reason, conflictType) => {
    set({ loading: true, error: null })
    const res = await api.post<ProctorReplacement>('/exam-day-changes/proctor-replace', {
      schedule_id: scheduleId,
      original_proctor_id: originalProctorId,
      new_proctor_id: newProctorId,
      reason,
      conflict_type: conflictType
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '替换监考失败', loading: false }); return false
  },

  recordProctorConflict: async (proctorId, candidateId, conflictType, relationship) => {
    set({ loading: true, error: null })
    const res = await api.post<ProctorConflict>('/exam-day-changes/proctor-conflict', {
      proctor_id: proctorId,
      candidate_id: candidateId,
      conflict_type: conflictType,
      relationship
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '记录监考回避关系失败', loading: false }); return false
  },

  deleteProctorConflict: async (id) => {
    set({ loading: true, error: null })
    const res = await api.del(`/exam-day-changes/proctor-conflicts/${id}`)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '删除回避关系失败', loading: false }); return false
  },

  checkProctorConflict: async (proctorId, candidateId) => {
    set({ loading: true, error: null })
    const res = await api.get<ProctorConflictCheckResult>(
      `/exam-day-changes/proctor-conflicts/check?proctor_id=${proctorId}&candidate_id=${candidateId}`
    )
    if (res.success && res.data) { set({ loading: false }); return res.data }
    set({ error: res.error || '冲突检测失败', loading: false }); return null
  },

  fetchProctorConflicts: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<ProctorConflict[]>(`/exam-day-changes/proctor-conflicts${qs}`)
    if (res.success && res.data) set({ proctorConflicts: res.data, loading: false })
    else set({ error: res.error || '获取监考回避关系列表失败', loading: false })
  },

  fetchProctorReplacements: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<ProctorReplacement[]>(`/exam-day-changes/proctor-replacements${qs}`)
    if (res.success && res.data) set({ proctorReplacements: res.data, loading: false })
    else set({ error: res.error || '获取监考替换记录列表失败', loading: false })
  },

  createAccessibilityArrangement: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<AccessibilityArrangement>('/exam-day-changes/accessibility-arrangement', data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '创建无障碍考试安排失败', loading: false }); return false
  },

  updateAccessibilityArrangement: async (id, data) => {
    set({ loading: true, error: null })
    const res = await api.put<AccessibilityArrangement>(`/exam-day-changes/accessibility-arrangement/${id}`, data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '更新无障碍考试安排失败', loading: false }); return false
  },

  completeAccessibilityArrangement: async (id, remarks) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/exam-day-changes/accessibility-arrangement/${id}/complete`, { remarks })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '标记无障碍考试安排完成失败', loading: false }); return false
  },

  fetchAccessibilityArrangements: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<AccessibilityArrangement[]>(`/exam-day-changes/accessibility-arrangements${qs}`)
    if (res.success && res.data) set({ accessibilityArrangements: res.data, loading: false })
    else set({ error: res.error || '获取无障碍考试安排列表失败', loading: false })
  },

  reportCheating: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<CheatingReview>('/exam-day-changes/cheating-report', data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '上报作弊失败', loading: false }); return false
  },

  reviewCheating: async (id, status, reviewNotes, penalty) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/exam-day-changes/cheating-review/${id}`, {
      status,
      review_notes: reviewNotes,
      penalty
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '作弊复核失败', loading: false }); return false
  },

  fetchCheatingReviews: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<CheatingReview[]>(`/exam-day-changes/cheating-reviews${qs}`)
    if (res.success && res.data) set({ cheatingReviews: res.data, loading: false })
    else set({ error: res.error || '获取作弊复核列表失败', loading: false })
  },

  updateHalfExamState: async (data) => {
    set({ loading: true, error: null })
    const res = await api.post<HalfExamState>('/exam-day-changes/half-exam-state', data)
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '更新半程考试状态失败', loading: false }); return false
  },

  fetchHalfExamStates: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<HalfExamState[]>(`/exam-day-changes/half-exam-states${qs}`)
    if (res.success && res.data) set({ halfExamStates: res.data, loading: false })
    else set({ error: res.error || '获取半程考试状态列表失败', loading: false })
  },

  createMakeupExamWithInheritance: async (originalRegistrationId, reason, inheritanceType) => {
    set({ loading: true, error: null })
    const res = await api.post<MakeupInheritance>('/exam-day-changes/makeup-exam-with-inheritance', {
      original_registration_id: originalRegistrationId,
      reason,
      inheritance_type: inheritanceType
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '创建补考继承链失败', loading: false }); return false
  },

  fetchMakeupInheritances: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<MakeupInheritance[]>(`/exam-day-changes/makeup-inheritances${qs}`)
    if (res.success && res.data) set({ makeupInheritances: res.data, loading: false })
    else set({ error: res.error || '获取补考继承链列表失败', loading: false })
  },

  fetchExamChangeLogs: async (filters) => {
    set({ loading: true, error: null })
    const qs = filters ? '?' + new URLSearchParams(filters).toString() : ''
    const res = await api.get<ExamChangeLog[]>(`/exam-day-changes/change-logs${qs}`)
    if (res.success && res.data) set({ examChangeLogs: res.data, loading: false })
    else set({ error: res.error || '获取变更日志列表失败', loading: false })
  },

  unlockScore: async (id, reviewNotes, reviewer) => {
    set({ loading: true, error: null })
    const res = await api.post<any>(`/exam-day-changes/cheating-review/${id}/unlock`, {
      review_notes: reviewNotes,
      reviewer,
    })
    if (res.success) { set({ loading: false }); return true }
    set({ error: res.error || '成绩解锁失败', loading: false }); return false
  },
}))
