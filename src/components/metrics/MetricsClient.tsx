'use client'

import { useEffect, useRef, useState } from 'react'

interface MetricsClientProps {
  projectId: string
}

type MetricType = 'stream' | 'x_post' | 'combined'

type MetricForm = {
  key: string
  type: MetricType
  label: string
  recordedAt: string
  youtubeUrl: string
  youtubeViews: string
  peakConcurrent: string
  avgViewDuration: string
  likes: string
  comments: string
  xPostUrl: string
  xImpressions: string
  xLikes: string
  xReposts: string
  clicks: string
  cv: string
  cvr: string
  cpa: string
  notes: string
}

type MetricFieldName = Exclude<keyof MetricForm, 'key' | 'type' | 'label' | 'recordedAt'>

type MetricField = {
  name: MetricFieldName
  label: string
  type: 'url' | 'number' | 'text'
  step?: string
}

type ApiMetric = {
  id: string
  type: MetricType
  label: string | null
  recordedAt: string | null
} & Partial<Record<MetricFieldName, string | number | null>>

const YOUTUBE_FIELDS: MetricField[] = [
  { name: 'youtubeUrl', label: 'YouTube URL', type: 'url' },
  { name: 'youtubeViews', label: '再生数', type: 'number' },
  { name: 'peakConcurrent', label: '最大同時接続数', type: 'number' },
  { name: 'avgViewDuration', label: '平均視聴維持率（%）', type: 'number', step: '0.01' },
  { name: 'likes', label: '高評価数', type: 'number' },
  { name: 'comments', label: 'コメント数', type: 'number' },
]

const X_FIELDS: MetricField[] = [
  { name: 'xPostUrl', label: 'X投稿URL', type: 'url' },
  { name: 'xImpressions', label: 'インプレッション', type: 'number' },
  { name: 'xLikes', label: 'いいね数', type: 'number' },
  { name: 'xReposts', label: 'リポスト数', type: 'number' },
  { name: 'clicks', label: 'クリック数', type: 'number' },
]

const RESULT_FIELDS: MetricField[] = [
  { name: 'cv', label: 'CV数', type: 'number' },
  { name: 'cvr', label: 'CVR（%）', type: 'number', step: '0.01' },
  { name: 'cpa', label: 'CPA（円）', type: 'number', step: '0.01' },
  { name: 'notes', label: '備考', type: 'text' },
]

const METRIC_TYPE_LABELS: Record<MetricType, string> = {
  stream: '配信',
  x_post: 'X投稿',
  combined: '配信＋X投稿',
}

const ALL_VALUE_FIELDS: MetricFieldName[] = [
  ...YOUTUBE_FIELDS.map(field => field.name),
  ...X_FIELDS.map(field => field.name),
  ...RESULT_FIELDS.map(field => field.name),
]

function emptyMetric(type: MetricType, key: string): MetricForm {
  return {
    key,
    type,
    label: '',
    recordedAt: '',
    youtubeUrl: '',
    youtubeViews: '',
    peakConcurrent: '',
    avgViewDuration: '',
    likes: '',
    comments: '',
    xPostUrl: '',
    xImpressions: '',
    xLikes: '',
    xReposts: '',
    clicks: '',
    cv: '',
    cvr: '',
    cpa: '',
    notes: '',
  }
}

function metricFromApi(metric: ApiMetric): MetricForm {
  const form = emptyMetric(metric.type, metric.id)
  form.label = metric.label || ''
  form.recordedAt = metric.recordedAt ? new Date(metric.recordedAt).toISOString().slice(0, 10) : ''
  for (const field of ALL_VALUE_FIELDS) {
    const value = metric[field]
    form[field] = value === null || value === undefined ? '' : String(value)
  }
  return form
}

function hasEnteredValues(metric: MetricForm): boolean {
  return Boolean(
    metric.label.trim() ||
    metric.recordedAt ||
    ALL_VALUE_FIELDS.some(field => metric[field].trim())
  )
}

