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
  loading: boolean
  error: string | null

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
}))
