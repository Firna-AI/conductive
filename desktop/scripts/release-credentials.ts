export function readReleaseCredentials(environment: NodeJS.ProcessEnv) {
  if (environment.GITHUB_EVENT_NAME?.startsWith('pull_request'))
    throw new Error('A pull request cannot use release credentials')
  const required = (name: string) => {
    const value = environment[name]
    if (!value?.trim()) throw new Error(`Missing release credential: ${name}`)
    return value
  }
  const decode = (name: string) => {
    const value = required(name).trim()
    const bytes = Buffer.from(value, 'base64')
    if (!bytes.length || bytes.toString('base64') !== value)
      throw new Error(`Invalid base64 in ${name}`)
    return bytes
  }
  const certificate = decode('CSC_LINK')
  const password = required('CSC_KEY_PASSWORD')
  const apiKey = decode('APPLE_API_KEY')
  if (
    !/^-----BEGIN PRIVATE KEY-----\r?\n[\s\S]+-----END PRIVATE KEY-----\s*$/.test(
      apiKey.toString('utf8'),
    )
  )
    throw new Error(
      'APPLE_API_KEY must contain a base64-encoded private API key',
    )
  const keyId = required('APPLE_API_KEY_ID').trim()
  if (!/^[A-Z0-9]{10}$/.test(keyId)) throw new Error('Invalid APPLE_API_KEY_ID')
  const issuer = required('APPLE_API_ISSUER').trim()
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(issuer))
    throw new Error('Invalid APPLE_API_ISSUER')
  const teamId = required('CONDUCTIVE_APPLE_TEAM_ID').trim()
  if (!/^[A-Z0-9]{10}$/.test(teamId))
    throw new Error('Invalid CONDUCTIVE_APPLE_TEAM_ID')
  return { certificate, password, apiKey, keyId, issuer, teamId }
}
