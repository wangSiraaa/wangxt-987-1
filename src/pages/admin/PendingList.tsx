import { useState, useEffect } from 'react'
import { CalendarPlus, AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const payBadge: Record<string, string> = { unpaid: 'bg-red-100 text-red-700', paid: 'bg-green-100 text-green-700' }
const payLabel: Record<string, string> = { unpaid: '未缴费', paid: '已缴费' }

export default function PendingList() {
  const { pendingRegistrations, schedules, masterData, loading, fetchPendingRegistrations, validateSchedule, assignSeats, fetchSchedules, fetchMasterData } = useDataStore()
  const [selected, setSelected] = useState<string[]>([])
  const [scheduleModal, setScheduleModal] = useState(false)
  const [targetScheduleId, setTargetScheduleId] = useState('')
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    fetchPendingRegistrations()
    fetchSchedules()
    fetchMasterData()
  }, [])

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleAll = () => {
    if (selected.length === pendingRegistrations.length) {
      setSelected([])
    } else {
      setSelected(pendingRegistrations.map(r => r.id))
    }
  }

  const onValidate = async () => {
    if (selected.length === 0 || !targetScheduleId) return
    const sched = schedules.find(s => s.id === targetScheduleId)
    if (!sched) return
    setValidating(true)
    const result = await validateSchedule(selected, {
      examDate: sched.exam_date,
      examTime: sched.start_time || sched.exam_time || '',
      examRoom: sched.exam_room_id || sched.exam_room,
    })
    setValidationResult(result)
    setValidating(false)
  }

  const onAssign = async () => {
    if (!targetScheduleId || selected.length === 0) return
    if (!validationResult || !validationResult.valid) {
      setValidationResult({ valid: false, errors: ['请先点击"校验排考"按钮进行验证，验证通过后方可确认分配'], warnings: [] })
      return
    }
    const result = await assignSeats(targetScheduleId, selected)
    if (result.success) {
      setScheduleModal(false)
      setTargetScheduleId('')
      setSelected([])
      setValidationResult(null)
      fetchPendingRegistrations()
      fetchSchedules()
    } else {
      setValidationResult({
        valid: false,
        errors: result.errors || ['分配座位失败'],
        warnings: result.warnings || []
      })
    }
  }

  const openScheduleModal = () => {
    setValidationResult(null)
    setTargetScheduleId('')
    setScheduleModal(true)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">待分配名单</h1>
        <button className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium" onClick={openScheduleModal} disabled={selected.length === 0}>
          <CalendarPlus className="w-4 h-4" />排考选中（{selected.length}）
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : pendingRegistrations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400">暂无待分配考生</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium w-10">
                  <input type="checkbox" checked={selected.length === pendingRegistrations.length && pendingRegistrations.length > 0} onChange={toggleAll} className="accent-blue-600" />
                </th>
                <th className="px-4 py-3 font-medium">考生</th>
                <th className="px-4 py-3 font-medium">身份证号</th>
                <th className="px-4 py-3 font-medium">所属机构</th>
                <th className="px-4 py-3 font-medium">科目</th>
                <th className="px-4 py-3 font-medium">等级</th>
                <th className="px-4 py-3 font-medium">缴费</th>
                <th className="px-4 py-3 font-medium">报名时间</th>
              </tr>
            </thead>
            <tbody>
              {pendingRegistrations.map((r, i) => (
                <tr key={r.id} className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 ${selected.includes(r.id) ? 'bg-blue-50' : i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`} onClick={() => toggleSelect(r.id)}>
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-blue-600" /></td>
                  <td className="px-4 py-3 text-sm font-medium">{r.candidate_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.candidate_id_card || r.candidate_id_number || '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.institution_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.subject_name || r.subject}</td>
                  <td className="px-4 py-3 text-sm">{r.skill_level_name || r.skill_level}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${payBadge[r.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                      {payLabel[r.payment_status] || r.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{dayjs(r.created_at).format('YYYY-MM-DD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setScheduleModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">排考分配</h2>
              <button onClick={() => setScheduleModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="mb-3 text-sm text-slate-500">已选择 {selected.length} 名考生</div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择排考场次</label>
                <select value={targetScheduleId} onChange={e => { setTargetScheduleId(e.target.value); setValidationResult(null) }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {schedules.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.batch_name} - {s.room_name || s.exam_room} ({s.exam_date} {s.start_time?.slice(0,5) || s.exam_time})
                    </option>
                  ))}
                </select>
              </div>

              {targetScheduleId && (
                <button className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 text-sm font-medium" onClick={onValidate} disabled={validating || selected.length === 0}>
                  {validating ? '校验中...' : <><AlertCircle className="w-4 h-4" />校验排考</>}
                </button>
              )}

              {validationResult && (
                <div className="rounded-lg border border-slate-200 p-4">
                  {validationResult.valid ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">校验通过</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 text-red-700 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">校验不通过</span>
                      </div>
                      <div className="space-y-1">
                        {validationResult.errors.map((msg: string, i: number) => (
                          <div key={`e-${i}`} className="flex items-start gap-2 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{msg}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {validationResult.warnings.map((msg: string, i: number) => (
                        <div key={`w-${i}`} className="flex items-start gap-2 text-sm text-orange-600">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{msg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setScheduleModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed" onClick={onAssign} disabled={!targetScheduleId || selected.length === 0 || !validationResult || !validationResult.valid}>
                确认分配
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
