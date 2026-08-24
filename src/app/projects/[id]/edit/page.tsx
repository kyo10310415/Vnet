export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ProjectForm } from '@/components/projects/ProjectForm'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      talent: true,
      schedules: { orderBy: [{ type: 'asc' }, { order: 'asc' }] },
      plans: { orderBy: { order: 'asc' } },
    },
  })

  if (!project) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">✏️ 案件編集</h1>
        <p className="text-sm text-gray-500 mt-1">{project.name}</p>
      </div>
      <ProjectForm initialData={project} isEdit />
    </div>
  )
}
