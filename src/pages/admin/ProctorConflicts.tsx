import { useState, useEffect } from 'react'
import { Plus, Trash2, AlertTriangle, CheckCircle, XCircle, UserCheck, Users } from 'lucide-react'
import { useDataStore, type ProctorConflictCheckResult } from '@/stores/dataStore'
import dayjs from 'dayjs'

const conflictTypeLabel: Record<string, string> = {
  family: '亲属关系',
  colleague: '同事关系',
  institution: '机构关联',
  other: '其他',
}

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
}

const statusLabel: Record<string, string> = {
  active: '生效',
  inactive: '已失效',
}

export default function ProctorConflicts() {
  const {
    proctorConflicts,
    masterData,
    registrations,
    loading,
    fetchProctorConflicts,
    fetchMasterData,
    fetchRegistrations,
    recordProctorConflict,
    deleteProctorConflict,
    checkProctorConflict,
  } = useDataStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null)
  const [conflictWarning, setConflictWarning] = useState<ProctorConflictCheckResult | null>(null)

  const [formData, setFormData] = useState({
    proctorId: '',
    candidateId: '',
    conflictType: 'family' as 'family' | 'colleague' | 'institution' | 'other',
    relationship: '',
  })

  useEffect(() => {
    fetchProctorConflicts()
    fetchMasterData()
    fetchRegistrations()
  }, [])

  useEffect(() => {
    if (formData.proctorId && formData.candidateId) {
      checkProctorConflict(formData.proctorId, formData.candidateId).then((result) => {
        if (result && result.hasConflict) {
          setConflictWarning(result)
        } else {
          setConflictWarning(null)
        }
      })
    } else {
      setConflictWarning(null)
    }
  }, [formData.proctorId, formData.candidateId])

  const handleAdd = async () => {
    if (!formData.proctorId || !formData.candidateId || !formData.relationship) return

    const ok = await recordProctorConflict(
      formData.proctorId,
      formData.candidateId,
      formData.conflictType,
      formData.relationship
    )
    if (ok) {
      setShowAddModal(false)
      setFormData({ proctorId: '', candidateId: '', conflictType: 'family', relationship: '' })
      setConflictWarning(null)
      fetchProctorConflicts()
      alert('回避关系已添加')
    }
  }

  const handleDelete = async () => {
    if (!selectedConflict) return
    const ok = await deleteProctorConflict(selectedConflict)
    if (ok) {
      setShowDeleteModal(false)
      setSelectedConflict(null)
      fetchProctorConflicts()
      alert('回避关系已删除')
    }
  }

  const openDeleteModal = (id: string) => {
    setSelectedConflict(id)
    setShowDeleteModal(true)
  }

  const candidates = registrations
    .map((r) => ({
      id: r.candidate_id,
      name: r.candidate_name,
      idNumber: r.candidate_id_number,
    }))
    .filter((c, index, self) => self.findIndex((t) => t.id === c.id) === index)

  const activeCount = proctorConflicts.filter((c) => c.status === 'active').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">监考回避管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            管理监考老师与考生之间的回避关系，确保考试公平公正
          </p>
        </div>
        <div className="flex items-center gap-4">
          {activeCount > 0 && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">{activeCount} 条生效中</span>
            </div>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            添加回避关系
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left text-sm text-slate-600">
              <th className="px-4 py-3 font-medium">监考老师</th>
              <th className="px-4 py-3 font-medium">考生</th>
              <th className="px-4 py-3 font-medium">关系类型</th>
              <th className="px-4 py-3 font-medium">具体关系</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">记录时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {proctorConflicts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  暂无回避关系记录
                </td>
              </tr>
            ) : (
              proctorConflicts.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'} ${c.status === 'inactive' ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-4 text-sm font-medium">{c.proctor_name}</td>
                  <td className="px-4 py-4 text-sm">{c.candidate_name}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                      {conflictTypeLabel[c.conflict_type] || c.conflict_type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm max-w-xs truncate" title={c.relationship}>
                    {c.relationship}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[c.status]}`}>
                      {statusLabel[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {dayjs(c.created_at).format('YYYY-MM-DD HH:mm')}
                  </td>
                  <td className="px-4 py-4">
                    {c.status === 'active' && (
                      <button
                        onClick={() => openDeleteModal(c.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        删除
                      </button>
                    )}
                    {c.status === 'inactive' && (
                      <span className="text-xs text-slate-400">已删除</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-800 mb-4">添加回避关系</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <UserCheck className="w-4 h-4 inline-block mr-1" />
                  选择监考老师
                </label>
                <select
                  value={formData.proctorId}
                  onChange={(e) => setFormData({ ...formData, proctorId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择监考老师</option>
                  {masterData.proctors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Users className="w-4 h-4 inline-block mr-1" />
                  选择考生
                </label>
                <select
                  value={formData.candidateId}
                  onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择考生</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.idNumber ? `(${c.idNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {conflictWarning && conflictWarning.hasConflict && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">警告</p>
                      <p className="mt-1">{conflictWarning.message}</p>
                      {conflictWarning.conflictType === 'schedule_conflict' && (
                        <p className="mt-1 text-xs text-yellow-700">
                          您仍然可以添加此回避关系，系统将在后续排考中自动规避。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">关系类型</label>
                <select
                  value={formData.conflictType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conflictType: e.target.value as 'family' | 'colleague' | 'institution' | 'other',
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="family">亲属关系</option>
                  <option value="colleague">同事关系</option>
                  <option value="institution">机构关联</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">具体关系说明</label>
                <textarea
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="请详细说明双方关系，例如：父子关系、同一学校任职等"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <CheckCircle className="w-4 h-4 inline-block mr-1" />
                添加后系统将在排考和监考分配时自动检测此回避关系，确保考试公平。
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm"
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({ proctorId: '', candidateId: '', conflictType: 'family', relationship: '' })
                  setConflictWarning(null)
                }}
              >
                取消
              </button>
              <button
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAdd}
                disabled={!formData.proctorId || !formData.candidateId || !formData.relationship}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedConflict && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">确认删除</h2>
                <p className="text-sm text-slate-500">删除后该回避关系将失效</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 inline-block mr-1" />
              删除后，系统将不再检测此回避关系。确定要删除吗？
            </div>

            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedConflict(null)
                }}
              >
                取消
              </button>
              <button
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                onClick={handleDelete}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
