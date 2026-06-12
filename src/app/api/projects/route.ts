import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')

  try {
    const projects = await prisma.project.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(clientId ? { clientId } : {}),
      },
      include: {
        client: true,
        talent: true,
        director: { select: { id: true, name: true } },
        _count: {
          select: {
            documents: true,
            reports: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name, clientId, clientName, talentId, talentName,
      directorId, productName, productOverview, purpose,
      targetAudience, appealPoints, requiredAppeals, ngItems,
      requiredNotations, usedUrl, streamDate, postDate, notes, status,
    } = body

    // クライアント作成 or 取得
    let finalClientId = clientId
    if (!finalClientId && clientName) {
      let client = await prisma.client.findFirst({ where: { name: clientName } })
      if (!client) client = await prisma.client.create({ data: { name: clientName } })
      finalClientId = client.id
    }

    // タレント作成 or 取得
    let finalTalentId = talentId
    if (!finalTalentId && talentName) {
      let talent = await prisma.talent.findFirst({ where: { name: talentName } })
      if (!talent) talent = await prisma.talent.create({ data: { name: talentName } })
      finalTalentId = talent.id
    }

    const project = await prisma.project.create({
      data: {
        name,
        clientId: finalClientId,
        talentId: finalTalentId,
        directorId: directorId || null,
        productName,
        productOverview,
        purpose,
        targetAudience,
        appealPoints,
        requiredAppeals,
        ngItems,
        requiredNotations,
        usedUrl,
        streamDate: streamDate ? new Date(streamDate) : null,
        postDate: postDate ? new Date(postDate) : null,
        notes,
        status: status || 'draft',
      },
      include: { client: true, talent: true },
    })

    await logActivity({
      projectId: project.id,
      type: 'project_created',
      description: `案件「${project.name}」を作成しました`,
      metadata: { projectId: project.id },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
