import type {
  FirstWorkspaceMessage,
  WorkspaceRuntime,
} from '../lifecycle/workspace-runtime'
import { readAgentLogin } from '../chat/queries'
import { HttpError } from '../http'
import { createWorkspace } from '../lifecycle/workspaces'
import { freshGitHubUserToken } from '../security/github-tokens'
import { readRoutine } from './routine-data'
import { runAdmission, runCreationAttempt } from './run-admission-data'
import { finishRoutineRun } from './run-outcome-data'
import {
  attachRunWorkspace,
  skipRoutineRun,
  storedRoutineRun,
} from './run-record-data'
import { routineRunText } from './run-text'

export interface RoutineRunRuntime extends WorkspaceRuntime {
  acceptFirstMessage(first: FirstWorkspaceMessage): Promise<unknown>
}

export async function startRoutineRun(
  runtime: RoutineRunRuntime,
  orgId: string,
  runId: string,
): Promise<void> {
  const { env, dependencies } = runtime
  const run = await storedRoutineRun(env.DB, orgId, runId)
  if (!run || run.state !== 'queued') return
  let routine = await readRoutine(env.DB, orgId, run.routineId)
  let admission = await runAdmission(env.DB, routine, run)
  if ('code' in admission) {
    await skipRoutineRun(env.DB, orgId, runId, admission, dependencies.now())
    return
  }
  try {
    const attempt = await runCreationAttempt(env.DB, run)
    if (attempt?.state === 'failed') {
      await finishRoutineRun(
        env.DB,
        orgId,
        runId,
        {
          state: 'failed',
          error: {
            code: attempt.errorCode ?? 'workspace_start_failed',
            message:
              attempt.errorMessage ??
              'The cloud computer could not start. Try again.',
          },
        },
        dependencies.now(),
        attempt.id,
      )
      return
    }
    if (!attempt) {
      if (
        !(await readAgentLogin(env, admission.owner.id, routine.choice.agent))
      )
        throw new HttpError(
          409,
          'agent_login_required',
          `Connect ${routine.choice.agent === 'claude' ? 'Claude' : 'Codex'} to run this routine.`,
        )
      await freshGitHubUserToken(env, admission.owner.id, dependencies)
    }
    routine = await readRoutine(env.DB, orgId, run.routineId)
    admission = await runAdmission(env.DB, routine, run)
    if ('code' in admission) {
      await skipRoutineRun(env.DB, orgId, runId, admission, dependencies.now())
      return
    }
    const created = await createWorkspace(
      runtime,
      orgId,
      admission.owner,
      {
        repositoryId: routine.repositoryId,
        sectionId: routine.sectionId,
        firstMessage: {
          id: run.messageId,
          text: routineRunText(routine, run.trigger),
          attachmentIds: [],
          choice: routine.choice,
        },
      },
      admission.owner,
    )
    await runtime.acceptFirstMessage(created.first)
    await attachRunWorkspace(
      env.DB,
      orgId,
      runId,
      created.workspace.id,
      dependencies.now(),
    )
  } catch (error) {
    await finishRoutineRun(
      env.DB,
      orgId,
      runId,
      {
        state: 'failed',
        error:
          error instanceof HttpError
            ? { code: error.code, message: error.message }
            : {
                code: 'workspace_start_failed',
                message: 'The cloud computer could not start. Try again.',
              },
      },
      dependencies.now(),
    )
  }
}
