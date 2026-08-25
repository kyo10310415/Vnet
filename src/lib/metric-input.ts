import { MetricType } from '@prisma/client'

const INTEGER_FIELDS = [
  'youtubeViews',
  'peakConcurrent',
  'likes',
  'comments',
  'xImpressions',
  'xLikes',
  'xReposts',
  'clicks',
  'cv',
] as const

const FLOAT_FIELDS = ['avgViewDuration', 'cvr', 'cpa'] as const
const TEXT_FIELDS = ['youtubeUrl', 'xPostUrl', 'notes'] as const

export class MetricInputError extends Error {}

function parseOptionalDate(value: unknown, label: string): Date | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new MetricInputError(`${label}を正しく入力してください`)
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new MetricInputError(`${label}を正しく入力してください`)
  }
  return date
}

function parseOptionalNumber(value: unknown, label: string, integer: boolean): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    throw new MetricInputError(`${label}は0以上の${integer ? '整数' : '数値'}で入力してください`)
  }
  return parsed
}

function parseOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim() || null
}

export function parseMetrics(value: unknown) {
  if (!Array.isArray(value) || value.length > 100) {
    throw new MetricInputError('数値データの形式が正しくありません')
  }

  return value.map((entry, order) => {
    if (!entry || typeof entry !== 'object') {
      throw new MetricInputError(`実績${order + 1}の形式が正しくありません`)
    }

    const input = entry as Record<string, unknown>
    if (!Object.values(MetricType).some(type => type === input.type)) {
      throw new MetricInputError(`実績${order + 1}の種別が正しくありません`)
    }

    const data: Record<string, string | number | Date | null> = {
      type: input.type as MetricType,
      label: parseOptionalText(input.label),
      recordedAt: parseOptionalDate(input.recordedAt, `実績${order + 1}の実施日`),
      order,
    }

    for (const field of TEXT_FIELDS) {
      data[field] = parseOptionalText(input[field])
    }
    for (const field of INTEGER_FIELDS) {
      data[field] = parseOptionalNumber(input[field], `実績${order + 1}の${field}`, true)
    }
    for (const field of FLOAT_FIELDS) {
      data[field] = parseOptionalNumber(input[field], `実績${order + 1}の${field}`, false)
    }

    return data
  })
}
