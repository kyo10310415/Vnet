export const dynamic = 'force-dynamic'

import { ProjectForm } from '@/components/projects/ProjectForm'

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">➕ 新規案件作成</h1>
        <p className="text-sm text-gray-500 mt-1">案件の基本情報を入力してください</p>
      </div>
      <ProjectForm />
    </div>
  )
}
