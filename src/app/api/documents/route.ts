import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateDocument } from '@/lib/ai/generate'
import { logActivity } from '@/lib/activity'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const type = searchParams.get('type')

  try {
    const documents = await prisma.generatedDocument.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status: status as any } : {}),
        ...(type ? { type: type as any } : {}),
      },
      include: {
        project: { select: { id: true, name: true, client: true } },
      },
      orderBy: [{ projectId: 'asc' }, { type: 'asc' }, { version: 'desc' }],
    })
    return NextResponse.json(documents)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, type, regenerate } = body

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true, talent: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 既存の最新バージョンを確認
    const existing = await prisma.generatedDocument.findFirst({
      where: { projectId, type },
      orderBy: { version: 'desc' },
    })

    const nextVersion = existing ? existing.version + 1 : 1

    // AI生成
    const { content, generatorType } = await generateDocument(type, {
      projectName: project.name,
      clientName: project.client.name,
      productName: project.productName ?? undefined,
      productOverview: project.productOverview ?? undefined,
      purpose: project.purpose ?? undefined,
      targetAudience: project.targetAudience ?? undefined,
      appealPoints: project.appealPoints ?? undefined,
      requiredAppeals: project.requiredAppeals ?? undefined,
      ngItems: project.ngItems ?? undefined,
      requiredNotations: project.requiredNotations ?? undefined,
      usedUrl: project.usedUrl ?? undefined,
      talentName: project.talent?.name ?? undefined,
    })

    const document = await prisma.generatedDocument.create({
      data: {
        projectId,
        type,
        content,
        generatorType,
        version: nextVersion,
        status: 'draft',
        parentId: existing?.id || null,
      },
    })

    await logActivity({
      projectId,
      type: 'document_generated',
      description: `AI下書き生成：${type}（バージョン${nextVersion}）`,
      metadata: { documentId: document.id, documentType: type, version: nextVersion },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}
