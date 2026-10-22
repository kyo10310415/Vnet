import test from 'node:test'
import assert from 'node:assert/strict'
import type { NextAuthConfig } from 'next-auth'
import type { AuthenticatedUser } from '../src/lib/authorization'

import ModuleCore, { createRequire } from 'node:module'
const loadModule = createRequire(__filename)
const Module = ModuleCore as typeof ModuleCore & { _load: (this: unknown, specifier: string, ...args: unknown[]) => unknown }
const originalLoad = Module._load
let configuration: NextAuthConfig
let sessionEmail: string | null = null
let member: AuthenticatedUser | null = null
let duplicate = false
Module._load = function (this: unknown, specifier: string, ...args: unknown[]) {
  if (specifier === 'next-auth') return (config: NextAuthConfig) => {
    configuration = config
    return { auth: async () => sessionEmail ? { user: { email: sessionEmail } } : null, handlers: {} }
  }
  if (specifier === '@/lib/prisma' || /[/\\]lib[/\\]prisma(?:\.ts)?$/.test(specifier)) {
    return { prisma: { user: { findMany: async () => member ? (duplicate ? [member, member] : [member]) : [] } } }
  }
  return originalLoad.call(this, specifier, ...args)
}
const { getCurrentUser } = loadModule('../src/auth.ts')

test('Google login requires verified email and pre-existing registered membership', async () => {
  const callback = configuration.callbacks!.signIn!
  const attempt = (emailVerified: boolean, provider = 'google') => callback({ account: { provider }, profile: { email: 'fixture@example.invalid', email_verified: emailVerified } } as never)
  member = null
  assert.equal(await attempt(true), false)
  member = { id: 'member', name: 'Fixture', email: 'fixture@example.invalid', role: 'reviewer' }
  assert.equal(await attempt(false), false)
  assert.equal(await attempt(true, 'untrusted'), false)
  assert.equal(await attempt(true), true)
  member = { ...member, role: 'unrecognised' as never }
  assert.equal(await attempt(true), false)
})

test('ambiguous legacy email membership fails closed instead of choosing a role', async () => {
  member = { id: 'member', name: 'Fixture', email: 'fixture@example.invalid', role: 'admin' }
  duplicate = true
  try {
    const callback = configuration.callbacks!.signIn!
    assert.equal(await callback({ account: { provider: 'google' }, profile: { email: member.email, email_verified: true } } as never), false)
    sessionEmail = member.email
    assert.equal(await getCurrentUser(), null)
  } finally {
    duplicate = false
  }
})

test('deleted or downgraded memberships apply immediately to an existing session', async () => {
  sessionEmail = 'fixture@example.invalid'
  member = { id: 'member', name: 'Fixture', email: sessionEmail, role: 'admin' }
  assert.equal((await getCurrentUser()).role, 'admin')
  member.role = 'viewer'
  assert.equal((await getCurrentUser()).role, 'viewer')
  member = null
  assert.equal(await getCurrentUser(), null)
  sessionEmail = null
  assert.equal(await getCurrentUser(), null)
})
