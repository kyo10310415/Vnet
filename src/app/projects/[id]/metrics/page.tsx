export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MetricsClient } from '@/components/metrics/MetricsClient'

export default async function MetricsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!project) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← {project.name}
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 数値入力</h1>
        <p className="text-sm text-gray-500 mt-1">{project.name}</p>
      </div>
      <MetricsClient projectId={project.id} />
    </div>
  )
}
