import { requireApiAccess } from '@/lib/access'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const access = await requireApiAccess(request, 'read')
  if (access instanceof Response) return access

  try {
    const talents = await prisma.talent.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(talents)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch talents' }, { status: 500 })
  }
}
