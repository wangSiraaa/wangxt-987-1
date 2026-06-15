import { useEffect, useMemo } from 'react'
import { Users, ClipboardList, CreditCard, CalendarCheck, UserPlus, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const payBadge: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
}
const payLabel: Record<string, string> = { unpaid: '未缴费', paid: '已缴费' }
const examBadge: Record<string, string> = {
  not_scheduled: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  absent: 'bg-yellow-100 text-yellow-700',
  cheating: 'bg-red-100 text-red-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-orange-100 text-orange-700',
}
const examLabel: Record<string, string> = {
  not_scheduled: '未排考',
  scheduled: '已排考',
  absent: '缺考',
  cheating: '作弊',
  passed: '通过',
  failed: '未通过',
}

export default function InstDashboard() {
  const { user } = useAuthStore()
  const { candidates, registrations, loading, fetchCandidates, fetchRegistrations } = useDataStore()
  const instId = user?.institution_id

  useEffect(() => {
    if (instId) fetchCandidates(instId)
    fetchRegistrations(instId ? { institution_id: instId } : undefined)
  }, [instId])

  const stats = useMemo(() => ({
    totalCandidates: candidates.length,
    totalRegistrations: registrations.length,
    paidCount: registrations.filter(r => r.payment_status === 'paid').length,
    scheduledCount: registrations.filter(r => r.exam_status === 'scheduled').length,
  }), [candidates, registrations])

  const recentRegs = useMemo(() => [...registrations].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10), [registrations])

  const statCards = [
    { icon: Users, label: '考生总数', value: stats.totalCandidates, color: 'blue' },
    { icon: ClipboardList, label: '报名总数', value: stats.totalRegistrations, color: 'green' },
    { icon: CreditCard, label: '已缴费', value: stats.paidCount, color: 'emerald' },
    { icon: CalendarCheck, label: '已排考', value: stats.scheduledCount, color: 'purple' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">机构仪表盘</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[s.color]}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">最近报名</h2>
          </div>
          {loading ? (
            <div className="text-center py-12 text-slate-400">加载中...</div>
          ) : recentRegs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">暂无报名记录</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">考生</th>
                  <th className="px-4 py-3 font-medium">科目</th>
                  <th className="px-4 py-3 font-medium">缴费状态</th>
                  <th className="px-4 py-3 font-medium">考试状态</th>
                  <th className="px-4 py-3 font-medium">报名时间</th>
                </tr>
              </thead>
              <tbody>
                {recentRegs.map((r, i) => (
                  <tr key={r.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm">{r.candidate_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{r.subject_name || r.subject}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">快捷操作</h2>
          <div className="space-y-3">
            <Link to="/institution/candidates" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors">
              <UserPlus className="w-5 h-5" />
              <span className="font-medium">添加考生</span>
            </Link>
            <Link to="/institution/registrations" className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors">
              <FileText className="w-5 h-5" />
              <span className="font-medium">报名考试</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
