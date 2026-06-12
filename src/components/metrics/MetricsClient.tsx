'use client'

import { useState, useEffect } from 'react'

interface MetricsClientProps {
  projectId: string
}

const FIELDS = [
  { group: 'YouTube', items: [
    { name: 'youtubeUrl', label: 'YouTube URL', type: 'url' },
    { name: 'youtubeViews', label: '再生数', type: 'number' },
    { name: 'peakConcurrent', label: '最大同時接続数', type: 'number' },
    { name: 'avgViewDuration', label: '平均視聴維持率（%）', type: 'number', step: '0.01' },
    { name: 'likes', label: '高評価数', type: 'number' },
    { name: 'comments', label: 'コメント数', type: 'number' },
  ]},
  { group: 'X（Twitter）', items: [
    { name: 'xPostUrl', label: 'X投稿URL', type: 'url' },
    { name: 'xImpressions', label: 'インプレッション', type: 'number' },
    { name: 'xLikes', label: 'いいね数', type: 'number' },
    { name: 'xReposts', label: 'リポスト数', type: 'number' },
    { name: 'clicks', label: 'クリック数', type: 'number' },
  ]},
  { group: '成果指標', items: [
    { name: 'cv', label: 'CV数', type: 'number' },
    { name: 'cvr', label: 'CVR（%）', type: 'number', step: '0.01' },
    { name: 'cpa', label: 'CPA（円）', type: 'number', step: '0.01' },
    { name: 'notes', label: '備考', type: 'text' },
  ]},
]

export function MetricsClient({ projectId }: MetricsClientProps) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [csvText, setCsvText] = useState('')

  useEffect(() => { loadMetrics() }, [projectId])

  const loadMetrics = async () => {
    const res = await fetch(`/api/metrics/${projectId}`)
    const data = await res.json()
    if (data) {
      const mapped: Record<string, string> = {}
      Object.entries(data).forEach(([k, v]) => {
        if (v !== null && v !== undefined && k !== 'id' && k !== 'projectId' && k !== 'createdAt' && k !== 'updatedAt') {
          mapped[k] = String(v)
        }
      })
      setForm(mapped)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const body: Record<string, any> = {}
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '') body[k] = v
      })
      await fetch(`/api/metrics/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 簡易CSVインポート
  const handleCsvImport = () => {
    try {
      const lines = csvText.trim().split('\n')
      const newForm = { ...form }
      const fieldMap: Record<string, string> = {
        'youtube_url': 'youtubeUrl', 'youtube_views': 'youtubeViews',
        'peak_concurrent': 'peakConcurrent', 'avg_view_duration': 'avgViewDuration',
        'likes': 'likes', 'comments': 'comments',
        'x_post_url': 'xPostUrl', 'x_impressions': 'xImpressions',
        'x_likes': 'xLikes', 'x_reposts': 'xReposts', 'clicks': 'clicks',
        'cv': 'cv', 'cvr': 'cvr', 'cpa': 'cpa', 'notes': 'notes',
      }
      for (const line of lines) {
        const [key, value] = line.split(',').map(s => s.trim())
        if (key && value !== undefined) {
          const mappedKey = fieldMap[key] || key
          newForm[mappedKey] = value
        }
      }
      setForm(newForm)
      setCsvText('')
      alert('CSVをインポートしました。内容を確認して「保存」を押してください。')
    } catch {
      alert('CSVのフォーマットが正しくありません')
    }
  }

  return (
    <div className="space-y-6">
      {saved && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 font-medium">
          ✅ 保存しました
        </div>
      )}

      {FIELDS.map(group => (
        <div key={group.group} className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 font-bold text-gray-800 border-b border-gray-100 pb-2">{group.group}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.items.map(field => (
              <div key={field.name} className={field.name === 'notes' ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name] || ''}
                  onChange={handleChange}
                  step={(field as any).step}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* CSVインポート */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-3 font-bold text-gray-800">📥 CSVインポート（簡易）</h3>
        <p className="text-xs text-gray-500 mb-3">
          フォーマット：<code className="bg-gray-100 px-1 rounded">key,value</code> を1行ずつ<br />
          例：<code className="bg-gray-100 px-1 rounded">youtube_views,12345</code>
        </p>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          rows={5}
          placeholder="youtube_views,12345&#10;peak_concurrent,890&#10;x_impressions,50000"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-500 mb-2"
        />
        <button
          onClick={handleCsvImport}
          disabled={!csvText.trim()}
          className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          CSVを読み込む
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? '保存中...' : '💾 数値を保存'}
        </button>
      </div>
    </div>
  )
}