export function MetricsClient({ projectId }: MetricsClientProps) {
  const nextKey = useRef(0)
  const [metrics, setMetrics] = useState<MetricForm[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvTargetKey, setCsvTargetKey] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadMetrics() {
      setInitialLoading(true)
      try {
        const res = await fetch(`/api/metrics/${projectId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '数値データの取得に失敗しました')
        if (ignore) return

        const loaded = (data as ApiMetric[]).map(metricFromApi)
        setMetrics(loaded)
        setCsvTargetKey(loaded[0]?.key || '')
      } catch (error) {
        if (!ignore) alert(error instanceof Error ? error.message : '数値データの取得に失敗しました')
      } finally {
        if (!ignore) setInitialLoading(false)
      }
    }

    void loadMetrics()
    return () => { ignore = true }
  }, [projectId])

  const addMetric = (type: MetricType) => {
    const key = `metric-new-${nextKey.current++}`
    setMetrics(prev => [...prev, emptyMetric(type, key)])
    setCsvTargetKey(key)
  }

  const updateMetric = <Field extends keyof MetricForm>(
    key: string,
    field: Field,
    value: MetricForm[Field]
  ) => {
    setMetrics(prev => prev.map(metric => metric.key === key
      ? { ...metric, [field]: value }
      : metric))
  }

  const removeMetric = (key: string) => {
    setMetrics(prev => {
      const next = prev.filter(metric => metric.key !== key)
      if (csvTargetKey === key) setCsvTargetKey(next[0]?.key || '')
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = metrics
        .filter(hasEnteredValues)
        .map(metric => ({
          type: metric.type,
          label: metric.label,
          recordedAt: metric.recordedAt,
          youtubeUrl: metric.youtubeUrl,
          youtubeViews: metric.youtubeViews,
          peakConcurrent: metric.peakConcurrent,
          avgViewDuration: metric.avgViewDuration,
          likes: metric.likes,
          comments: metric.comments,
          xPostUrl: metric.xPostUrl,
          xImpressions: metric.xImpressions,
          xLikes: metric.xLikes,
          xReposts: metric.xReposts,
          clicks: metric.clicks,
          cv: metric.cv,
          cvr: metric.cvr,
          cpa: metric.cpa,
          notes: metric.notes,
        }))

      const res = await fetch(`/api/metrics/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存に失敗しました')

      const loaded = (data as ApiMetric[]).map(metricFromApi)
      setMetrics(loaded)
      setCsvTargetKey(loaded[0]?.key || '')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleCsvImport = () => {
    if (!csvTargetKey) return

    try {
      const fieldMap: Record<string, keyof MetricForm> = {
        label: 'label', recorded_at: 'recordedAt',
        youtube_url: 'youtubeUrl', youtube_views: 'youtubeViews',
        peak_concurrent: 'peakConcurrent', avg_view_duration: 'avgViewDuration',
        likes: 'likes', comments: 'comments',
        x_post_url: 'xPostUrl', x_impressions: 'xImpressions',
        x_likes: 'xLikes', x_reposts: 'xReposts', clicks: 'clicks',
        cv: 'cv', cvr: 'cvr', cpa: 'cpa', notes: 'notes',
      }
      const updates: Partial<MetricForm> = {}

      for (const line of csvText.trim().split('\n')) {
        const [rawKey, ...valueParts] = line.split(',')
        const field = fieldMap[rawKey?.trim()]
        const value = valueParts.join(',').trim()
        if (field && field !== 'key' && field !== 'type') {
          updates[field] = value
        }
      }

      setMetrics(prev => prev.map(metric => metric.key === csvTargetKey
        ? { ...metric, ...updates }
        : metric))
      setCsvText('')
      alert('CSVを読み込みました。内容を確認して「すべて保存」を押してください。')
    } catch {
      alert('CSVのフォーマットが正しくありません')
    }
  }

  if (initialLoading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
          ✅ すべての数値データを保存しました
        </div>
      )}

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-indigo-950">実績を追加</h2>
            <p className="mt-1 text-sm text-indigo-700">配信やX投稿ごとに、数値を何件でも登録できます。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addMetric('stream')}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              ＋ 配信実績を追加
            </button>
            <button
              type="button"
              onClick={() => addMetric('x_post')}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              ＋ X投稿実績を追加
            </button>
          </div>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-700">数値データはまだありません</p>
          <p className="mt-1 text-xs text-gray-500">上のボタンから配信またはX投稿の実績を追加してください。</p>
        </div>
      ) : (
        <div className="space-y-6">
          {metrics.map((metric, index) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              index={index}
              onChange={updateMetric}
              onRemove={removeMetric}
            />
          ))}
        </div>
      )}

      {metrics.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-3 font-bold text-gray-800">📥 CSVインポート（簡易）</h3>
          <div className="mb-3 max-w-md">
            <label htmlFor="csv-target" className="mb-1 block text-sm font-medium text-gray-700">読み込み先</label>
            <select
              id="csv-target"
              value={csvTargetKey}
              onChange={event => setCsvTargetKey(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {metrics.map((metric, index) => (
                <option key={metric.key} value={metric.key}>
                  {metric.label || `${METRIC_TYPE_LABELS[metric.type]} ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            フォーマット：<code className="rounded bg-gray-100 px-1">key,value</code> を1行ずつ<br />
            例：<code className="rounded bg-gray-100 px-1">youtube_views,12345</code>
          </p>
          <textarea
            value={csvText}
            onChange={event => setCsvText(event.target.value)}
            rows={5}
            placeholder="youtube_views,12345&#10;peak_concurrent,890&#10;x_impressions,50000"
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleCsvImport}
            disabled={!csvText.trim() || !csvTargetKey}
            className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            CSVを読み込む
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '💾 すべて保存'}
        </button>
      </div>
    </div>
  )
}

function MetricCard({
  metric,
  index,
  onChange,
  onRemove,
}: {
  metric: MetricForm
  index: number
  onChange: <Field extends keyof MetricForm>(key: string, field: Field, value: MetricForm[Field]) => void
  onRemove: (key: string) => void
}) {
  const showYouTube = metric.type === 'stream' || metric.type === 'combined'
  const showX = metric.type === 'x_post' || metric.type === 'combined'

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">実績 {index + 1}</p>
          <h2 className="font-bold text-gray-900">
            {metric.type === 'stream' ? '🎥' : metric.type === 'x_post' ? '𝕏' : '📣'}{' '}
            {metric.label || METRIC_TYPE_LABELS[metric.type]}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onRemove(metric.key)}
          className="self-start rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:self-auto"
        >
          削除
        </button>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${metric.key}-type`} className="mb-1 block text-sm font-medium text-gray-700">種別</label>
            <select
              id={`${metric.key}-type`}
              value={metric.type}
              onChange={event => onChange(metric.key, 'type', event.target.value as MetricType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="stream">配信</option>
              <option value="x_post">X投稿</option>
              <option value="combined">配信＋X投稿</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${metric.key}-label`} className="mb-1 block text-sm font-medium text-gray-700">実績名</label>
            <input
              id={`${metric.key}-label`}
              type="text"
              value={metric.label}
              onChange={event => onChange(metric.key, 'label', event.target.value)}
              placeholder="例：発売記念配信／告知投稿①"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor={`${metric.key}-recordedAt`} className="mb-1 block text-sm font-medium text-gray-700">実施日</label>
            <input
              id={`${metric.key}-recordedAt`}
              type="date"
              value={metric.recordedAt}
              onChange={event => onChange(metric.key, 'recordedAt', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {showYouTube && (
          <MetricFieldGroup title="YouTube" fields={YOUTUBE_FIELDS} metric={metric} onChange={onChange} />
        )}
        {showX && (
          <MetricFieldGroup title="X（Twitter）" fields={X_FIELDS} metric={metric} onChange={onChange} />
        )}
        <MetricFieldGroup title="成果指標" fields={RESULT_FIELDS} metric={metric} onChange={onChange} />
      </div>
    </div>
  )
}

function MetricFieldGroup({
  title,
  fields,
  metric,
  onChange,
}: {
  title: string
  fields: MetricField[]
  metric: MetricForm
  onChange: <Field extends keyof MetricForm>(key: string, field: Field, value: MetricForm[Field]) => void
}) {
  return (
    <div>
      <h3 className="mb-3 border-b border-gray-100 pb-2 font-bold text-gray-800">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(field => (
          <div key={field.name} className={field.name === 'notes' ? 'sm:col-span-2' : ''}>
            <label htmlFor={`${metric.key}-${field.name}`} className="mb-1 block text-sm font-medium text-gray-700">
              {field.label}
            </label>
            {field.name === 'notes' ? (
              <textarea
                id={`${metric.key}-${field.name}`}
                value={metric[field.name]}
                onChange={event => onChange(metric.key, field.name, event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            ) : (
              <input
                id={`${metric.key}-${field.name}`}
                type={field.type}
                min={field.type === 'number' ? '0' : undefined}
                step={field.step}
                value={metric[field.name]}
                onChange={event => onChange(metric.key, field.name, event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
