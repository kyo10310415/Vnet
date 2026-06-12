/**
 * AI生成モジュール
 * 
 * 現在はモック実装です。
 * OpenAI APIに差し替える場合は、各関数内の実装を変更してください。
 * インターフェースは変更不要です。
 */

import { DocumentType } from '@prisma/client'

export interface GenerateInput {
  projectName: string
  clientName: string
  productName?: string
  productOverview?: string
  purpose?: string
  targetAudience?: string
  appealPoints?: string
  requiredAppeals?: string
  ngItems?: string
  requiredNotations?: string
  usedUrl?: string
  talentName?: string
}

export interface GenerateResult {
  content: string
  generatorType: 'ai' | 'human'
}

/**
 * AIコンテンツ生成メイン関数
 * 後からOpenAI APIに差し替え可能な設計
 */
export async function generateDocument(
  type: DocumentType,
  input: GenerateInput
): Promise<GenerateResult> {
  // TODO: OpenAI API連携
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  // const prompt = buildPrompt(type, input)
  // const response = await openai.chat.completions.create({...})
  // return { content: response.choices[0].message.content, generatorType: 'ai' }

  // モック実装
  await new Promise(resolve => setTimeout(resolve, 500)) // APIコール擬似遅延

  const content = generateMockContent(type, input)
  return { content, generatorType: 'ai' }
}

