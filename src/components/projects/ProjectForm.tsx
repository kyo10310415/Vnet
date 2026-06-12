'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PROJECT_STATUSES = [
  { value: 'draft', label: '下書き' },
  { value: 'active', label: '進行中' },
  { value: 'streaming', label: '配信中' },
  { value: 'post_production', label: '配信後作業' },
  { value: 'reporting', label: 'レポート作成中' },
  { value: 'delivered', label: '納品済み' },
  { value: 'closed', label: '完了' },
]

interface ProjectFormProps {
  initialData?: any
  isEdit?: boolean
}

export function ProjectForm({ initialData, isEdit = false }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: initialData?.name || '',
    clientName: initialData?.client?.name || '',
    talentName: initialData?.talent?.name || '',
    productName: initialData?.productName || '',
    productOverview: initialData?.productOverview || '',
    purpose: initialData?.purpose || '',
    targetAudience: initialData?.targetAudience || '',
    appealPoints: initialData?.appealPoints || '',
    requiredAppeals: initialData?.requiredAppeals || '',
    ngItems: initialData?.ngItems || '',
    requiredNotations: initialData?.requiredNotations || '',
    usedUrl: initialData?.usedUrl || '',
    streamDate: initialData?.streamDate ? new Date(initialData.streamDate).toISOString().split('T')[0] : '',
    postDate: initialData?.postDate ? new Date(initialData.postDate).toISOString().split('T')[0] : '',
    status: initialData?.status || 'draft',
    notes: initialData?.notes || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.clientName) {
      alert('案件名とクライアント名は必須です')
      return
    }
    setLoading(true)
    try {
      const url = isEdit ? `/api/projects/${initialData.id}` : '/api/projects'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      router.push(`/projects/${isEdit ? initialData.id : data.id}`)
    } catch (err) {
      alert('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { group: '基本情報', items: [
      { name: 'name', label: '案件名', required: true, type: 'input' },
      { name: 'clientName', label: 'クライアント名', required: true, type: 'input' },
      { name: 'talentName', label: 'タレント名', required: false, type: 'input' },
      { name: 'status', label: 'ステータス', required: false, type: 'select' },
    ]},
    { group: '商材情報', items: [
      { name: 'productName', label: '商材名', required: false, type: 'input' },
      { name: 'productOverview', label: '商材概要', required: false, type: 'textarea' },
      { name: 'purpose', label: '実施目的', required: false, type: 'textarea' },
      { name: 'targetAudience', label: '想定ターゲット', required: false, type: 'textarea' },
    ]},
    { group: '訴求・制約', items: [
      { name: 'appealPoints', label: '訴求ポイント', required: false, type: 'textarea' },
      { name: 'requiredAppeals', label: '必須訴求', required: false, type: 'textarea' },
      { name: 'ngItems', label: 'NG事項', required: false, type: 'textarea' },
      { name: 'requiredNotations', label: '必須表記', required: false, type: 'textarea' },
      { name: 'usedUrl', label: '使用URL', required: false, type: 'input' },
    ]},
    { group: 'スケジュール', items: [
      { name: 'streamDate', label: '配信予定日', required: false, type: 'date' },
      { name: 'postDate', label: '投稿予定日', required: false, type: 'date' },
    ]},
    { group: 'その他', items: [
      { name: 'notes', label: '備考', required: false, type: 'textarea' },
    ]},
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {fields.map(group => (
        <div key={group.group} className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-bold text-gray-800 border-b border-gray-100 pb-2">
            {group.group}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.items.map(field => (
              <div
                key={field.name}
                className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
              >
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="ml-1 text-red-500">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    name={field.name}
                    value={(form as any)[field.name]}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                ) : field.type === 'select' ? (
                  <select
                    name={field.name}
                    value={(form as any)[field.name]}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {PROJECT_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    value={(form as any)[field.name]}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? '保存中...' : isEdit ? '更新する' : '案件を作成する'}
        </button>
      </div>
    </form>
  )
}
