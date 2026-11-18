/** The characters that a new org secret name can use. */
export function validSecretName(name: string): boolean {
  return name.length > 0 && !/[^A-Za-z0-9_]/u.test(name)
}

/** The field error for a new org secret name. */
export const SECRET_NAME_ERROR = 'Use only letters, digits, and underscores.'
