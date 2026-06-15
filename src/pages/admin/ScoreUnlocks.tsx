import { useState, useEffect } from 'react'
import { Plus, Search, Check, X } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const statusBadge: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}
const statusLabel: Record<string, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已驳回',
}

export default function ScoreUnlocks() {
  const { scoreUnlocks, loading, registrations, fetchScoreUnlocks, createScoreUnlock, approveScoreUnlock, rejectScoreUnlock, fetchRegistrations } = useDataStore()
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ registration_id: '', reason: '' })

  useEffect(() => {
    const params: Record<string, string> = {}
    if (statusFilter) params.status = statusFilter
    fetchScoreUnlocks(params)
  }, [statusFilter])

  useEffect(() => {
    if (showModal) {
      fetchRegistrations({ payment_status: 'paid' })
    }
  }, [showModal])

  const onCreate = async () => {
    if (!formData.registration_id || !formData.reason) return
    const ok = await createScoreUnlock(formData.registration_id, formData.reason)
    if (ok) {
      setShowModal(false)
      setFormData({ registration_id: '', reason: '' })
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      fetchScoreUnlocks(params)
    }
  }

  const onApprove = async (id: string) => {
    const ok = await approveScoreUnlock(id)
    if (ok) {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      fetchScoreUnlocks(params)
    }
  }

  const onReject = async (id: string) => {
    const ok = await rejectScoreUnlock(id)
    if (ok) {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      fetchScoreUnlocks(params)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">成绩解锁管理</h1>
        <button
          className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />创建解锁
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            <option value="pending">待审批</option>
            <option value="approved">已批准</option>
            <option value="rejected">已驳回</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">考生姓名</th>
                <th className="px-4 py-3 font-medium">身份证号</th>
                <th className="px-4 py-3 font-medium">科目</th>
                <th className="px-4 py-3 font-medium">等级</th>
                <th className="px-4 py-3 font-medium">解锁原因</th>
                <th className="px-4 py-3 font-medium">申请人</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">创建时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {scoreUnlocks.map((s: any, i: number) => (
                <tr key={s.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-4 py-3 text-sm">{s.candidate_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{s.id_card || '-'}</td>
                  <td className="px-4 py-3 text-sm">{s.subject_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{s.skill_level_name || '-'}</td>
                  <td className="px-4 py-3 text-sm max-w-[200px] truncate">{s.unlock_reason || s.reason}</td>
                  <td className="px-4 py-3 text-sm">{s.requester_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[s.status] || ''}`}>
                      {statusLabel[s.status] || s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{dayjs(s.created_at).format('YYYY-MM-DD HH:mm')}</td>
                  <td className="px-4 py-3">
                    {s.status === 'pending' && (
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm" onClick={() => onApprove(s.id)}>
                          <Check className="w-3.5 h-3.5" />批准
                        </button>
                        <button className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm" onClick={() => onReject(s.id)}>
                          <X className="w-3.5 h-3.5" />驳回
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {scoreUnlocks.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">暂无解锁记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">创建成绩解锁</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择报名记录</label>
                <select
                  value={formData.registration_id}
                  onChange={e => setFormData(f => ({ ...f, registration_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {registrations.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.candidate_name} - {r.subject_name} ({r.skill_level_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">解锁原因</label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={onCreate} disabled={!formData.registration_id || !formData.reason}>确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
