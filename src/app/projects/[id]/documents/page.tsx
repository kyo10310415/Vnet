export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DocumentsPageClient } from '@/components/documents/DocumentsPageClient'

export default async function DocumentsPage({
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
        <h1 className="text-2xl font-bold text-gray-900">🤖 AI下書き生成</h1>
        <p className="text-sm text-gray-500 mt-1">{project.name}</p>
      </div>
      <DocumentsPageClient projectId={project.id} projectName={project.name} />
    </div>
  )
}
