import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { TOOL_ENV } from '../../../tools/context'
import {
  commitAuthorEnvironment,
  type CommitAuthor,
} from '../../../src/shared/commit-author'
import type { WorkspaceToolContext } from './workspace-tools'

export async function prepareProviderHome(home: string): Promise<void> {
  await Promise.all(
    ['claude', 'codex'].map((name) =>
      mkdir(join(home, '.conductive', name), { recursive: true, mode: 0o700 }),
    ),
  )
}

/** The inherited environment without provider settings, with the shared provider homes. */
export function agentEnvironment(
  home: string,
): Record<string, string | undefined> {
  const env = { ...process.env }
  delete env.CONDUCTIVE_MEASURE_LOGIN
  for (const key of Object.keys(env)) {
    if (/^(ANTHROPIC_|CLAUDE_|CLAUDECODE$|OPENAI_|CODEX_)/.test(key))
      delete env[key]
  }
  env.HOME = home
  env.CLAUDE_CONFIG_DIR = `${home}/.conductive/claude`
  env.CODEX_HOME = `${home}/.conductive/codex`
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1'
  env.DISABLE_AUTOUPDATER = '1'
  return env
}

/** Provider credentials never enter the inherited environment. */
export function providerEnvironment(
  home: string,
  tools: WorkspaceToolContext,
  author: CommitAuthor | null,
): Record<string, string | undefined> {
  const env = agentEnvironment(home)
  env[TOOL_ENV.machineOrigin] = tools.machineOrigin
  env[TOOL_ENV.workspaceToken] = tools.workspaceToken
  env[TOOL_ENV.turnId] = tools.turnId
  if (author) Object.assign(env, commitAuthorEnvironment(author))
  return env
}
