import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LayoutDashboard, Users, ClipboardList, CalendarDays, AlertTriangle, FileText, Unlock, LogOut, Menu, X, Clock, Wrench, UserCheck, Eye, Ban, History, Accessibility } from 'lucide-react'
import { useState } from 'react'

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: '仪表盘', end: true },
  { to: '/admin/batches', icon: CalendarDays, label: '考试批次' },
  { to: '/admin/schedules', icon: ClipboardList, label: '排考管理' },
  { to: '/admin/pending', icon: Users, label: '待分配名单' },
  { to: '/admin/exam-day-changes', icon: Clock, label: '临考变更' },
  { to: '/admin/deferrals', icon: Eye, label: '缓考审批' },
  { to: '/admin/equipment-failures', icon: Wrench, label: '设备故障' },
  { to: '/admin/proctor-conflicts', icon: UserCheck, label: '监考回避' },
  { to: '/admin/accessibility', icon: Accessibility, label: '无障碍安排' },
  { to: '/admin/cheating-reviews', icon: Ban, label: '作弊复核' },
  { to: '/admin/change-logs', icon: History, label: '变更日志' },
  { to: '/admin/exceptions', icon: AlertTriangle, label: '异常记录' },
  { to: '/admin/makeup', icon: FileText, label: '补考管理' },
  { to: '/admin/score-unlocks', icon: Unlock, label: '成绩解锁' },
]

const institutionLinks = [
  { to: '/institution', icon: LayoutDashboard, label: '仪表盘', end: true },
  { to: '/institution/candidates', icon: Users, label: '考生管理' },
  { to: '/institution/registrations', icon: ClipboardList, label: '报名管理' },
]

const proctorLinks = [
  { to: '/proctor', icon: LayoutDashboard, label: '工作台', end: true },
  { to: '/proctor/exceptions', icon: AlertTriangle, label: '异常登记' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const links = user?.role === 'exam_admin' || user?.role === 'system' ? adminLinks
    : user?.role === 'institution' ? institutionLinks
    : proctorLinks

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="w-60 bg-slate-800 text-white flex-shrink-0 flex flex-col">
        <div className="p-4 text-lg font-bold border-b border-slate-700">考试管理系统</div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="text-sm text-slate-400 mb-2 truncate">{user?.name || user?.username}</div>
          <button
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
