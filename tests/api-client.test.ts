import test from 'node:test'
import assert from 'node:assert/strict'
import { apiFetch } from '../src/lib/api-client'

test('expired sessions redirect to login and denied operations reject instead of reporting success', async () => {
  const previousFetch = globalThis.fetch
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const redirects: string[] = []
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { assign: (url: string) => redirects.push(url) } } })
  try {
    globalThis.fetch = async () => new Response('{}', { status: 401 })
    await assert.rejects(apiFetch('/api/projects'), /ログイン/)
    assert.deepEqual(redirects, ['/login'])
    globalThis.fetch = async () => new Response('{}', { status: 403 })
    await assert.rejects(apiFetch('/api/projects', { method: 'POST' }), /権限/)
    const allowed = new Response('{}', { status: 200 })
    globalThis.fetch = async () => allowed
    assert.equal(await apiFetch('/api/projects'), allowed)
  } finally {
    globalThis.fetch = previousFetch
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
