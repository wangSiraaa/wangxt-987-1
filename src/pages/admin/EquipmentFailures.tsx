import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, ArrowRight, Wrench, Check, X, Shield } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const statusBadge: Record<string, string> = {
  reported: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  transferred: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
}

const statusLabel: Record<string, string> = {
  reported: '已上报',
  confirmed: '已确认',
  transferred: '已转场',
  resolved: '已解决',
}

const equipmentTypeLabel: Record<string, string> = {
  computer: '电脑',
  projector: '投影仪',
  speaker: '音响',
  network: '网络',
  other: '其他',
}

export default function EquipmentFailures() {
  const {
    equipmentFailures,
    schedules,
    masterData,
    loading,
    fetchEquipmentFailures,
    fetchSchedules,
    fetchMasterData,
    confirmEquipmentFailure,
    transferEquipmentFailure,
    resolveEquipmentFailure,
    reportEquipmentFailure,
  } = useDataStore()

  const [showReportModal, setShowReportModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [selectedFailure, setSelectedFailure] = useState<string | null>(null)
  const [newRoomId, setNewRoomId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [resolveRemarks, setResolveRemarks] = useState('')

  const [reportScheduleId, setReportScheduleId] = useState('')
  const [reportEquipmentType, setReportEquipmentType] = useState('computer')
  const [reportDescription, setReportDescription] = useState('')

  useEffect(() => {
    fetchEquipmentFailures()
    fetchSchedules()
    fetchMasterData()
  }, [])

  const openReportModal = () => {
    setReportScheduleId('')
    setReportEquipmentType('computer')
    setReportDescription('')
    setShowReportModal(true)
  }

  const openTransferModal = (id: string) => {
    setSelectedFailure(id)
    setNewRoomId('')
    setTransferReason('')
    setShowTransferModal(true)
  }

  const openResolveModal = (id: string) => {
    setSelectedFailure(id)
    setResolveRemarks('')
    setShowResolveModal(true)
  }

  const handleConfirm = async (id: string) => {
    const ok = await confirmEquipmentFailure(id)
    if (ok) {
      fetchEquipmentFailures()
      alert('故障已确认')
    }
  }

  const handleTransfer = async () => {
    if (!selectedFailure || !newRoomId || !transferReason) return
    const ok = await transferEquipmentFailure(selectedFailure, newRoomId, transferReason)
    if (ok) {
      setShowTransferModal(false)
      fetchEquipmentFailures()
      alert('转场处理完成，已保护已签到考生座位')
    }
  }

  const handleResolve = async () => {
    if (!selectedFailure || !resolveRemarks) return
    const ok = await resolveEquipmentFailure(selectedFailure, resolveRemarks)
    if (ok) {
      setShowResolveModal(false)
      fetchEquipmentFailures()
      alert('故障已标记为已解决')
    }
  }

  const handleReport = async () => {
    if (!reportScheduleId || !reportDescription) return
    const ok = await reportEquipmentFailure({
      schedule_id: reportScheduleId,
      equipment_type: reportEquipmentType,
      description: reportDescription,
    })
    if (ok) {
      setShowReportModal(false)
      fetchEquipmentFailures()
      alert('故障已上报')
    }
  }

  const getScheduleInfo = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId)
    if (!schedule) return '-'
    return `${schedule.batch_name || ''} - ${schedule.room_name || ''} (${schedule.exam_date} ${schedule.exam_time})`
  }

  const pendingCount = equipmentFailures.filter(f => f.status === 'reported' || f.status === 'confirmed' || f.status === 'transferred').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">设备故障管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理考试过程中的设备故障，包括上报、确认、转场和解决</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">{pendingCount} 个故障待处理</span>
            </div>
          )}
          <button
            onClick={openReportModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Wrench className="w-4 h-4" />上报设备故障
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left text-sm text-slate-600">
              <th className="px-4 py-3 font-medium">排考</th>
              <th className="px-4 py-3 font-medium">设备类型</th>
              <th className="px-4 py-3 font-medium">故障描述</th>
              <th className="px-4 py-3 font-medium">上报时间</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {equipmentFailures.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">暂无设备故障记录</td></tr>
            ) : equipmentFailures.map((f, i) => (
              <tr key={f.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                <td className="px-4 py-4 text-sm max-w-xs truncate" title={getScheduleInfo(f.schedule_id)}>
                  {getScheduleInfo(f.schedule_id)}
                </td>
                <td className="px-4 py-4 text-sm">{equipmentTypeLabel[f.equipment_type] || f.equipment_type}</td>
                <td className="px-4 py-4 text-sm max-w-xs truncate" title={f.description}>{f.description}</td>
                <td className="px-4 py-4 text-sm">{dayjs(f.reported_at).format('YYYY-MM-DD HH:mm')}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[f.status]}`}>
                    {statusLabel[f.status]}
                  </span>
                  {f.status === 'transferred' && f.transfer_to_room_name && (
                    <div className="text-xs text-slate-500 mt-1">转至：{f.transfer_to_room_name}</div>
                  )}
                </td>
                <td className="px-4 py-4">
                  {f.status === 'reported' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(f.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />确认故障
                      </button>
                      <button
                        onClick={() => openTransferModal(f.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />转场处理
                      </button>
                      <button
                        onClick={() => openResolveModal(f.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                      >
                        <Check className="w-3.5 h-3.5" />标记解决
                      </button>
                    </div>
                  )}
                  {f.status === 'confirmed' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openTransferModal(f.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />转场处理
                      </button>
                      <button
                        onClick={() => openResolveModal(f.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                      >
                        <Check className="w-3.5 h-3.5" />标记解决
                      </button>
                    </div>
                  )}
                  {f.status === 'transferred' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openResolveModal(f.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                      >
                        <Check className="w-3.5 h-3.5" />标记解决
                      </button>
                    </div>
                  )}
                  {f.status === 'resolved' && (
                    <div className="text-xs text-slate-500">
                      {f.resolved_by && <div>处理人：{f.resolved_by}</div>}
                      {f.resolved_at && <div className="mt-1">处理时间：{dayjs(f.resolved_at).format('YYYY-MM-DD HH:mm')}</div>}
                      {f.remarks && <div className="mt-1">备注：{f.remarks}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">上报设备故障</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择排考</label>
                <select value={reportScheduleId} onChange={e => setReportScheduleId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择发生故障的考试安排</option>
                  {schedules.filter(s => s.status === 'confirmed' || s.status === 'pending').map(s => (
                    <option key={s.id} value={s.id}>{s.batch_name} - {s.room_name} ({s.exam_date} {s.exam_time})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">设备类型</label>
                <select value={reportEquipmentType} onChange={e => setReportEquipmentType(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(equipmentTypeLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">故障描述</label>
                <textarea value={reportDescription} onChange={e => setReportDescription(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请详细描述故障情况" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowReportModal(false)}>取消</button>
              <button
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                onClick={handleReport}
                disabled={!reportScheduleId || !reportDescription}
              >
                提交上报
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && selectedFailure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTransferModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">转场处理</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择新考场</label>
                <select value={newRoomId} onChange={e => setNewRoomId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">请选择转场目标考场</option>
                  {masterData.examRooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name} (容量：{room.capacity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">转场原因</label>
                <textarea value={transferReason} onChange={e => setTransferReason(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请说明转场原因" />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <Shield className="w-4 h-4 inline-block mr-1" />
                系统将自动保护已签到考生的座位不被重新分配，并记录变更日志。
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowTransferModal(false)}>取消</button>
              <button
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                onClick={handleTransfer}
                disabled={!newRoomId || !transferReason}
              >
                确认转场
              </button>
            </div>
          </div>
        </div>
      )}

      {showResolveModal && selectedFailure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowResolveModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">标记故障已解决</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">处理说明</label>
                <textarea value={resolveRemarks} onChange={e => setResolveRemarks(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请说明故障解决情况" />
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline-block mr-1" />
                标记后故障状态将更新为已解决，并记录处理人和处理时间。
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowResolveModal(false)}>取消</button>
              <button
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                onClick={handleResolve}
                disabled={!resolveRemarks}
              >
                确认解决
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
