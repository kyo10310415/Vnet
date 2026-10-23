import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { getToken } from 'next-auth/jwt'

test('patched Auth.js treats malformed Bearer encoding as an invalid session', async () => {
  const secret = randomBytes(32).toString('hex')
  for (const authorization of ['Bearer %', 'Bearer %ZZ', 'Bearer %E0%A4%A', 'Bearer invalid']) {
    const token = await getToken({
      req: new Request('https://fixture.example.invalid/api', { headers: { authorization } }),
      secret,
    })
    assert.equal(token, null)
  }
})
