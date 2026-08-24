'use client'

import { useRef, useState } from 'react'
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

type ScheduleType = 'stream' | 'post'
type ScheduleMode = 'single' | 'range'

type ScheduleRow = {
  key: string
  mode: ScheduleMode
  startDate: string
  endDate: string
}

type PlanRow = {
  key: string
  content: string
}

type FormState = {
  name: string
  clientName: string
  talentName: string
  productName: string
  productOverview: string
  purpose: string
  targetAudience: string
  ngItems: string
  requiredNotations: string
  usedUrl: string
  status: string
  notes: string
}

type InitialScalarData = {
  [Key in Exclude<keyof FormState, 'clientName' | 'talentName'>]?: FormState[Key] | null
}

type InitialProject = InitialScalarData & {
  id: string
  client?: { name?: string | null } | null
  talent?: { name?: string | null } | null
  schedules?: Array<{
    id: string
    type: ScheduleType
    startDate: Date | string
    endDate?: Date | string | null
    order: number
  }>
  plans?: Array<{
    id: string
    content: string
    order: number
  }>
}

interface ProjectFormProps {
  initialData?: InitialProject
  isEdit?: boolean
}

type FieldDefinition = {
  name: keyof FormState
  label: string
  required?: boolean
  type: 'input' | 'textarea' | 'select'
}

function toDateInput(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10)
}

function initialSchedules(initialData: InitialProject | undefined, type: ScheduleType): ScheduleRow[] {
  const rows = initialData?.schedules
    ?.filter(schedule => schedule.type === type)
    .sort((a, b) => a.order - b.order)
    .map(schedule => ({
      key: schedule.id,
      mode: schedule.endDate ? 'range' as const : 'single' as const,
      startDate: toDateInput(schedule.startDate),
      endDate: schedule.endDate ? toDateInput(schedule.endDate) : '',
    }))

  return rows?.length
    ? rows
    : [{ key: `${type}-new-0`, mode: 'single', startDate: '', endDate: '' }]
}

const FIELD_GROUPS: Array<{ group: string; items: FieldDefinition[] }> = [
  { group: '基本情報', items: [
    { name: 'name', label: '案件名', required: true, type: 'input' },
    { name: 'clientName', label: 'クライアント名', required: true, type: 'input' },
    { name: 'talentName', label: 'タレント名', type: 'input' },
    { name: 'status', label: 'ステータス', type: 'select' },
  ]},
  { group: '商材情報', items: [
    { name: 'productName', label: '商材名', type: 'input' },
    { name: 'productOverview', label: '商材概要', type: 'textarea' },
    { name: 'purpose', label: '実施目的', type: 'textarea' },
    { name: 'targetAudience', label: '想定ターゲット', type: 'textarea' },
  ]},
  { group: '制約', items: [
    { name: 'ngItems', label: 'NG事項', type: 'textarea' },
    { name: 'requiredNotations', label: '必須表記', type: 'textarea' },
    { name: 'usedUrl', label: '使用URL', type: 'input' },
  ]},
  { group: 'その他', items: [
    { name: 'notes', label: '備考', type: 'textarea' },
  ]},
]

