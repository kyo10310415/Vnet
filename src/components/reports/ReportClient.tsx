'use client'

import { useState, useEffect } from 'react'
import { ApprovalModal } from '@/components/ui/ApprovalModal'

interface ReportClientProps {
  projectId: string
}

const SECTIONS = [
  { name: 'overview', label: '案件概要' },
  { name: 'implementation', label: '実施内容' },
  { name: 'urls', label: '投稿・配信URL' },
  { name: 'metricsSummary', label: '数値サマリー' },
  { name: 'achievements', label: '成果' },
  { name: 'goodPoints', label: '良かった点' },
  { name: 'issues', label: '課題' },
  { name: 'improvements', label: '次回改善提案' },
  { name: 'clientComment', label: 'クライアント向けコメント' },
]

export function ReportClient({ projectId }: ReportClientProps) {
  const [report, setReport] = useState<any>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [approvalModal, setApprovalModal] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadReport() }, [projectId])

  const loadReport = async () => {
    const res = await fetch(`/api/reports/${projectId}`)
    const data = await res.json()
    if (data) {
      setReport(data)
      const mapped: Record<string, string> = {}
      SECTIONS.forEach(s => { mapped[s.name] = data[s.name] || '' })
      setForm(mapped)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/reports/${projectId}/generate`, { method: 'POST' })
      const data = await res.json()
      setReport(data)
      const mapped: Record<string, string> = {}
      SECTIONS.forEach(s => { mapped[s.name] = data[s.name] || '' })
      setForm(mapped)
    } catch {
      alert('生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error)
        return
      }
      const data = await res.json()
      setReport(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitForReview = async () => {
    await fetch(`/api/reports/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, status: 'pending_review' }),
    })
    await loadReport()
  }

  const handleApprove = async (approverName: string, comment: string) => {
    await fetch(`/api/reports/${projectId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverName, comment }),
    })
    await loadReport()
    setApprovalModal(false)
  }

  const handleReject = async (rejectorName: string, reason: string) => {
    await fetch(`/api/reports/${projectId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectorName, reason }),
    })
    await loadReport()
    setApprovalModal(false)
  }

  const isReadOnly = report?.status === 'approved' || report?.status === 'delivered'

  return (
    <div className="space-y-6">
      {/* ステータスバナー */}
      {!report ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-gray-500 mb-4">レポートがまだ作成されていません</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {generating ? '⏳ 生成中...' : '📄 レポート下書きを自動生成'}
          </button>
          <p className="text-xs text-gray-400 mt-2">案件情報・数値データを元に下書きを生成します</p>
        </div>
      ) : (
        <>
          {/* 納品可否バナー */}
          <div className={`rounded-xl border-l-4 p-4 ${
            report.status === 'approved' || report.status === 'delivered'
              ? 'border-green-500 bg-green-50'
              : 'border-red-400 bg-red-50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                {report.status === 'approved' || report.status === 'delivered' ? (
                  <p className="font-bold text-green-800 text-lg">✅ 納品可能</p>
                ) : (
                  <p className="font-bold text-red-800 text-lg">🚫 納品不可（承認前）</p>
                )}
                <p className="text-sm mt-1 text-gray-600">
                  ステータス：{
                    ({ draft: '下書き', pending_review: '承認待ち', approved: '承認済み', rejected: '差し戻し', delivered: '納品済み' } as Record<string, string>)[report.status] || report.status
                  }
                </p>
                {report.approvedBy && (
                  <p className="text-xs text-gray-500 mt-1">
                    承認者：{report.approvedBy}（{new Date(report.approvedAt).toLocaleString('ja-JP')}）
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {report.status === 'draft' && (
                  <button
                    onClick={handleSubmitForReview}
                    className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                  >
                    📋 承認申請
                  </button>
                )}
                {report.status === 'pending_review' && (
                  <button
                    onClick={() => setApprovalModal(true)}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    ✅ 承認・差し戻し
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={generating || isReadOnly}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  🔄 再生成
                </button>
              </div>
            </div>
          </div>

          {saved && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              ✅ 保存しました
            </div>
          )}

          {isReadOnly && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
              ⚠️ 承認済みのレポートは編集できません
            </div>
          )}

          {/* レポートセクション */}
          <div className="space-y-4">
            {SECTIONS.map(section => (
              <div key={section.name} className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 font-semibold text-gray-800">{section.label}</h3>
                {isReadOnly ? (
                  <div className="whitespace-pre-wrap text-sm text-gray-700 min-h-[60px]">
                    {form[section.name] || '（未記入）'}
                  </div>
                ) : (
                  <textarea
                    value={form[section.name] || ''}
                    onChange={e => setForm(prev => ({ ...prev, [section.name]: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                  />
                )}
              </div>
            ))}
          </div>

          {!isReadOnly && (
            <div className="flex justify-end gap-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? '保存中...' : '💾 保存'}
              </button>
            </div>
          )}
        </>
      )}

      {/* 承認モーダル */}
      {approvalModal && (
        <ApprovalModal
          isOpen={approvalModal}
          onClose={() => setApprovalModal(false)}
          onApprove={handleApprove}
          onReject={handleReject}
          documentType="レポート"
          documentVersion={1}
        />
      )}
    </div>
  )
}
