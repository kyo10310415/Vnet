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
        talents: { include: { talent: true }, orderBy: { order: 'asc' } },
        director: { select: { id: true, name: true, role: true } },
        schedules: { orderBy: [{ type: 'asc' }, { order: 'asc' }] },
        plans: { orderBy: { order: 'asc' } },
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
    if (!isProjectStatus(status)) {
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

      return transaction.project.update({
        where: { id },
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
          schedules: {
            deleteMany: {},
            create: scheduleData,
          },
          plans: {
            deleteMany: {},
            create: planData,
          },
          talents: {
            deleteMany: {},
            create: talentIds.map((talentId, order) => ({ talentId, order })),
          },
          notes,
          status,
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
      type: 'project_updated',
      description: `案件「${project.name}」を更新しました`,
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    if (error instanceof ProjectInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
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
