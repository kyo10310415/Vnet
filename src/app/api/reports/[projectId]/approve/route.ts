import { requireApiAccess } from '@/lib/access'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const access = await requireApiAccess(request, 'review')
  if (access instanceof Response) return access

  const { projectId } = await params
  try {
    const body = await request.json()
    const { comment } = body

    const report = await prisma.report.findUnique({ where: { projectId } })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (report.status === 'approved' || report.status === 'delivered') {
      return NextResponse.json({ error: '既に承認済みです' }, { status: 400 })
    }

    const user = access
    const approverName = access.name

    const updatedReport = await prisma.$transaction(async transaction => {
      const updated = await transaction.report.update({
        where: { projectId },
        data: {
          status: 'approved',
          approvedBy: approverName,
          approvedAt: new Date(),
          approvalComment: comment,
        },
      })

      await transaction.approval.create({
        data: {
          documentId: report.id,
          approverId: user.id,
          comment,
          version: 1,
          reportId: report.id,
        },
      })

      return updated
    })

    await logActivity({
      projectId,
      userId: user.id,
      type: 'report_approved',
      description: `レポートを承認しました（承認者：${approverName}）`,
    })

    return NextResponse.json(updatedReport)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to approve report' }, { status: 500 })
  }
}