export function ProjectForm({ initialData, isEdit = false }: ProjectFormProps) {
  const router = useRouter()
  const nextRowId = useRef(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: initialData?.name || '',
    clientName: initialData?.client?.name || '',
    talentName: initialData?.talent?.name || '',
    productName: initialData?.productName || '',
    productOverview: initialData?.productOverview || '',
    purpose: initialData?.purpose || '',
    targetAudience: initialData?.targetAudience || '',
    ngItems: initialData?.ngItems || '',
    requiredNotations: initialData?.requiredNotations || '',
    usedUrl: initialData?.usedUrl || '',
    status: initialData?.status || 'draft',
    notes: initialData?.notes || '',
  })
  const [schedules, setSchedules] = useState<Record<ScheduleType, ScheduleRow[]>>({
    stream: initialSchedules(initialData, 'stream'),
    post: initialSchedules(initialData, 'post'),
  })
  const [plans, setPlans] = useState<PlanRow[]>(() => {
    const rows = [...(initialData?.plans ?? [])]
      .sort((a, b) => a.order - b.order)
      .map(plan => ({ key: plan.id, content: plan.content }))
    return rows?.length ? rows : [{ key: 'plan-new-0', content: '' }]
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const name = e.target.name as keyof FormState
    setForm(prev => ({ ...prev, [name]: e.target.value }))
  }

  const addSchedule = (type: ScheduleType) => {
    setSchedules(prev => ({
      ...prev,
      [type]: [
        ...prev[type],
        { key: `${type}-new-${nextRowId.current++}`, mode: 'single', startDate: '', endDate: '' },
      ],
    }))
  }

  const updateSchedule = (type: ScheduleType, key: string, patch: Partial<ScheduleRow>) => {
    setSchedules(prev => ({
      ...prev,
      [type]: prev[type].map(row => row.key === key ? { ...row, ...patch } : row),
    }))
  }

  const removeSchedule = (type: ScheduleType, key: string) => {
    setSchedules(prev => ({
      ...prev,
      [type]: prev[type].length === 1
        ? [{ key: `${type}-new-${nextRowId.current++}`, mode: 'single', startDate: '', endDate: '' }]
        : prev[type].filter(row => row.key !== key),
    }))
  }

  const addPlan = () => {
    setPlans(prev => [...prev, { key: `plan-new-${nextRowId.current++}`, content: '' }])
  }

  const removePlan = (key: string) => {
    setPlans(prev => prev.length === 1
      ? [{ key: `plan-new-${nextRowId.current++}`, content: '' }]
      : prev.filter(row => row.key !== key))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.clientName.trim()) {
      alert('案件名とクライアント名は必須です')
      return
    }

    try {
      const schedulePayload = (['stream', 'post'] as const).flatMap(type =>
        schedules[type].flatMap(row => {
          if (!row.startDate && !row.endDate) return []
          if (!row.startDate) throw new Error('予定日の開始日を入力してください')
          if (row.mode === 'range' && !row.endDate) {
            throw new Error('期間指定の終了日を入力してください')
          }
          if (row.mode === 'range' && row.endDate < row.startDate) {
            throw new Error('予定日の終了日は開始日以降にしてください')
          }
          return [{
            type,
            startDate: row.startDate,
            endDate: row.mode === 'range' ? row.endDate : null,
          }]
        })
      )

      setLoading(true)
      const url = isEdit ? `/api/projects/${initialData?.id}` : '/api/projects'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          clientName: form.clientName.trim(),
          schedules: schedulePayload,
          plans: plans.map(plan => plan.content.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存に失敗しました')
      router.push(`/projects/${isEdit ? initialData?.id : data.id}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {FIELD_GROUPS.slice(0, 2).map(group => (
        <FieldGroup key={group.group} group={group} form={form} onChange={handleChange} />
      ))}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 border-b border-gray-100 pb-2 text-base font-bold text-gray-800">企画</h2>
        <p className="mb-4 text-sm text-gray-500">企画内容は複数登録できます。</p>
        <div className="space-y-3">
          {plans.map((plan, index) => (
            <div key={plan.key} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor={`plan-${plan.key}`} className="text-sm font-medium text-gray-700">
                  企画内容 {index + 1}
                </label>
                <button
                  type="button"
                  onClick={() => removePlan(plan.key)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  削除
                </button>
              </div>
              <textarea
                id={`plan-${plan.key}`}
                value={plan.content}
                onChange={e => setPlans(prev => prev.map(row =>
                  row.key === plan.key ? { ...row, content: e.target.value } : row
                ))}
                rows={3}
                placeholder="企画の内容を入力してください"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPlan}
          className="mt-4 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        >
          ＋ 企画内容を追加
        </button>
      </div>

      <FieldGroup group={FIELD_GROUPS[2]} form={form} onChange={handleChange} />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 border-b border-gray-100 pb-2 text-base font-bold text-gray-800">スケジュール</h2>
        <div className="space-y-6">
          {(['stream', 'post'] as const).map(type => {
            const label = type === 'stream' ? '配信予定日' : '投稿予定日'
            return (
              <div key={type}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                  <button
                    type="button"
                    onClick={() => addSchedule(type)}
                    className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    ＋ {label}を追加
                  </button>
                </div>
                <p className="mb-3 text-xs text-gray-500">単日または期間を選び、複数登録できます。</p>
                <div className="space-y-3">
                  {schedules[type].map((row, index) => (
                    <div key={row.key} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
                      <div>
                        <label htmlFor={`${type}-mode-${row.key}`} className="mb-1 block text-xs font-medium text-gray-600">
                          指定方法
                        </label>
                        <select
                          id={`${type}-mode-${row.key}`}
                          value={row.mode}
                          onChange={e => updateSchedule(type, row.key, {
                            mode: e.target.value as ScheduleMode,
                            endDate: e.target.value === 'single' ? '' : row.endDate,
                          })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="single">単日</option>
                          <option value="range">期間</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`${type}-start-${row.key}`} className="mb-1 block text-xs font-medium text-gray-600">
                          {row.mode === 'range' ? '開始日' : `${label} ${index + 1}`}
                        </label>
                        <input
                          id={`${type}-start-${row.key}`}
                          type="date"
                          value={row.startDate}
                          onChange={e => updateSchedule(type, row.key, { startDate: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      {row.mode === 'range' ? (
                        <div>
                          <label htmlFor={`${type}-end-${row.key}`} className="mb-1 block text-xs font-medium text-gray-600">
                            終了日
                          </label>
                          <input
                            id={`${type}-end-${row.key}`}
                            type="date"
                            min={row.startDate || undefined}
                            value={row.endDate}
                            onChange={e => updateSchedule(type, row.key, { endDate: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      ) : <div className="hidden sm:block" />}
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => removeSchedule(type, row.key)}
                          className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <FieldGroup group={FIELD_GROUPS[3]} form={form} onChange={handleChange} />

      <div className="flex justify-end gap-3">
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
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? '保存中...' : isEdit ? '更新する' : '案件を作成する'}
        </button>
      </div>
    </form>
  )
}

function FieldGroup({
  group,
  form,
  onChange,
}: {
  group: { group: string; items: FieldDefinition[] }
  form: FormState
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 border-b border-gray-100 pb-2 text-base font-bold text-gray-800">
        {group.group}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {group.items.map(field => (
          <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label htmlFor={field.name} className="mb-1 block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.name}
                name={field.name}
                value={form[field.name]}
                onChange={onChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            ) : field.type === 'select' ? (
              <select
                id={field.name}
                name={field.name}
                value={form[field.name]}
                onChange={onChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {PROJECT_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            ) : (
              <input
                id={field.name}
                type="text"
                name={field.name}
                value={form[field.name]}
                onChange={onChange}
                required={field.required}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
