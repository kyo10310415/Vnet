import { DocumentStatus, ProjectStatus } from '@prisma/client'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: '下書き',
  active: '進行中',
  streaming: '配信中',
  post_production: '配信後作業',
  reporting: 'レポート作成中',
  delivered: '納品済み',
  closed: '完了',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: 'gray',
  active: 'blue',
  streaming: 'red',
  post_production: 'yellow',
  reporting: 'purple',
  delivered: 'green',
  closed: 'gray',
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: '下書き',
  pending_review: '承認待ち',
  approved: '承認済み',
  rejected: '差し戻し',
}

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'gray',
  pending_review: 'yellow',
  approved: 'green',
  rejected: 'red',
}

export const DOCUMENT_TYPE_LABELS = {
  stream_structure: '配信構成案',
  stream_script: '配信台本案',
  ng_list: 'NGリスト案',
  talent_briefing: 'タレント向け説明文案',
  x_announcement: 'X告知投稿文案',
  report_body: 'レポート本文案',
  next_proposal: '次回施策提案案',
}

export const CHECKLIST_CATEGORY_LABELS = {
  pre_stream: '配信前',
  during_stream: '配信中',
  post_stream: '配信後',
  pre_report: 'レポート前',
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

type ScheduleDate = {
  startDate: Date | string
  endDate?: Date | string | null
}

export function formatScheduleEntry(schedule: ScheduleDate): string {
  const start = formatDate(schedule.startDate)
  if (!schedule.endDate) return start

  const end = formatDate(schedule.endDate)
  return start === end ? start : `${start}〜${end}`
}

export function formatSchedules(schedules: ScheduleDate[]): string {
  if (schedules.length === 0) return '—'
  return schedules.map(formatScheduleEntry).join('、')
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusBadgeClass(status: DocumentStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'pending_review':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    case 'rejected':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}
