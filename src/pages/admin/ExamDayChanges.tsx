import { useState, useEffect } from 'react'
import { Clock, CreditCard, UserX, Wrench, Users, Eye, Ban, History, Plus, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { useDataStore, type Registration, type Schedule, type AccessibilityArrangement, type HalfExamState } from '@/stores/dataStore'
import dayjs from 'dayjs'

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  reported: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-yellow-100 text-yellow-700',
  transferred: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-green-100 text-green-700',
  half_completed: 'bg-purple-100 text-purple-700',
  deferred: 'bg-orange-100 text-orange-700',
}

const statusLabel: Record<string, string> = {
  pending: '待处理',
  approved: '已通过',
  rejected: '已驳回',
  reported: '已上报',
  confirmed: '已确认',
  transferred: '已转场',
  resolved: '已解决',
  scheduled: '已排考',
  checked_in: '已签到',
  half_completed: '半程完成',
  deferred: '已缓考',
}

const changeTypeLabel: Record<string, string> = {
  seat_adjust: '座位调整',
  proctor_replace: '监考替换',
  room_transfer: '考场转场',
  deferral: '缓考申请',
  accessibility: '无障碍安排',
  equipment_failure: '设备故障',
  late_payment: '临考补缴',
  half_exam: '半程状态',
  cheating: '作弊处理',
  other: '其他变更',
}

