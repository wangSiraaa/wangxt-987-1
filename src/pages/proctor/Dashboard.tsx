import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users, MapPin, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

export default function ProctorDashboard() {
  const { user } = useAuthStore()
  const { schedules, loading, fetchTodaySchedules } = useDataStore()
  const navigate = useNavigate()

  const loadData = useCallback(() => {
    if (user?.id) fetchTodaySchedules(user.id)
  }, [fetchTodaySchedules, user?.id])

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 30000)
    return () => clearInterval(timer)
  }, [loadData])

  const totalSchedules = schedules.length
  const totalCandidates = schedules.reduce((sum: number, s: any) => sum + (s.assigned_count || 0), 0)
  const checkedInCount = schedules.reduce((sum: number, s: any) => sum + (s.checked_in_count || 0), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">监考工作台</h1>
        <span className="text-sm text-slate-500">{dayjs().format('YYYY年MM月DD日')}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{totalSchedules}</div>
              <div className="text-sm text-slate-500">今日考试场次</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{totalCandidates}</div>
              <div className="text-sm text-slate-500">应到人数</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{checkedInCount}</div>
              <div className="text-sm text-slate-500">已签到人数</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-4">今日考试安排</h2>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400">今日暂无考试安排</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((s: any) => (
            <div
              key={s.id}
              className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer border border-slate-100"
              onClick={() => navigate(`/proctor/checkin/${s.id}`)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{s.subject_name || '-'}</span>
                <span className="text-xs text-slate-400">{s.skill_level_name || '-'}</span>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{s.room_name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>已安排 {s.assigned_count || 0} 人</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
