import { expect, it } from 'vitest'

import { MACHINE_PATHS, TOOL_TURN_HEADER } from '../../src/shared/agent-tools'

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

it('provides a fresh token to the GitHub CLI without requiring a turn or storing it', async () => {
  const launcher = await credentialLauncher(
    `globalThis.fetch = async (url, options) => {
      const request = new Request(url, options)
      process.stderr.write(JSON.stringify({
        turnId: request.headers.get(${JSON.stringify(TOOL_TURN_HEADER)}),
        authorization: request.headers.get('Authorization'),
      }))
      return Response.json({ token: 'fresh-terminal-token' })
    }`,
    {
      CONDUCTIVE_MACHINE_ORIGIN: 'https://machine.conductive.test',
      CONDUCTIVE_TURN_ID: 'stale-saved-turn',
      WORKSPACE_TOKEN: 'workspace-token',
    },
  )
  try {
    const before = await launcher.files()
    const result = await launcher.run('', '', ['token'])
    expect(result.exitCode, result.stderr).toBe(0)
    expect(result.stdout).toBe('fresh-terminal-token\n')
    expect(JSON.parse(result.stderr)).toEqual({
      turnId: null,
      authorization: 'Bearer workspace-token',
    })
    expect(await launcher.files()).toEqual(before)
  } finally {
    await launcher.dispose()
  }
})

it('explains each GitHub access failure with the Worker message or one fixed fallback', async () => {
  const launcher = await credentialLauncher(
    `globalThis.fetch = async (url, options) => {
      const turn = new Request(url, options).headers.get(${JSON.stringify(TOOL_TURN_HEADER)})
      if (turn === 'offline') throw new TypeError('fetch failed')
      const message = turn === 'unsafe'
        ? 'Sign in again\\u001b[2J'
        : 'Start an agent turn to use GitHub access.'
      return Response.json(
        { error: { code: 'current_turn_required', message } },
        { status: 409 },
      )
    }`,
    {
      CONDUCTIVE_MACHINE_ORIGIN: 'https://machine.conductive.test',
      WORKSPACE_TOKEN: 'workspace-token',
    },
  )
  const input = 'protocol=https\nhost=github.com\n\n'
  try {
    const cases = [
      {
        turn: '',
        stderr:
          'Git gets GitHub access in an agent turn. Ask an agent to run this command.\n',
      },
      {
        turn: 'ended-turn',
        stderr: 'Start an agent turn to use GitHub access.\n',
      },
      { turn: 'unsafe', stderr: 'GitHub access failed. Try again.\n' },
      { turn: 'offline', stderr: 'GitHub access failed. Try again.\n' },
    ]
    for (const { turn, stderr } of cases) {
      const result = await launcher.run(turn, input)
      expect({ turn, ...result }).toEqual({
        turn,
        exitCode: 1,
        stdout: '',
        stderr,
        timedOut: false,
      })
    }
  } finally {
    await launcher.dispose()
  }
})
