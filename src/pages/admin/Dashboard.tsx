import { useEffect, useMemo } from 'react'
import { ClipboardList, Clock, CalendarCheck, CalendarDays, ListTodo, Layers, LayoutGrid } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const payBadge: Record<string, string> = { unpaid: 'bg-red-100 text-red-700', paid: 'bg-green-100 text-green-700' }
const payLabel: Record<string, string> = { unpaid: '未缴费', paid: '已缴费' }

export default function AdminDashboard() {
  const { registrations, pendingRegistrations, schedules, loading, fetchRegistrations, fetchPendingRegistrations, fetchSchedules } = useDataStore()

  useEffect(() => {
    fetchRegistrations()
    fetchPendingRegistrations()
    fetchSchedules()
  }, [])

  const stats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD')
    return {
      totalRegistrations: registrations.length,
      pendingCount: pendingRegistrations.length,
      scheduledCount: registrations.filter(r => r.exam_status === 'scheduled').length,
      todayExams: schedules.filter(s => s.exam_date === today).length,
    }
  }, [registrations, pendingRegistrations, schedules])

  const recentPending = useMemo(() => pendingRegistrations.slice(0, 10), [pendingRegistrations])

  const statCards = [
    { icon: ClipboardList, label: '报名总数', value: stats.totalRegistrations, bg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { icon: Clock, label: '待分配', value: stats.pendingCount, bg: 'bg-orange-100', iconColor: 'text-orange-600' },
    { icon: CalendarCheck, label: '已排考', value: stats.scheduledCount, bg: 'bg-green-100', iconColor: 'text-green-600' },
    { icon: CalendarDays, label: '今日考试', value: stats.todayExams, bg: 'bg-purple-100', iconColor: 'text-purple-600' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">管理仪表盘</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.iconColor}`} />
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
            <h2 className="text-lg font-semibold text-slate-800">待分配报名</h2>
          </div>
          {loading ? (
            <div className="text-center py-12 text-slate-400">加载中...</div>
          ) : recentPending.length === 0 ? (
            <div className="text-center py-12 text-slate-400">暂无待分配报名</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">考生</th>
                  <th className="px-4 py-3 font-medium">身份证号</th>
                  <th className="px-4 py-3 font-medium">科目</th>
                  <th className="px-4 py-3 font-medium">等级</th>
                  <th className="px-4 py-3 font-medium">缴费</th>
                </tr>
              </thead>
              <tbody>
                {recentPending.map((r, i) => (
                  <tr key={r.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-sm">{r.candidate_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{r.candidate_id_card || r.candidate_id_number || '-'}</td>
                    <td className="px-4 py-3 text-sm">{r.subject_name || r.subject}</td>
                    <td className="px-4 py-3 text-sm">{r.skill_level_name || r.skill_level}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${payBadge[r.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                        {payLabel[r.payment_status] || r.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">快捷操作</h2>
          <div className="space-y-3">
            <Link to="/admin/pending" className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors">
              <ListTodo className="w-5 h-5" />
              <span className="font-medium">待分配名单</span>
            </Link>
            <Link to="/admin/batches" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors">
              <Layers className="w-5 h-5" />
              <span className="font-medium">批次管理</span>
            </Link>
            <Link to="/admin/schedules" className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors">
              <LayoutGrid className="w-5 h-5" />
              <span className="font-medium">排考管理</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
