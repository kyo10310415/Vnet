import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params
  try {
    const body = await request.json()
    const { status, note, checkedByName } = body

    let checkedById: string | undefined
    if (checkedByName) {
      let user = await prisma.user.findFirst({ where: { name: checkedByName } })
      if (!user) {
        user = await prisma.user.create({
          data: { name: checkedByName, email: `${Date.now()}@temp.local`, role: 'director' },
        })
      }
      checkedById = user.id
    }

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        status,
        note,
        checkedById: checkedById || undefined,
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
