import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const statusBadge: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
}
const statusLabel: Record<string, string> = {
  pending: '待处理',
  scheduled: '已排考',
  completed: '已完成',
  approved: '已批准',
  rejected: '已驳回',
}
const examStatusMap: Record<string, string> = {
  not_scheduled: '未排考',
  scheduled: '已排考',
  absent: '缺考',
  cheating: '作弊',
  passed: '通过',
  failed: '未通过',
}

export default function MakeupExams() {
  const { makeupExams, loading, registrations, fetchMakeupExams, createMakeupExam, fetchRegistrations } = useDataStore()
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ registration_id: '', reason: '' })

  useEffect(() => {
    const params: Record<string, string> = {}
    if (statusFilter) params.status = statusFilter
    fetchMakeupExams(params)
  }, [statusFilter])

  useEffect(() => {
    if (showModal) {
      fetchRegistrations({ payment_status: 'paid' })
    }
  }, [showModal])

  const onCreate = async () => {
    if (!formData.registration_id || !formData.reason) return
    const ok = await createMakeupExam(formData.registration_id, formData.reason)
    if (ok) {
      setShowModal(false)
      setFormData({ registration_id: '', reason: '' })
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      fetchMakeupExams(params)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">补考管理</h1>
        <button
          className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />创建补考
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
            <option value="pending">待处理</option>
            <option value="scheduled">已排考</option>
            <option value="completed">已完成</option>
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
                <th className="px-4 py-3 font-medium">原考试状态</th>
                <th className="px-4 py-3 font-medium">补考原因</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {makeupExams.map((m: any, i: number) => (
                <tr key={m.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-4 py-3 text-sm">{m.candidate_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{m.id_card || '-'}</td>
                  <td className="px-4 py-3 text-sm">{m.subject_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{m.skill_level_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{examStatusMap[m.original_exam_status] || m.original_exam_status || '-'}</td>
                  <td className="px-4 py-3 text-sm max-w-[200px] truncate">{m.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[m.status] || ''}`}>
                      {statusLabel[m.status] || m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{dayjs(m.created_at).format('YYYY-MM-DD HH:mm')}</td>
                </tr>
              ))}
              {makeupExams.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">暂无补考记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">创建补考</h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">补考原因</label>
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
