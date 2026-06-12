import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { rejectorName, reason, revisionRequest } = body

    if (!rejectorName || !reason) {
      return NextResponse.json({ error: '差し戻し者名と理由が必要です' }, { status: 400 })
    }

    const doc = await prisma.generatedDocument.findUnique({ where: { id } })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let user = await prisma.user.findFirst({ where: { name: rejectorName } })
    if (!user) {
      user = await prisma.user.create({
        data: { name: rejectorName, email: `${Date.now()}@temp.local`, role: 'reviewer' },
      })
    }

    const [updatedDoc] = await prisma.$transaction([
      prisma.generatedDocument.update({
        where: { id },
        data: {
          status: 'rejected',
          rejectedBy: rejectorName,
          rejectedAt: new Date(),
          rejectionReason: reason,
          revisionRequest: revisionRequest || null,
        },
      }),
      prisma.rejection.create({
        data: {
          documentId: id,
          rejectorId: user.id,
          reason,
          revisionRequest: revisionRequest || null,
          version: doc.version,
        },
      }),
    ])

    await logActivity({
      projectId: doc.projectId,
      userId: user.id,
      type: 'document_rejected',
      description: `ドキュメント差し戻し：${doc.type}（v${doc.version}）by ${rejectorName}`,
      metadata: { documentId: id, rejectorName, reason, version: doc.version },
    })

    return NextResponse.json(updatedDoc)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to reject document' }, { status: 500 })
  }
}
