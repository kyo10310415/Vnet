import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import {
  isProjectStatus,
  parseProjectPlans,
  parseProjectSchedules,
  parseProjectTalents,
  ProjectInputError,
} from '@/lib/project-input'
import { resolveTalentIds } from '@/lib/project-talent.server'

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
        talents: { include: { talent: true }, orderBy: { order: 'asc' } },
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
      name, clientId, clientName, talentName, talentNames, talentType, talentGroupName,
      directorId, productName, productOverview, purpose,
      targetAudience, ngItems, requiredNotations, usedUrl,
      schedules, plans, notes, status,
    } = body

    const normalizedClientName = typeof clientName === 'string' ? clientName.trim() : ''
    const requestedClientId = typeof clientId === 'string' && clientId ? clientId : null
    if (typeof name !== 'string' || !name.trim() || (!requestedClientId && !normalizedClientName)) {
      return NextResponse.json({ error: '案件名とクライアント名は必須です' }, { status: 400 })
    }

    const scheduleData = parseProjectSchedules(schedules)
    const planData = parseProjectPlans(plans)
    const talentData = parseProjectTalents(
      talentType,
      talentGroupName,
      talentNames ?? (typeof talentName === 'string' ? [talentName] : []),
    )
    if (status !== undefined && !isProjectStatus(status)) {
      throw new ProjectInputError('ステータスが正しくありません')
    }

    const project = await prisma.$transaction(async transaction => {
      let finalClientId = requestedClientId
      if (!finalClientId) {
        let client = await transaction.client.findFirst({ where: { name: normalizedClientName } })
        if (!client) client = await transaction.client.create({ data: { name: normalizedClientName } })
        finalClientId = client.id
      }

      const talentIds = await resolveTalentIds(transaction, talentData.talentNames)

      return transaction.project.create({
        data: {
          name: name.trim(),
          clientId: finalClientId,
          talentType: talentData.talentType,
          talentGroupName: talentData.talentGroupName,
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
          talents: {
            create: talentIds.map((talentId, order) => ({ talentId, order })),
          },
          notes,
          status: status || 'draft',
        },
        include: {
          client: true,
          talents: { include: { talent: true }, orderBy: { order: 'asc' } },
          schedules: true,
          plans: true,
        },
      })
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
