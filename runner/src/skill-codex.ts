import { array, boolean, object, string } from './parse'
import { codexBinary } from './providers/binaries'
import { agentEnvironment, prepareProviderHome } from './providers/environment'
import { ProviderLifetime } from './providers/lifetime'
import type { StartProcess } from './providers/process'
import { JsonRpc } from './providers/rpc'
import type { FoundSkill } from './skill-read'

/** How long the Codex app server may take to start and list its skills. */
export const CODEX_SKILLS_TIMEOUT_MS = 5_000

export interface CodexSkillsRequest {
  home: string
  repository: string
  start: StartProcess
  timeoutMs: number
}

/**
 * Starts a Codex app server with the shared Codex home, asks it for the
 * enabled skills of the repository, and closes it. It needs no login.
 * It rejects when the server gives no answer in time.
 */
export async function listCodexSkills(
  request: CodexSkillsRequest,
): Promise<FoundSkill[]> {
  await prepareProviderHome(request.home)
  const lifetime = new ProviderLifetime()
  const env = agentEnvironment(request.home)
  for (const key of Object.keys(env))
    if (key.startsWith('CONDUCTIVE_')) delete env[key]
  let rpc: JsonRpc
  try {
    rpc = new JsonRpc(
      request.start({
        command: process.execPath,
        args: [
          codexBinary(),
          'app-server',
          '-c',
          'cli_auth_credentials_store="ephemeral"',
        ],
        cwd: request.repository,
        env,
        lifetime,
      }),
      () => {},
      () => {},
    )
  } catch (error) {
    await lifetime.close()
    throw error
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      ask(rpc, request.repository),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('The Codex app server did not answer.')),
          request.timeoutMs,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
    await rpc.close().finally(() => lifetime.close())
  }
}

async function ask(rpc: JsonRpc, repository: string): Promise<FoundSkill[]> {
  await rpc.request('initialize', {
    clientInfo: { name: 'conductive', title: 'Conductive', version: '0.1.0' },
    capabilities: { experimentalApi: true },
  })
  rpc.notify('initialized')
  const answer = object(
    await rpc.request('skills/list', { cwds: [repository], forceReload: true }),
  )
  return array(answer.data, object).flatMap((entry) =>
    array(entry.skills, skill).flat(),
  )
}

/** Keeps an enabled skill. An item of another shape is left out. */
function skill(value: unknown): FoundSkill[] {
  try {
    const input = object(value)
    if (!boolean(input.enabled)) return []
    return [
      {
        name: string(input.name),
        description: string(input.description),
        path: string(input.path),
      },
    ]
  } catch {
    return []
  }
}
