import { requireApiAccess } from '@/lib/access'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const access = await requireApiAccess(request, 'edit')
  if (access instanceof Response) return access

  const { id, itemId } = await params
  try {
    const body = await request.json()
    const { status, note } = body

    const checkedById = access.id

    const item = await prisma.checklistItem.update({
      where: { id: itemId, checklistId: id },
      data: {
        status,
        note,
        checkedById,
        checkedAt: status === 'checked' ? new Date() : null,
      },
      include: { checklist: true },
    })

    await logActivity({
      projectId: item.checklist.projectId,
      type: 'checklist_updated',
      description: `チェックリスト更新：${item.label} → ${status}`,
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 })
  }
}
