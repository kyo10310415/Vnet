import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 シードデータを投入します...')

  // デフォルトユーザー作成
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: '管理者', email: 'admin@example.com', role: 'admin' },
  })

  const director = await prisma.user.upsert({
    where: { email: 'director@example.com' },
    update: {},
    create: { name: '田中 ディレクター', email: 'director@example.com', role: 'director' },
  })

  await prisma.user.upsert({
    where: { email: 'reviewer@example.com' },
    update: {},
    create: { name: '鈴木 レビュアー', email: 'reviewer@example.com', role: 'reviewer' },
  })

  // クライアント作成
  let client = await prisma.client.findFirst({ where: { name: 'サンプル株式会社' } })
  if (!client) {
    client = await prisma.client.create({ data: { name: 'サンプル株式会社' } })
  }

  // タレント作成
  let talent = await prisma.talent.findFirst({ where: { name: '星野 あかり' } })
  if (!talent) {
    talent = await prisma.talent.create({
      data: {
        name: '星野 あかり',
        channel: 'https://youtube.com/@sample',
        twitterId: '@hoshino_akari',
      },
    })
  }

  // サンプル案件作成
  const existingProject = await prisma.project.findFirst({
    where: { name: '【サンプル】美容サプリPR配信' },
  })

  if (!existingProject) {
    await prisma.project.create({
      data: {
        name: '【サンプル】美容サプリPR配信',
        clientId: client.id,
        talentId: talent.id,
        directorId: director.id,
        productName: 'ビューティーサプリ Premium',
        productOverview: '美容と健康をサポートするサプリメント。コラーゲン・ビタミンC・ヒアルロン酸を配合。',
        purpose: 'ブランド認知向上と新規購入者獲得',
        targetAudience: '20〜30代女性、美容・健康に関心が高い層',
        appealPoints: '①天然成分100%使用 ②1日2粒で簡単継続 ③30日間返金保証付き',
        requiredAppeals: '「天然成分100%」「30日間返金保証」は必ず伝えること',
        ngItems: '「痩せる」「治る」などの医薬的な効果・効能の断言\n他社製品との比較\n価格の誇大な表現',
        requiredNotations: '#PR #BeautySupplement #PR案件',
        usedUrl: 'https://example.com/beauty-supple?ref=vtuber',
        streamDate: new Date('2025-07-15'),
        postDate: new Date('2025-07-15'),
        status: 'active',
        notes: 'タレントへの商品サンプル送付済み',
      },
    })
  }

  console.log('✅ シードデータ投入完了:', {
    admin: admin.name,
    director: director.name,
    client: client.name,
    talent: talent.name,
  })
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
