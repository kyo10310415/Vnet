export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { DocumentStatusBadge } from '@/components/ui/StatusBadge'
import { DOCUMENT_TYPE_LABELS, formatDateTime } from '@/lib/constants'

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const filterStatus = status || 'pending_review'

  const documents = await prisma.generatedDocument.findMany({
    where: { status: filterStatus as any },
    include: {
      project: { select: { id: true, name: true, client: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">✅ 承認待ち一覧</h1>
        <p className="text-sm text-gray-500 mt-1">AI生成物の承認・差し戻しを行います</p>
      </div>

      {/* 重要バナー */}
      <div className="rounded-xl border-l-4 border-orange-400 bg-orange-50 p-4">
        <p className="text-sm font-bold text-orange-800">
          ⚠️ 重要：このページのドキュメントはAI生成の下書きです。必ず内容を確認してから承認してください。
        </p>
        <p className="text-xs text-orange-700 mt-1">
          承認前のドキュメントは「未承認」「下書き」として扱われ、タレントへの共有や配信での使用は禁止です。
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-2">
        {[
          { status: 'pending_review', label: '承認待ち', color: 'yellow' },
          { status: 'rejected', label: '差し戻し', color: 'red' },
          { status: 'approved', label: '承認済み', color: 'green' },
          { status: 'draft', label: '下書き', color: 'gray' },
        ].map(tab => (
          <Link
            key={tab.status}
            href={`/approvals?status=${tab.status}`}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filterStatus === tab.status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">該当するドキュメントはありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <DocumentStatusBadge status={doc.status as any} />
                    <span className="text-xs text-gray-500">
                      {DOCUMENT_TYPE_LABELS[doc.type as keyof typeof DOCUMENT_TYPE_LABELS]}
                    </span>
                    <span className="text-xs text-gray-400">v{doc.version}</span>
                  </div>
                  <p className="font-medium text-gray-900">
                    <Link href={`/projects/${doc.project.id}`} className="hover:text-indigo-600">
                      {doc.project.name}
                    </Link>
                  </p>
                  <p className="text-xs text-gray-500">{doc.project.client.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    更新：{formatDateTime(doc.updatedAt)}
                  </p>
                  {doc.status === 'rejected' && doc.rejectionReason && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2">
                      <p className="text-xs text-red-700">差し戻し理由：{doc.rejectionReason}</p>
                      {doc.revisionRequest && (
                        <p className="text-xs text-red-600">修正依頼：{doc.revisionRequest}</p>
                      )}
                    </div>
                  )}
                </div>
                <Link
                  href={`/projects/${doc.project.id}/documents`}
                  className="flex-shrink-0 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
                >
                  確認・承認 →
                </Link>
              </div>
              {/* プレビュー（最初の100文字） */}
              <div className="mt-3 rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-600 line-clamp-2">
                  {doc.content.substring(0, 150)}...
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
