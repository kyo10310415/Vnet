'use client'

import { useState } from 'react'

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onApprove: (approverName: string, comment: string) => Promise<void>
  onReject: (rejectorName: string, reason: string, revisionRequest: string) => Promise<void>
  documentType: string
  documentVersion: number
}

export function ApprovalModal({
  isOpen,
  onClose,
  onApprove,
  onReject,
  documentType,
  documentVersion,
}: ApprovalModalProps) {
  const [mode, setMode] = useState<'approve' | 'reject'>('approve')
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [reason, setReason] = useState('')
  const [revisionRequest, setRevisionRequest] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!name) return alert('名前を入力してください')
    setLoading(true)
    try {
      if (mode === 'approve') {
        await onApprove(name, comment)
      } else {
        if (!reason) return alert('差し戻し理由を入力してください')
        await onReject(name, reason, revisionRequest)
      }
      onClose()
    } catch (err) {
      alert('処理に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-xl font-bold text-gray-800">
          承認・差し戻し
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          対象：{documentType}（v{documentVersion}）
        </p>

        {/* モード選択 */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode('approve')}
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
              mode === 'approve'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            ✅ 承認する
          </button>
          <button
            onClick={() => setMode('reject')}
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
              mode === 'reject'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            ❌ 差し戻す
          </button>
        </div>

        {/* 名前入力 */}
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            あなたの名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：田中 花子"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {mode === 'approve' ? (
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              承認コメント（任意）
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="承認理由・コメント"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                差し戻し理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                placeholder="差し戻しの理由を記入してください"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                修正依頼（任意）
              </label>
              <textarea
                value={revisionRequest}
                onChange={e => setRevisionRequest(e.target.value)}
                rows={2}
                placeholder="具体的な修正内容"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 rounded-lg py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
              mode === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? '処理中...' : mode === 'approve' ? '承認する' : '差し戻す'}
          </button>
        </div>
      </div>
    </div>
  )
}
