import 'server-only'

import type { Prisma } from '@prisma/client'

export async function resolveTalentIds(
  transaction: Prisma.TransactionClient,
  talentNames: string[],
): Promise<string[]> {
  const ids: string[] = []

  for (const name of talentNames) {
    let talent = await transaction.talent.findFirst({ where: { name } })
    if (!talent) {
      talent = await transaction.talent.create({ data: { name } })
    }
    ids.push(talent.id)
  }

  return ids
}
