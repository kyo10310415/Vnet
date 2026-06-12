import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const metric = await prisma.metric.findUnique({ where: { projectId } })
    return NextResponse.json(metric)
  } catch (error) {
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
    const {
      youtubeUrl, youtubeViews, peakConcurrent, avgViewDuration, likes, comments,
      xPostUrl, xImpressions, xLikes, xReposts, clicks, cv, cvr, cpa, notes,
    } = body

    const metric = await prisma.metric.upsert({
      where: { projectId },
      update: {
        youtubeUrl, youtubeViews, peakConcurrent,
        avgViewDuration: avgViewDuration ? parseFloat(avgViewDuration) : null,
        likes, comments,
        xPostUrl, xImpressions, xLikes, xReposts, clicks,
        cv, cvr: cvr ? parseFloat(cvr) : null,
        cpa: cpa ? parseFloat(cpa) : null, notes,
      },
      create: {
        projectId,
        youtubeUrl, youtubeViews, peakConcurrent,
        avgViewDuration: avgViewDuration ? parseFloat(avgViewDuration) : null,
        likes, comments,
        xPostUrl, xImpressions, xLikes, xReposts, clicks,
        cv, cvr: cvr ? parseFloat(cvr) : null,
        cpa: cpa ? parseFloat(cpa) : null, notes,
      },
    })

    await logActivity({
      projectId,
      type: 'metric_registered',
      description: '数値データを登録・更新しました',
    })

    return NextResponse.json(metric)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 })
  }
}
