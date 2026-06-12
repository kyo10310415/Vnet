'use client'

import { useState, useEffect } from 'react'

const CATEGORY_LABELS: Record<string, string> = {
  pre_stream: '🎬 配信前チェック',
  during_stream: '📡 配信中チェック',
  post_stream: '📝 配信後チェック',
  pre_report: '📊 レポート前チェック',
}

interface ChecklistClientProps {
  projectId: string
}

export function ChecklistClient({ projectId }: ChecklistClientProps) {
  const [checklists, setChecklists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [checkerName, setCheckerName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadChecklists() }, [projectId])

  const loadChecklists = async () => {
    setLoading(true)
    const res = await fetch(`/api/checklists?projectId=${projectId}`)
    const data = await res.json()
    setChecklists(data)
    setLoading(false)
  }

  const createDefaultChecklists = async () => {
    setCreating(true)
    await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, useDefaults: true }),
    })
    await loadChecklists()
    setCreating(false)
  }

  const handleItemCheck = async (
    checklistId: string,
    itemId: string,
    currentStatus: string
  ) => {
    const newStatus = currentStatus === 'checked' ? 'unchecked' : 'checked'
    await fetch(`/api/checklists/${checklistId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        checkedByName: checkerName || '担当者',
      }),
    })
    await loadChecklists()
  }

  const handleNeedsReview = async (checklistId: string, itemId: string) => {
    await fetch(`/api/checklists/${checklistId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'needs_review' }),
    })
    await loadChecklists()
  }

  if (loading) return <div className="text-center py-8 text-gray-400">読み込み中...</div>

  if (checklists.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border border-dashed border-gray-300 bg-gray-50">
        <p className="text-gray-500 mb-4">チェックリストが作成されていません</p>
        <button
          onClick={createDefaultChecklists}
          disabled={creating}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? '作成中...' : '✅ デフォルトチェックリストを作成'}
        </button>
      </div>
    )
  }

  const allItems = checklists.flatMap(cl => cl.items)
  const checkedCount = allItems.filter(i => i.status === 'checked').length
  const reviewCount = allItems.filter(i => i.status === 'needs_review').length
  const progress = allItems.length > 0 ? Math.round((checkedCount / allItems.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* 担当者名入力 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">チェック担当者名：</label>
        <input
          type="text"
          value={checkerName}
          onChange={e => setCheckerName(e.target.value)}
          placeholder="例：田中 花子"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 max-w-xs"
        />
      </div>

      {/* 進捗サマリー */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">全体進捗</span>
          <span className="text-sm font-bold text-gray-900">{checkedCount}/{allItems.length}（{progress}%）</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {reviewCount > 0 && (
          <p className="text-xs text-yellow-600 mt-2">⚠️ 要確認：{reviewCount}件</p>
        )}
      </div>

      {/* チェックリスト */}
      {checklists.map(checklist => {
        const items = checklist.items
        const checked = items.filter((i: any) => i.status === 'checked').length
        return (
          <div key={checklist.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                {CATEGORY_LABELS[checklist.category] || checklist.category}
              </h3>
              <span className="text-sm text-gray-500">{checked}/{items.length}</span>
            </div>
            <ul className="space-y-2">
              {items.map((item: any) => (
                <li key={item.id} className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                  item.status === 'checked' ? 'border-green-200 bg-green-50' :
                  item.status === 'needs_review' ? 'border-yellow-200 bg-yellow-50' :
                  'border-gray-100'
                }`}>
                  <button
                    onClick={() => handleItemCheck(checklist.id, item.id, item.status)}
                    className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded border-2 transition ${
                      item.status === 'checked'
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {item.status === 'checked' && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${item.status === 'checked' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.label}
                    </p>
                    {item.status === 'needs_review' && (
                      <span className="text-xs text-yellow-600">⚠️ 要確認</span>
                    )}
                    {item.checkedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        チェック済み {new Date(item.checkedAt).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                  {item.status !== 'needs_review' && item.status !== 'checked' && (
                    <button
                      onClick={() => handleNeedsReview(checklist.id, item.id)}
                      className="text-xs text-yellow-600 hover:underline flex-shrink-0"
                    >
                      要確認
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
