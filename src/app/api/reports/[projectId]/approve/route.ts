import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const body = await request.json()
    const { approverName, comment } = body

    if (!approverName) {
      return NextResponse.json({ error: '承認者名が必要です' }, { status: 400 })
    }

    const report = await prisma.report.findUnique({ where: { projectId } })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (report.status === 'approved' || report.status === 'delivered') {
      return NextResponse.json({ error: '既に承認済みです' }, { status: 400 })
    }

    let user = await prisma.user.findFirst({ where: { name: approverName } })
    if (!user) {
      user = await prisma.user.create({
        data: { name: approverName, email: `${Date.now()}@temp.local`, role: 'reviewer' },
      })
    }

    const updatedReport = await prisma.report.update({
      where: { projectId },
      data: {
        status: 'approved',
        approvedBy: approverName,
        approvedAt: new Date(),
        approvalComment: comment,
      },
    })

    await prisma.approval.create({
      data: {
        documentId: report.id,
        approverId: user.id,
        comment,
        version: 1,
        reportId: report.id,
      },
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
