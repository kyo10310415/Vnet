import { requireApiAccess } from '@/lib/access'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const access = await requireApiAccess(request, 'read')
  if (access instanceof Response) return access

  try {
    const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(clients)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}
