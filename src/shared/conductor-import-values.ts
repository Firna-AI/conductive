export class ImportContractError extends Error {
  constructor() {
    super('The import data is not valid.')
  }
}

export function importObject(value: unknown): Record<string, unknown> {
  if (!isImportObject(value)) throw new ImportContractError()
  return value
}

function isImportObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function importText(value: unknown): string {
  if (typeof value !== 'string' || !value.length || value.includes('\0'))
    throw new ImportContractError()
  return value
}

export function importNullableText(value: unknown): string | null {
  return value === null ? null : importText(value)
}

export function importInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new ImportContractError()
  return value
}

export function importList(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new ImportContractError()
  return value
}

export function importHash(value: unknown): string {
  const result = importText(value)
  if (!/^[a-f0-9]{64}$/.test(result)) throw new ImportContractError()
  return result
}

export function importOid(value: unknown): string {
  const result = importText(value)
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(result))
    throw new ImportContractError()
  return result
}

export function importNativeId(value: unknown): string {
  const id = importText(value)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new ImportContractError()
  return id
}

export function importRepositoryName(value: unknown): string {
  const remote = importText(value)
  const match = remote.match(
    /^(?:(?:https:\/\/github\.com\/)|(?:git@github\.com:)|(?:ssh:\/\/git@github\.com\/))?([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i,
  )
  if (!match) throw new ImportContractError()
  return match[1].toLowerCase()
}

export function importPath(value: unknown): string {
  const path = importText(value)
  if (
    path.startsWith('/') ||
    path
      .split('/')
      .some(
        (part) =>
          !part || part === '.' || part === '..' || /^\.git$/i.test(part),
      )
  )
    throw new ImportContractError()
  return path
}

export function importBranch(value: unknown): string {
  const branch = importText(value)
  if (
    branch.startsWith('-') ||
    branch === '@' ||
    [...branch].some(
      (character) =>
        character.charCodeAt(0) <= 32 ||
        character.charCodeAt(0) === 127 ||
        '~^:?*[\\'.includes(character),
    ) ||
    branch.includes('..') ||
    branch.includes('@{') ||
    branch
      .split('/')
      .some(
        (part) =>
          !part ||
          part.startsWith('.') ||
          part.endsWith('.') ||
          part.endsWith('.lock'),
      )
  )
    throw new ImportContractError()
  return branch
}
