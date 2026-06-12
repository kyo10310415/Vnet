import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

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
        talent: true,
        metrics: true,
        documents: {
          where: { status: 'approved' },
          orderBy: { version: 'desc' },
        },
      },
    })

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const metrics = Array.isArray(project.metrics) ? project.metrics[0] : project.metrics

    // 数値サマリー生成
    let metricsSummary = '### 数値サマリー\n'
    if (metrics) {
      if (metrics.youtubeViews) metricsSummary += `- YouTube再生数：${metrics.youtubeViews.toLocaleString()}回\n`
      if (metrics.peakConcurrent) metricsSummary += `- 最大同時接続数：${metrics.peakConcurrent.toLocaleString()}人\n`
      if (metrics.avgViewDuration) metricsSummary += `- 平均視聴維持率：${metrics.avgViewDuration}%\n`
      if (metrics.likes) metricsSummary += `- 高評価数：${metrics.likes.toLocaleString()}\n`
      if (metrics.comments) metricsSummary += `- コメント数：${metrics.comments.toLocaleString()}\n`
      if (metrics.xImpressions) metricsSummary += `- Xインプレッション：${metrics.xImpressions.toLocaleString()}\n`
      if (metrics.xLikes) metricsSummary += `- Xいいね数：${metrics.xLikes.toLocaleString()}\n`
      if (metrics.xReposts) metricsSummary += `- Xリポスト数：${metrics.xReposts.toLocaleString()}\n`
      if (metrics.clicks) metricsSummary += `- クリック数：${metrics.clicks.toLocaleString()}\n`
      if (metrics.cv) metricsSummary += `- CV数：${metrics.cv}\n`
      if (metrics.cvr) metricsSummary += `- CVR：${metrics.cvr}%\n`
      if (metrics.cpa) metricsSummary += `- CPA：¥${metrics.cpa.toLocaleString()}\n`
    } else {
      metricsSummary += '※数値は未入力です。数値入力画面から登録してください。\n'
    }

    const urls = [
      metrics?.youtubeUrl ? `YouTube: ${metrics.youtubeUrl}` : null,
      metrics?.xPostUrl ? `X投稿: ${metrics.xPostUrl}` : null,
    ].filter(Boolean).join('\n') || '※URLは未入力です'

    // レポートを作成/更新（下書きとして）
    const report = await prisma.report.upsert({
      where: { projectId },
      update: {
        overview: `**案件名：** ${project.name}\n**クライアント：** ${project.client.name}\n**商材：** ${project.productName || '未設定'}\n**実施目的：** ${project.purpose || '未設定'}\n**ターゲット：** ${project.targetAudience || '未設定'}`,
        implementation: `${project.talent?.name || 'タレント'}によるライブ配信およびX投稿を実施しました。\n**配信日：** ${project.streamDate ? new Date(project.streamDate).toLocaleDateString('ja-JP') : '未設定'}\n**投稿日：** ${project.postDate ? new Date(project.postDate).toLocaleDateString('ja-JP') : '未設定'}`,
        urls,
        metricsSummary,
        achievements: metrics?.cv ? `CV数 ${metrics.cv}件を達成しました。` : '（承認後に記載）',
        goodPoints: '（承認後に記載してください）',
        issues: '（承認後に記載してください）',
        improvements: '（承認後に記載してください）',
        clientComment: `この度は${project.name}にご参画いただき、ありがとうございました。（承認後に記載）`,
        status: 'draft',
      },
      create: {
        projectId,
        overview: `**案件名：** ${project.name}\n**クライアント：** ${project.client.name}\n**商材：** ${project.productName || '未設定'}\n**実施目的：** ${project.purpose || '未設定'}\n**ターゲット：** ${project.targetAudience || '未設定'}`,
        implementation: `${project.talent?.name || 'タレント'}によるライブ配信およびX投稿を実施しました。\n**配信日：** ${project.streamDate ? new Date(project.streamDate).toLocaleDateString('ja-JP') : '未設定'}\n**投稿日：** ${project.postDate ? new Date(project.postDate).toLocaleDateString('ja-JP') : '未設定'}`,
        urls,
        metricsSummary,
        achievements: metrics?.cv ? `CV数 ${metrics.cv}件を達成しました。` : '（承認後に記載）',
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
