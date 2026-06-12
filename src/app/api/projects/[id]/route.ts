import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        talent: true,
        director: { select: { id: true, name: true, role: true } },
        documents: {
          orderBy: [{ type: 'asc' }, { version: 'desc' }],
        },
        checklists: {
          include: { items: { orderBy: { order: 'asc' } } },
          orderBy: { category: 'asc' },
        },
        metrics: true,
        reports: true,
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { name: true } } },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const {
      name, clientId, clientName, talentId, talentName,
      directorId, productName, productOverview, purpose,
      targetAudience, appealPoints, requiredAppeals, ngItems,
      requiredNotations, usedUrl, streamDate, postDate, notes, status,
    } = body

    let finalClientId = clientId
    if (!finalClientId && clientName) {
      let client = await prisma.client.findFirst({ where: { name: clientName } })
      if (!client) client = await prisma.client.create({ data: { name: clientName } })
      finalClientId = client.id
    }

    let finalTalentId = talentId
    if (!finalTalentId && talentName) {
      let talent = await prisma.talent.findFirst({ where: { name: talentName } })
      if (!talent) talent = await prisma.talent.create({ data: { name: talentName } })
      finalTalentId = talent.id
    }

    const project = await prisma.project.update({
      where: { id },
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
        status,
      },
      include: { client: true, talent: true },
    })

    await logActivity({
      projectId: project.id,
      type: 'project_updated',
      description: `案件「${project.name}」を更新しました`,
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
