import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { isProjectStatus, parseProjectPlans, parseProjectSchedules, ProjectInputError } from '@/lib/project-input'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')
  const projectStatus = isProjectStatus(status) ? status : undefined

  try {
    const projects = await prisma.project.findMany({
      where: {
        ...(projectStatus ? { status: projectStatus } : {}),
        ...(clientId ? { clientId } : {}),
      },
      include: {
        client: true,
        talent: true,
        director: { select: { id: true, name: true } },
        schedules: { orderBy: [{ type: 'asc' }, { order: 'asc' }] },
        plans: { orderBy: { order: 'asc' } },
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
      targetAudience, ngItems, requiredNotations, usedUrl,
      schedules, plans, notes, status,
    } = body

    if (typeof name !== 'string' || !name.trim() || (!clientId && !clientName?.trim())) {
      return NextResponse.json({ error: '案件名とクライアント名は必須です' }, { status: 400 })
    }

    const scheduleData = parseProjectSchedules(schedules)
    const planData = parseProjectPlans(plans)
    if (status !== undefined && !isProjectStatus(status)) {
      throw new ProjectInputError('ステータスが正しくありません')
    }

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
        name: name.trim(),
        clientId: finalClientId,
        talentId: finalTalentId,
        directorId: directorId || null,
        productName,
        productOverview,
        purpose,
        targetAudience,
        ngItems,
        requiredNotations,
        usedUrl,
        schedules: { create: scheduleData },
        plans: { create: planData },
        notes,
        status: status || 'draft',
      },
      include: { client: true, talent: true, schedules: true, plans: true },
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
    if (error instanceof ProjectInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
