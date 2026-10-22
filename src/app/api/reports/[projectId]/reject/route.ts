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
    const { reason } = body

    const user = access
    const rejectorName = access.name

    const updatedReport = await prisma.report.update({
      where: { projectId },
      data: { status: 'rejected' },
    })

    await logActivity({
      projectId,
      userId: user.id,
      type: 'report_approved',
      description: `レポートを差し戻しました（差し戻し者：${rejectorName}）理由：${reason}`,
    })

    return NextResponse.json(updatedReport)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reject report' }, { status: 500 })
  }
}
