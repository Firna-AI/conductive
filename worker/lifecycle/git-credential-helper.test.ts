import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { TOOL_TURN_HEADER } from '../../tools/context'
import { credentialLauncher } from './credential-launcher-test-support'

it('sends the credential turn header with no request body through the installed launcher', async () => {
  const preload = `
globalThis.fetch = async (url, options) => {
  const request = new Request(url, options)
  process.stderr.write(JSON.stringify({
    url: request.url,
    method: request.method,
    authorization: request.headers.get('Authorization'),
    turnId: request.headers.get(${JSON.stringify(TOOL_TURN_HEADER)}),
    contentType: request.headers.get('Content-Type'),
    body: request.body === null,
    redirect: request.redirect,
  }))
  return Response.json({ token: 'fresh-github-token' })
}
`
  const launcher = await credentialLauncher(preload, {
    CONDUCTIVE_MACHINE_ORIGIN: 'https://machine.conductive.test',
    CONDUCTIVE_TURN_ID: 'stale-saved-turn',
    WORKSPACE_TOKEN: 'workspace-token',
  })
  try {
    const before = await launcher.files()
    const result = await launcher.run(
      'current-turn',
      'protocol=https\nhost=github.com\n\n',
    )
    expect(result.exitCode, result.stderr).toBe(0)
    expect(result.stdout).toBe(
      'username=x-access-token\npassword=fresh-github-token\n\n',
    )
    expect(JSON.parse(result.stderr)).toEqual({
      url: `https://machine.conductive.test${MACHINE_PATHS.gitCredential}`,
      method: 'POST',
      authorization: 'Bearer workspace-token',
      turnId: 'current-turn',
      contentType: null,
      body: true,
      redirect: 'error',
    })
    const after = await launcher.files()
    expect(after).toEqual(before)
    expect(Object.values(after).join('\n')).not.toContain('fresh-github-token')
  } finally {
    await launcher.dispose()
  }
})
