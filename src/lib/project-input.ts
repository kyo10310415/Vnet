export type ProjectScheduleInput = {
  type: 'stream' | 'post'
  startDate: string
  endDate?: string | null
}

export class ProjectInputError extends Error {}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && Object.values(ProjectStatus).some(status => status === value)
}

function parseDateOnly(value: unknown, label: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ProjectInputError(`${label}を正しく入力してください`)
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ProjectInputError(`${label}を正しく入力してください`)
  }

  return date
}

export function parseProjectSchedules(value: unknown) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > 100) {
    throw new ProjectInputError('予定日の形式が正しくありません')
  }

  const orderByType = { stream: 0, post: 0 }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new ProjectInputError(`予定日${index + 1}の形式が正しくありません`)
    }

    const input = entry as Partial<ProjectScheduleInput>
    if (input.type !== 'stream' && input.type !== 'post') {
      throw new ProjectInputError(`予定日${index + 1}の種別が正しくありません`)
    }

    const startDate = parseDateOnly(input.startDate, `予定日${index + 1}の開始日`)
    const endDate = input.endDate
      ? parseDateOnly(input.endDate, `予定日${index + 1}の終了日`)
      : null

    if (endDate && endDate < startDate) {
      throw new ProjectInputError(`予定日${index + 1}の終了日は開始日以降にしてください`)
    }

    return {
      type: input.type,
      startDate,
      endDate,
      order: orderByType[input.type]++,
    }
  })
}

export function parseProjectPlans(value: unknown) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > 100) {
    throw new ProjectInputError('企画内容の形式が正しくありません')
  }

  return value
    .map(item => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && 'content' in item) {
        const content = (item as { content?: unknown }).content
        return typeof content === 'string' ? content.trim() : ''
      }
      return ''
    })
    .filter(Boolean)
    .map((content, order) => ({ content, order }))
}
import { ProjectStatus } from '@prisma/client'
