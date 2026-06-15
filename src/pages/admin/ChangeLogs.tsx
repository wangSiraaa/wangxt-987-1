import { useState, useEffect } from 'react'
import { History, Search, Filter, Download, Clock } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import dayjs from 'dayjs'

const changeTypeBadge: Record<string, string> = {
  seat_adjust: 'bg-blue-100 text-blue-700',
  proctor_replace: 'bg-purple-100 text-purple-700',
  room_transfer: 'bg-orange-100 text-orange-700',
  deferral: 'bg-yellow-100 text-yellow-700',
  accessibility: 'bg-teal-100 text-teal-700',
  equipment_failure: 'bg-red-100 text-red-700',
  late_payment: 'bg-green-100 text-green-700',
  half_exam: 'bg-indigo-100 text-indigo-700',
  cheating: 'bg-rose-100 text-rose-700',
  proctor_conflict: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700',
}

const changeTypeLabel: Record<string, string> = {
  seat_adjust: '座位调整',
  proctor_replace: '监考替换',
  room_transfer: '考场转场',
  deferral: '缓考申请',
  accessibility: '无障碍安排',
  equipment_failure: '设备故障',
  late_payment: '临考补缴',
  half_exam: '半程状态',
  cheating: '作弊处理',
  proctor_conflict: '回避关系',
  other: '其他变更',
}

export default function ChangeLogs() {
  const {
    examChangeLogs,
    loading,
    fetchExamChangeLogs,
  } = useDataStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    fetchExamChangeLogs()
  }, [])

  const filteredLogs = examChangeLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      (log.candidate_name && log.candidate_name.includes(searchTerm)) ||
      (log.reason && log.reason.includes(searchTerm)) ||
      (log.changed_by && log.changed_by.includes(searchTerm))
    const matchesType = !filterType || log.change_type === filterType
    const matchesDate = (!dateRange.start || dayjs(log.created_at).isAfter(dayjs(dateRange.start).startOf('day'))) &&
                        (!dateRange.end || dayjs(log.created_at).isBefore(dayjs(dateRange.end).endOf('day')))
    return matchesSearch && matchesType && matchesDate
  })

  const exportLogs = () => {
    const csvContent = [
      ['时间', '变更类型', '考生', '变更原因', '原值', '新值', '操作人'].join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        changeTypeLabel[log.change_type] || log.change_type,
        log.candidate_name || '',
        log.reason || '',
        log.old_value || '',
        log.new_value || '',
        log.changed_by || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `变更日志_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = dayjs(log.created_at).format('YYYY-MM-DD')
    if (!groups[date]) groups[date] = []
    groups[date].push(log)
    return groups
  }, {} as Record<string, typeof filteredLogs>)

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf())

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">变更日志</h1>
          <p className="text-sm text-slate-500 mt-1">完整记录所有考试日变更操作，支持审计追溯</p>
        </div>
        <button
          onClick={exportLogs}
          className="flex items-center gap-1 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800"
        >
          <Download className="w-4 h-4" />导出CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜索考生、原因、操作人"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">变更类型</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">全部类型</option>
                {Object.entries(changeTypeLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">开始日期</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">结束日期</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">暂无变更记录</p>
          </div>
        ) : sortedDates.map(date => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                {date}
                {dayjs(date).isSame(dayjs(), 'day') && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">今天</span>}
              </span>
              <span className="text-xs text-slate-400">({groupedLogs[date].length} 条记录)</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-sm text-slate-600">
                    <th className="px-4 py-3 font-medium w-32">时间</th>
                    <th className="px-4 py-3 font-medium w-28">类型</th>
                    <th className="px-4 py-3 font-medium w-28">考生</th>
                    <th className="px-4 py-3 font-medium">变更原因</th>
                    <th className="px-4 py-3 font-medium w-32">原值</th>
                    <th className="px-4 py-3 font-medium w-32">新值</th>
                    <th className="px-4 py-3 font-medium w-24">操作人</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLogs[date].map((log, i) => (
                    <tr key={log.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="px-4 py-3 text-sm text-slate-500">{dayjs(log.created_at).format('HH:mm:ss')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${changeTypeBadge[log.change_type] || 'bg-gray-100 text-gray-700'}`}>
                          {changeTypeLabel[log.change_type] || log.change_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{log.candidate_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{log.reason || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{log.old_value || '-'}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">{log.new_value || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{log.changed_by || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-slate-400">
        共 {filteredLogs.length} 条记录
      </div>
    </div>
  )
}
