import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import { isRole } from '@/lib/authorization'

async function findRegisteredUser(email: string) {
  const matches = await prisma.user.findMany({
    where: { email: { equals: email.toLowerCase(), mode: 'insensitive' } },
    select: { id: true, name: true, email: true, role: true },
    take: 2,
  })
  // A legacy case-variant duplicate must not select an arbitrary user's role.
  const user = matches.length === 1 ? matches[0] : null
  return user && isRole(user.role) ? { ...user, role: user.role } : null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  logger: { error() { console.error('Authentication failed') }, warn() {}, debug() {} },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google' || profile?.email_verified !== true || !profile.email) return false
      return !!(await findRegisteredUser(profile.email))
    },
  },
})

// Resolve current membership for every request: deleting or downgrading a user
// must take effect without waiting for the encrypted session cookie to expire.
export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.email) return null
  return findRegisteredUser(session.user.email)
}
