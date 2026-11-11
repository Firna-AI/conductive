import type { AppEnv } from '../env'

export function reportingEnvironment(
  databaseFailure = new Error('private database failure'),
): AppEnv {
  const unused = (): never => {
    throw databaseFailure
  }
  return {
    DB: {
      prepare: unused,
      batch: unused,
      exec: unused,
      withSession: unused,
      dump: unused,
    },
    APP_ORIGIN: 'https://app.conductive.build',
    MACHINE_ORIGIN: 'https://api.conductive.build',
    MARKETING_ORIGIN: 'https://conductive.build',
    PREVIEW_DOMAIN: 'conductive.page',
    GITHUB_CLIENT_ID: 'test-client',
    GITHUB_CLIENT_SECRET: 'test-secret',
    SESSION_SIGNING_KEY: btoa('s'.repeat(32)),
    BOAT_API_KEY: 'test-key',
    BOAT_ORG_ID: 'test-org',
    BOAT_KEY_ENCRYPTION_KEY: btoa('e'.repeat(32)),
  }
}
