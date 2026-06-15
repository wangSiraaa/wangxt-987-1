import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import InstDashboard from '@/pages/institution/Dashboard'
import Candidates from '@/pages/institution/Candidates'
import InstRegistrations from '@/pages/institution/Registrations'
import AdminDashboard from '@/pages/admin/Dashboard'
import Batches from '@/pages/admin/Batches'
import Schedules from '@/pages/admin/Schedules'
import PendingList from '@/pages/admin/PendingList'
import Exceptions from '@/pages/admin/Exceptions'
import MakeupExams from '@/pages/admin/MakeupExams'
import ScoreUnlocks from '@/pages/admin/ScoreUnlocks'
import ProctorDashboard from '@/pages/proctor/Dashboard'
import Checkin from '@/pages/proctor/Checkin'
import ExceptionRegister from '@/pages/proctor/ExceptionRegister'
import { useAuthStore } from '@/stores/authStore'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/login" />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/institution" element={<ProtectedRoute roles={['institution']}><Layout /></ProtectedRoute>}>
          <Route index element={<InstDashboard />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="registrations" element={<InstRegistrations />} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute roles={['exam_admin','system']}><Layout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="batches" element={<Batches />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="pending" element={<PendingList />} />
          <Route path="exceptions" element={<Exceptions />} />
          <Route path="makeup" element={<MakeupExams />} />
          <Route path="score-unlocks" element={<ScoreUnlocks />} />
        </Route>
        <Route path="/proctor" element={<ProtectedRoute roles={['proctor']}><Layout /></ProtectedRoute>}>
          <Route index element={<ProctorDashboard />} />
          <Route path="checkin/:scheduleId" element={<Checkin />} />
          <Route path="exceptions" element={<ExceptionRegister />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}
