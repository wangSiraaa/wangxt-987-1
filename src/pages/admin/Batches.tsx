import { useState, useEffect } from 'react'
import { Plus, Pencil, Search } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const batchBadge: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
  registration_open: 'bg-blue-100 text-blue-700',
  registration_closed: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-green-100 text-green-700',
}
const batchLabel: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
  registration_open: '报名中',
  registration_closed: '报名截止',
  in_progress: '进行中',
}

export default function Batches() {
  const { batches, masterData, loading, fetchBatches, createBatch, updateBatch, fetchMasterData } = useDataStore()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({ code: '', name: '', skill_level: '', subject: '', exam_date: '', start_time: '', end_time: '', total_capacity: 30 })

  useEffect(() => {
    fetchBatches()
    fetchMasterData()
  }, [])

  const openAdd = () => {
    setEditItem(null)
    setForm({ code: '', name: '', skill_level: '', subject: '', exam_date: '', start_time: '', end_time: '', total_capacity: 30 })
    setShowModal(true)
  }

  const openEdit = (b: any) => {
    setEditItem(b)
    setForm({
      code: b.code || '',
      name: b.name,
      skill_level: b.skill_level,
      subject: b.subject,
      exam_date: b.exam_date,
      start_time: b.start_time || '',
      end_time: b.end_time || '',
      total_capacity: b.total_capacity || 30,
    })
    setShowModal(true)
  }

  const onSubmit = async () => {
    if (!form.name || !form.exam_date) return
    let ok: boolean
    if (editItem) {
      ok = await updateBatch(editItem.id, {
        name: form.name,
        exam_date: form.exam_date,
        start_time: form.start_time,
        end_time: form.end_time,
      })
    } else {
      ok = await createBatch({
        code: form.code,
        name: form.name,
        skill_level: form.skill_level,
        subject: form.subject,
        exam_date: form.exam_date,
        start_time: form.start_time,
        end_time: form.end_time,
        total_capacity: form.total_capacity,
      })
    }
    if (ok) {
      setShowModal(false)
      fetchBatches()
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">考试批次</h1>
        <button className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium" onClick={openAdd}>
          <Plus className="w-4 h-4" />创建批次
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400">暂无批次数据，点击"创建批次"开始</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">编码</th>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">等级</th>
                <th className="px-4 py-3 font-medium">科目</th>
                <th className="px-4 py-3 font-medium">考试日期</th>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">排考场次</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => (
                <tr key={b.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="px-4 py-3 text-sm font-mono">{b.code || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-sm">{b.skill_level_name || b.skill_level}</td>
                  <td className="px-4 py-3 text-sm">{b.subject_name || b.subject}</td>
                  <td className="px-4 py-3 text-sm">{b.exam_date}</td>
                  <td className="px-4 py-3 text-sm">
                    {b.start_time && b.end_time ? `${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${batchBadge[b.status] || 'bg-gray-100 text-gray-600'}`}>
                      {batchLabel[b.status] || b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{b.schedule_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm" onClick={() => openEdit(b)}>
                      <Pencil className="w-3.5 h-3.5" />编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editItem ? '编辑批次' : '创建批次'}</h2>
            <div className="space-y-4">
              {!editItem && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">批次编码</label>
                    <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">等级</label>
                    <select value={form.skill_level} onChange={e => setForm(f => ({ ...f, skill_level: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">请选择</option>
                      {masterData.skillLevels.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">科目</label>
                    <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">请选择</option>
                      {masterData.subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">总容量</label>
                    <input type="number" value={form.total_capacity} onChange={e => setForm(f => ({ ...f, total_capacity: parseInt(e.target.value) || 0 }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">批次名称</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">考试日期</label>
                <input type="date" value={form.exam_date} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">开始时间</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">结束时间</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={onSubmit} disabled={!form.name || !form.exam_date}>
                {editItem ? '保存' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
