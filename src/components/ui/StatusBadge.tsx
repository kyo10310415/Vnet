import { DocumentStatus } from '@prisma/client'
import { DOCUMENT_STATUS_LABELS } from '@/lib/constants'

interface StatusBadgeProps {
  status: DocumentStatus
  large?: boolean
}

const statusConfig = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', icon: '📝' },
  pending_review: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '⏳' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: '✅' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: '❌' },
}

export function DocumentStatusBadge({ status, large = false }: StatusBadgeProps) {
  const config = statusConfig[status]
  const sizeClass = large ? 'px-3 py-1.5 text-sm font-semibold' : 'px-2 py-0.5 text-xs font-medium'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClass}`}>
      <span>{config.icon}</span>
      <span>{DOCUMENT_STATUS_LABELS[status]}</span>
    </span>
  )
}

interface WarningBannerProps {
  message: string
  type?: 'warning' | 'error' | 'info'
}

export function WarningBanner({ message, type = 'warning' }: WarningBannerProps) {
  const config = {
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-800', icon: '⚠️' },
    error: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800', icon: '🚫' },
    info: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800', icon: 'ℹ️' },
  }[type]

  return (
    <div className={`flex items-start gap-2 rounded-lg border-l-4 ${config.bg} ${config.border} p-4`}>
      <span className="text-lg">{config.icon}</span>
      <p className={`text-sm font-medium ${config.text}`}>{message}</p>
    </div>
  )
}
