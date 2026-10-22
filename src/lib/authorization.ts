export const roles = ['admin', 'director', 'reviewer', 'viewer'] as const
export type Role = (typeof roles)[number]
export type Permission = 'read' | 'edit' | 'review' | 'users'
export type AuthenticatedUser = { id: string; name: string; email: string; role: Role }

export function isRole(value: unknown): value is Role {
  return roles.some(role => role === value)
}

export function canAccess(role: Role, permission: Permission) {
  if (permission === 'read') return isRole(role)
  if (permission === 'users') return role === 'admin'
  if (permission === 'review') return ['admin', 'director', 'reviewer'].includes(role)
  return role === 'admin' || role === 'director'
}

export function sameOriginMutation(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export function authorizeUser(user: AuthenticatedUser | null, permission: Permission, request: Request) {
  if (!user || !isRole(user.role)) return 401
  if (!canAccess(user.role, permission) || !sameOriginMutation(request)) return 403
  return null
}

export function canEditProject(user: AuthenticatedUser, directorId: string | null) {
  return user.role === 'admin' || (user.role === 'director' && user.id === directorId)
}