function generateMockContent(type: DocumentType, input: GenerateInput): string {
  const { projectName, clientName, productName, purpose, targetAudience, appealPoints, requiredAppeals, ngItems, requiredNotations, usedUrl, talentName } = input

  switch (type) {
    case 'stream_structure':
      return `# 配信構成案（下書き・AI生成）

## 案件概要
- 案件名：${projectName}
- クライアント：${clientName}
- 商材：${productName || '（未設定）'}
- 目的：${purpose || '（未設定）'}

## 配信構成

### オープニング（5分）
- 挨拶・自己紹介
- 今日の配信内容の説明
- PR案件の開示（「本日は${clientName}様のPR配信となります」）

### 商品紹介・メインコンテンツ（30分）
- ${productName || '商材'}の紹介
- 実際に使用・体験するコーナー
- 訴求ポイントの自然な組み込み：${appealPoints || '（未設定）'}

### Q&Aコーナー（15分）
- 視聴者からの質問回答
- URL・情報の案内
  - 使用URL：${usedUrl || '（未設定）'}

### エンディング（5分）
- 必須訴求まとめ：${requiredAppeals || '（未設定）'}
- 必須表記の読み上げ
- クロージング

## 注意事項
- NG事項：${ngItems || '（未設定）'}
- 必須表記：${requiredNotations || '（未設定）'}

---
⚠️ **この文書はAI生成の下書きです。必ず人間が確認・承認してください。**`

    case 'stream_script':
      return `# 配信台本案（下書き・AI生成）

## 基本情報
- タレント：${talentName || '（未設定）'}
- 案件：${projectName}

---

## オープニング

【画面入り直後】
「みんなー！来てくれてありがとう！今日もよろしくね！」

【PR開示】
「今日はですね、${clientName}さんのPR案件をやらせていただきます！
${productName || '今日紹介する商品'}について、みんなに紹介できることになったよ！」

---

## 商品紹介パート

【導入】
「まず${productName || 'この商品'}なんだけど、知ってる人いる？」
（チャット確認）

【訴求ポイント】
${appealPoints ? `「${appealPoints}」` : '（訴求ポイントを設定してください）'}

【必須訴求】
※以下は必ず読み上げること：
${requiredAppeals || '（必須訴求を設定してください）'}

【URL案内】
「気になる人は概要欄のリンクもチェックしてみてね！
${usedUrl || '（URLを設定してください）'}」

---

## 禁止ワード・注意事項
${ngItems ? `以下のワードは絶対に使用しないこと：\n${ngItems}` : '（NG事項を設定してください）'}

---

## 必須表記（エンディング時に読み上げ）
${requiredNotations || '（必須表記を設定してください）'}

---
⚠️ **この台本はAI生成の下書きです。タレントへの共有前に必ず承認を受けてください。**`

    case 'ng_list':
      return `# NGリスト案（下書き・AI生成）

## 案件：${projectName}

### 禁止ワード・表現
${ngItems ? ngItems.split(/[、,\n]/).map((item: string, i: number) => `${i + 1}. ${item.trim()}`).join('\n') : '（NG事項が設定されていません）'}

### 一般的な注意事項（VTuber PR案件共通）
1. 根拠のない効果の断言（「絶対に痩せる」「必ず治る」等）
2. 競合他社の名前を出しての比較・批判
3. 誇大な表現（「世界一」「完璧」等の根拠なき表現）
4. 個人の感想を一般化した表現
5. 価格に関する不正確な情報
6. クライアントの未発表情報の漏洩

### 必須確認事項
- [ ] 台本に上記NGワードが含まれていないか確認
- [ ] 配信前にタレントへ周知完了
- [ ] 配信中リアルタイムモニタリング担当者を配置

---
⚠️ **このNGリストはAI生成の下書きです。クライアント確認後に承認してください。**`

    case 'talent_briefing':
      return `# タレント向け説明文案（下書き・AI生成）

## ${talentName || 'タレント'} 様

いつもお世話になっております。
今回の案件についてご説明させていただきます。

---

## 案件概要

| 項目 | 内容 |
|------|------|
| 案件名 | ${projectName} |
| クライアント | ${clientName} |
| 商材名 | ${productName || '（未設定）'} |
| 実施目的 | ${purpose || '（未設定）'} |

---

## 商材について

**商材概要：**
${input.productOverview || '（商材概要が設定されていません）'}

**ターゲット：**
${targetAudience || '（未設定）'}

---

## 配信時の訴求ポイント

${appealPoints || '（訴求ポイントが設定されていません）'}

### 必ず伝えていただきたい内容
${requiredAppeals || '（必須訴求が設定されていません）'}

---

## 禁止事項（必ずご確認ください）

${ngItems || '（NG事項が設定されていません）'}

---

## 必須表記

配信中・投稿に必ず以下の表記をお願いします：
${requiredNotations || '（必須表記が設定されていません）'}

---

## 使用URL・情報

${usedUrl || '（URLが設定されていません）'}

---

ご不明な点がございましたら、担当ディレクターまでお問い合わせください。

---
⚠️ **この説明文はAI生成の下書きです。タレントへの送付前に必ず承認を受けてください。**`

    case 'x_announcement':
      return `# X告知投稿文案（下書き・AI生成）

## パターン1（事前告知）
---
【PR】${productName || '新商材'}をご紹介🎉

${talentName || 'タレント'}が${productName || 'こちらの商品'}について配信するよ！

詳しくはこちら👇
${usedUrl || '（URLを設定してください）'}

#PR #${clientName.replace(/\s/g, '')} #VTuber
---

## パターン2（配信告知）
---
【PR配信のお知らせ】

本日は${clientName}様のご提供でお届けします✨
${productName || '商材'}について実際に体験しながら紹介するよ！

▼詳細はこちら
${usedUrl || '（URLを設定してください）'}

${requiredNotations || '#PR'}
---

## パターン3（配信後報告）
---
${productName || '商材'}の配信ありがとうございました！

視聴してくれたみんな、本当にありがとう🙏
気になった方はぜひチェックしてみてね！

${usedUrl || '（URLを設定してください）'}

${requiredNotations || '#PR #${clientName}'}
---

⚠️ **この投稿文はAI生成の下書きです。投稿前に必ず承認を受けてください。**`

    case 'report_body':
      return `# レポート本文案（下書き・AI生成）

## 案件概要
- **案件名：** ${projectName}
- **クライアント：** ${clientName}
- **商材：** ${productName || '（未設定）'}
- **実施目的：** ${purpose || '（未設定）'}
- **ターゲット：** ${targetAudience || '（未設定）'}

---

## 実施内容
本案件では、${talentName || 'タレント'}によるライブ配信とX投稿を実施しました。
配信では${productName || '商材'}の特徴や魅力を視聴者に向けて紹介し、${purpose || '設定された目的'}の達成を目指しました。

---

## 数値サマリー
※数値入力画面から自動取得されます

---

## 成果
（数値確認後に記載）

---

## 良かった点
- タレントの自然な商品紹介により、視聴者の共感を得られた
- （承認後に具体的な内容を記載）

---

## 課題
- （承認後に具体的な内容を記載）

---

## 次回改善提案
- （承認後に具体的な内容を記載）

---

## クライアント向けコメント
この度はお声がけいただきありがとうございました。
（承認後に詳細を記載）

---
⚠️ **このレポートはAI生成の下書きです。クライアント提出前に必ず承認を受けてください。承認前は「納品不可」です。**`

    case 'next_proposal':
      return `# 次回施策提案案（下書き・AI生成）

## ${projectName} 振り返りと次回提案

---

## 今回の振り返り

### 効果的だった施策
- ライブ配信形式によるリアルタイムの視聴者反応
- タレントによる商品体験の実演

### 改善点
- （数値確認後に記載）

---

## 次回施策提案

### 提案1：配信形式の最適化
- 配信時間帯の見直し（視聴者の活動時間に合わせた設定）
- コーナー構成の改善

### 提案2：SNS連携強化
- 配信告知のタイミング最適化
- ハッシュタグ戦略の見直し

### 提案3：クロスプラットフォーム展開
- YouTube/Twitchでの同時配信
- アーカイブ活用による長期的なリーチ

---

## KPI設定案（次回）

| 指標 | 目標値 |
|------|--------|
| 配信同時接続 | （今回比+20%） |
| X投稿インプレ | （今回比+15%） |
| CV数 | （今回比+10%） |

---
⚠️ **この提案はAI生成の下書きです。クライアントへの提出前に必ず承認を受けてください。**`

    default:
      return `# AI生成コンテンツ（下書き）\n\n案件：${projectName}\n\n※この文書はAI生成の下書きです。`
  }
}
