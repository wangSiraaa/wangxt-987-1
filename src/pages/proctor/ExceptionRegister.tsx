import { useState, useEffect } from 'react'
import { AlertTriangle, Send } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const typeLabel: Record<string, string> = {
  checkin: '签到异常',
  cheating: '作弊',
  absent: '缺考',
  other: '其他',
}
const statusBadge: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-red-100 text-red-700',
  dismissed: 'bg-green-100 text-green-700',
}
const statusLabel: Record<string, string> = {
  pending: '待处理',
  confirmed: '已确认',
  dismissed: '已驳回',
}

export default function ExceptionRegister() {
  const { exceptions, loading, registerException, fetchExceptions } = useDataStore()
  const [formData, setFormData] = useState({
    type: 'checkin',
    candidate_id: '',
    description: '',
    evidence: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchExceptions()
  }, [])

  const candidates: any[] = []

  const onSubmit = async () => {
    if (!formData.type || !formData.description) return
    setSubmitting(true)
    const data: any = {
      registrationId: formData.candidate_id,
      type: formData.type,
      description: formData.description,
    }
    if (formData.evidence) data.evidence = formData.evidence
    const ok = await registerException(data)
    setSubmitting(false)
    if (ok) {
      setFormData({ type: 'checkin', candidate_id: '', description: '', evidence: '' })
      fetchExceptions()
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">异常登记</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-slate-800">登记异常</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">异常类型</label>
            <select
              value={formData.type}
              onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="checkin">签到异常</option>
              <option value="cheating">作弊</option>
              <option value="absent">缺考</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">考生（可选）</label>
            <select
              value={formData.candidate_id}
              onChange={e => setFormData(f => ({ ...f, candidate_id: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">不指定考生</option>
              {candidates.map((c: any) => (
                <option key={c.candidate_id} value={c.candidate_id}>
                  {c.candidate_name} ({c.id_card})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">异常描述</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="请描述异常情况"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">证据描述</label>
            <input
              type="text"
              value={formData.evidence}
              onChange={e => setFormData(f => ({ ...f, evidence: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="证据说明（可选）"
            />
          </div>
          <button
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            onClick={onSubmit}
            disabled={submitting || !formData.description}
          >
            <Send className="w-4 h-4" />提交
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-800 px-6 pt-5 pb-3">近期异常记录</h2>
        {loading ? (
          <div className="text-center py-8 text-slate-400">加载中...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">考生</th>
                <th className="px-4 py-3 font-medium">描述</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.slice(0, 20).map((e: any, i: number) => (
                <tr key={e.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-4 py-3 text-sm">{typeLabel[e.type] || e.type}</td>
                  <td className="px-4 py-3 text-sm">{e.candidate_name || '-'}</td>
                  <td className="px-4 py-3 text-sm max-w-[250px] truncate">{e.description}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[e.status] || ''}`}>
                      {statusLabel[e.status] || e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{dayjs(e.created_at).format('YYYY-MM-DD HH:mm')}</td>
                </tr>
              ))}
              {exceptions.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无异常记录</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
