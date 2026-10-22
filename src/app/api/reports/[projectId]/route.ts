import { requireApiAccess } from '@/lib/access'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const access = await requireApiAccess(request, 'read')
  if (access instanceof Response) return access

  const { projectId } = await params
  try {
    const report = await prisma.report.findUnique({ where: { projectId } })
    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const access = await requireApiAccess(request, 'edit')
  if (access instanceof Response) return access

  const { projectId } = await params
  try {
    const body = await request.json()
    const {
      overview, implementation, urls, metricsSummary,
      achievements, goodPoints, issues, improvements, clientComment, status,
    } = body

    if (status !== undefined && !['draft', 'pending_review'].includes(status)) {
      return NextResponse.json({ error: '承認・差し戻しは専用の操作を使用してください' }, { status: 400 })
    }

    // 承認済みレポートは直接編集不可
    const existing = await prisma.report.findUnique({ where: { projectId } })
    if (existing?.status === 'approved' || existing?.status === 'delivered') {
      return NextResponse.json(
        { error: '承認済み・納品済みレポートは編集できません' },
        { status: 400 }
      )
    }

    const report = await prisma.report.upsert({
      where: { projectId },
      update: {
        overview, implementation, urls, metricsSummary,
        achievements, goodPoints, issues, improvements, clientComment,
        status: status || 'draft',
      },
      create: {
        projectId,
        overview, implementation, urls, metricsSummary,
        achievements, goodPoints, issues, improvements, clientComment,
        status: status || 'draft',
      },
    })

    await logActivity({
      projectId,
      type: 'report_generated',
      description: 'レポートを作成・更新しました',
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
  }
}
