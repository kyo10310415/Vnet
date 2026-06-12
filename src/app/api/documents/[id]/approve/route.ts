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
    const { approverName, comment } = body

    if (!approverName) {
      return NextResponse.json({ error: '承認者名が必要です' }, { status: 400 })
    }

    const doc = await prisma.generatedDocument.findUnique({ where: { id } })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (doc.status === 'approved') {
      return NextResponse.json({ error: '既に承認済みです' }, { status: 400 })
    }

    // システムユーザーまたは名前でユーザーを取得/作成
    let user = await prisma.user.findFirst({ where: { name: approverName } })
    if (!user) {
      user = await prisma.user.create({
        data: { name: approverName, email: `${Date.now()}@temp.local`, role: 'reviewer' },
      })
    }

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
      metadata: { documentId: id, approverName, version: doc.version },
    })

    return NextResponse.json(updatedDoc)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 })
  }
}
