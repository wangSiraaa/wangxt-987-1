import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const genderLabel: Record<string, string> = { male: '男', female: '女', other: '其他' }

export default function Candidates() {
  const { user } = useAuthStore()
  const { candidates, loading, fetchCandidates, addCandidate, updateCandidate, deleteCandidate } = useDataStore()
  const instId = user?.institution_id

  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', id_card: '', phone: '', gender: 'male', birth_date: '', address: '' })

  useEffect(() => {
    if (instId) fetchCandidates(instId)
  }, [instId])

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', id_card: '', phone: '', gender: 'male', birth_date: '', address: '' })
    setShowModal(true)
  }

  const openEdit = (c: any) => {
    setEditItem(c)
    setForm({ name: c.name, id_card: c.id_card || c.id_number, phone: c.phone, gender: c.gender || 'male', birth_date: c.birth_date || '', address: c.address || '' })
    setShowModal(true)
  }

  const onSubmit = async () => {
    if (!form.name || !form.id_card || !instId) return
    let ok: boolean
    if (editItem) {
      ok = await updateCandidate(instId, editItem.id, { name: form.name, id_card: form.id_card, phone: form.phone, gender: form.gender, birth_date: form.birth_date, address: form.address })
    } else {
      ok = await addCandidate(instId, { name: form.name, id_card: form.id_card, phone: form.phone, gender: form.gender, birth_date: form.birth_date, address: form.address })
    }
    if (ok) {
      setShowModal(false)
      fetchCandidates(instId)
    }
  }

  const onDelete = async (id: string) => {
    if (!instId || !confirm('确认删除该考生？')) return
    const ok = await deleteCandidate(instId, id)
    if (ok) fetchCandidates(instId)
  }

  const filtered = candidates.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return (c.name?.toLowerCase().includes(s) || c.id_number?.toLowerCase().includes(s) || c.id_card?.toLowerCase().includes(s))
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">考生管理</h1>
        <button className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium" onClick={openAdd}>
          <Plus className="w-4 h-4" />添加考生
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text" placeholder="搜索姓名或身份证号" value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400">暂无考生数据，点击"添加考生"开始录入</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">姓名</th>
                <th className="px-4 py-3 font-medium">身份证号</th>
                <th className="px-4 py-3 font-medium">电话</th>
                <th className="px-4 py-3 font-medium">性别</th>
                <th className="px-4 py-3 font-medium">报名数</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={`border-t border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-sm">{c.id_card || c.id_number}</td>
                  <td className="px-4 py-3 text-sm">{c.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm">{genderLabel[c.gender] || c.gender || '-'}</td>
                  <td className="px-4 py-3 text-sm">{c.registration_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm" onClick={() => openEdit(c)}>
                        <Pencil className="w-3.5 h-3.5" />编辑
                      </button>
                      <button className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm" onClick={() => onDelete(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />删除
                      </button>
                    </div>
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
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editItem ? '编辑考生' : '添加考生'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">身份证号</label>
                <input type="text" value={form.id_card} onChange={e => setForm(f => ({ ...f, id_card: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">电话</label>
                <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">性别</label>
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">出生日期</label>
                <input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">地址</label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm" onClick={() => setShowModal(false)}>取消</button>
              <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" onClick={onSubmit} disabled={!form.name || !form.id_card}>
                {editItem ? '保存' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
