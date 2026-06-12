export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/constants'

const ACTIVITY_ICONS: Record<string, string> = {
  project_created: '🆕',
  project_updated: '✏️',
  document_generated: '🤖',
  document_approved: '✅',
  document_rejected: '❌',
  checklist_updated: '☑️',
  metric_registered: '📊',
  report_generated: '📄',
  report_approved: '🎉',
  report_delivered: '📦',
}

export default async function ActivitiesPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { name: true, role: true } },
      project: { select: { id: true, name: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📜 アクティビティログ</h1>
        <p className="text-sm text-gray-500 mt-1">最新{logs.length}件の操作ログ</p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">アクティビティがありません</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="divide-y divide-gray-100">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition">
                <span className="mt-0.5 text-xl flex-shrink-0">
                  {ACTIVITY_ICONS[log.type] || '📝'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{log.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {log.project && (
                      <span className="text-xs text-indigo-600">
                        【{log.project.name}】
                      </span>
                    )}
                    {log.user && (
                      <span className="text-xs text-gray-500">{log.user.name}</span>
                    )}
                    <span className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
                  </div>
                </div>
                <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {log.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
