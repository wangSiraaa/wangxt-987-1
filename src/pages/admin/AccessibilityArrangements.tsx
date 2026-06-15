import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, CheckCircle, Eye, AlertCircle, Check, X, Users, Calendar, User, FileText, Tag } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const accessibilityTypeBadge: Record<string, string> = {
  wheelchair: 'bg-blue-100 text-blue-700',
  visual_impairment: 'bg-purple-100 text-purple-700',
  hearing_impairment: 'bg-green-100 text-green-700',
  learning_disability: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
}

const accessibilityTypeLabel: Record<string, string> = {
  wheelchair: '轮椅通道',
  visual_impairment: '视力障碍',
  hearing_impairment: '听力障碍',
  learning_disability: '学习障碍',
  other: '其他',
}

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const statusLabel: Record<string, string> = {
  pending: '待安排',
  scheduled: '已安排',
  completed: '已完成',
  cancelled: '已取消',
}

const specialRequirementOptions = [
  '延长考试时间',
  '提供大字试卷',
  '专人引导',
  '单独考场',
  '辅助设备',
  '其他特殊要求',
]

export default function AccessibilityArrangements() {
  const {
    accessibilityArrangements,
    schedules,
    registrations,
    loading,
    fetchAccessibilityArrangements,
    fetchSchedules,
    fetchRegistrations,
    createAccessibilityArrangement,
    updateAccessibilityArrangement,
    completeAccessibilityArrangement,
  } = useDataStore()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completeId, setCompleteId] = useState<string | null>(null)
  const [completeRemarks, setCompleteRemarks] = useState('')
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])

  type AccessibilityType = 'wheelchair' | 'visual_impairment' | 'hearing_impairment' | 'learning_disability' | 'other'

  const [formData, setFormData] = useState({
    schedule_id: '',
    registration_id: '',
    arrangement_type: 'wheelchair' as AccessibilityType,
    description: '',
    requirements: '',
    seat_no: '',
  })

  const [batchFormData, setBatchFormData] = useState({
    schedule_id: '',
    arrangement_type: 'wheelchair' as AccessibilityType,
    description: '',
    requirements: '',
  })

  useEffect(() => {
    fetchAccessibilityArrangements()
    fetchSchedules()
    fetchRegistrations()
  }, [])

  const getScheduleName = (scheduleId: string | null) => {
    if (!scheduleId) return '-'
    const schedule = schedules.find(s => s.id === scheduleId)
    if (!schedule) return '-'
    return `${schedule.batch_name} - ${schedule.room_name} (${schedule.exam_date} ${schedule.exam_time})`
  }

  const getCandidateInfo = (registrationId: string | null) => {
    if (!registrationId) return '-'
    const registration = registrations.find(r => r.id === registrationId)
    if (!registration) return '-'
    return registration.candidate_name || '-'
  }

  const filteredRegistrations = useMemo(() => {
    if (!formData.schedule_id) {
      return registrations.filter(r => r.schedule_id && r.status !== 'cancelled')
    }
    return registrations.filter(r => r.schedule_id === formData.schedule_id && r.status !== 'cancelled')
  }, [formData.schedule_id, registrations])

  const batchFilteredRegistrations = useMemo(() => {
    if (!batchFormData.schedule_id) return []
    return registrations.filter(r => r.schedule_id === batchFormData.schedule_id && r.status !== 'cancelled')
  }, [batchFormData.schedule_id, registrations])

  const openEditModal = (id?: string) => {
    if (id) {
      const arrangement = accessibilityArrangements.find(a => a.id === id)
      if (arrangement) {
        setEditingId(id)
        setFormData({
          schedule_id: arrangement.schedule_id || '',
          registration_id: arrangement.registration_id,
          arrangement_type: arrangement.arrangement_type as AccessibilityType,
          description: arrangement.description || '',
          requirements: arrangement.requirements || '',
          seat_no: arrangement.seat_no || '',
        })
      }
    } else {
      setEditingId(null)
      setFormData({
        schedule_id: '',
        registration_id: '',
        arrangement_type: 'wheelchair',
        description: '',
        requirements: '',
        seat_no: '',
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formData.registration_id || !formData.arrangement_type) {
      alert('请填写必要信息')
      return
    }

    const data = {
      ...formData,
      schedule_id: formData.schedule_id || null,
      seat_no: formData.seat_no || null,
    }

    let ok
    if (editingId) {
      ok = await updateAccessibilityArrangement(editingId, data)
    } else {
      ok = await createAccessibilityArrangement(data)
    }

    if (ok) {
      setShowModal(false)
      fetchAccessibilityArrangements()
      alert(editingId ? '无障碍安排已更新' : '无障碍安排已创建')
    }
  }

  const openCompleteModal = (id: string) => {
    setCompleteId(id)
    setCompleteRemarks('')
    setShowCompleteModal(true)
  }

  const handleComplete = async () => {
    if (!completeId) return
    const ok = await completeAccessibilityArrangement(completeId, completeRemarks)
    if (ok) {
      setShowCompleteModal(false)
      fetchAccessibilityArrangements()
      alert('无障碍安排已标记完成')
    }
  }

  const handleBatchSubmit = async () => {
    if (selectedCandidates.length === 0 || !batchFormData.arrangement_type) {
      alert('请选择考生和无障碍类型')
      return
    }

    let successCount = 0
    for (const regId of selectedCandidates) {
      const data = {
        registration_id: regId,
        schedule_id: batchFormData.schedule_id || null,
        arrangement_type: batchFormData.arrangement_type,
        description: batchFormData.description,
        requirements: batchFormData.requirements,
      }
      const ok = await createAccessibilityArrangement(data)
      if (ok) successCount++
    }

    if (successCount > 0) {
      setShowBatchModal(false)
      setSelectedCandidates([])
      fetchAccessibilityArrangements()
      alert(`成功创建 ${successCount} 条无障碍安排`)
    }
  }

  const toggleCandidate = (regId: string) => {
    setSelectedCandidates(prev =>
      prev.includes(regId)
        ? prev.filter(id => id !== regId)
        : [...prev, regId]
    )
  }

  const selectAllCandidates = () => {
    if (selectedCandidates.length === batchFilteredRegistrations.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(batchFilteredRegistrations.map(r => r.id))
    }
  }

  const pendingCount = accessibilityArrangements.filter(a => a.status === 'pending').length
  const scheduledCount = accessibilityArrangements.filter(a => a.status === 'scheduled').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">无障碍考试安排</h1>
          <p className="text-sm text-slate-500 mt-1">管理考生的无障碍考试安排，包括特殊座位分配和特殊需求处理</p>
        </div>
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">{pendingCount} 个待安排</span>
            </div>
          )}
          {scheduledCount > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{scheduledCount} 个已安排</span>
            </div>
          )}
          <button
            onClick={() => openEditModal()}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />新增安排
          </button>
          <button
            onClick={() => {
              setBatchFormData({
                schedule_id: '',
                arrangement_type: 'wheelchair',
                description: '',
                requirements: '',
              })
              setSelectedCandidates([])
              setShowBatchModal(true)
            }}
            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
          >
            <Users className="w-4 h-4" />批量安排
          </button>
        </div>
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
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {accessibilityArrangements.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">暂无无障碍安排</td></tr>
            ) : accessibilityArrangements.map((a, i) => (
              <tr key={a.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                <td className="px-4 py-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {a.candidate_name || getCandidateInfo(a.registration_id)}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {getScheduleName(a.schedule_id)}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${accessibilityTypeBadge[a.arrangement_type]}`}>
                    {accessibilityTypeLabel[a.arrangement_type]}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm max-w-xs truncate" title={a.requirements || a.description || '-'}>
                  {a.requirements || a.description || '-'}
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[a.status]}`}>
                    {statusLabel[a.status]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    {(a.status === 'pending' || a.status === 'scheduled') && (
                      <>
                        <button
                          onClick={() => openEditModal(a.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                        >
                          <Edit className="w-3.5 h-3.5" />编辑
                        </button>
                        <button
                          onClick={() => openCompleteModal(a.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />完成
                        </button>
                      </>
                    )}
                    {a.status === 'completed' && (
                      <div className="text-xs text-slate-500">
                        {a.remarks && <div>备注：{a.remarks}</div>}
                        <div className="mt-1">
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          {dayjs(a.updated_at || a.created_at).format('YYYY-MM-DD HH:mm')}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editingId ? '编辑无障碍安排' : '新增无障碍安排'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />选择排考（选填）
                </label>
                <select
                  value={formData.schedule_id}
                  onChange={e => setFormData({ ...formData, schedule_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">暂不指定排考</option>
                  {schedules.filter(s => s.status === 'confirmed' || s.status === 'pending').map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name} ({s.exam_date} {s.exam_time})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />选择考生 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.registration_id}
                  onChange={e => setFormData({ ...formData, registration_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择考生</option>
                  {filteredRegistrations.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.candidate_name} - {r.subject_name} ({r.candidate_id_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Tag className="w-4 h-4 inline mr-1" />无障碍类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.arrangement_type}
                  onChange={e => setFormData({ ...formData, arrangement_type: e.target.value as any })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="wheelchair">轮椅通道</option>
                  <option value="visual_impairment">视力障碍</option>
                  <option value="hearing_impairment">听力障碍</option>
                  <option value="learning_disability">学习障碍</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />情况说明
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="请详细说明考生的无障碍需求情况"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <CheckCircle className="w-4 h-4 inline mr-1" />特殊要求
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {specialRequirementOptions.map(opt => (
                    <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const currentReqs = formData.requirements ? formData.requirements.split('、') : []
                      if (currentReqs.includes(opt)) {
                        setFormData({ ...formData, requirements: currentReqs.filter(r => r !== opt).join('、') })
                      } else {
                        setFormData({ ...formData, requirements: [...currentReqs, opt].join('、') })
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      formData.requirements?.includes(opt)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {formData.requirements?.includes(opt) ? <Check className="w-3 h-3 inline mr-1" /> : null}
                    {opt}
                  </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.requirements}
                  onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="或手动输入其他特殊要求，用顿号分隔"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <CheckCircle className="w-4 h-4 inline mr-1" />特殊座位号
                </label>
                <input
                  type="text"
                  value={formData.seat_no}
                  onChange={e => setFormData({ ...formData, seat_no: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：靠门口位置、宽敞位置、前排座位等"
                />
                <p className="text-xs text-slate-500 mt-1">提示：无障碍考生通常需要分配靠门口、宽敞或前排的特殊座位</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowModal(false)}>取消</button>
              <button
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={!formData.registration_id || !formData.arrangement_type}
              >
                {editingId ? '保存修改' : '创建安排'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCompleteModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">标记无障碍安排已完成</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">完成备注（选填）</label>
                <textarea
                  value={completeRemarks}
                  onChange={e => setCompleteRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="请输入完成情况说明"
                />
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline-block mr-1" />
                标记完成后，系统将自动记录变更日志。
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowCompleteModal(false)}>取消</button>
              <button
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                onClick={handleComplete}
              >
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBatchModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">批量创建无障碍安排</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />选择排考 <span className="text-red-500">*</span>
                </label>
                <select
                  value={batchFormData.schedule_id}
                  onChange={e => {
                    setBatchFormData({ ...batchFormData, schedule_id: e.target.value })
                    setSelectedCandidates([])
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择排考</option>
                  {schedules.filter(s => s.status === 'confirmed' || s.status === 'pending').map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name} ({s.exam_date} {s.exam_time})</option>
                  ))}
                </select>
              </div>

              {batchFormData.schedule_id && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      <Users className="w-4 h-4 inline mr-1" />选择考生 <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={selectAllCandidates}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {selectedCandidates.length === batchFilteredRegistrations.length ? '取消全选' : '全选'}
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                    {batchFilteredRegistrations.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">该排考下暂无考生</div>
                    ) : (
                      batchFilteredRegistrations.map(r => (
                        <label
                          key={r.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCandidates.includes(r.id)}
                            onChange={() => toggleCandidate(r.id)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-800">{r.candidate_name}</div>
                            <div className="text-xs text-slate-500">{r.subject_name} - {r.candidate_id_number}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">已选择 {selectedCandidates.length} 名考生</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Tag className="w-4 h-4 inline mr-1" />无障碍类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={batchFormData.arrangement_type}
                  onChange={e => setBatchFormData({ ...batchFormData, arrangement_type: e.target.value as any })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="wheelchair">轮椅通道</option>
                  <option value="visual_impairment">视力障碍</option>
                  <option value="hearing_impairment">听力障碍</option>
                  <option value="learning_disability">学习障碍</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />情况说明
                </label>
                <textarea
                  value={batchFormData.description}
                  onChange={e => setBatchFormData({ ...batchFormData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="请详细说明考生的无障碍需求情况"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <CheckCircle className="w-4 h-4 inline mr-1" />特殊要求
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {specialRequirementOptions.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const currentReqs = batchFormData.requirements ? batchFormData.requirements.split('、') : []
                        if (currentReqs.includes(opt)) {
                          setBatchFormData({ ...batchFormData, requirements: currentReqs.filter(r => r !== opt).join('、') })
                        } else {
                          setBatchFormData({ ...batchFormData, requirements: [...currentReqs, opt].join('、') })
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs border ${
                        batchFormData.requirements?.includes(opt)
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {batchFormData.requirements?.includes(opt) ? <Check className="w-3 h-3 inline mr-1" /> : null}
                      {opt}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={batchFormData.requirements}
                  onChange={e => setBatchFormData({ ...batchFormData, requirements: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="或手动输入其他特殊要求，用顿号分隔"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => {
                setShowBatchModal(false)
                setSelectedCandidates([])
              }}>取消</button>
              <button
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                onClick={handleBatchSubmit}
                disabled={selectedCandidates.length === 0 || !batchFormData.arrangement_type}
              >
                批量创建 ({selectedCandidates.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
