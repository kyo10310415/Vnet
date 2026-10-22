import { requireApiAccess } from '@/lib/access'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireApiAccess(request, 'review')
  if (access instanceof Response) return access

  const { id } = await params
  try {
    const body = await request.json()
    const { comment } = body

    const doc = await prisma.generatedDocument.findUnique({ where: { id } })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (doc.status === 'approved') {
      return NextResponse.json({ error: '既に承認済みです' }, { status: 400 })
    }

    const user = access
    const approverName = access.name

    const [updatedDoc] = await prisma.$transaction([
      prisma.generatedDocument.update({
        where: { id },
        data: {
          status: 'approved',
          approvedBy: approverName,
          approvedAt: new Date(),
          approvalComment: comment || null,
        },
      }),
      prisma.approval.create({
        data: {
          documentId: id,
          approverId: user.id,
          comment: comment || null,
          version: doc.version,
        },
      }),
    ])

    await logActivity({
      projectId: doc.projectId,
      userId: user.id,
      type: 'document_approved',
      description: `ドキュメント承認：${doc.type}（v${doc.version}）by ${approverName}`,
      metadata: { documentId: id, version: doc.version },
    })

    return NextResponse.json(updatedDoc)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 })
  }
}
