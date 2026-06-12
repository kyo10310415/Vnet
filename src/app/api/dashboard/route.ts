import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      activeProjects,
      pendingApprovals,
      rejectedDocs,
      projectsWithoutReport,
      deliverableReports,
    ] = await Promise.all([
      // 進行中案件数
      prisma.project.count({
        where: { status: { in: ['active', 'streaming', 'post_production', 'reporting'] } },
      }),
      // 承認待ち件数
      prisma.generatedDocument.count({ where: { status: 'pending_review' } }),
      // 差し戻し件数
      prisma.generatedDocument.count({ where: { status: 'rejected' } }),
      // レポート未作成件数（進行中案件のうち）
      prisma.project.count({
        where: {
          status: { in: ['post_production', 'reporting'] },
          reports: { none: {} },
        },
      }),
      // 納品可能件数（レポート承認済み）
      prisma.report.count({ where: { status: 'approved' } }),
    ])

    return NextResponse.json({
      activeProjects,
      pendingApprovals,
      rejectedDocs,
      projectsWithoutReport,
      deliverableReports,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
