import { useState, useEffect } from 'react'
import { Check, X, Clock, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const statusLabel: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
}

export default function DeferralApprovals() {
  const {
    deferralRequests,
    schedules,
    registrations,
    loading,
    fetchDeferralRequests,
    fetchSchedules,
    fetchRegistrations,
    approveDeferral,
    rejectDeferral,
  } = useDataStore()

  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [approvalRemarks, setApprovalRemarks] = useState('')
  const [newScheduleId, setNewScheduleId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)

  useEffect(() => {
    fetchDeferralRequests()
    fetchSchedules()
    fetchRegistrations()
  }, [])

  const openModal = (id: string, type: 'approve' | 'reject') => {
    setSelectedRequest(id)
    setActionType(type)
    setApprovalRemarks('')
    setNewScheduleId('')
    setShowModal(true)
  }

  const handleApprove = async () => {
    if (!selectedRequest || !newScheduleId) return
    const ok = await approveDeferral(selectedRequest, newScheduleId, approvalRemarks)
    if (ok) {
      setShowModal(false)
      fetchDeferralRequests()
      fetchRegistrations()
      alert('缓考申请已通过，已重新安排考试')
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    const ok = await rejectDeferral(selectedRequest, approvalRemarks)
    if (ok) {
      setShowModal(false)
      fetchDeferralRequests()
      alert('缓考申请已驳回')
    }
  }

  const pendingCount = deferralRequests.filter(r => r.status === 'pending').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">缓考审批</h1>
          <p className="text-sm text-slate-500 mt-1">审核考生的缓考申请，决定是否通过并重新安排考试</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">{pendingCount} 个申请待审批</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left text-sm text-slate-600">
              <th className="px-4 py-3 font-medium">考生</th>
              <th className="px-4 py-3 font-medium">原排考</th>
              <th className="px-4 py-3 font-medium">申请原因</th>
              <th className="px-4 py-3 font-medium">证明材料</th>
              <th className="px-4 py-3 font-medium">申请时间</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {deferralRequests.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">暂无缓考申请</td></tr>
            ) : deferralRequests.map((r, i) => (
              <tr key={r.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                <td className="px-4 py-4 text-sm font-medium">{r.candidate_name}</td>
                <td className="px-4 py-4 text-sm">{r.original_schedule_name || '-'}</td>
                <td className="px-4 py-4 text-sm max-w-xs truncate" title={r.reason}>{r.reason}</td>
                <td className="px-4 py-4 text-sm">
                  {r.evidence ? (
                    <a href={r.evidence} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      查看证明
                    </a>
                  ) : (
                    <span className="text-slate-400">无</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm">{dayjs(r.requested_at).format('YYYY-MM-DD HH:mm')}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[r.status]}`}>
                    {statusLabel[r.status]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(r.id, 'approve')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                      >
                        <Check className="w-3.5 h-3.5" />通过
                      </button>
                      <button
                        onClick={() => openModal(r.id, 'reject')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                      >
                        <X className="w-3.5 h-3.5" />驳回
                      </button>
                    </div>
                  )}
                  {r.status !== 'pending' && (
                    <div className="text-xs text-slate-500">
                      {r.approved_by ? `处理人：${r.approved_by}` : ''}
                      {r.remarks && <div className="mt-1">备注：{r.remarks}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {actionType === 'approve' ? '通过缓考申请' : '驳回缓考申请'}
            </h2>
            
            {actionType === 'approve' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">选择新排考</label>
                  <select value={newScheduleId} onChange={e => setNewScheduleId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">请选择新的考试安排</option>
                    {schedules.filter(s => s.status === 'confirmed' || s.status === 'pending').map(s => (
                      <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name} ({s.exam_date})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">审批备注（选填）</label>
                  <textarea value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="请输入审批意见" />
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <CheckCircle className="w-4 h-4 inline-block mr-1" />
                  通过后系统将自动为考生重新安排座位，并记录变更日志。
                </div>
              </div>
            )}

            {actionType === 'reject' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">驳回原因</label>
                  <textarea value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请详细说明驳回原因" />
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  <XCircle className="w-4 h-4 inline-block mr-1" />
                  驳回后考生需按原考试安排参加考试，或重新提交申请。
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowModal(false)}>取消</button>
              <button
                className={`flex-1 py-2 text-white rounded-lg text-sm ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={actionType === 'approve' ? handleApprove : handleReject}
                disabled={actionType === 'approve' ? !newScheduleId : !approvalRemarks}
              >
                确认{actionType === 'approve' ? '通过' : '驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
