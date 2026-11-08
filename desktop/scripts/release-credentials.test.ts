import { describe, expect, it } from 'vitest'

import { readReleaseCredentials } from './release-credentials.ts'

const environment = {
  CSC_LINK: Buffer.from('test certificate').toString('base64'),
  CSC_KEY_PASSWORD: 'test export password',
  APPLE_API_KEY: Buffer.from(
    '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
  ).toString('base64'),
  APPLE_API_KEY_ID: 'ABCDEFGHIJ',
  APPLE_API_ISSUER: '00000000-0000-0000-0000-000000000000',
  CONDUCTIVE_APPLE_TEAM_ID: 'UV85J3PKBX',
}

describe('release credentials', () => {
  it('accepts the complete signing and notarization credential set', () => {
    expect(readReleaseCredentials(environment).teamId).toBe('UV85J3PKBX')
  })

  it.each(Object.keys(environment))(
    'rejects a missing %s before building',
    (key) => {
      expect(() =>
        readReleaseCredentials({ ...environment, [key]: '' }),
      ).toThrow(key)
    },
  )

  it.each(['pull_request', 'pull_request_target'])(
    'refuses release credentials for %s',
    (event) => {
      expect(() =>
        readReleaseCredentials({ ...environment, GITHUB_EVENT_NAME: event }),
      ).toThrow('pull request')
    },
  )

  it('rejects a malformed Apple team', () => {
    expect(() =>
      readReleaseCredentials({ ...environment, CONDUCTIVE_APPLE_TEAM_ID: '-' }),
    ).toThrow('CONDUCTIVE_APPLE_TEAM_ID')
  })

  it.each(['CSC_LINK', 'APPLE_API_KEY'])(
    'rejects malformed base64 in %s',
    (key) => {
      expect(() =>
        readReleaseCredentials({
          ...environment,
          [key]: 'invalid secret value!',
        }),
      ).toThrow(key)
    },
  )

  it('requires a private API key instead of a public certificate', () => {
    expect(() =>
      readReleaseCredentials({
        ...environment,
        APPLE_API_KEY: Buffer.from('public certificate').toString('base64'),
      }),
    ).toThrow('APPLE_API_KEY')
  })
})
