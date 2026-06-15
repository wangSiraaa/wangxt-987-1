import { useState, useEffect } from 'react'
import { Ban, Check, X, Eye, AlertTriangle, CheckCircle, XCircle, Lock, Unlock, FileText } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewing: 'bg-blue-100 text-blue-700',
  sustained: 'bg-red-100 text-red-700',
  dismissed: 'bg-green-100 text-green-700',
}

const statusLabel: Record<string, string> = {
  pending: '待复核',
  reviewing: '复核中',
  sustained: '作弊成立',
  dismissed: '不予认定',
}

export default function CheatingReviews() {
  const {
    cheatingReviews,
    registrations,
    schedules,
    loading,
    fetchCheatingReviews,
    fetchRegistrations,
    fetchSchedules,
    reviewCheating,
    unlockScore,
  } = useDataStore()

  const [selectedReview, setSelectedReview] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<'sustain' | 'dismiss' | 'unlock' | null>(null)
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [reviewer, setReviewer] = useState('')

  useEffect(() => {
    fetchCheatingReviews()
    fetchRegistrations()
    fetchSchedules()
  }, [])

  const openModal = (id: string, type: 'sustain' | 'dismiss' | 'unlock') => {
    setSelectedReview(id)
    setActionType(type)
    setReviewRemarks('')
    setReviewer('')
    setShowModal(true)
  }

  const handleReview = async () => {
    if (!selectedReview || !reviewer) return
    const review = cheatingReviews.find(c => c.id === selectedReview)
    if (!review) return

    let decision: 'sustained' | 'dismissed'
    if (actionType === 'sustain') {
      decision = 'sustained'
    } else if (actionType === 'dismiss') {
      decision = 'dismissed'
    } else {
      return
    }

    const ok = await reviewCheating(selectedReview, decision, reviewRemarks, reviewer)
    if (ok) {
      setShowModal(false)
      fetchCheatingReviews()
      fetchRegistrations()
      alert(decision === 'sustained' ? '作弊认定成立，成绩已冻结' : '不予认定，成绩已解锁')
    }
  }

  const handleUnlock = async () => {
    if (!selectedReview || !reviewer) return
    const ok = await unlockScore(selectedReview, reviewRemarks, reviewer)
    if (ok) {
      setShowModal(false)
      fetchCheatingReviews()
      fetchRegistrations()
      alert('成绩已成功解锁')
    }
  }

  const pendingCount = cheatingReviews.filter(c => c.status === 'pending' || c.status === 'reviewing').length
  const frozenCount = cheatingReviews.filter(c => !c.score_unlocked).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">作弊复核管理</h1>
          <p className="text-sm text-slate-500 mt-1">审核作弊指控，决定是否认定，并管理成绩冻结与解锁</p>
        </div>
        <div className="flex gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">{pendingCount} 个待复核</span>
            </div>
          )}
          {frozenCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
              <Lock className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">{frozenCount} 个成绩冻结</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left text-sm text-slate-600">
              <th className="px-4 py-3 font-medium">考生</th>
              <th className="px-4 py-3 font-medium">排考</th>
              <th className="px-4 py-3 font-medium">作弊事实</th>
              <th className="px-4 py-3 font-medium">证据</th>
              <th className="px-4 py-3 font-medium">上报时间</th>
              <th className="px-4 py-3 font-medium">复核状态</th>
              <th className="px-4 py-3 font-medium">成绩状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {cheatingReviews.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">暂无作弊记录</td></tr>
            ) : cheatingReviews.map((c, i) => (
              <tr key={c.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                <td className="px-4 py-4 text-sm font-medium">{c.candidate_name || '-'}</td>
                <td className="px-4 py-4 text-sm">{c.schedule_name || '-'}</td>
                <td className="px-4 py-4 text-sm max-w-xs truncate" title={c.report_reason}>{c.report_reason}</td>
                <td className="px-4 py-4 text-sm">
                  {c.evidence ? (
                    <a href={c.evidence} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />查看
                    </a>
                  ) : (
                    <span className="text-slate-400">无</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm">{dayjs(c.reported_at).format('YYYY-MM-DD HH:mm')}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[c.status]}`}>
                    {statusLabel[c.status]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${c.score_unlocked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {c.score_unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {c.score_unlocked ? '已解锁' : '已冻结'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {(c.status === 'pending' || c.status === 'reviewing') && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => openModal(c.id, 'sustain')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                      >
                        <Check className="w-3.5 h-3.5" />认定作弊
                      </button>
                      <button
                        onClick={() => openModal(c.id, 'dismiss')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
                      >
                        <X className="w-3.5 h-3.5" />不予认定
                      </button>
                    </div>
                  )}
                  {c.status === 'sustained' && !c.score_unlocked && (
                    <button
                      onClick={() => openModal(c.id, 'unlock')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs hover:bg-orange-700"
                    >
                      <Unlock className="w-3.5 h-3.5" />申诉解锁
                    </button>
                  )}
                  {c.status !== 'pending' && c.status !== 'reviewing' && (
                    <div className="text-xs text-slate-500">
                      <div>复核人：{c.reviewed_by || '-'}</div>
                      {c.review_remarks && <div className="mt-1">备注：{c.review_remarks}</div>}
                      {c.reviewed_at && <div className="mt-1">时间：{dayjs(c.reviewed_at).format('YYYY-MM-DD HH:mm')}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {actionType === 'sustain' && '认定作弊成立'}
              {actionType === 'dismiss' && '不予认定'}
              {actionType === 'unlock' && '申诉复核解锁成绩'}
            </h2>
            
            <div className="space-y-4">
              {actionType !== 'unlock' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 inline-block mr-1" />
                  请仔细核对证据材料，确保认定准确。
                </div>
              )}
              {actionType === 'unlock' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                  <AlertTriangle className="w-4 h-4 inline-block mr-1" />
                  此操作将解锁该考生成绩，需确认为主管复核通过。
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">复核人姓名</label>
                <input type="text" value={reviewer} onChange={e => setReviewer(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="请输入复核人姓名" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {actionType === 'sustain' && '认定理由'}
                  {actionType === 'dismiss' && '不予认定理由'}
                  {actionType === 'unlock' && '解锁理由'}
                </label>
                <textarea value={reviewRemarks} onChange={e => setReviewRemarks(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="请详细说明理由" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowModal(false)}>取消</button>
              <button
                className={`flex-1 py-2 text-white rounded-lg text-sm ${
                  actionType === 'sustain' ? 'bg-red-600 hover:bg-red-700' :
                  actionType === 'dismiss' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }`}
                onClick={actionType === 'unlock' ? handleUnlock : handleReview}
                disabled={!reviewer}
              >
                {actionType === 'sustain' && '确认认定'}
                {actionType === 'dismiss' && '确认不予认定'}
                {actionType === 'unlock' && '确认解锁'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
