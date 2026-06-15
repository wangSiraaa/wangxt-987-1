import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RefreshCw, UserCheck, UserX, Clock, MapPin, BookOpen } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const checkinStatusBadge: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  checked_in: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
}
const checkinStatusLabel: Record<string, string> = {
  pending: '待签到',
  checked_in: '已签到',
  absent: '缺考',
}

export default function Checkin() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const navigate = useNavigate()
  const { loading, fetchScheduleDetail, fetchCheckinRecords, checkin, markAbsent, checkinRecords, checkinStats } = useDataStore()
  const [scheduleData, setScheduleData] = useState<any>(null)
  const [checkinModal, setCheckinModal] = useState<any>(null)
  const [checkinForm, setCheckinForm] = useState({ id_card: '', checkin_method: 'id_card', exception_type: '', exception_remark: '' })

  const loadData = async () => {
    if (!scheduleId) return
    const detail = await fetchScheduleDetail(scheduleId)
    setScheduleData(detail)
    await fetchCheckinRecords(scheduleId)
  }

  useEffect(() => { loadData() }, [scheduleId])

  const seats = scheduleData?.registrations || scheduleData?.seats || []

  const stats = checkinStats || seats.reduce((acc: any, s: any) => {
    acc.total++
    if (s.checkin_status === 'checked_in') acc.checked_in++
    else if (s.checkin_status === 'absent') acc.absent++
    else acc.pending++
    return acc
  }, { total: 0, checked_in: 0, absent: 0, pending: 0 })

  const onCheckin = async () => {
    if (!checkinModal) return
    const ok = await checkin({
      seatArrangementId: checkinModal.id || checkinModal.registration_id || checkinModal.registrationId,
      registrationId: checkinModal.registration_id || checkinModal.registrationId,
      scheduleId: scheduleId!,
      type: checkinForm.checkin_method,
      idCard: checkinForm.id_card || checkinModal.id_card,
    })
    if (ok) {
      setCheckinModal(null)
      setCheckinForm({ id_card: '', checkin_method: 'id_card', exception_type: '', exception_remark: '' })
      loadData()
    }
  }

  const onMarkAbsent = async () => {
    const pendingSeats = seats.filter((s: any) => s.checkin_status === 'pending')
    if (pendingSeats.length === 0) return
    if (!confirm(`确认将 ${pendingSeats.length} 名未签到考生标记为缺考？`)) return
    const ids = pendingSeats.map((s: any) => s.id)
    const ok = await markAbsent(ids)
    if (ok) loadData()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">签到管理</h1>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 text-sm"
            onClick={loadData}
          >
            <RefreshCw className="w-4 h-4" />刷新
          </button>
          <button
            className="flex items-center gap-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 text-sm"
            onClick={onMarkAbsent}
          >
            <UserX className="w-4 h-4" />标记缺考
          </button>
        </div>
      </div>

      {scheduleData && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-slate-500">科目：</span>
              <span className="font-medium">{scheduleData.subject_name || scheduleData.subject}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-slate-500">考场：</span>
              <span className="font-medium">{scheduleData.room_name || scheduleData.exam_room}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-slate-500">时间：</span>
              <span className="font-medium">
                {scheduleData.exam_date} {scheduleData.start_time?.slice(0,5) || ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span className="text-slate-500">监考：</span>
              <span className="font-medium">{scheduleData.proctor_name || '-'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm">
          <span className="text-slate-500">总计 </span>
          <span className="font-bold text-blue-700">{stats.total || seats.length}</span>
        </div>
        <div className="bg-green-50 rounded-lg px-4 py-2 text-sm">
          <span className="text-slate-500">已签到 </span>
          <span className="font-bold text-green-700">{stats.checked_in || 0}</span>
        </div>
        <div className="bg-red-50 rounded-lg px-4 py-2 text-sm">
          <span className="text-slate-500">缺考 </span>
          <span className="font-bold text-red-700">{stats.absent || 0}</span>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm">
          <span className="text-slate-500">待签到 </span>
          <span className="font-bold text-gray-700">{stats.pending || 0}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">座位号</th>
                <th className="px-4 py-3 font-medium">考生姓名</th>
                <th className="px-4 py-3 font-medium">身份证号</th>
                <th className="px-4 py-3 font-medium">所属机构</th>
                <th className="px-4 py-3 font-medium">签到状态</th>
                <th className="px-4 py-3 font-medium">签到时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((s: any, i: number) => (
                <tr key={s.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium">{s.seat_no}</td>
                  <td className="px-4 py-3 text-sm">{s.candidate_name}</td>
                  <td className="px-4 py-3 text-sm">{s.id_card}</td>
                  <td className="px-4 py-3 text-sm">{s.institution_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${checkinStatusBadge[s.checkin_status] || checkinStatusBadge.pending}`}>
                      {checkinStatusLabel[s.checkin_status] || '待签到'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{s.checkin_time ? dayjs(s.checkin_time).format('HH:mm:ss') : '-'}</td>
                  <td className="px-4 py-3">
                    {s.checkin_status === 'pending' && (
                      <button
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        onClick={() => setCheckinModal(s)}
                      >
                        <UserCheck className="w-3.5 h-3.5" />签到
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {seats.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">暂无考生数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {checkinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCheckinModal(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">考生签到</h2>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <div>姓名：<span className="font-medium">{checkinModal.candidate_name}</span></div>
                <div>身份证：<span className="font-medium">{checkinModal.id_card}</span></div>
                <div>座位号：<span className="font-medium">{checkinModal.seat_no}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">验证身份证号</label>
                <input
                  type="text"
                  value={checkinForm.id_card}
                  onChange={e => setCheckinForm(f => ({ ...f, id_card: e.target.value }))}
                  placeholder="输入身份证号验证（可选）"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">签到方式</label>
                <select
                  value={checkinForm.checkin_method}
                  onChange={e => setCheckinForm(f => ({ ...f, checkin_method: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="id_card">身份证</option>
                  <option value="face">人脸识别</option>
                  <option value="manual">手动签到</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">异常类型（可选）</label>
                <select
                  value={checkinForm.exception_type}
                  onChange={e => setCheckinForm(f => ({ ...f, exception_type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">无异常</option>
                  <option value="checkin">签到异常</option>
                  <option value="cheating">作弊</option>
                  <option value="absent">缺考</option>
                  <option value="other">其他</option>
                </select>
              </div>
              {checkinForm.exception_type && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">异常备注</label>
                  <textarea
                    value={checkinForm.exception_remark}
                    onChange={e => setCheckinForm(f => ({ ...f, exception_remark: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setCheckinModal(null)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={onCheckin}>确认签到</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
