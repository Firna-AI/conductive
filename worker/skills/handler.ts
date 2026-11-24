import type { SkillReadOutcome } from '../../src/shared/generated/SkillReadOutcome'
import { isSkillName, type SkillIdentity } from '../../src/shared/skills'
import type { WorkspaceChat } from '../chat/backend'
import type { AppEnv } from '../env'
import { filesWorkspace } from '../files/access'
import { errorResponse, HttpError, privateResponse } from '../http'
import { gate } from '../security/gate'
import { filterSkillText } from './output'
import { SkillTooLargeError } from './runner'

function skillIdentity(query: URLSearchParams): SkillIdentity {
  const agent = query.get('agent')
  const name = query.get('name')
  if (
    (agent !== 'claude' && agent !== 'codex') ||
    name === null ||
    !isSkillName(name)
  )
    throw new HttpError(400, 'invalid_input', 'Choose a skill to open.')
  return { agent, name }
}

export function createSkillHandler(
  env: AppEnv,
  chat: WorkspaceChat,
  now: () => number,
) {
  return async (request: Request, workspaceId: string): Promise<Response> => {
    try {
      const context = await gate(request, env, now())
      if (request.method !== 'GET' || request.headers.has('Upgrade'))
        throw new HttpError(404, 'not_found', 'The page is not available.')
      const workspace = await filesWorkspace(env, context, workspaceId)
      const skill = skillIdentity(new URL(request.url).searchParams)
      if (workspace.state === 'stopped')
        throw new HttpError(
          503,
          'computer_stopped',
          'Resume the cloud computer to open this skill.',
        )
      if (workspace.state === 'starting')
        throw new HttpError(
          503,
          'computer_starting',
          'The cloud computer is starting.',
        )
      const text = await chat.runner.connections.readSkill(
        skill,
        request.signal,
      )
      return privateResponse(
        Response.json({
          text: await filterSkillText(env, chat.store, workspace, text),
        } satisfies Pick<Extract<SkillReadOutcome, { ok: true }>, 'text'>),
      )
    } catch (error) {
      return privateResponse(
        error instanceof SkillTooLargeError
          ? error.response()
          : errorResponse(error, request),
      )
    }
  }
}
