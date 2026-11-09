import { HttpError, isRecord } from '../http'

export type OrgEnvironment = Record<string, { value: string; secret: boolean }>

export function parseOrgEnvironment(value: unknown): OrgEnvironment {
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([name, entry]) => {
        if (typeof entry === 'string')
          return [name, { value: entry, secret: true }]
        if (
          isRecord(entry) &&
          typeof entry.value === 'string' &&
          typeof entry.secret === 'boolean'
        )
          return [name, { value: entry.value, secret: entry.secret }]
        throw unavailableEnvironment()
      }),
    )
  }
  throw unavailableEnvironment()
}

export function environmentValues(
  environment: OrgEnvironment,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(environment).map(([name, entry]) => [name, entry.value]),
  )
}

export function environmentSecrets(environment: OrgEnvironment): string[] {
  return Object.values(environment)
    .filter((entry) => entry.secret)
    .map((entry) => entry.value)
}

function unavailableEnvironment(): HttpError {
  return new HttpError(
    409,
    'org_environment_unavailable',
    'The cloud computer settings could not load. Ask an org admin to save them again.',
  )
}
