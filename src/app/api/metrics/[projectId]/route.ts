import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { MetricInputError, parseMetrics } from '@/lib/metric-input'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const metrics = await prisma.metric.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(metrics)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const body = await request.json()
    const metrics = parseMetrics(body.metrics)

    const projectExists = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    })
    if (!projectExists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        metrics: {
          deleteMany: {},
          create: metrics,
        },
      },
      select: {
        metrics: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })

    await logActivity({
      projectId,
      type: 'metric_registered',
      description: `数値データを${metrics.length}件登録・更新しました`,
    })

    return NextResponse.json(project.metrics)
  } catch (error) {
    console.error(error)
    if (error instanceof MetricInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 })
  }
}
