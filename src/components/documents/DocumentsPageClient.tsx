'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentStatusBadge } from '@/components/ui/StatusBadge'
import { ApprovalModal } from '@/components/ui/ApprovalModal'
import { DOCUMENT_TYPE_LABELS, formatDateTime } from '@/lib/constants'

const DOC_TYPES = [
  { value: 'stream_structure', label: '配信構成案', icon: '🎬', required: true },
  { value: 'stream_script', label: '配信台本案', icon: '📜', required: true },
  { value: 'ng_list', label: 'NGリスト案', icon: '🚫', required: true },
  { value: 'talent_briefing', label: 'タレント向け説明文案', icon: '🎭', required: true },
  { value: 'x_announcement', label: 'X告知投稿文案', icon: '🐦', required: false },
  { value: 'report_body', label: 'レポート本文案', icon: '📊', required: false },
  { value: 'next_proposal', label: '次回施策提案案', icon: '💡', required: false },
]

interface DocumentPageClientProps {
  projectId: string
  projectName: string
}

export function DocumentsPageClient({ projectId, projectName }: DocumentPageClientProps) {
  const [documents, setDocuments] = useState<any[]>([])
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [approvalModal, setApprovalModal] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [projectId])

  const loadDocuments = async () => {
    const res = await fetch(`/api/documents?projectId=${projectId}`)
    const data = await res.json()
    setDocuments(data)
  }

  const getLatestByType = (type: string) => {
    return documents
      .filter(d => d.type === type)
      .sort((a, b) => b.version - a.version)[0]
  }

  const handleGenerate = async (type: string) => {
    setGenerating(type)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, type }),
      })
      const data = await res.json()
      await loadDocuments()
      setSelectedType(type)
      setSelectedDoc(data)
      setEditContent(data.content)
      setIsEditing(false)
    } catch (err) {
      alert('生成に失敗しました')
    } finally {
      setGenerating(null)
    }
  }

  const handleSelectDoc = (type: string) => {
    const doc = getLatestByType(type)
    setSelectedType(type)
    setSelectedDoc(doc || null)
    setEditContent(doc?.content || '')
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!selectedDoc) return
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      const data = await res.json()
      if (data._newVersion) {
        alert('承認済みのため、新しいバージョン（v' + data.version + '）として保存しました')
      }
      await loadDocuments()
      setSelectedDoc(data)
      setIsEditing(false)
    } catch {
      alert('保存に失敗しました')
    }
  }

  const handleSubmitForReview = async () => {
    if (!selectedDoc) return
    setSubmittingReview(true)
    try {
      await fetch(`/api/documents/${selectedDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending_review' }),
      })
      await loadDocuments()
      const updated = documents.find(d => d.id === selectedDoc.id)
      if (updated) setSelectedDoc({ ...updated, status: 'pending_review' })
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleApprove = async (approverName: string, comment: string) => {
    if (!selectedDoc) return
    await fetch(`/api/documents/${selectedDoc.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverName, comment }),
    })
    await loadDocuments()
    setApprovalModal(false)
    const updated = { ...selectedDoc, status: 'approved', approvedBy: approverName }
    setSelectedDoc(updated)
  }

  const handleReject = async (rejectorName: string, reason: string, revisionRequest: string) => {
    if (!selectedDoc) return
    await fetch(`/api/documents/${selectedDoc.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectorName, reason, revisionRequest }),
    })
    await loadDocuments()
    setApprovalModal(false)
    const updated = { ...selectedDoc, status: 'rejected', rejectedBy: rejectorName }
    setSelectedDoc(updated)
  }

  return (
    <div className="space-y-4">
      {/* 重要注意バナー */}
      <div className="rounded-xl border-l-4 border-red-400 bg-red-50 p-4">
        <p className="text-sm font-bold text-red-800">
          🚨 重要：AI生成物は下書きです。承認を受けるまで使用・共有禁止
        </p>
        <p className="text-xs text-red-600 mt-1">
          配信台本・NGリスト・タレント説明文は必ず担当者承認後に使用してください
        </p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-280px)]">
        {/* 左：ドキュメントタイプ一覧 */}
        <div className="w-64 flex-shrink-0 overflow-y-auto">
          <div className="space-y-1">
            {DOC_TYPES.map(docType => {
              const doc = getLatestByType(docType.value)
              return (
                <button
                  key={docType.value}
                  onClick={() => handleSelectDoc(docType.value)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedType === docType.value
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span>{docType.icon}</span>
                      <span className="text-xs font-medium text-gray-800">{docType.label}</span>
                    </div>
                    {docType.required && (
                      <span className="text-xs text-red-500 flex-shrink-0">必須</span>
                    )}
                  </div>
                  {doc ? (
                    <div className="mt-2">
                      <DocumentStatusBadge status={doc.status} />
                      <p className="text-xs text-gray-400 mt-1">v{doc.version}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-2">未生成</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 右：ドキュメント詳細・編集 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedType ? (
            <div className="flex flex-col h-full">
              {/* ドキュメントヘッダー */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-gray-900">
                    {DOCUMENT_TYPE_LABELS[selectedType as keyof typeof DOCUMENT_TYPE_LABELS]}
                  </h3>
                  {selectedDoc && (
                    <>
                      <DocumentStatusBadge status={selectedDoc.status} large />
                      <span className="text-sm text-gray-500">v{selectedDoc.version}</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* 生成・再生成ボタン */}
                  <button
                    onClick={() => handleGenerate(selectedType)}
                    disabled={generating === selectedType}
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    {generating === selectedType ? '⏳ 生成中...' : selectedDoc ? '🔄 再生成' : '🤖 AI生成'}
                  </button>

                  {/* 承認申請ボタン（下書き時のみ） */}
                  {selectedDoc && selectedDoc.status === 'draft' && (
                    <button
                      onClick={handleSubmitForReview}
                      disabled={submittingReview}
                      className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                    >
                      📋 承認申請
                    </button>
                  )}

                  {/* 承認・差し戻しボタン（承認待ち時のみ） */}
                  {selectedDoc && selectedDoc.status === 'pending_review' && (
                    <button
                      onClick={() => setApprovalModal(true)}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      ✅ 承認・差し戻し
                    </button>
                  )}
                </div>
              </div>

              {/* 承認済み・差し戻し情報表示 */}
              {selectedDoc?.status === 'approved' && (
                <div className="mb-3 rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-xs font-medium text-green-800">
                    ✅ 承認済み · 承認者：{selectedDoc.approvedBy} · {formatDateTime(selectedDoc.approvedAt)}
                  </p>
                  {selectedDoc.approvalComment && (
                    <p className="text-xs text-green-700 mt-1">コメント：{selectedDoc.approvalComment}</p>
                  )}
                </div>
              )}
              {selectedDoc?.status === 'rejected' && (
                <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-xs font-medium text-red-800">
                    ❌ 差し戻し · {selectedDoc.rejectedBy} · {formatDateTime(selectedDoc.rejectedAt)}
                  </p>
                  <p className="text-xs text-red-700 mt-1">理由：{selectedDoc.rejectionReason}</p>
                  {selectedDoc.revisionRequest && (
                    <p className="text-xs text-red-700">修正依頼：{selectedDoc.revisionRequest}</p>
                  )}
                </div>
              )}

              {/* コンテンツエリア */}
              {selectedDoc ? (
                isEditing ? (
                  <div className="flex flex-col flex-1 gap-2">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="flex-1 rounded-xl border border-indigo-300 p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setIsEditing(false); setEditContent(selectedDoc.content) }}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-5">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                        {selectedDoc.content}
                      </pre>
                    </div>
                    {selectedDoc.status !== 'approved' && selectedDoc.status !== 'delivered' && (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => setIsEditing(true)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          ✏️ 編集
                        </button>
                      </div>
                    )}
                    {selectedDoc.status === 'approved' && (
                      <p className="mt-2 text-xs text-gray-400 text-right">
                        ※承認済み。編集すると新バージョンが作成されます
                      </p>
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
                  <div className="text-center">
                    <p className="text-gray-500 mb-3">まだ生成されていません</p>
                    <button
                      onClick={() => handleGenerate(selectedType)}
                      disabled={generating === selectedType}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {generating === selectedType ? '⏳ 生成中...' : '🤖 AI生成する'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
              <p className="text-gray-500">左からドキュメントタイプを選択してください</p>
            </div>
          )}
        </div>
      </div>

      {/* 承認モーダル */}
      {approvalModal && selectedDoc && (
        <ApprovalModal
          isOpen={approvalModal}
          onClose={() => setApprovalModal(false)}
          onApprove={handleApprove}
          onReject={handleReject}
          documentType={DOCUMENT_TYPE_LABELS[selectedDoc.type as keyof typeof DOCUMENT_TYPE_LABELS]}
          documentVersion={selectedDoc.version}
        />
      )}
    </div>
  )
}
