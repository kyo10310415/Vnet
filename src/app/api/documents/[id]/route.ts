import { requireApiAccess } from '@/lib/access'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireApiAccess(request, 'read')
  if (access instanceof Response) return access

  const { id } = await params
  try {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, client: true } },
        approvals: true,
        rejections: true,
        parent: true,
        children: { orderBy: { version: 'desc' } },
      },
    })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(doc)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireApiAccess(request, 'edit')
  if (access instanceof Response) return access

  const { id } = await params
  try {
    const body = await request.json()
    const { content, status } = body
    if (status !== undefined && !['draft', 'pending_review'].includes(status)) {
      return NextResponse.json({ error: '承認・差し戻しは専用の操作を使用してください' }, { status: 400 })
    }

    // 承認済みドキュメントの直接編集を禁止
    const existing = await prisma.generatedDocument.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing.status === 'approved') {
      // 新バージョンを作成
      const newDoc = await prisma.generatedDocument.create({
        data: {
          projectId: existing.projectId,
          type: existing.type,
          content: content || existing.content,
          generatorType: 'human',
          version: existing.version + 1,
          status: 'draft',
          parentId: existing.id,
        },
      })
      return NextResponse.json({ ...newDoc, _newVersion: true })
    }

    const updated = await prisma.generatedDocument.update({
      where: { id },
      data: {
        content: content !== undefined ? content : existing.content,
        status: status || existing.status,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}
