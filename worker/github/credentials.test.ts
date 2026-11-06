import { expect, it } from 'vitest'

import { installationTokenProvider } from './credentials'
import { object } from './parsers'

it('signs server-only installation credentials with one-repository read permissions', async () => {
  const keys = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )
  if (!('privateKey' in keys)) throw new Error('Expected an RSA key pair')
  const exported = await crypto.subtle.exportKey('pkcs8', keys.privateKey)
  if (!(exported instanceof ArrayBuffer))
    throw new Error('Expected a PKCS#8 key')
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...new Uint8Array(exported)))}\n-----END PRIVATE KEY-----`
  const requests: Request[] = []
  const provider = installationTokenProvider(
    {
      GITHUB_CLIENT_ID: 'github-client-id',
      GITHUB_APP_PRIVATE_KEY: pem,
    },
    async (request) => {
      requests.push(request.clone())
      return Response.json({ token: 'private-installation-token' })
    },
    () => 1800000000000,
  )
  expect(
    await provider({
      id: 'workspace-1',
      orgId: 'org-1',
      branch: 'changes',
      repositoryId: 186853002,
      fullName: 'Codertocat/Hello-World',
      defaultBranch: 'main',
      installationId: 1,
    }),
  ).toBe('private-installation-token')
  expect(requests).toHaveLength(1)
  expect(requests[0].url).toBe(
    'https://api.github.com/app/installations/1/access_tokens',
  )
  expect(await requests[0].json()).toEqual({
    repository_ids: [186853002],
    permissions: {
      contents: 'read',
      pull_requests: 'read',
      checks: 'read',
      statuses: 'read',
    },
  })
  const jwt = requests[0].headers.get('Authorization')?.slice(7) ?? ''
  const [header, payload, signature] = jwt.split('.')
  const decode = (value: string) =>
    Uint8Array.from(
      atob(value.replaceAll('-', '+').replaceAll('_', '/')),
      (character) => character.charCodeAt(0),
    )
  const claims: unknown = JSON.parse(new TextDecoder().decode(decode(payload)))
  expect(object(claims)).toEqual({
    iat: 1799999940,
    exp: 1800000540,
    iss: 'github-client-id',
  })
  expect(
    await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      keys.publicKey,
      decode(signature),
      new TextEncoder().encode(`${header}.${payload}`),
    ),
  ).toBe(true)
})
