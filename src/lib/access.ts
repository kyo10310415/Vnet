import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/auth'
import { prisma } from '@/lib/prisma'
import { authorizeUser, canAccess, canEditProject, type Permission } from './authorization'

export async function requirePageUser(permission: Permission = 'read') {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!canAccess(user.role, permission)) redirect('/?access=denied')
  return user
}

export async function requireApiAccess(request: Request, permission: Permission = 'read') {
  const user = await getCurrentUser()
  const denied = authorizeUser(user, permission, request)
  if (denied || !user) {
    return NextResponse.json({ error: denied === 403 ? '操作権限がありません' : 'ログインが必要です' }, { status: denied || 401 })
  }
  // Directors may read shared projects but may only change their own work.
  if (user.role === 'director' && permission !== 'read') {
    let path: string[]
    try {
      path = new URL(request.url).pathname.split('/').filter(Boolean).map(segment => decodeURIComponent(segment))
      if (path.some(segment => /[/\\%]/.test(segment) || segment === '.' || segment === '..')) throw new Error('Invalid path')
    } catch {
      return NextResponse.json({ error: '操作対象のパスが正しくありません' }, { status: 400 })
    }
    const creationOrAnalysis = path[0] === 'api' && path[1] === 'projects' &&
      ((path.length === 2 && request.method === 'POST') || (path.length === 3 && path[2] === 'analyze' && request.method === 'POST'))
    const documentPath = path[1] === 'documents' && path[2] &&
      (path.length === 3 || (path.length === 4 && ['approve', 'reject'].includes(path[3])))
    const checklistPath = path[1] === 'checklists' && path.length === 5 && path[3] === 'items'
    let projectId: string | null = null
    if (path[0] !== 'api') return NextResponse.json({ error: '操作権限がありません' }, { status: 403 })
    if (path[1] === 'projects' && path.length === 3 && !creationOrAnalysis) projectId = path[2]
    if (path[1] === 'metrics' && path.length === 3) projectId = path[2]
    if (path[1] === 'reports' && (path.length === 3 ||
      (path.length === 4 && ['generate', 'approve', 'reject'].includes(path[3])))) projectId = path[2]
    if (documentPath) {
      const doc = await prisma.generatedDocument.findUnique({ where: { id: path[2] }, select: { projectId: true } })
      projectId = doc?.projectId || null
      if (!projectId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (checklistPath) {
      const checklist = await prisma.checklist.findUnique({ where: { id: path[2] }, select: { projectId: true } })
      projectId = checklist?.projectId || null
      if (!projectId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (['documents', 'checklists'].includes(path[1]) && path.length === 2 && request.method === 'POST') {
      const body = await request.clone().json().catch(() => null)
      if (typeof body?.projectId !== 'string') return NextResponse.json({ error: '案件IDが必要です' }, { status: 400 })
      projectId = body.projectId
    }
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { directorId: true } })
      if (!project || !canEditProject(user, project.directorId)) {
        return NextResponse.json({ error: '担当案件の操作権限がありません' }, { status: 403 })
      }
    } else if (!creationOrAnalysis) {
      // A future mutation route must explicitly join the scope policy.
      return NextResponse.json({ error: '操作対象の案件を確認できません' }, { status: 403 })
    }
  }
  return user
}
