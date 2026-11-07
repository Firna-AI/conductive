import { generateKeyPairSync } from 'node:crypto'

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { errorResponse } from '../../http'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import {
  handleImageSourceCredential,
  IMAGE_SOURCE_CREDENTIAL_PATH,
} from './credential'
import { localSourceFixture } from './local-source-test-support'
import { INSTALLATION_TOKEN } from './native-github-test-support'
import { readSourceJob } from './source-data'

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const privateKey = keys.privateKey
  .export({ type: 'pkcs1', format: 'pem' })
  .toString()
const FAILURE = {
  status: 502,
  code: 'image_sources_unavailable',
  message:
    'The repositories could not load. Check the GitHub App access and try again.',
}
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  vi.spyOn(Date, 'now').mockReturnValue(TEST_TIME)
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

function deferred() {
  let resolve: () => void = () => {
    throw new Error('Not initialized')
  }
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

it('limits the read token to one repository and consumes its private build grant exactly once', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  const started = deferred()
  const release = deferred()
  let starting: Promise<boolean | void> | undefined
  try {
    await fixture.step()
    await fixture.step()
    fixture.provider.beforeStart = async (command) => {
      if (command.includes('clone --bare')) {
        started.resolve()
        await release.promise
      }
    }
    starting = fixture.prepare()
    await started.promise
    const grant = fixture.provider.commands
      .at(-1)
      ?.match(/Authorization: Bearer ([A-Za-z0-9_-]+)/u)?.[1]
    if (!grant) throw new Error('Missing build grant')
    const claim = async () => {
      try {
        return await handleImageSourceCredential(
          new Request(
            `${fixture.env.MACHINE_ORIGIN}${IMAGE_SOURCE_CREDENTIAL_PATH}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${grant}` },
            },
          ),
          fixture.env,
        )
      } catch (error) {
        return errorResponse(error)
      }
    }
    const stored = await readSourceJob(fixture.env.DB, fixture.input.buildId)
    expect(stored?.tokenCiphertext).not.toContain(INSTALLATION_TOKEN)
    expect(stored?.grantHash).not.toBe(grant)
    for (const [name, value] of [
      ['Cookie', 'browser-session'],
      ['Origin', fixture.env.APP_ORIGIN],
    ]) {
      const headers = new Headers({ Authorization: `Bearer ${grant}` })
      headers.set(name, value)
      await expect(
        handleImageSourceCredential(
          new Request(
            `${fixture.env.MACHINE_ORIGIN}${IMAGE_SOURCE_CREDENTIAL_PATH}`,
            {
              method: 'POST',
              headers,
            },
          ),
          fixture.env,
        ),
      ).rejects.toMatchObject({ status: 403, code: 'build_grant_refused' })
    }
    for (const mutation of [
      [
        "UPDATE image_builds SET sandbox_id = 'another-builder'",
        "UPDATE image_builds SET sandbox_id = 'builder-one'",
      ],
      [
        "UPDATE image_builds SET state = 'failed'",
        "UPDATE image_builds SET state = 'running'",
      ],
      [
        'UPDATE image_source_jobs SET source_index = 1',
        'UPDATE image_source_jobs SET source_index = 0',
      ],
      [
        "UPDATE image_source_jobs SET org_id = 'another-org'",
        `UPDATE image_source_jobs SET org_id = '${fixture.org.id}'`,
      ],
      [
        "UPDATE repositories SET full_name = 'another/repository'",
        "UPDATE repositories SET full_name = 'example/source-repository'",
      ],
      ['UPDATE orgs SET deleted_at = 1', 'UPDATE orgs SET deleted_at = NULL'],
    ]) {
      await fixture.env.DB.prepare(mutation[0]).run()
      expect((await claim()).status).toBe(401)
      await fixture.env.DB.prepare(mutation[1]).run()
    }
    const responses = await Promise.all([claim(), claim()])
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 401,
    ])
    const response = responses.find((candidate) => candidate.status === 200)
    if (!response) throw new Error('Missing successful claim')
    expect(await response.text()).toBe(`${INSTALLATION_TOKEN}_1`)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect((await claim()).status).toBe(401)
    const mint = fixture.access.requests[0]
    expect([mint.method, mint.url, mint.redirect]).toEqual([
      'POST',
      'https://api.github.com/app/installations/701/access_tokens',
      'manual',
    ])
    expect(await mint.clone().json()).toEqual({
      repository_ids: [101],
      permissions: { contents: 'read' },
    })
    const [header, claims, signature] = (
      mint.headers.get('Authorization')?.slice(7) ?? ''
    ).split('.')
    const publicKey = await crypto.subtle.importKey(
      'spki',
      keys.publicKey.export({ type: 'spki', format: 'der' }),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({
      alg: 'RS256',
      typ: 'JWT',
    })
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({
      iss: 'github-client-id',
      iat: 1_799_999_940,
      exp: 1_800_000_540,
    })
    expect(
      await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        publicKey,
        Buffer.from(signature, 'base64url'),
        Buffer.from(`${header}.${claims}`),
      ),
    ).toBe(true)
    release.resolve()
    await starting
    await expect(fixture.finish()).rejects.toMatchObject(FAILURE)
    expect(fixture.access.activeTokens).toEqual([])
    expect(fixture.access.requests[1].url).toBe(
      'https://api.github.com/installation/token',
    )
    expect(fixture.access.requests[1].redirect).toBe('manual')
  } finally {
    release.resolve()
    await starting
    await fixture.dispose()
  }
})
