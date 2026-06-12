export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDate } from '@/lib/constants'

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  active: '進行中',
  streaming: '配信中',
  post_production: '配信後作業',
  reporting: 'レポート作成中',
  delivered: '納品済み',
  closed: '完了',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-blue-100 text-blue-700',
  streaming: 'bg-red-100 text-red-700',
  post_production: 'bg-yellow-100 text-yellow-700',
  reporting: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

  const projects = await prisma.project.findMany({
    where: status ? { status: status as any } : {},
    include: {
      client: true,
      talent: true,
      director: { select: { name: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 案件一覧</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length}件の案件</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          ＋ 新規案件作成
        </Link>
      </div>

      {/* ステータスフィルター */}
      <div className="flex flex-wrap gap-2">
        {[null, 'draft', 'active', 'streaming', 'post_production', 'reporting', 'delivered', 'closed'].map(s => (
          <Link
            key={s || 'all'}
            href={s ? `/projects?status=${s}` : '/projects'}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              status === s || (!status && !s)
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? STATUS_LABEL[s] : 'すべて'}
          </Link>
        ))}
      </div>

      {/* 案件一覧テーブル */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500 mb-4">案件がありません</p>
          <Link href="/projects/new" className="text-indigo-600 hover:underline text-sm">
            最初の案件を作成する →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">案件名</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">クライアント</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">タレント</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">配信予定日</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">ステータス</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">文書数</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map(project => (
                <tr key={project.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/projects/${project.id}`} className="hover:text-indigo-600">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{project.client.name}</td>
                  <td className="px-4 py-3 text-gray-600">{project.talent?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(project.streamDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLOR[project.status]}`}>
                      {STATUS_LABEL[project.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{project._count.documents}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
