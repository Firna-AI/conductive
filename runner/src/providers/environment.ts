import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { RunnerLogin } from '../../../src/shared/runner'

export async function prepareProviderHome(home: string): Promise<void> {
  await Promise.all(
    ['claude', 'codex'].map((name) =>
      mkdir(join(home, '.conducting', name), { recursive: true, mode: 0o700 }),
    ),
  )
}

/** Remove inherited provider accounts before adding exactly one sender's login. */
export function providerEnvironment(
  home: string,
  login?: RunnerLogin,
): Record<string, string | undefined> {
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (/^(ANTHROPIC_|CLAUDE_|CLAUDECODE$|OPENAI_|CODEX_)/.test(key))
      delete env[key]
  }
  env.HOME = home
  env.CLAUDE_CONFIG_DIR = `${home}/.conducting/claude`
  env.CODEX_HOME = `${home}/.conducting/codex`
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1'
  env.DISABLE_AUTOUPDATER = '1'
  if (login?.agent === 'claude')
    env[
      login.kind === 'token' ? 'CLAUDE_CODE_OAUTH_TOKEN' : 'ANTHROPIC_API_KEY'
    ] = login.secret
  if (login?.agent === 'codex') env.OPENAI_API_KEY = login.secret
  return env
}
