import { useState, useEffect } from 'react'
import { Plus, CreditCard, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const regStatusBadge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
  frozen: 'bg-red-100 text-red-700',
}
const regStatusLabel: Record<string, string> = { pending: '待确认', confirmed: '已确认', cancelled: '已取消', frozen: '已冻结' }
const payBadge: Record<string, string> = { unpaid: 'bg-red-100 text-red-700', paid: 'bg-green-100 text-green-700', refunded: 'bg-purple-100 text-purple-700' }
const payLabel: Record<string, string> = { unpaid: '未缴费', paid: '已缴费', refunded: '已退款' }
const examBadge: Record<string, string> = {
  not_scheduled: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  absent: 'bg-yellow-100 text-yellow-700',
  cheating: 'bg-red-100 text-red-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-orange-100 text-orange-700',
}
const examLabel: Record<string, string> = { not_scheduled: '未排考', scheduled: '已排考', absent: '缺考', cheating: '作弊', passed: '通过', failed: '未通过' }

export default function InstRegistrations() {
  const { user } = useAuthStore()
  const { registrations, candidates, masterData, loading, fetchRegistrations, fetchCandidates, fetchMasterData, payRegistration } = useDataStore()
  const instId = user?.institution_id

  const [statusFilter, setStatusFilter] = useState('')
  const [payFilter, setPayFilter] = useState('')
  const [examFilter, setExamFilter] = useState('')
  const [regModal, setRegModal] = useState(false)
  const [payModal, setPayModal] = useState<any>(null)
  const [regForm, setRegForm] = useState({ candidate_id: '', skill_level: '', subject: '' })
  const [payForm, setPayForm] = useState({ payment_method: 'bank_transfer', transaction_no: '', amount: '' })

  useEffect(() => {
    fetchRegistrations(instId ? { institution_id: instId } : undefined)
    if (instId) fetchCandidates(instId)
    fetchMasterData()
  }, [instId])

  const refreshList = () => {
    const filters: Record<string, string> = {}
    if (instId) filters.institution_id = instId
    if (statusFilter) filters.status = statusFilter
    if (payFilter) filters.payment_status = payFilter
    if (examFilter) filters.exam_status = examFilter
    fetchRegistrations(filters)
  }

  useEffect(() => { refreshList() }, [statusFilter, payFilter, examFilter])

  const onRegister = async () => {
    if (!regForm.candidate_id || !regForm.skill_level || !regForm.subject) return
    const { api } = await import('@/lib/api.js')
    const res = await api.post('/registrations', {
      candidate_id: regForm.candidate_id,
      skill_level_id: regForm.skill_level,
      subject_id: regForm.subject,
    })
    if (res.success) {
      setRegModal(false)
      setRegForm({ candidate_id: '', skill_level: '', subject: '' })
      refreshList()
    }
  }

  const onPay = async () => {
    if (!payModal || !payForm.transaction_no || !payForm.amount) return
    const ok = await payRegistration(payModal.id, {
      payment_method: payForm.payment_method,
      transaction_no: payForm.transaction_no,
      amount: parseFloat(payForm.amount),
    })
    if (ok) {
      setPayModal(null)
      setPayForm({ payment_method: 'bank_transfer', transaction_no: '', amount: '' })
      refreshList()
    }
  }

  const filtered = registrations.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false
    if (payFilter && r.payment_status !== payFilter) return false
    if (examFilter && r.exam_status !== examFilter) return false
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">报名管理</h1>
        <button className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium" onClick={() => setRegModal(true)}>
          <Plus className="w-4 h-4" />报名
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部状态</option>
            <option value="pending">待确认</option>
            <option value="confirmed">已确认</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">全部缴费</option>
          <option value="unpaid">未缴费</option>
          <option value="paid">已缴费</option>
        </select>
        <select value={examFilter} onChange={e => setExamFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">全部考试状态</option>
          <option value="not_scheduled">未排考</option>
          <option value="scheduled">已排考</option>
          <option value="passed">通过</option>
          <option value="failed">未通过</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400">暂无报名记录</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">考生</th>
                <th className="px-4 py-3 font-medium">身份证号</th>
                <th className="px-4 py-3 font-medium">科目</th>
                <th className="px-4 py-3 font-medium">等级</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">缴费</th>
                <th className="px-4 py-3 font-medium">考试状态</th>
                <th className="px-4 py-3 font-medium">报名时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="px-4 py-3 text-sm">{r.candidate_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.candidate_id_card || r.candidate_id_number || '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.subject_name || r.subject}</td>
                  <td className="px-4 py-3 text-sm">{r.skill_level_name || r.skill_level}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${regStatusBadge[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {regStatusLabel[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${payBadge[r.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                      {payLabel[r.payment_status] || r.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${examBadge[r.exam_status] || 'bg-gray-100 text-gray-600'}`}>
                      {examLabel[r.exam_status] || r.exam_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{dayjs(r.created_at).format('YYYY-MM-DD')}</td>
                  <td className="px-4 py-3">
                    {r.payment_status === 'unpaid' && (
                      <button className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm" onClick={() => setPayModal(r)}>
                        <CreditCard className="w-3.5 h-3.5" />缴费
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {regModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRegModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">报名考试</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择考生</label>
                <select value={regForm.candidate_id} onChange={e => setRegForm(f => ({ ...f, candidate_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id_card || c.id_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">等级</label>
                <select value={regForm.skill_level} onChange={e => setRegForm(f => ({ ...f, skill_level: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {masterData.skillLevels.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">科目</label>
                <select value={regForm.subject} onChange={e => setRegForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {masterData.subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setRegModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={onRegister} disabled={!regForm.candidate_id || !regForm.skill_level || !regForm.subject}>确认报名</button>
            </div>
          </div>
        </div>
      )}

      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">缴费</h2>
            <div className="bg-slate-50 rounded-lg p-3 text-sm mb-4">
              <div>考生：<span className="font-medium">{payModal.candidate_name}</span></div>
              <div>科目：<span className="font-medium">{payModal.subject_name || payModal.subject}</span></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">缴费方式</label>
                <select value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="bank_transfer">银行转账</option>
                  <option value="online">在线支付</option>
                  <option value="cash">现金</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">交易号</label>
                <input type="text" value={payForm.transaction_no} onChange={e => setPayForm(f => ({ ...f, transaction_no: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">金额</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setPayModal(null)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={onPay} disabled={!payForm.transaction_no || !payForm.amount}>确认缴费</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
