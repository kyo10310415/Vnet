import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { authorizeUser, canAccess, canEditProject, type AuthenticatedUser } from '../src/lib/authorization'

import ModuleCore, { createRequire } from 'node:module'
const loadModule = createRequire(__filename)
const Module = ModuleCore as typeof ModuleCore & { _load: (this: unknown, specifier: string, ...args: unknown[]) => unknown }
const originalLoad = Module._load
let actor: AuthenticatedUser | null = null
let writes: { table: string; data: Record<string, unknown> }[] = []
let dbCalls = 0
const doc = { id: 'document', projectId: 'project', version: 2, status: 'pending_review', type: 'stream_script' }
const db = {
  user: { findMany: async () => { dbCalls++; return [{ id: 'user', name: 'Fixture' }] } },
  generatedDocument: {
    findUnique: async () => { dbCalls++; return doc },
    update: async (args: { data: Record<string, unknown> }) => { writes.push({ table: 'document', data: args.data }); return { ...doc, ...args.data } },
  },
  project: { findUnique: async () => ({ directorId: 'assigned-director' }) },
  checklist: { findUnique: async () => ({ projectId: 'project' }) },
  approval: { create: async (args: { data: Record<string, unknown> }) => { writes.push({ table: 'approval', data: args.data }); return args.data } },
  rejection: { create: async (args: { data: Record<string, unknown> }) => { writes.push({ table: 'rejection', data: args.data }); return args.data } },
  activityLog: { create: async () => ({}) },
  $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
}
Module._load = function (this: unknown, specifier: string, ...args: unknown[]) {
  if (specifier === 'server-only') return {}
  if (specifier === '@/auth' || /[/\\]src[/\\]auth(?:\.ts)?$/.test(specifier)) return { getCurrentUser: async () => actor }
  if (specifier === '@/lib/prisma' || /[/\\]lib[/\\]prisma(?:\.ts)?$/.test(specifier)) return { prisma: db }
  return originalLoad.call(this, specifier, ...args)
}

function request(url: string, method = 'GET', body?: unknown, origin = 'http://localhost:3001') {
  return new NextRequest('http://localhost:3001' + url, {
    method, headers: { origin, 'content-type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}
const user = (role: AuthenticatedUser['role']): AuthenticatedUser => ({ id: 'member', name: 'Signed-in reviewer', email: 'member@example.invalid', role })

test('anonymous, unknown roles, CSRF and role boundaries are denied', () => {
  assert.equal(authorizeUser(null, 'read', request('/api/users')), 401)
  assert.equal(authorizeUser({ ...user('viewer'), role: 'unknown' as never }, 'read', request('/api/users')), 401)
  assert.equal(authorizeUser(user('viewer'), 'edit', request('/api/projects', 'POST', {})), 403)
  assert.equal(authorizeUser(user('reviewer'), 'users', request('/api/users', 'POST', {})), 403)
  assert.equal(authorizeUser(user('admin'), 'edit', request('/api/projects', 'POST', {}, 'https://attacker.invalid')), 403)
  assert.equal(authorizeUser(user('admin'), 'edit', new Request('http://localhost:3001/api/projects', { method: 'POST' })), 403)
  assert.equal(authorizeUser(user('admin'), 'edit', request('/api/projects', 'POST', {})), null)
  assert.equal(canAccess('reviewer', 'review'), true)
  assert.equal(canEditProject(user('director'), 'someone-else'), false)
  assert.equal(canEditProject(user('director'), 'member'), true)
})

function routes(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name)
    return entry.isDirectory() ? (entry.name === 'auth' ? [] : routes(file)) : entry.name === 'route.ts' ? [file] : []
  })
}
const routeFiles = routes(path.join(process.cwd(), 'src/app/api'))

test('every business API rejects anonymous requests before any DB or external work', async () => {
  actor = null
  dbCalls = 0
  writes = []
  let methods = 0
  for (const file of routeFiles) {
    const route = loadModule(file)
    const url = '/api/' + path.relative(path.join(process.cwd(), 'src/app/api'), path.dirname(file)).replaceAll(path.sep, '/').replaceAll(/\[[^\]]+\]/g, 'fixture')
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      if (!route[method]) continue
      methods++
      const response = await route[method](request(url, method, method === 'GET' ? undefined : {}), { params: Promise.resolve({ id: 'document', projectId: 'project', itemId: 'item' }) })
      assert.equal(response.status, 401, `${path.relative(process.cwd(), file)} ${method}`)
    }
  }
  assert.ok(methods >= 25)
  assert.equal(dbCalls, 0)
  assert.deepEqual(writes, [])
})

test('registered viewer can read but cannot approve or administer users', async () => {
  actor = user('viewer')
  const users = loadModule('../src/app/api/users/route.ts')
  assert.equal((await users.GET(request('/api/users'))).status, 200)
  assert.equal((await users.POST(request('/api/users', 'POST', { name: 'attacker', role: 'admin' }))).status, 403)
  const approval = loadModule('../src/app/api/documents/[id]/approve/route.ts')
  assert.equal((await approval.POST(request('/api/documents/document/approve', 'POST', { approverName: 'spoof' }), { params: Promise.resolve({ id: 'document' }) })).status, 403)
})

