import { prisma } from '@/lib/prisma'
import { ActivityType } from '@prisma/client'

export async function logActivity({
  projectId,
  userId,
  type,
  description,
  metadata,
}: {
  projectId?: string
  userId?: string
  type: ActivityType
  description: string
  metadata?: Record<string, unknown>
}) {
  try {
    await prisma.activityLog.create({
      data: {
        projectId,
        userId,
        type,
        description,
        metadata: metadata ? (metadata as any) : undefined,
      },
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}
