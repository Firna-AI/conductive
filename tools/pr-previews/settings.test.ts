import { expect, it } from 'vitest'
import { checkSettings } from './settings.ts'
import { previewEnvironment } from './settings.test-support.ts'

it('skips with a warning when no required preview setting is present', () => {
  expect(
    checkSettings({ CONDUCTIVE_FRAME_SOURCES: 'https://frames.example' }),
  ).toEqual({
    kind: 'skip',
    warning: 'Preview settings are absent. Skipping preview configuration.',
  })
})

it('names every missing setting without including configured secret values', () => {
  expect(
    checkSettings({
      CLOUDFLARE_API_TOKEN: 'fake-sensitive-token',
      GITHUB_CLIENT_SECRET: 'fake-sensitive-client-secret',
      BOAT_API_KEY: '   ',
    }),
  ).toEqual({
    kind: 'error',
    missing: [
      'CLOUDFLARE_ACCOUNT_ID',
      'PREVIEW_ZONE',
      'GITHUB_CLIENT_ID',
      'GITHUB_APP_SLUG',
      'BOAT_ORG_ID',
      'OPERATOR_GITHUB_IDS',
      'GITHUB_APP_PRIVATE_KEY',
      'GITHUB_WEBHOOK_SECRET',
      'SESSION_SIGNING_KEY',
      'BOAT_KEY_ENCRYPTION_KEY',
      'BOAT_API_KEY',
    ],
    message:
      'Missing preview settings: CLOUDFLARE_ACCOUNT_ID, PREVIEW_ZONE, GITHUB_CLIENT_ID, GITHUB_APP_SLUG, BOAT_ORG_ID, OPERATOR_GITHUB_IDS, GITHUB_APP_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET, SESSION_SIGNING_KEY, BOAT_KEY_ENCRYPTION_KEY, BOAT_API_KEY.',
  })
})

it('separates complete settings into public variables and six unchanged secrets', () => {
  const environment = previewEnvironment()
  for (const frameSources of [undefined, 'https://frames.example']) {
    expect(
      checkSettings({ ...environment, CONDUCTIVE_FRAME_SOURCES: frameSources }),
    ).toEqual({
      kind: 'ready',
      settings: {
        accountId: '0123456789abcdef0123456789abcdef',
        apiToken: 'fake-cloudflare-token',
        zone: 'preview.example',
        variables: {
          GITHUB_CLIENT_ID: 'fake-github-client',
          GITHUB_APP_SLUG: 'conductive-preview-test',
          BOAT_ORG_ID: 'fake-preview-org',
          OPERATOR_GITHUB_IDS: '123,456',
          ...(frameSources === undefined
            ? {}
            : { CONDUCTIVE_FRAME_SOURCES: frameSources }),
        },
        secrets: {
          GITHUB_CLIENT_SECRET: 'fake-client-secret',
          GITHUB_APP_PRIVATE_KEY: 'fake-private-key\nsecond line\n',
          GITHUB_WEBHOOK_SECRET: 'fake-webhook-secret',
          SESSION_SIGNING_KEY: 'fake-signing-key',
          BOAT_KEY_ENCRYPTION_KEY: 'fake-encryption-key',
          BOAT_API_KEY: 'fake-boat-key',
        },
      },
    })
  }
})
