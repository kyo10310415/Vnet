import { requireApiAccess } from '@/lib/access'
import { NextResponse } from 'next/server'
import { isRole } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const access = await requireApiAccess(request, 'read')
  if (access instanceof Response) return access

  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const access = await requireApiAccess(request, 'users')
  if (access instanceof Response) return access

  try {
    const body = await request.json()
    const { name, email, role = 'viewer' } = body
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.includes('@') || !isRole(role)) {
      return NextResponse.json({ error: 'ユーザー情報が正しくありません' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), role },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
