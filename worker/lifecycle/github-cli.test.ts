import { expect, it } from 'vitest'

import { credentialLauncher } from './credential-launcher-test-support'

it('authenticates each GitHub CLI invocation afresh and preserves arguments, input, and exit status', async () => {
  const launcher = await credentialLauncher(
    `globalThis.fetch = async (url, options) => {
      const turn = new Request(url, options).headers.get('X-Conductive-Turn-Id')
      return Response.json({ token: turn ? 'agent-github-token' : 'owner-github-token' })
    }`,
    {
      CONDUCTIVE_MACHINE_ORIGIN: 'https://machine.conductive.test',
      CONDUCTIVE_TURN_ID: 'stale-saved-turn',
      WORKSPACE_TOKEN: 'workspace-token',
    },
  )
  try {
    const before = await launcher.files()
    const args = [
      'issue',
      'create',
      '--title',
      "A title's text",
      '--body-file',
      '-',
    ]
    const terminal = await launcher.runGitHub('', args, 'An issue body\n')
    expect(terminal.exitCode, terminal.stderr).toBe(7)
    expect(JSON.parse(terminal.stdout)).toEqual({
      args,
      token: 'owner-github-token',
      input: 'An issue body\n',
    })
    const agent = await launcher.runGitHub('current-turn', ['pr', 'list'])
    expect(agent.exitCode, agent.stderr).toBe(7)
    expect(JSON.parse(agent.stdout)).toEqual({
      args: ['pr', 'list'],
      token: 'agent-github-token',
      input: '',
    })
    const version = await launcher.runGitHub('', ['--version'])
    expect(JSON.parse(version.stdout)).toEqual({
      args: ['--version'],
      token: null,
      input: '',
    })
    const supplied = await launcher.runGitHub('', ['issue', 'list'], '', {
      GITHUB_TOKEN: 'user-supplied-token',
    })
    expect(JSON.parse(supplied.stdout)).toEqual({
      args: ['issue', 'list'],
      token: 'user-supplied-token',
      input: '',
    })
    expect(await launcher.files()).toEqual(before)
  } finally {
    await launcher.dispose()
  }
})

it('stops the GitHub CLI when authentication fails and keeps credentials out of errors', async () => {
  const launcher = await credentialLauncher(
    `globalThis.fetch = async () => Response.json(
      { token: 'must-stay-private' }, { status: 401 },
    )`,
    {
      CONDUCTIVE_MACHINE_ORIGIN: 'https://machine.conductive.test',
      WORKSPACE_TOKEN: 'workspace-token',
    },
  )
  try {
    const result = await launcher.runGitHub('', ['issue', 'list'])
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      'GitHub access failed. Check the current turn and sign in again.\n',
    )
  } finally {
    await launcher.dispose()
  }
})
