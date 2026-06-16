export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDateTime } from '@/lib/constants'

async function getDashboardData() {
  const [
    activeProjects,
    pendingApprovals,
    rejectedDocs,
    projectsWithoutReport,
    deliverableReports,
    recentProjects,
    recentActivities,
  ] = await Promise.all([
    prisma.project.count({
      where: { status: { in: ['active', 'streaming', 'post_production', 'reporting'] } },
    }),
    prisma.generatedDocument.count({ where: { status: 'pending_review' } }),
    prisma.generatedDocument.count({ where: { status: 'rejected' } }),
    prisma.project.count({
      where: {
        status: { in: ['post_production', 'reporting'] },
        reports: { none: {} },
      },
    }),
    prisma.report.count({ where: { status: 'approved' } }),
    prisma.project.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { client: true, talent: true },
    }),
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true } } },
    }),
  ])

  return {
    activeProjects, pendingApprovals, rejectedDocs,
    projectsWithoutReport, deliverableReports,
    recentProjects, recentActivities,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const stats = [
    { label: '進行中案件', value: data.activeProjects, icon: '🚀', color: 'blue', href: '/projects?status=active' },
    { label: '承認待ち', value: data.pendingApprovals, icon: '⏳', color: 'yellow', href: '/approvals' },
    { label: '差し戻し', value: data.rejectedDocs, icon: '❌', color: 'red', href: '/approvals?status=rejected' },
    { label: 'レポート未作成', value: data.projectsWithoutReport, icon: '📊', color: 'purple', href: '/projects?status=reporting' },
    { label: '納品可能', value: data.deliverableReports, icon: '✅', color: 'green', href: '/projects?status=delivered' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  }

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏠 ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">ぶいねっと管理</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          ＋ 新規案件作成
        </Link>
      </div>

      {/* AI生成物承認についての注意バナー */}
      <div className="rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4">
        <p className="text-sm font-semibold text-yellow-800">
          ⚠️ 重要：AI生成物は自動確定しません。配信台本・NGリスト・告知文など、すべての生成物は人間が承認してから使用してください。
        </p>
      </div>

      {/* ステータスカード */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href} className="block">
            <div className={`rounded-xl border p-4 transition hover:shadow-md ${colorMap[stat.color]}`}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-xs font-medium mt-1">{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 最近の案件 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">📋 最近の案件</h2>
            <Link href="/projects" className="text-xs text-indigo-600 hover:underline">
              すべて表示
            </Link>
          </div>
          {data.recentProjects.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">案件がありません</p>
          ) : (
            <ul className="space-y-3">
              {data.recentProjects.map(project => (
                <li key={project.id}>
                  <Link href={`/projects/${project.id}`} className="block rounded-lg hover:bg-gray-50 p-2 -mx-2 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.client.name} / {project.talent?.name || '—'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        project.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                        project.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 最近のアクティビティ */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">📜 最近のアクティビティ</h2>
            <Link href="/activities" className="text-xs text-indigo-600 hover:underline">
              すべて表示
            </Link>
          </div>
          {data.recentActivities.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">アクティビティがありません</p>
          ) : (
            <ul className="space-y-2">
              {data.recentActivities.map(log => (
                <li key={log.id} className="flex items-start gap-2">
                  <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-400"></span>
                  <div>
                    <p className="text-xs text-gray-700">{log.description}</p>
                    <p className="text-xs text-gray-400">
                      {log.project?.name && <span className="mr-1">【{log.project.name}】</span>}
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
