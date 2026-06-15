import { useState, useEffect } from 'react'
import { AlertTriangle, Search, Eye, Gavel } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const typeBadge: Record<string, string> = {
  checkin: 'bg-blue-100 text-blue-700',
  cheating: 'bg-red-100 text-red-700',
  absent: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700',
}
const typeLabel: Record<string, string> = {
  checkin: '签到异常',
  cheating: '作弊',
  absent: '缺考',
  other: '其他',
}
const statusBadge: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-red-100 text-red-700',
  dismissed: 'bg-green-100 text-green-700',
}
const statusLabel: Record<string, string> = {
  pending: '待处理',
  confirmed: '已确认',
  dismissed: '已驳回',
}

export default function Exceptions() {
  const { exceptions, loading, fetchExceptions, handleException } = useDataStore()
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [handleModal, setHandleModal] = useState<any>(null)
  const [detailModal, setDetailModal] = useState<any>(null)
  const [formData, setFormData] = useState({ status: 'confirmed', handling_result: '', should_freeze: false })

  useEffect(() => {
    const params: Record<string, string> = {}
    if (statusFilter) params.status = statusFilter
    if (typeFilter) params.type = typeFilter
    fetchExceptions(params)
  }, [statusFilter, typeFilter])

  const onHandle = async () => {
    if (!handleModal) return
    const ok = await handleException(handleModal.id, formData.status, formData.handling_result, formData.should_freeze)
    if (ok) {
      setHandleModal(null)
      setFormData({ status: 'confirmed', handling_result: '', should_freeze: false })
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      fetchExceptions(params)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">异常记录管理</h1>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="confirmed">已确认</option>
            <option value="dismissed">已驳回</option>
          </select>
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部类型</option>
          <option value="checkin">签到异常</option>
          <option value="cheating">作弊</option>
          <option value="absent">缺考</option>
          <option value="other">其他</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">考生姓名</th>
                <th className="px-4 py-3 font-medium">身份证号</th>
                <th className="px-4 py-3 font-medium">描述</th>
                <th className="px-4 py-3 font-medium">上报人</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">创建时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((e: any, i: number) => (
                <tr
                  key={e.id}
                  className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                  onClick={() => setDetailModal(e)}
                >
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[e.type] || typeBadge.other}`}>
                      {typeLabel[e.type] || e.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{e.candidate_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{e.id_card || '-'}</td>
                  <td className="px-4 py-3 text-sm max-w-[200px] truncate">{e.description}</td>
                  <td className="px-4 py-3 text-sm">{e.reporter_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[e.status] || ''}`}>
                      {statusLabel[e.status] || e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{dayjs(e.created_at).format('YYYY-MM-DD HH:mm')}</td>
                  <td className="px-4 py-3">
                    {e.status === 'pending' && (
                      <button
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        onClick={ev => { ev.stopPropagation(); setHandleModal(e) }}
                      >
                        <Gavel className="w-3.5 h-3.5" />处理
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {exceptions.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">暂无异常记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-slate-800">异常详情</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex"><span className="w-24 text-slate-500">类型</span><span>{typeLabel[detailModal.type] || detailModal.type}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">考生</span><span>{detailModal.candidate_name || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">身份证号</span><span>{detailModal.id_card || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">描述</span><span>{detailModal.description}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">上报人</span><span>{detailModal.reporter_name || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">状态</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[detailModal.status]}`}>{statusLabel[detailModal.status]}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">创建时间</span><span>{dayjs(detailModal.created_at).format('YYYY-MM-DD HH:mm')}</span></div>
              {detailModal.handling_result && <div className="flex"><span className="w-24 text-slate-500">处理结果</span><span>{detailModal.handling_result}</span></div>}
            </div>
            <button className="mt-6 w-full py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setDetailModal(null)}>关闭</button>
          </div>
        </div>
      )}

      {handleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setHandleModal(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">处理异常</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">处理决定</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" value="confirmed" checked={formData.status === 'confirmed'} onChange={() => setFormData(f => ({ ...f, status: 'confirmed' }))} className="accent-blue-600" />
                    <span className="text-sm">确认</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" value="dismissed" checked={formData.status === 'dismissed'} onChange={() => setFormData(f => ({ ...f, status: 'dismissed' }))} className="accent-blue-600" />
                    <span className="text-sm">驳回</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">处理说明</label>
                <textarea
                  value={formData.handling_result}
                  onChange={e => setFormData(f => ({ ...f, handling_result: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              {formData.status === 'confirmed' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.should_freeze} onChange={e => setFormData(f => ({ ...f, should_freeze: e.target.checked }))} className="accent-blue-600" />
                  <span className="text-sm text-slate-700">冻结考生报名资格</span>
                </label>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setHandleModal(null)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={onHandle}>确认处理</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
