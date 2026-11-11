export function object(
  value: unknown,
  path: string,
  problems: string[],
): Record<string, unknown> {
  if (isObject(value)) return value
  problems.push(`${path} must be an object.`)
  return {}
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function list(
  value: unknown,
  path: string,
  problems: string[],
): unknown[] {
  if (Array.isArray(value)) return value
  problems.push(`${path} must be an array.`)
  return []
}

export function text(value: unknown, path: string, problems: string[]): string {
  if (typeof value === 'string') return value
  problems.push(`${path} must be a string.`)
  return ''
}

export function texts(
  value: unknown,
  path: string,
  problems: string[],
): string[] {
  return list(value, path, problems).map((item, index) =>
    text(item, `${path}[${index}]`, problems),
  )
}

export function onlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  problems: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) problems.push(`${path}.${key} is not allowed.`)
  }
}

export function fixed(
  value: unknown,
  expected: string | boolean,
  path: string,
  problems: string[],
): void {
  if (value !== expected) problems.push(`${path} must be ${expected}.`)
}
