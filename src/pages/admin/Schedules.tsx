import { useState, useEffect } from 'react'
import { Plus, Users, Maximize2, ArrowRightLeft, Search, X } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const schedBadge: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', confirmed: 'bg-blue-100 text-blue-700', in_progress: 'bg-green-100 text-green-700', completed: 'bg-purple-100 text-purple-700', cancelled: 'bg-red-100 text-red-700' }
const schedLabel: Record<string, string> = { draft: '草稿', confirmed: '已确认', in_progress: '进行中', completed: '已完成', cancelled: '已取消' }
const checkinBadge: Record<string, string> = { pending: 'bg-gray-100 text-gray-600', checked_in: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700' }
const checkinLabel: Record<string, string> = { pending: '待签到', checked_in: '已签到', absent: '缺考' }

export default function Schedules() {
  const { schedules, scheduleDetail, pendingRegistrations, batches, masterData, loading, fetchSchedules, fetchScheduleDetail, createSchedule, assignSeats, expandCapacity, adjustSeat, fetchPendingRegistrations, fetchMasterData, fetchBatches } = useDataStore()

  const [batchFilter, setBatchFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [createModal, setCreateModal] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [assignModal, setAssignModal] = useState(false)
  const [expandModal, setExpandModal] = useState(false)
  const [adjustModal, setAdjustModal] = useState(false)
  const [selectedPending, setSelectedPending] = useState<string[]>([])
  const [createForm, setCreateForm] = useState({ batch_id: '', exam_room_id: '', proctor_id: '', subject: '', skill_level: '', exam_date: '', start_time: '', end_time: '', capacity: 30 })
  const [expandForm, setExpandForm] = useState({ new_capacity: 0, reason: '' })
  const [adjustForm, setAdjustForm] = useState({ seat_arrangement_id: '', to_schedule_id: '', new_seat_no: '1', reason: '' })

  useEffect(() => {
    fetchSchedules()
    fetchBatches()
    fetchMasterData()
    fetchPendingRegistrations()
  }, [])

  const refreshSchedules = () => {
    const filters: Record<string, string> = {}
    if (batchFilter) filters.batch_id = batchFilter
    if (dateFilter) filters.exam_date = dateFilter
    fetchSchedules(filters)
  }

  useEffect(() => { refreshSchedules() }, [batchFilter, dateFilter])

  const openDetail = async (id: string) => {
    setDetailId(id)
    await fetchScheduleDetail(id)
  }

  const onCreate = async () => {
    if (!createForm.batch_id || !createForm.exam_room_id || !createForm.exam_date) return
    const ok = await createSchedule({
      batch_id: createForm.batch_id,
      exam_room_id: createForm.exam_room_id,
      proctor_id: createForm.proctor_id || undefined,
      subject_id: createForm.subject,
      skill_level_id: createForm.skill_level,
      exam_date: createForm.exam_date,
      start_time: createForm.start_time,
      end_time: createForm.end_time,
      capacity: createForm.capacity,
    })
    if (ok) {
      setCreateModal(false)
      setCreateForm({ batch_id: '', exam_room_id: '', proctor_id: '', subject: '', skill_level: '', exam_date: '', start_time: '', end_time: '', capacity: 30 })
      refreshSchedules()
    }
  }

  const onAssign = async () => {
    if (!detailId || selectedPending.length === 0) return
    const ok = await assignSeats(detailId, selectedPending)
    if (ok) {
      setAssignModal(false)
      setSelectedPending([])
      fetchScheduleDetail(detailId)
      fetchPendingRegistrations()
    }
  }

  const onExpand = async () => {
    if (!detailId || !expandForm.new_capacity || !expandForm.reason) return
    const ok = await expandCapacity(detailId, expandForm.new_capacity, expandForm.reason)
    if (ok) {
      setExpandModal(false)
      setExpandForm({ new_capacity: 0, reason: '' })
      fetchScheduleDetail(detailId)
    }
  }

  const onAdjust = async () => {
    if (!detailId || !adjustForm.seat_arrangement_id || !adjustForm.to_schedule_id || !adjustForm.reason) return
    const ok = await adjustSeat({
      seatArrangementId: adjustForm.seat_arrangement_id,
      toScheduleId: adjustForm.to_schedule_id,
      newSeatNo: adjustForm.new_seat_no,
      reason: adjustForm.reason,
    })
    if (ok) {
      setAdjustModal(false)
      setAdjustForm({ seat_arrangement_id: '', to_schedule_id: '', new_seat_no: '1', reason: '' })
      fetchScheduleDetail(detailId)
    }
  }

  const togglePending = (id: string) => {
    setSelectedPending(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const seats = (scheduleDetail as any)?.seats || []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">排考管理</h1>
        <button className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium" onClick={() => setCreateModal(true)}>
          <Plus className="w-4 h-4" />创建排考
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部批次</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading && !detailId ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400">暂无排考数据</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">批次</th>
                <th className="px-4 py-3 font-medium">考场</th>
                <th className="px-4 py-3 font-medium">监考</th>
                <th className="px-4 py-3 font-medium">科目</th>
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">容量</th>
                <th className="px-4 py-3 font-medium">已安排</th>
                <th className="px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s, i) => (
                <tr key={s.id} className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`} onClick={() => openDetail(s.id)}>
                  <td className="px-4 py-3 text-sm font-medium">{s.batch_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{s.room_name || s.exam_room}</td>
                  <td className="px-4 py-3 text-sm">{s.proctor_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{s.subject_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{s.exam_date}</td>
                  <td className="px-4 py-3 text-sm">
                    {s.start_time && s.end_time ? `${s.start_time.slice(0,5)}-${s.end_time.slice(0,5)}` : s.exam_time || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">{s.capacity}</td>
                  <td className="px-4 py-3 text-sm">{s.assigned_count ?? s.registered_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${schedBadge[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {schedLabel[s.status] || s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailId && scheduleDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetailId(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">排考详情</h2>
              <button onClick={() => setDetailId(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
              <div><span className="text-slate-500">批次：</span><span className="font-medium">{scheduleDetail.batch_name}</span></div>
              <div><span className="text-slate-500">考场：</span><span className="font-medium">{scheduleDetail.room_name || scheduleDetail.exam_room}</span></div>
              <div><span className="text-slate-500">监考：</span><span className="font-medium">{scheduleDetail.proctor_name || '-'}</span></div>
              <div><span className="text-slate-500">容量：</span><span className="font-medium">{scheduleDetail.capacity}</span></div>
            </div>
            <div className="flex gap-2 mb-4">
              <button className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm" onClick={() => setAssignModal(true)}>
                <Users className="w-4 h-4" />分配考生
              </button>
              <button className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 text-sm" onClick={() => { setExpandForm({ new_capacity: scheduleDetail.capacity + 10, reason: '' }); setExpandModal(true) }}>
                <Maximize2 className="w-4 h-4" />扩容
              </button>
              <button className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 text-sm" onClick={() => setAdjustModal(true)}>
                <ArrowRightLeft className="w-4 h-4" />调座
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-sm text-slate-600">
                    <th className="px-4 py-3 font-medium">座位号</th>
                    <th className="px-4 py-3 font-medium">考生姓名</th>
                    <th className="px-4 py-3 font-medium">身份证号</th>
                    <th className="px-4 py-3 font-medium">所属机构</th>
                    <th className="px-4 py-3 font-medium">签到状态</th>
                  </tr>
                </thead>
                <tbody>
                  {seats.map((s: any, i: number) => (
                    <tr key={s.id || i} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="px-4 py-3 text-sm font-medium">{s.seat_no}</td>
                      <td className="px-4 py-3 text-sm">{s.candidate_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{s.id_card || '-'}</td>
                      <td className="px-4 py-3 text-sm">{s.institution_name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${checkinBadge[s.checkin_status] || checkinBadge.pending}`}>
                          {checkinLabel[s.checkin_status] || '待签到'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {seats.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无考生安排</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAssignModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">分配考生</h2>
              <button onClick={() => setAssignModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="mb-3 text-sm text-slate-500">已选择 {selectedPending.length} 名考生</div>
            <div className="overflow-hidden rounded-lg border border-slate-200 mb-4">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-sm text-slate-600">
                    <th className="px-4 py-3 font-medium w-10"></th>
                    <th className="px-4 py-3 font-medium">考生</th>
                    <th className="px-4 py-3 font-medium">身份证号</th>
                    <th className="px-4 py-3 font-medium">科目</th>
                    <th className="px-4 py-3 font-medium">等级</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRegistrations.map((r, i) => (
                    <tr key={r.id} className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 ${selectedPending.includes(r.id) ? 'bg-blue-50' : i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`} onClick={() => togglePending(r.id)}>
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedPending.includes(r.id)} onChange={() => togglePending(r.id)} className="accent-blue-600" /></td>
                      <td className="px-4 py-3 text-sm">{r.candidate_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{r.candidate_id_card || r.candidate_id_number || '-'}</td>
                      <td className="px-4 py-3 text-sm">{r.subject_name || r.subject}</td>
                      <td className="px-4 py-3 text-sm">{r.skill_level_name || r.skill_level}</td>
                    </tr>
                  ))}
                  {pendingRegistrations.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无待分配考生</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setAssignModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={onAssign} disabled={selectedPending.length === 0}>确认分配</button>
            </div>
          </div>
        </div>
      )}

      {expandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setExpandModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">扩容</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新容量</label>
                <input type="number" value={expandForm.new_capacity} onChange={e => setExpandForm(f => ({ ...f, new_capacity: parseInt(e.target.value) || 0 }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">原因</label>
                <textarea value={expandForm.reason} onChange={e => setExpandForm(f => ({ ...f, reason: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setExpandModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm" onClick={onExpand} disabled={!expandForm.new_capacity || !expandForm.reason}>确认扩容</button>
            </div>
          </div>
        </div>
      )}

      {adjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAdjustModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">调座</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择考生</label>
                <select value={adjustForm.seat_arrangement_id} onChange={e => setAdjustForm(f => ({ ...f, seat_arrangement_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {seats.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.candidate_name} (座位{s.seat_no})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">目标排考</label>
                <select value={adjustForm.to_schedule_id} onChange={e => setAdjustForm(f => ({ ...f, to_schedule_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {schedules.filter(s => s.id !== detailId).map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name || s.exam_room} ({s.exam_date})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新座位号</label>
                <input type="text" value={adjustForm.new_seat_no} onChange={e => setAdjustForm(f => ({ ...f, new_seat_no: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">原因</label>
                <textarea value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setAdjustModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm" onClick={onAdjust} disabled={!adjustForm.seat_arrangement_id || !adjustForm.to_schedule_id || !adjustForm.reason}>确认调座</button>
            </div>
          </div>
        </div>
      )}

      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">创建排考</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">批次</label>
                <select value={createForm.batch_id} onChange={e => setCreateForm(f => ({ ...f, batch_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">考场</label>
                <select value={createForm.exam_room_id} onChange={e => setCreateForm(f => ({ ...f, exam_room_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {masterData.examRooms.map(r => <option key={r.id} value={r.id}>{r.name}（容量：{r.capacity}）</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">监考</label>
                <select value={createForm.proctor_id} onChange={e => setCreateForm(f => ({ ...f, proctor_id: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {masterData.proctors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">科目</label>
                <select value={createForm.subject} onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {masterData.subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">等级</label>
                <select value={createForm.skill_level} onChange={e => setCreateForm(f => ({ ...f, skill_level: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择</option>
                  {masterData.skillLevels.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">考试日期</label>
                <input type="date" value={createForm.exam_date} onChange={e => setCreateForm(f => ({ ...f, exam_date: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">开始时间</label>
                  <input type="time" value={createForm.start_time} onChange={e => setCreateForm(f => ({ ...f, start_time: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">结束时间</label>
                  <input type="time" value={createForm.end_time} onChange={e => setCreateForm(f => ({ ...f, end_time: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">容量</label>
                <input type="number" value={createForm.capacity} onChange={e => setCreateForm(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setCreateModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={onCreate} disabled={!createForm.batch_id || !createForm.exam_room_id || !createForm.exam_date}>确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
