import { spawn } from 'node:child_process'
import { Writable } from 'node:stream'

import type {
  SpawnedProcess,
  SpawnOptions,
} from '@anthropic-ai/claude-agent-sdk'

import type { RunnerLogin } from '../../../src/shared/runner'
import type { ProviderLifetime } from './lifetime'

export function spawnClaudeProcess(
  request: SpawnOptions,
  login: RunnerLogin,
  lifetime: ProviderLifetime,
): SpawnedProcess {
  const descriptor =
    login.kind === 'token'
      ? 'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR'
      : 'CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR'
  const child = spawn(request.command, request.args, {
    cwd: request.cwd,
    env: { ...request.env, [descriptor]: '3' },
    stdio: ['pipe', 'pipe', 'ignore', 'pipe'],
  })
  const exited = lifetime.register(child)
  const credential = child.stdio[3]
  const { stdin, stdout } = child
  if (!stdin || !stdout || !(credential instanceof Writable)) {
    void lifetime.close()
    throw new Error('The agent login pipe is unavailable.')
  }
  credential.once('error', () => {
    credential.destroy()
    void lifetime.close()
  })
  credential.once('finish', () => credential.destroy())
  void exited.then(() => credential.destroy())
  try {
    credential.end(`${login.secret}\n`)
  } catch (error) {
    credential.destroy()
    void lifetime.close()
    throw error
  }
  return Object.assign(child, { stdin, stdout })
}
