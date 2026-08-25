import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { formatDate, formatSchedules } from '@/lib/constants'
import { formatProjectTalentName } from '@/lib/project-talent'

const METRIC_TYPE_LABELS = {
  stream: '配信',
  x_post: 'X投稿',
  combined: '配信＋X投稿',
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        talents: { include: { talent: true }, orderBy: { order: 'asc' } },
        metrics: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
        schedules: { orderBy: [{ type: 'asc' }, { order: 'asc' }] },
        documents: {
          where: { status: 'approved' },
          orderBy: { version: 'desc' },
        },
      },
    })

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // 数値サマリー生成
    let metricsSummary = '### 数値サマリー\n'
    if (project.metrics.length > 0) {
      project.metrics.forEach((metric, index) => {
        const title = metric.label || `${METRIC_TYPE_LABELS[metric.type]} ${index + 1}`
        metricsSummary += `\n#### ${title}\n`
        if (metric.recordedAt) metricsSummary += `- 実施日：${formatDate(metric.recordedAt)}\n`
        if (metric.youtubeViews !== null) metricsSummary += `- YouTube再生数：${metric.youtubeViews.toLocaleString()}回\n`
        if (metric.peakConcurrent !== null) metricsSummary += `- 最大同時接続数：${metric.peakConcurrent.toLocaleString()}人\n`
        if (metric.avgViewDuration !== null) metricsSummary += `- 平均視聴維持率：${metric.avgViewDuration}%\n`
        if (metric.likes !== null) metricsSummary += `- 高評価数：${metric.likes.toLocaleString()}\n`
        if (metric.comments !== null) metricsSummary += `- コメント数：${metric.comments.toLocaleString()}\n`
        if (metric.xImpressions !== null) metricsSummary += `- Xインプレッション：${metric.xImpressions.toLocaleString()}\n`
        if (metric.xLikes !== null) metricsSummary += `- Xいいね数：${metric.xLikes.toLocaleString()}\n`
        if (metric.xReposts !== null) metricsSummary += `- Xリポスト数：${metric.xReposts.toLocaleString()}\n`
        if (metric.clicks !== null) metricsSummary += `- クリック数：${metric.clicks.toLocaleString()}\n`
        if (metric.cv !== null) metricsSummary += `- CV数：${metric.cv}\n`
        if (metric.cvr !== null) metricsSummary += `- CVR：${metric.cvr}%\n`
        if (metric.cpa !== null) metricsSummary += `- CPA：¥${metric.cpa.toLocaleString()}\n`
        if (metric.notes) metricsSummary += `- 備考：${metric.notes}\n`
      })
    } else {
      metricsSummary += '※数値は未入力です。数値入力画面から登録してください。\n'
    }

    const urls = project.metrics.flatMap((metric, index) => {
      const title = metric.label || `${METRIC_TYPE_LABELS[metric.type]} ${index + 1}`
      return [
        metric.youtubeUrl ? `${title} YouTube: ${metric.youtubeUrl}` : null,
        metric.xPostUrl ? `${title} X投稿: ${metric.xPostUrl}` : null,
      ].filter((line): line is string => Boolean(line))
    }).join('\n') || '※URLは未入力です'

    const totalCv = project.metrics.reduce((total, metric) => total + (metric.cv || 0), 0)

    const streamSchedules = project.schedules.filter(schedule => schedule.type === 'stream')
    const postSchedules = project.schedules.filter(schedule => schedule.type === 'post')
    const streamDates = streamSchedules.length ? formatSchedules(streamSchedules) : '未設定'
    const postDates = postSchedules.length ? formatSchedules(postSchedules) : '未設定'
    const talentName = formatProjectTalentName(project)
    const implementation = `${talentName === '—' ? 'タレント' : talentName}によるライブ配信およびX投稿を実施しました。\n**配信日：** ${streamDates}\n**投稿日：** ${postDates}`

    // レポートを作成/更新（下書きとして）
    const report = await prisma.report.upsert({
      where: { projectId },
      update: {
        overview: `**案件名：** ${project.name}\n**クライアント：** ${project.client.name}\n**商材：** ${project.productName || '未設定'}\n**実施目的：** ${project.purpose || '未設定'}\n**ターゲット：** ${project.targetAudience || '未設定'}`,
        implementation,
        urls,
        metricsSummary,
        achievements: totalCv > 0 ? `合計CV数 ${totalCv}件を達成しました。` : '（承認後に記載）',
        goodPoints: '（承認後に記載してください）',
        issues: '（承認後に記載してください）',
        improvements: '（承認後に記載してください）',
        clientComment: `この度は${project.name}にご参画いただき、ありがとうございました。（承認後に記載）`,
        status: 'draft',
      },
      create: {
        projectId,
        overview: `**案件名：** ${project.name}\n**クライアント：** ${project.client.name}\n**商材：** ${project.productName || '未設定'}\n**実施目的：** ${project.purpose || '未設定'}\n**ターゲット：** ${project.targetAudience || '未設定'}`,
        implementation,
        urls,
        metricsSummary,
        achievements: totalCv > 0 ? `合計CV数 ${totalCv}件を達成しました。` : '（承認後に記載）',
        goodPoints: '（承認後に記載してください）',
        issues: '（承認後に記載してください）',
        improvements: '（承認後に記載してください）',
        clientComment: `この度は${project.name}にご参画いただき、ありがとうございました。（承認後に記載）`,
        status: 'draft',
      },
    })

    await logActivity({
      projectId,
      type: 'report_generated',
      description: `レポート下書きを自動生成しました`,
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
