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
type TalentType = 'individual' | 'group'

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

type TalentRow = {
  key: string
  name: string
}

type FormState = {
  name: string
  clientName: string
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
  [Key in Exclude<keyof FormState, 'clientName'>]?: FormState[Key] | null
}

type InitialProject = InitialScalarData & {
  id: string
  client?: { name?: string | null } | null
  talentType?: TalentType | null
  talentGroupName?: string | null
  talents?: Array<{
    id: string
    order: number
    talent: { name: string }
  }>
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

type AnalysisFields = {
  name: string | null
  clientName: string | null
  talentType: TalentType | null
  talentGroupName: string | null
  talentNames: string[]
  productName: string | null
  productOverview: string | null
  purpose: string | null
  targetAudience: string | null
  plans: string[]
  ngItems: string | null
  requiredNotations: string | null
  usedUrl: string | null
  schedules: Array<{
    type: ScheduleType
    startDate: string
    endDate: string | null
  }>
  notes: string | null
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
  const analysisFileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [analysisFiles, setAnalysisFiles] = useState<File[]>([])
  const [analysisMessage, setAnalysisMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState<FormState>({
    name: initialData?.name || '',
    clientName: initialData?.client?.name || '',
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
  const [talentType, setTalentType] = useState<TalentType>(initialData?.talentType || 'individual')
  const [talentGroupName, setTalentGroupName] = useState(initialData?.talentGroupName || '')
  const [talents, setTalents] = useState<TalentRow[]>(() => {
    const rows = [...(initialData?.talents ?? [])]
      .sort((a, b) => a.order - b.order)
      .map(assignment => ({ key: assignment.id, name: assignment.talent.name }))
    return rows.length ? rows : [{ key: 'talent-new-0', name: '' }]
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

  const addTalent = () => {
    setTalents(prev => [...prev, { key: `talent-new-${nextRowId.current++}`, name: '' }])
  }

  const removeTalent = (key: string) => {
    setTalents(prev => prev.length === 1
      ? [{ key: `talent-new-${nextRowId.current++}`, name: '' }]
      : prev.filter(row => row.key !== key))
  }

  const handleAnalyze = async () => {
    if (!transcript.trim() && analysisFiles.length === 0) {
      setAnalysisMessage({ type: 'error', text: '文字起こしを入力するか、ファイルを追加してください。' })
      return
    }

    setAnalysisLoading(true)
    setAnalysisMessage(null)
    try {
      const body = new FormData()
      body.append('transcript', transcript.trim())
      analysisFiles.forEach(file => body.append('files', file))
      const response = await fetch('/api/projects/analyze', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI解析に失敗しました')

      const fields = data.fields as AnalysisFields
      setForm(prev => ({
        ...prev,
        name: fields.name ?? prev.name,
        clientName: fields.clientName ?? prev.clientName,
        productName: fields.productName ?? prev.productName,
        productOverview: fields.productOverview ?? prev.productOverview,
        purpose: fields.purpose ?? prev.purpose,
        targetAudience: fields.targetAudience ?? prev.targetAudience,
        ngItems: fields.ngItems ?? prev.ngItems,
        requiredNotations: fields.requiredNotations ?? prev.requiredNotations,
        usedUrl: fields.usedUrl ?? prev.usedUrl,
        notes: fields.notes ?? prev.notes,
      }))

      if (fields.talentType) setTalentType(fields.talentType)
      if (fields.talentGroupName) setTalentGroupName(fields.talentGroupName)
      if (fields.talentNames.length) {
        setTalents(fields.talentNames.map(name => ({
          key: `talent-ai-${nextRowId.current++}`,
          name,
        })))
      }
      if (fields.plans.length) {
        setPlans(fields.plans.map(content => ({
          key: `plan-ai-${nextRowId.current++}`,
          content,
        })))
      }

      for (const type of ['stream', 'post'] as const) {
        const detectedSchedules = fields.schedules.filter(schedule => schedule.type === type)
        if (detectedSchedules.length) {
          setSchedules(prev => ({
            ...prev,
            [type]: detectedSchedules.map(schedule => ({
              key: `${type}-ai-${nextRowId.current++}`,
              mode: schedule.endDate ? 'range' : 'single',
              startDate: schedule.startDate,
              endDate: schedule.endDate || '',
            })),
          }))
        }
      }

      const scalarCount = [
        fields.name,
        fields.clientName,
        fields.productName,
        fields.productOverview,
        fields.purpose,
        fields.targetAudience,
        fields.ngItems,
        fields.requiredNotations,
        fields.usedUrl,
        fields.notes,
      ].filter(Boolean).length
      const appliedCount = scalarCount
        + (fields.talentType || fields.talentGroupName || fields.talentNames.length ? 1 : 0)
        + (fields.plans.length ? 1 : 0)
        + (fields.schedules.length ? 1 : 0)
      setAnalysisMessage({
        type: 'success',
        text: appliedCount
          ? `${appliedCount}項目をフォームへ反映しました。内容を確認し、必要に応じて修正してください。`
          : 'フォームへ反映できる情報を資料から見つけられませんでした。',
      })
    } catch (error) {
      setAnalysisMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'AI解析に失敗しました',
      })
    } finally {
      setAnalysisLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.clientName.trim()) {
      alert('案件名とクライアント名は必須です')
      return
    }
    if (talentType === 'group' && !talentGroupName.trim()) {
      alert('グループ名を入力してください')
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
          talentType,
          talentGroupName: talentType === 'group' ? talentGroupName.trim() : null,
          talentNames: talents.map(talent => talent.name.trim()).filter(Boolean),
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
      {!isEdit && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-indigo-950">✨ AIで案件情報を自動入力</h2>
            <p className="mt-1 text-sm text-indigo-800">
              文字起こしや資料から読み取れた項目だけを反映します。反映後もすべて手動で編集できます。
            </p>
          </div>
          <label htmlFor="analysis-transcript" className="mb-1 block text-sm font-medium text-gray-700">
            文字起こし
          </label>
          <textarea
            id="analysis-transcript"
            value={transcript}
            onChange={event => setTranscript(event.target.value)}
            rows={6}
            maxLength={50000}
            placeholder="打ち合わせやヒアリングの文字起こしを貼り付けてください"
            className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <div className="mt-4">
            <label htmlFor="analysis-files" className="mb-1 block text-sm font-medium text-gray-700">
              添付ファイル
            </label>
            <input
              ref={analysisFileInputRef}
              id="analysis-files"
              type="file"
              multiple
              accept=".pdf,.txt,.text,.md,.markdown,.json,.html,.htm,.xml,.srt,.vtt,.csv,.tsv,.doc,.docx,.rtf,.odt,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif"
              onChange={event => setAnalysisFiles(Array.from(event.target.files ?? []))}
              className="block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700"
            />
            <p className="mt-1 text-xs text-gray-500">PDF・Word・Excel・PowerPoint・テキスト・字幕・画像（最大5件、1件10MB、合計25MB）</p>
            {analysisFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {analysisFiles.map(file => (
                  <span key={`${file.name}-${file.lastModified}`} className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-600">
                    {file.name}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setAnalysisFiles([])
                    if (analysisFileInputRef.current) analysisFileInputRef.current.value = ''
                  }}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  添付をクリア
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analysisLoading}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analysisLoading ? 'AIで解析中...' : 'AIで解析してフォームに反映'}
            </button>
            <p className="text-xs text-gray-500">入力済みの項目は、資料から値を読み取れた場合だけ更新されます。</p>
          </div>
          <p className="mt-2 text-xs text-gray-500">解析時、入力した文字起こしと添付資料はOpenAI APIへ送信されます。</p>
          {analysisMessage && (
            <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              analysisMessage.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {analysisMessage.text}
            </div>
          )}
        </div>
      )}

      <FieldGroup group={FIELD_GROUPS[0]} form={form} onChange={handleChange} />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 border-b border-gray-100 pb-2 text-base font-bold text-gray-800">タレント</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="talent-type" className="mb-1 block text-sm font-medium text-gray-700">案件単位</label>
            <select
              id="talent-type"
              value={talentType}
              onChange={event => setTalentType(event.target.value as TalentType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="individual">個人</option>
              <option value="group">グループ</option>
            </select>
          </div>
          {talentType === 'group' && (
            <div>
              <label htmlFor="talent-group-name" className="mb-1 block text-sm font-medium text-gray-700">
                グループ名<span className="ml-1 text-red-500">*</span>
              </label>
              <input
                id="talent-group-name"
                type="text"
                value={talentGroupName}
                onChange={event => setTalentGroupName(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">
                {talentType === 'group' ? 'メンバー名' : 'タレント名'}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {talentType === 'group' ? '判明しているメンバーを複数登録できます。' : '共演案件など、複数名を登録できます。'}
              </p>
            </div>
            <button
              type="button"
              onClick={addTalent}
              className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            >
              ＋ 追加
            </button>
          </div>
          <div className="space-y-3">
            {talents.map((talent, index) => (
              <div key={talent.key} className="flex items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex-1">
                  <label htmlFor={`talent-${talent.key}`} className="mb-1 block text-xs font-medium text-gray-600">
                    {talentType === 'group' ? 'メンバー' : 'タレント'} {index + 1}
                  </label>
                  <input
                    id={`talent-${talent.key}`}
                    type="text"
                    value={talent.name}
                    onChange={event => setTalents(prev => prev.map(row =>
                      row.key === talent.key ? { ...row, name: event.target.value } : row
                    ))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTalent(talent.key)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FieldGroup group={FIELD_GROUPS[1]} form={form} onChange={handleChange} />

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
