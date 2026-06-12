import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const talents = await prisma.talent.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(talents)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch talents' }, { status: 500 })
  }
}