test('approver and rejector are the authenticated user, never a client-supplied name', async () => {
  actor = user('reviewer')
  writes = []
  for (const action of ['approve', 'reject']) {
    const route = loadModule(`../src/app/api/documents/[id]/${action}/route.ts`)
    const response = await route.POST(request(`/api/documents/document/${action}`, 'POST', { approverName: 'spoof', rejectorName: 'spoof', comment: 'reviewed', reason: 'needs changes' }), { params: Promise.resolve({ id: 'document' }) })
    assert.equal(response.status, 200)
  }
  assert.equal(writes.find(w => w.table === 'approval')?.data.approverId, actor.id)
  assert.equal(writes.find(w => w.table === 'rejection')?.data.rejectorId, actor.id)
  assert.equal(writes[0].data.approvedBy, actor.name)
  assert.ok(!JSON.stringify(writes).includes('spoof'))
})

test('directors cannot edit or approve another director project', async () => {
  actor = user('director')
  const route = loadModule('../src/app/api/documents/[id]/approve/route.ts')
  writes = []
  const response = await route.POST(request('/api/documents/document/approve', 'POST', {}), { params: Promise.resolve({ id: 'document' }) })
  assert.equal(response.status, 403)
  assert.deepEqual(writes, [])
})

test('encoded static paths cannot bypass director ownership checks', async () => {
  actor = user('director')
  writes = []
  const route = loadModule('../src/app/api/documents/[id]/approve/route.ts')
  const response = await route.POST(request('/api/%64ocuments/document/approve', 'POST', {}), { params: Promise.resolve({ id: 'document' }) })
  assert.equal(response.status, 403)
  assert.deepEqual(writes, [])
})

test('directors fail closed for encoded separators, double decoding and unknown mutations', async () => {
  actor = user('director')
  const { requireApiAccess } = loadModule('../src/lib/access.ts')
  for (const path of ['/api/documents%2Fdocument/approve', '/api/%2564ocuments/document/approve', '/api/%ZZ/document']) {
    assert.equal((await requireApiAccess(request(path, 'POST', {}), 'edit')).status, 400)
  }
  assert.equal((await requireApiAccess(request('/api/future-mutation', 'POST', {}), 'edit')).status, 403)
})

test('a director can still approve the project assigned to them', async () => {
  actor = { ...user('director'), id: 'assigned-director' }
  writes = []
  const route = loadModule('../src/app/api/documents/[id]/approve/route.ts')
  const response = await route.POST(request('/api/documents/document/approve', 'POST', {}), { params: Promise.resolve({ id: 'document' }) })
  assert.equal(response.status, 200)
  assert.equal(writes.find(w => w.table === 'approval')?.data.approverId, actor.id)
})

test('generic document edit cannot bypass human approval with status=approved', async () => {
  actor = user('admin')
  writes = []
  const route = loadModule('../src/app/api/documents/[id]/route.ts')
  const response = await route.PUT(request('/api/documents/document', 'PUT', { status: 'approved' }), { params: Promise.resolve({ id: 'document' }) })
  assert.equal(response.status, 400)
  assert.deepEqual(writes, [])
})

test('generic report edit cannot bypass the dedicated approval operation', async () => {
  actor = user('admin')
  writes = []
  const route = loadModule('../src/app/api/reports/[projectId]/route.ts')
  const response = await route.PUT(request('/api/reports/project', 'PUT', { status: 'approved' }), { params: Promise.resolve({ projectId: 'project' }) })
  assert.equal(response.status, 400)
  assert.deepEqual(writes, [])
})

test('report approval keeps state and audit writes in one transaction on a foreign-key failure', async () => {
  actor = user('reviewer')
  const previousTransaction = db.$transaction
  const originalError = console.error
  let transactions = 0
  let outsideUpdates = 0
  const transactionWrites: string[] = []
  Object.assign(db, {
    report: {
      findUnique: async () => ({ id: 'report', status: 'pending_review' }),
      update: async () => { outsideUpdates++; throw new Error('not transactional') },
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => {
      transactions++
      return callback({
        report: { update: async () => { transactionWrites.push('state'); return {} } },
        approval: { create: async () => { transactionWrites.push('audit'); throw new Error('fixture foreign key') } },
      })
    },
  })
  console.error = () => {}
  try {
    const route = loadModule('../src/app/api/reports/[projectId]/approve/route.ts')
    const response = await route.POST(request('/api/reports/project/approve', 'POST', { approverName: 'spoof' }), { params: Promise.resolve({ projectId: 'project' }) })
    assert.equal(response.status, 500)
    assert.equal(transactions, 1)
    assert.equal(outsideUpdates, 0)
    assert.deepEqual(transactionWrites, ['state', 'audit'])
  } finally {
    Object.assign(db, { $transaction: previousTransaction })
    Reflect.deleteProperty(db, 'report')
    console.error = originalError
  }
})

test('all server pages protect their data before rendering', () => {
  function check(folder: string) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name)
      if (entry.isDirectory() && entry.name !== 'login' && entry.name !== 'api') check(file)
      else if (entry.name === 'page.tsx') assert.match(readFileSync(file, 'utf8'), /export default async function[\s\S]*?\{\s*(?:const user = )?await requirePageUser\([^)]*\)/, file)
    }
  }
  check(path.join(process.cwd(), 'src/app'))
})
