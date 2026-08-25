export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime, formatSchedules, DOCUMENT_TYPE_LABELS } from '@/lib/constants'
import { DocumentStatusBadge } from '@/components/ui/StatusBadge'
import { formatProjectTalentName } from '@/lib/project-talent'

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き', active: '進行中', streaming: '配信中',
  post_production: '配信後作業', reporting: 'レポート作成中',
  delivered: '納品済み', closed: '完了',
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', active: 'bg-blue-100 text-blue-700',
  streaming: 'bg-red-100 text-red-700', post_production: 'bg-yellow-100 text-yellow-700',
  reporting: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      talents: { include: { talent: true }, orderBy: { order: 'asc' } },
      director: { select: { name: true } },
      schedules: { orderBy: [{ type: 'asc' }, { order: 'asc' }] },
      plans: { orderBy: { order: 'asc' } },
      documents: { orderBy: [{ type: 'asc' }, { version: 'desc' }] },
      checklists: { include: { items: { orderBy: { order: 'asc' } } }, orderBy: { category: 'asc' } },
      metrics: true,
      reports: true,
      activityLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { name: true } } },
      },
    },
  })

  if (!project) notFound()

  const report = project.reports[0]
  const streamSchedules = project.schedules.filter(schedule => schedule.type === 'stream')
  const postSchedules = project.schedules.filter(schedule => schedule.type === 'post')
  const pendingDocs = project.documents.filter(d => d.status === 'pending_review')
  const rejectedDocs = project.documents.filter(d => d.status === 'rejected')
  const talentName = formatProjectTalentName(project)

  // 最新バージョンのみ表示（typeごとに）
  const latestDocsByType = Object.values(
    project.documents.reduce((acc, doc) => {
      if (!acc[doc.type] || acc[doc.type].version < doc.version) {
        acc[doc.type] = doc
      }
      return acc
    }, {} as Record<string, typeof project.documents[0]>)
  )

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/projects" className="text-sm text-gray-400 hover:text-gray-600">← 案件一覧</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[project.status]}`}>
              {STATUS_LABEL[project.status]}
            </span>
            <span className="text-sm text-gray-500">{project.client.name}</span>
            {talentName !== '—' && <span className="text-sm text-gray-500">/ {talentName}</span>}
          </div>
        </div>
        <Link
          href={`/projects/${id}/edit`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          編集
        </Link>
      </div>

      {/* 警告バナー */}
      {(pendingDocs.length > 0 || rejectedDocs.length > 0) && (
        <div className="space-y-2">
          {pendingDocs.length > 0 && (
            <div className="rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-800">
                ⏳ 承認待ちのドキュメントが{pendingDocs.length}件あります
              </p>
            </div>
          )}
          {rejectedDocs.length > 0 && (
            <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                ❌ 差し戻しのドキュメントが{rejectedDocs.length}件あります
              </p>
            </div>
          )}
        </div>
      )}

      {/* クイックアクション */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: `/projects/${id}/documents`, label: 'AI下書き生成', icon: '🤖', color: 'bg-purple-50 border-purple-200 text-purple-700' },
          { href: `/projects/${id}/checklist`, label: 'チェックリスト', icon: '✅', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { href: `/projects/${id}/metrics`, label: '数値入力', icon: '📊', color: 'bg-green-50 border-green-200 text-green-700' },
          { href: `/projects/${id}/report`, label: 'レポート', icon: '📄', color: 'bg-orange-50 border-orange-200 text-orange-700' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex items-center gap-2 rounded-xl border p-4 font-medium transition hover:shadow-md ${action.color}`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm">{action.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 案件詳細情報 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 font-bold text-gray-900">📋 案件情報</h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: '商材名', value: project.productName },
                { label: '配信予定日', value: formatSchedules(streamSchedules) },
                { label: '投稿予定日', value: formatSchedules(postSchedules) },
                { label: '使用URL', value: project.usedUrl },
              ].map(item => item.value && item.value !== '—' && (
                <div key={item.label}>
                  <dt className="text-xs font-medium text-gray-500">{item.label}</dt>
                  <dd className="text-sm text-gray-900 mt-0.5">{item.value}</dd>
                </div>
              ))}
              {project.purpose && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500">実施目的</dt>
                  <dd className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{project.purpose}</dd>
                </div>
              )}
              {project.plans.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500">企画内容</dt>
                  <dd className="mt-1 space-y-2">
                    {project.plans.map((plan, index) => (
                      <div key={plan.id} className="rounded bg-indigo-50 p-3 text-sm text-indigo-950 whitespace-pre-wrap">
                        <span className="mr-2 font-semibold">{index + 1}.</span>{plan.content}
                      </div>
                    ))}
                  </dd>
                </div>
              )}
              {project.ngItems && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500 text-red-500">⚠️ NG事項</dt>
                  <dd className="text-sm text-red-700 mt-0.5 whitespace-pre-wrap bg-red-50 p-2 rounded">{project.ngItems}</dd>
                </div>
              )}
              {project.requiredNotations && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-blue-600">必須表記</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap rounded bg-blue-50 p-2 text-sm text-blue-900">{project.requiredNotations}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* ドキュメント一覧 */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">🤖 AI生成ドキュメント</h2>
              <Link href={`/projects/${id}/documents`} className="text-xs text-indigo-600 hover:underline">
                生成・管理 →
              </Link>
            </div>
            {latestDocsByType.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">まだドキュメントがありません</p>
                <Link href={`/projects/${id}/documents`} className="text-sm text-indigo-600 hover:underline">
                  AI下書きを生成する →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {latestDocsByType.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {DOCUMENT_TYPE_LABELS[doc.type as keyof typeof DOCUMENT_TYPE_LABELS]}
                      </p>
                      <p className="text-xs text-gray-500">v{doc.version} · {formatDateTime(doc.createdAt)}</p>
                    </div>
                    <DocumentStatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* レポートステータス */}
          {report && (
            <div className={`rounded-xl border p-6 ${
              report.status === 'approved' ? 'border-green-200 bg-green-50' :
              report.status === 'rejected' ? 'border-red-200 bg-red-50' :
              'border-yellow-200 bg-yellow-50'
            }`}>
              <h2 className="mb-2 font-bold text-gray-900">📄 レポートステータス</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {report.status === 'approved' ? '✅ 納品可能' :
                     report.status === 'delivered' ? '📦 納品済み' :
                     '🚫 納品不可（未承認）'}
                  </p>
                  {report.approvedBy && (
                    <p className="text-xs text-gray-600 mt-1">承認者：{report.approvedBy}（{formatDate(report.approvedAt)}）</p>
                  )}
                </div>
                <Link href={`/projects/${id}/report`} className="text-xs text-indigo-600 hover:underline">
                  確認 →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* サイドパネル：アクティビティ */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 font-bold text-gray-900">📜 最近のアクティビティ</h2>
            {project.activityLogs.length === 0 ? (
              <p className="text-xs text-gray-500">アクティビティはありません</p>
            ) : (
              <ul className="space-y-3">
                {project.activityLogs.map(log => (
                  <li key={log.id} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-300"></span>
                    <div>
                      <p className="text-xs text-gray-700">{log.description}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
