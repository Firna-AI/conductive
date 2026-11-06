import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { TOOL_TURN_HEADER } from '../../tools/context'
import { imageTestProcess } from '../tools/image-test-process'

it('sends the credential turn header with no request body', async () => {
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
  const result = await imageTestProcess(
    process.execPath,
    [
      '--import',
      `data:text/javascript,${encodeURIComponent(preload)}`,
      fileURLToPath(
        new URL('../../image/git-credential-helper.mjs', import.meta.url).href,
      ),
      'get',
    ],
    'protocol=https\nhost=github.com\n\n',
    {
      CONDUCTING_MACHINE_ORIGIN: 'https://machine.conducting.test',
      CONDUCTING_TURN_ID: 'current-turn',
      WORKSPACE_TOKEN: 'workspace-token',
    },
  )
  expect(result.exitCode, result.stderr).toBe(0)
  expect(result.stdout).toBe(
    'username=x-access-token\npassword=fresh-github-token\n\n',
  )
  expect(JSON.parse(result.stderr)).toEqual({
    url: `https://machine.conducting.test${MACHINE_PATHS.gitCredential}`,
    method: 'POST',
    authorization: 'Bearer workspace-token',
    turnId: 'current-turn',
    contentType: null,
    body: true,
    redirect: 'error',
  })
})