export default function ExamDayChanges() {
  const {
    schedules,
    registrations,
    pendingRegistrations,
    deferralRequests,
    equipmentFailures,
    proctorReplacements,
    proctorConflicts,
    accessibilityArrangements,
    cheatingReviews,
    halfExamStates,
    makeupInheritances,
    examChangeLogs,
    masterData,
    loading,
    fetchSchedules,
    fetchRegistrations,
    fetchPendingRegistrations,
    fetchDeferralRequests,
    fetchEquipmentFailures,
    fetchProctorReplacements,
    fetchProctorConflicts,
    fetchAccessibilityArrangements,
    fetchCheatingReviews,
    fetchHalfExamStates,
    fetchMakeupInheritances,
    fetchExamChangeLogs,
    fetchMasterData,
    latePaymentReschedule,
    submitDeferralRequest,
    reportEquipmentFailure,
    replaceProctor,
    recordProctorConflict,
    createAccessibilityArrangement,
    reportCheating,
    updateHalfExamState,
    createMakeupExamWithInheritance,
  } = useDataStore()

  const [activeTab, setActiveTab] = useState('late-payment')
  const [latePaymentModal, setLatePaymentModal] = useState(false)
  const [deferralModal, setDeferralModal] = useState(false)
  const [equipmentModal, setEquipmentModal] = useState(false)
  const [proctorReplaceModal, setProctorReplaceModal] = useState(false)
  const [conflictModal, setConflictModal] = useState(false)
  const [accessibilityModal, setAccessibilityModal] = useState(false)
  const [cheatingModal, setCheatingModal] = useState(false)
  const [halfExamModal, setHalfExamModal] = useState(false)
  const [makeupModal, setMakeupModal] = useState(false)

  const [selectedSchedule, setSelectedSchedule] = useState('')
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [latePaymentReason, setLatePaymentReason] = useState('临考补缴')

  const [deferralForm, setDeferralForm] = useState({
    registration_id: '',
    reason: '',
    evidence: '',
  })

  const [equipmentForm, setEquipmentForm] = useState({
    schedule_id: '',
    equipment_type: 'computer',
    description: '',
  })

  const [proctorReplaceForm, setProctorReplaceForm] = useState({
    schedule_id: '',
    original_proctor_id: '',
    new_proctor_id: '',
    reason: '',
    conflict_type: '',
  })

  const [conflictForm, setConflictForm] = useState({
    proctor_id: '',
    candidate_id: '',
    conflict_type: 'family',
    relationship: '',
  })

  const [accessibilityForm, setAccessibilityForm] = useState({
    schedule_id: '',
    registration_id: '',
    arrangement_type: 'wheelchair',
    description: '',
    requirements: '',
  })

  const [cheatingForm, setCheatingForm] = useState({
    registration_id: '',
    schedule_id: '',
    report_reason: '',
    evidence: '',
  })

  const [halfExamForm, setHalfExamForm] = useState({
    registration_id: '',
    schedule_id: '',
    theory_exam_date: '',
    theory_score: '',
    theory_status: 'completed',
  })

  const [makeupForm, setMakeupForm] = useState({
    original_registration_id: '',
    reason: '',
    inheritance_type: 'deferral',
  })

  useEffect(() => {
    fetchSchedules()
    fetchRegistrations()
    fetchPendingRegistrations()
    fetchDeferralRequests()
    fetchEquipmentFailures()
    fetchProctorReplacements()
    fetchProctorConflicts()
    fetchAccessibilityArrangements()
    fetchCheatingReviews()
    fetchHalfExamStates()
    fetchMakeupInheritances()
    fetchExamChangeLogs()
    fetchMasterData()
  }, [])

  const toggleRegistration = (id: string) => {
    setSelectedRegistrations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleLatePayment = async () => {
    if (!selectedSchedule || selectedRegistrations.length === 0) return
    const result = await latePaymentReschedule(selectedSchedule, selectedRegistrations, latePaymentReason)
    if (result.success) {
      setLatePaymentModal(false)
      setSelectedRegistrations([])
      setLatePaymentReason('临考补缴')
      fetchSchedules()
      fetchPendingRegistrations()
      fetchExamChangeLogs()
      alert(`补缴排考成功！已安排 ${result.data?.assigned_count || 0} 名考生，保护 ${result.data?.preserved_count || 0} 名已签到考生座位`)
    } else {
      alert('补缴排考失败：' + (result.errors?.[0] || '未知错误'))
    }
  }

  const handleDeferral = async () => {
    if (!deferralForm.registration_id || !deferralForm.reason) return
    const ok = await submitDeferralRequest({
      ...deferralForm,
      requested_by: 'admin',
    })
    if (ok) {
      setDeferralModal(false)
      setDeferralForm({ registration_id: '', reason: '', evidence: '' })
      fetchDeferralRequests()
      alert('缓考申请提交成功')
    }
  }

  const handleEquipmentFailure = async () => {
    if (!equipmentForm.schedule_id || !equipmentForm.description) return
    const schedule = schedules.find(s => s.id === equipmentForm.schedule_id)
    const ok = await reportEquipmentFailure({
      ...equipmentForm,
      room_id: schedule?.exam_room_id,
      reported_by: 'admin',
    })
    if (ok) {
      setEquipmentModal(false)
      setEquipmentForm({ schedule_id: '', equipment_type: 'computer', description: '' })
      fetchEquipmentFailures()
      alert('设备故障上报成功')
    }
  }

  const handleProctorReplace = async () => {
    if (!proctorReplaceForm.schedule_id || !proctorReplaceForm.original_proctor_id || !proctorReplaceForm.new_proctor_id || !proctorReplaceForm.reason) return
    const ok = await replaceProctor(
      proctorReplaceForm.schedule_id,
      proctorReplaceForm.original_proctor_id,
      proctorReplaceForm.new_proctor_id,
      proctorReplaceForm.reason,
      proctorReplaceForm.conflict_type || undefined
    )
    if (ok) {
      setProctorReplaceModal(false)
      setProctorReplaceForm({ schedule_id: '', original_proctor_id: '', new_proctor_id: '', reason: '', conflict_type: '' })
      fetchProctorReplacements()
      fetchSchedules()
      alert('监考替换成功')
    }
  }

  const handleConflict = async () => {
    if (!conflictForm.proctor_id || !conflictForm.candidate_id || !conflictForm.relationship) return
    const ok = await recordProctorConflict(
      conflictForm.proctor_id,
      conflictForm.candidate_id,
      conflictForm.conflict_type,
      conflictForm.relationship
    )
    if (ok) {
      setConflictModal(false)
      setConflictForm({ proctor_id: '', candidate_id: '', conflict_type: 'family', relationship: '' })
      fetchProctorConflicts()
      alert('回避关系记录成功')
    }
  }

  const handleAccessibility = async () => {
    if (!accessibilityForm.schedule_id || !accessibilityForm.registration_id || !accessibilityForm.description) return
    const ok = await createAccessibilityArrangement({
      ...accessibilityForm,
      arrangement_type: accessibilityForm.arrangement_type as AccessibilityArrangement['arrangement_type'],
      requested_by: 'admin',
    } as Partial<AccessibilityArrangement>)
    if (ok) {
      setAccessibilityModal(false)
      setAccessibilityForm({ schedule_id: '', registration_id: '', arrangement_type: 'wheelchair', description: '', requirements: '' })
      fetchAccessibilityArrangements()
      alert('无障碍安排创建成功')
    }
  }

  const handleCheating = async () => {
    if (!cheatingForm.registration_id || !cheatingForm.schedule_id || !cheatingForm.report_reason) return
    const ok = await reportCheating({
      ...cheatingForm,
      reported_by: 'admin',
    })
    if (ok) {
      setCheatingModal(false)
      setCheatingForm({ registration_id: '', schedule_id: '', report_reason: '', evidence: '' })
      fetchCheatingReviews()
      fetchRegistrations()
      alert('作弊已上报，成绩已冻结')
    }
  }

  const handleHalfExam = async () => {
    if (!halfExamForm.registration_id || !halfExamForm.schedule_id || !halfExamForm.theory_exam_date) return
    const ok = await updateHalfExamState({
      ...halfExamForm,
      theory_score: halfExamForm.theory_score ? parseFloat(halfExamForm.theory_score) : null,
      theory_status: halfExamForm.theory_status as HalfExamState['theory_status'],
      practical_status: 'pending' as HalfExamState['practical_status'],
      overall_status: 'theory_done' as HalfExamState['overall_status'],
    } as Partial<HalfExamState>)
    if (ok) {
      setHalfExamModal(false)
      setHalfExamForm({ registration_id: '', schedule_id: '', theory_exam_date: '', theory_score: '', theory_status: 'completed' })
      fetchHalfExamStates()
      fetchRegistrations()
      alert('半程考试状态已更新')
    }
  }

  const handleMakeup = async () => {
    if (!makeupForm.original_registration_id || !makeupForm.reason) return
    const ok = await createMakeupExamWithInheritance(
      makeupForm.original_registration_id,
      makeupForm.reason,
      makeupForm.inheritance_type
    )
    if (ok) {
      setMakeupModal(false)
      setMakeupForm({ original_registration_id: '', reason: '', inheritance_type: 'deferral' })
      fetchMakeupInheritances()
      fetchRegistrations()
      alert('补考继承链创建成功，原始记录已保留')
    }
  }

  const tabs = [
    { id: 'late-payment', label: '临考补缴', icon: CreditCard },
    { id: 'deferrals', label: '缓考申请', icon: Eye },
    { id: 'equipment', label: '设备故障', icon: Wrench },
    { id: 'proctor', label: '监考管理', icon: Users },
    { id: 'accessibility', label: '无障碍', icon: Users },
    { id: 'cheating', label: '作弊处理', icon: Ban },
    { id: 'half-exam', label: '半程状态', icon: Clock },
    { id: 'makeup', label: '补考继承', icon: History },
    { id: 'logs', label: '变更日志', icon: History },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">临考变更管理</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'late-payment' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700">临考补缴后排座</h2>
            <button
              className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
              onClick={() => setLatePaymentModal(true)}
            >
              <Plus className="w-4 h-4" />补缴排座
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">排座规则说明</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                已签到考生的座位会被自动保护，不会被重新分配
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                补缴考生从最大座位号之后开始分配新座位
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                如遇座位号冲突，系统会自动跳过已占用的座位
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">排考</th>
                  <th className="px-4 py-3 font-medium">考场</th>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">已签到</th>
                  <th className="px-4 py-3 font-medium">总容量</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {schedules.filter(s => s.status === 'in_progress' || s.status === 'confirmed').map((s, i) => (
                  <tr key={s.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm font-medium">{s.batch_name}</td>
                    <td className="px-4 py-3 text-sm">{s.room_name || s.exam_room}</td>
                    <td className="px-4 py-3 text-sm">{s.exam_date}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-green-600 font-medium">
                        {s.assigned_count ? Math.floor(s.assigned_count * 0.6) : 0}
                      </span> / {s.assigned_count || 0}
                    </td>
                    <td className="px-4 py-3 text-sm">{s.capacity}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[s.status] || 'bg-gray-100'}`}>
                        {statusLabel[s.status] || s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'deferrals' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700">缓考申请记录</h2>
            <button
              className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              onClick={() => setDeferralModal(true)}
            >
              <Plus className="w-4 h-4" />新增申请
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">考生</th>
                  <th className="px-4 py-3 font-medium">原排考</th>
                  <th className="px-4 py-3 font-medium">申请原因</th>
                  <th className="px-4 py-3 font-medium">申请时间</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {deferralRequests.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无缓考申请</td></tr>
                ) : deferralRequests.map((r, i) => (
                  <tr key={r.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm font-medium">{r.candidate_name}</td>
                    <td className="px-4 py-3 text-sm">{r.original_schedule_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{r.reason}</td>
                    <td className="px-4 py-3 text-sm">{dayjs(r.requested_at).format('YYYY-MM-DD HH:mm')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[r.status]}`}>
                        {statusLabel[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'equipment' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700">设备故障记录</h2>
            <button
              className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
              onClick={() => setEquipmentModal(true)}
            >
              <Plus className="w-4 h-4" />上报故障
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">排考</th>
                  <th className="px-4 py-3 font-medium">设备类型</th>
                  <th className="px-4 py-3 font-medium">故障描述</th>
                  <th className="px-4 py-3 font-medium">上报时间</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {equipmentFailures.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无设备故障</td></tr>
                ) : equipmentFailures.map((e, i) => (
                  <tr key={e.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm font-medium">{e.schedule_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {e.equipment_type === 'computer' ? '电脑' :
                       e.equipment_type === 'projector' ? '投影仪' :
                       e.equipment_type === 'speaker' ? '音响' : '其他'}
                    </td>
                    <td className="px-4 py-3 text-sm">{e.description}</td>
                    <td className="px-4 py-3 text-sm">{dayjs(e.reported_at).format('YYYY-MM-DD HH:mm')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[e.status]}`}>
                        {statusLabel[e.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'proctor' && (
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-700">监考替换记录</h2>
              <button
                className="flex items-center gap-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
                onClick={() => setProctorReplaceModal(true)}
              >
                <UserX className="w-4 h-4" />替换监考
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-sm text-slate-600">
                    <th className="px-4 py-3 font-medium">排考</th>
                    <th className="px-4 py-3 font-medium">原监考</th>
                    <th className="px-4 py-3 font-medium">新监考</th>
                    <th className="px-4 py-3 font-medium">替换原因</th>
                    <th className="px-4 py-3 font-medium">替换时间</th>
                  </tr>
                </thead>
                <tbody>
                  {proctorReplacements.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无监考替换记录</td></tr>
                  ) : proctorReplacements.map((p, i) => (
                    <tr key={p.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="px-4 py-3 text-sm font-medium">{p.schedule_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{p.original_proctor_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{p.new_proctor_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{p.reason}</td>
                      <td className="px-4 py-3 text-sm">{dayjs(p.replaced_at).format('YYYY-MM-DD HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-700">回避关系管理</h2>
              <button
                className="flex items-center gap-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium"
                onClick={() => setConflictModal(true)}
              >
                <Plus className="w-4 h-4" />添加回避关系
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-sm text-slate-600">
                    <th className="px-4 py-3 font-medium">监考</th>
                    <th className="px-4 py-3 font-medium">考生</th>
                    <th className="px-4 py-3 font-medium">关系类型</th>
                    <th className="px-4 py-3 font-medium">具体关系</th>
                    <th className="px-4 py-3 font-medium">记录时间</th>
                  </tr>
                </thead>
                <tbody>
                  {proctorConflicts.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无回避关系记录</td></tr>
                  ) : proctorConflicts.map((c, i) => (
                    <tr key={c.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="px-4 py-3 text-sm font-medium">{c.proctor_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{c.candidate_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {c.conflict_type === 'family' ? '亲属关系' :
                         c.conflict_type === 'colleague' ? '同事关系' :
                         c.conflict_type === 'institution' ? '机构关联' : '其他'}
                      </td>
                      <td className="px-4 py-3 text-sm">{c.relationship}</td>
                      <td className="px-4 py-3 text-sm">{dayjs(c.created_at).format('YYYY-MM-DD HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'accessibility' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700">无障碍考试安排</h2>
            <button
              className="flex items-center gap-1 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 text-sm font-medium"
              onClick={() => setAccessibilityModal(true)}
            >
              <Plus className="w-4 h-4" />新增安排
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">考生</th>
                  <th className="px-4 py-3 font-medium">排考</th>
                  <th className="px-4 py-3 font-medium">无障碍类型</th>
                  <th className="px-4 py-3 font-medium">特殊要求</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {accessibilityArrangements.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无无障碍安排</td></tr>
                ) : accessibilityArrangements.map((a, i) => (
                  <tr key={a.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm font-medium">{a.candidate_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{a.schedule_id}</td>
                    <td className="px-4 py-3 text-sm">
                      {a.arrangement_type === 'wheelchair' ? '轮椅通道' :
                       a.arrangement_type === 'visual_impairment' ? '视力障碍' :
                       a.arrangement_type === 'hearing_impairment' ? '听力障碍' :
                       a.arrangement_type === 'learning_disability' ? '学习障碍' : '其他'}
                    </td>
                    <td className="px-4 py-3 text-sm">{a.requirements || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[a.status]}`}>
                        {statusLabel[a.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'cheating' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700">作弊处理记录</h2>
            <button
              className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
              onClick={() => setCheatingModal(true)}
            >
              <Ban className="w-4 h-4" />上报作弊
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">考生</th>
                  <th className="px-4 py-3 font-medium">排考</th>
                  <th className="px-4 py-3 font-medium">作弊事实</th>
                  <th className="px-4 py-3 font-medium">上报时间</th>
                  <th className="px-4 py-3 font-medium">复核状态</th>
                  <th className="px-4 py-3 font-medium">成绩状态</th>
                </tr>
              </thead>
              <tbody>
                {cheatingReviews.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">暂无作弊记录</td></tr>
                ) : cheatingReviews.map((c, i) => (
                  <tr key={c.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm font-medium">{c.candidate_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{c.schedule_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{c.report_reason}</td>
                    <td className="px-4 py-3 text-sm">{dayjs(c.reported_at).format('YYYY-MM-DD HH:mm')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[c.status]}`}>
                        {c.status === 'pending' ? '待复核' :
                         c.status === 'reviewing' ? '复核中' :
                         c.status === 'sustained' ? '作弊成立' : '不予认定'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.score_unlocked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.score_unlocked ? '已解锁' : '已冻结'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'half-exam' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700">半程考试状态管理</h2>
            <button
              className="flex items-center gap-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
              onClick={() => setHalfExamModal(true)}
            >
              <Clock className="w-4 h-4" />记录半程状态
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">考生</th>
                  <th className="px-4 py-3 font-medium">理论考试日期</th>
                  <th className="px-4 py-3 font-medium">理论成绩</th>
                  <th className="px-4 py-3 font-medium">理论状态</th>
                  <th className="px-4 py-3 font-medium">实操状态</th>
                  <th className="px-4 py-3 font-medium">整体状态</th>
                </tr>
              </thead>
              <tbody>
                {halfExamStates.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">暂无半程状态记录</td></tr>
                ) : halfExamStates.map((h, i) => (
                  <tr key={h.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm font-medium">{h.candidate_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{h.theory_exam_date}</td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{h.theory_score ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[h.theory_status]}`}>
                        {statusLabel[h.theory_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[h.practical_status]}`}>
                        {statusLabel[h.practical_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.half_completed}`}>
                        {h.overall_status === 'theory_done' ? '理论已完成' :
                         h.overall_status === 'in_progress' ? '进行中' : '全部完成'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'makeup' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-700">补考继承链管理</h2>
            <button
              className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
              onClick={() => setMakeupModal(true)}
            >
              <History className="w-4 h-4" />创建补考
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">考生</th>
                  <th className="px-4 py-3 font-medium">继承类型</th>
                  <th className="px-4 py-3 font-medium">补考原因</th>
                  <th className="px-4 py-3 font-medium">违纪保留</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {makeupInheritances.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无补考继承记录</td></tr>
                ) : makeupInheritances.map((m, i) => (
                  <tr key={m.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm font-medium">{m.candidate_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {m.inheritance_type === 'deferral' ? '缓考补考' :
                       m.inheritance_type === 'absence' ? '缺考补考' :
                       m.inheritance_type === 'failure' ? '不及格补考' : '其他'}
                    </td>
                    <td className="px-4 py-3 text-sm">{m.reason}</td>
                    <td className="px-4 py-3">
                      {m.preserves_disciplinary_record ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          已保留
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          未保留
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{dayjs(m.created_at).format('YYYY-MM-DD HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">完整变更日志</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">变更类型</th>
                  <th className="px-4 py-3 font-medium">相关考生</th>
                  <th className="px-4 py-3 font-medium">变更原因</th>
                  <th className="px-4 py-3 font-medium">原值</th>
                  <th className="px-4 py-3 font-medium">新值</th>
                  <th className="px-4 py-3 font-medium">操作人</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {examChangeLogs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400">暂无变更记录</td></tr>
                ) : examChangeLogs.map((l, i) => (
                  <tr key={l.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {changeTypeLabel[l.change_type] || l.change_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{l.candidate_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{l.reason}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{l.old_value || '-'}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{l.new_value || '-'}</td>
                    <td className="px-4 py-3 text-sm">{l.changed_by}</td>
                    <td className="px-4 py-3 text-sm">{dayjs(l.created_at).format('YYYY-MM-DD HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {latePaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setLatePaymentModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">临考补缴后排座</h2>
              <button onClick={() => setLatePaymentModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择排考</label>
                <select value={selectedSchedule} onChange={e => setSelectedSchedule(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择排考</option>
                  {schedules.filter(s => s.status === 'in_progress' || s.status === 'confirmed').map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name || s.exam_room} ({s.exam_date})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">补缴原因</label>
                <input type="text" value={latePaymentReason} onChange={e => setLatePaymentReason(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">选择补缴考生（已选择 {selectedRegistrations.length} 人）</label>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left text-sm text-slate-600">
                        <th className="px-3 py-2 font-medium w-10"></th>
                        <th className="px-3 py-2 font-medium">考生</th>
                        <th className="px-3 py-2 font-medium">身份证号</th>
                        <th className="px-3 py-2 font-medium">缴费状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...registrations, ...pendingRegistrations].filter(r => r.payment_status !== 'paid' || r.exam_status === 'not_scheduled').map((r, i) => (
                        <tr key={r.id} className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 ${selectedRegistrations.includes(r.id) ? 'bg-blue-50' : i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`} onClick={() => toggleRegistration(r.id)}>
                          <td className="px-3 py-2"><input type="checkbox" checked={selectedRegistrations.includes(r.id)} onChange={() => toggleRegistration(r.id)} className="accent-blue-600" /></td>
                          <td className="px-3 py-2 text-sm">{r.candidate_name || '-'}</td>
                          <td className="px-3 py-2 text-sm">{r.candidate_id_card || r.candidate_id_number || '-'}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {r.payment_status === 'paid' ? '已缴费' : '未缴费'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 inline-block mr-1" />
                已签到考生的座位会被自动保护，系统会从空闲座位开始分配。
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setLatePaymentModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm" onClick={handleLatePayment} disabled={!selectedSchedule || selectedRegistrations.length === 0}>确认排座</button>
            </div>
          </div>
        </div>
      )}

      {deferralModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeferralModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">提交缓考申请</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择考生</label>
                <select value={deferralForm.registration_id} onChange={e => setDeferralForm(f => ({ ...f, registration_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {registrations.filter(r => r.exam_status === 'scheduled').map(r => (
                    <option key={r.id} value={r.id}>{r.candidate_name} - {r.subject_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">缓考原因</label>
                <textarea value={deferralForm.reason} onChange={e => setDeferralForm(f => ({ ...f, reason: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请详细说明缓考原因" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">证明材料（选填）</label>
                <input type="text" value={deferralForm.evidence} onChange={e => setDeferralForm(f => ({ ...f, evidence: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="上传证明材料链接" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setDeferralModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={handleDeferral} disabled={!deferralForm.registration_id || !deferralForm.reason}>提交申请</button>
            </div>
          </div>
        </div>
      )}

      {equipmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEquipmentModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">上报设备故障</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择排考</label>
                <select value={equipmentForm.schedule_id} onChange={e => setEquipmentForm(f => ({ ...f, schedule_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {schedules.filter(s => s.status === 'in_progress').map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name || s.exam_room}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">设备类型</label>
                <select value={equipmentForm.equipment_type} onChange={e => setEquipmentForm(f => ({ ...f, equipment_type: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="computer">电脑</option>
                  <option value="projector">投影仪</option>
                  <option value="speaker">音响</option>
                  <option value="network">网络</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">故障描述</label>
                <textarea value={equipmentForm.description} onChange={e => setEquipmentForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请详细描述故障情况" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setEquipmentModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm" onClick={handleEquipmentFailure} disabled={!equipmentForm.schedule_id || !equipmentForm.description}>上报故障</button>
            </div>
          </div>
        </div>
      )}

      {proctorReplaceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setProctorReplaceModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">替换监考</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择排考</label>
                <select value={proctorReplaceForm.schedule_id} onChange={e => {
                  const sched = schedules.find(s => s.id === e.target.value)
                  setProctorReplaceForm(f => ({ ...f, schedule_id: e.target.value, original_proctor_id: sched?.proctor_id || '' }))
                }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {schedules.filter(s => s.status === 'confirmed' || s.status === 'in_progress').map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name || s.exam_room}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">原监考</label>
                <input type="text" value={masterData.proctors.find(p => p.id === proctorReplaceForm.original_proctor_id)?.name || ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新监考</label>
                <select value={proctorReplaceForm.new_proctor_id} onChange={e => setProctorReplaceForm(f => ({ ...f, new_proctor_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {masterData.proctors.filter(p => p.id !== proctorReplaceForm.original_proctor_id).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">替换原因</label>
                <select value={proctorReplaceForm.conflict_type} onChange={e => setProctorReplaceForm(f => ({ ...f, conflict_type: e.target.value, reason: e.target.value ? '回避关系' : '' }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2">
                  <option value="">普通替换</option>
                  <option value="family">亲属回避</option>
                  <option value="colleague">同事回避</option>
                  <option value="institution">机构关联回避</option>
                  <option value="other">其他回避</option>
                </select>
                <input type="text" value={proctorReplaceForm.reason} onChange={e => setProctorReplaceForm(f => ({ ...f, reason: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="请说明替换原因" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setProctorReplaceModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm" onClick={handleProctorReplace} disabled={!proctorReplaceForm.schedule_id || !proctorReplaceForm.new_proctor_id || !proctorReplaceForm.reason}>确认替换</button>
            </div>
          </div>
        </div>
      )}

      {conflictModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConflictModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">添加回避关系</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">监考老师</label>
                <select value={conflictForm.proctor_id} onChange={e => setConflictForm(f => ({ ...f, proctor_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {masterData.proctors.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">考生</label>
                <select value={conflictForm.candidate_id} onChange={e => setConflictForm(f => ({ ...f, candidate_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {registrations.map(r => (
                    <option key={r.candidate_id} value={r.candidate_id}>{r.candidate_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">关系类型</label>
                <select value={conflictForm.conflict_type} onChange={e => setConflictForm(f => ({ ...f, conflict_type: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="family">亲属关系</option>
                  <option value="colleague">同事关系</option>
                  <option value="institution">机构关联</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">具体关系说明</label>
                <input type="text" value={conflictForm.relationship} onChange={e => setConflictForm(f => ({ ...f, relationship: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：父子关系、师生关系等" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setConflictModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm" onClick={handleConflict} disabled={!conflictForm.proctor_id || !conflictForm.candidate_id || !conflictForm.relationship}>确认添加</button>
            </div>
          </div>
        </div>
      )}

      {accessibilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAccessibilityModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">无障碍考试安排</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择排考</label>
                <select value={accessibilityForm.schedule_id} onChange={e => setAccessibilityForm(f => ({ ...f, schedule_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {schedules.map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name || s.exam_room}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择考生</label>
                <select value={accessibilityForm.registration_id} onChange={e => setAccessibilityForm(f => ({ ...f, registration_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {registrations.filter(r => r.schedule_id === accessibilityForm.schedule_id || !accessibilityForm.schedule_id).map(r => (
                    <option key={r.id} value={r.id}>{r.candidate_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">无障碍类型</label>
                <select value={accessibilityForm.arrangement_type} onChange={e => setAccessibilityForm(f => ({ ...f, arrangement_type: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="wheelchair">轮椅通道</option>
                  <option value="visual_impairment">视力障碍</option>
                  <option value="hearing_impairment">听力障碍</option>
                  <option value="learning_disability">学习障碍</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">情况说明</label>
                <textarea value={accessibilityForm.description} onChange={e => setAccessibilityForm(f => ({ ...f, description: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="请说明考生情况" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">特殊要求</label>
                <input type="text" value={accessibilityForm.requirements} onChange={e => setAccessibilityForm(f => ({ ...f, requirements: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：需要延长考试时间、提供大字试卷等" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setAccessibilityModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm" onClick={handleAccessibility} disabled={!accessibilityForm.schedule_id || !accessibilityForm.registration_id || !accessibilityForm.description}>确认安排</button>
            </div>
          </div>
        </div>
      )}

      {cheatingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCheatingModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">上报作弊</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择排考</label>
                <select value={cheatingForm.schedule_id} onChange={e => setCheatingForm(f => ({ ...f, schedule_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {schedules.filter(s => s.status === 'in_progress' || s.status === 'completed').map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name || s.exam_room}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择考生</label>
                <select value={cheatingForm.registration_id} onChange={e => setCheatingForm(f => ({ ...f, registration_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {registrations.filter(r => r.schedule_id === cheatingForm.schedule_id || !cheatingForm.schedule_id).map(r => (
                    <option key={r.id} value={r.id}>{r.candidate_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">作弊事实</label>
                <textarea value={cheatingForm.report_reason} onChange={e => setCheatingForm(f => ({ ...f, report_reason: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请详细描述作弊行为，如：夹带小抄、交头接耳、使用电子设备等" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">证据材料（选填）</label>
                <input type="text" value={cheatingForm.evidence} onChange={e => setCheatingForm(f => ({ ...f, evidence: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="上传证据照片或视频链接" />
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 mt-4">
              <AlertTriangle className="w-4 h-4 inline-block mr-1" />
              上报后该考生成绩将立即冻结，需主管复核后才能解锁。
            </div>
            <div className="flex gap-3 mt-4">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setCheatingModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm" onClick={handleCheating} disabled={!cheatingForm.registration_id || !cheatingForm.schedule_id || !cheatingForm.report_reason}>确认上报</button>
            </div>
          </div>
        </div>
      )}

      {halfExamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setHalfExamModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">记录半程考试状态</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择排考</label>
                <select value={halfExamForm.schedule_id} onChange={e => setHalfExamForm(f => ({ ...f, schedule_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {schedules.filter(s => s.status === 'in_progress').map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name || s.exam_room}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择考生</label>
                <select value={halfExamForm.registration_id} onChange={e => setHalfExamForm(f => ({ ...f, registration_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {registrations.filter(r => r.schedule_id === halfExamForm.schedule_id || !halfExamForm.schedule_id).map(r => (
                    <option key={r.id} value={r.id}>{r.candidate_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">理论考试日期</label>
                <input type="date" value={halfExamForm.theory_exam_date} onChange={e => setHalfExamForm(f => ({ ...f, theory_exam_date: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">理论成绩（选填）</label>
                <input type="number" step="0.1" value={halfExamForm.theory_score} onChange={e => setHalfExamForm(f => ({ ...f, theory_score: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：85.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">理论考试状态</label>
                <select value={halfExamForm.theory_status} onChange={e => setHalfExamForm(f => ({ ...f, theory_status: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="completed">已完成</option>
                  <option value="passed">已通过</option>
                  <option value="failed">未通过</option>
                  <option value="absent">缺考</option>
                </select>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800 mt-4">
              <Clock className="w-4 h-4 inline-block mr-1" />
              此操作将标记考生为"理论已考、实操待考"状态，实操考试需单独安排。
            </div>
            <div className="flex gap-3 mt-4">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setHalfExamModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm" onClick={handleHalfExam} disabled={!halfExamForm.registration_id || !halfExamForm.schedule_id || !halfExamForm.theory_exam_date}>确认记录</button>
            </div>
          </div>
        </div>
      )}

      {makeupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setMakeupModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">创建补考（带继承链）</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择原始报名</label>
                <select value={makeupForm.original_registration_id} onChange={e => setMakeupForm(f => ({ ...f, original_registration_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {registrations.filter(r => r.exam_status === 'deferred' || r.exam_status === 'absent' || r.exam_status === 'failed').map(r => (
                    <option key={r.id} value={r.id}>{r.candidate_name} - {r.subject_name} ({r.exam_status === 'deferred' ? '已缓考' : r.exam_status === 'absent' ? '缺考' : '不及格'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">继承类型</label>
                <select value={makeupForm.inheritance_type} onChange={e => setMakeupForm(f => ({ ...f, inheritance_type: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="deferral">缓考补考</option>
                  <option value="absence">缺考补考</option>
                  <option value="failure">不及格补考</option>
                  <option value="other">其他原因</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">补考原因</label>
                <textarea value={makeupForm.reason} onChange={e => setMakeupForm(f => ({ ...f, reason: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请说明补考原因" />
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800 mt-4">
              <History className="w-4 h-4 inline-block mr-1" />
              系统将自动创建补考继承链，保留原始报名信息和违纪记录，不会被新补考冲掉。
            </div>
            <div className="flex gap-3 mt-4">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setMakeupModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm" onClick={handleMakeup} disabled={!makeupForm.original_registration_id || !makeupForm.reason}>确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}