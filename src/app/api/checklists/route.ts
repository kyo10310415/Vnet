import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

// デフォルトのチェックリスト項目
const DEFAULT_CHECKLIST_ITEMS = {
  pre_stream: [
    'PR表記（#PR）が配信タイトル・概要欄に入っている',
    'NGワードリストを確認した',
    '必須訴求事項を台本に入れている',
    '指定URLが概要欄に設置されている',
    'タレントへの案件説明が完了している',
    '配信台本を最終確認した',
    '配信前チェックリストの承認が完了している',
  ],
  during_stream: [
    'PR開示のアナウンスが行われた',
    'NGワードを使用していない',
    '必須訴求を配信内で伝えた',
    '指定URLを視聴者に案内した',
  ],
  post_stream: [
    '配信URLを保存した',
    'スクリーンショット（最大同時接続数）を保存した',
    'X投稿を実施した',
    '投稿リンクを保存した',
    '配信アーカイブが公開されていることを確認した',
  ],
  pre_report: [
    '数値回収が完了した（YouTube）',
    '数値回収が完了した（X）',
    'CV数・CVRを確認した',
    'レポート内容を確認した',
    'クライアント提出前承認が完了した',
    'レポートの最終確認が完了している',
  ],
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  try {
    const checklists = await prisma.checklist.findMany({
      where: projectId ? { projectId } : {},
      include: {
        items: { orderBy: { order: 'asc' } },
      },
      orderBy: { category: 'asc' },
    })
    return NextResponse.json(checklists)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, useDefaults } = body

    if (useDefaults) {
      // デフォルトチェックリストを一括作成
      const categories = ['pre_stream', 'during_stream', 'post_stream', 'pre_report'] as const
      const created = []

      for (const category of categories) {
        const checklist = await prisma.checklist.create({
          data: {
            projectId,
            category,
            title: {
              pre_stream: '配信前チェック',
              during_stream: '配信中チェック',
              post_stream: '配信後チェック',
              pre_report: 'レポート前チェック',
            }[category],
            items: {
              create: DEFAULT_CHECKLIST_ITEMS[category].map((label, index) => ({
                label,
                order: index,
                status: 'unchecked' as const,
              })),
            },
          },
          include: { items: true },
        })
        created.push(checklist)
      }

      await logActivity({
        projectId,
        type: 'checklist_updated',
        description: 'デフォルトチェックリストを作成しました',
      })

      return NextResponse.json(created, { status: 201 })
    }

    const { category, title, items } = body
    const checklist = await prisma.checklist.create({
      data: {
        projectId,
        category,
        title,
        items: {
          create: (items || []).map((item: { label: string }, index: number) => ({
            label: item.label,
            order: index,
            status: 'unchecked' as const,
          })),
        },
      },
      include: { items: true },
    })

    return NextResponse.json(checklist, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 })
  }
}
