import type {
  FirstWorkspaceMessage,
  WorkspaceRuntime,
} from '../lifecycle/workspace-runtime'
import { resolveDefaultLogin } from '../chat/default-login'
import { HttpError } from '../http'
import { createWorkspace } from '../lifecycle/workspaces'
import { freshGitHubUserToken } from '../security/github-tokens'
import { warnWorker } from '../warnings'
import { readAutomation } from './automation-data'
import { readAutomationCapabilities } from './automation-capabilities-data'
import { runAdmission, runCreationAttempt } from './run-admission-data'
import { recordRunChoice } from './run-choice-data'
import { finishAutomationRun } from './run-outcome-data'
import {
  attachRunWorkspace,
  skipAutomationRun,
  storedAutomationRun,
} from './run-record-data'
import { automationRunText } from './run-text'

export interface AutomationRunRuntime extends WorkspaceRuntime {
  acceptFirstMessage(first: FirstWorkspaceMessage): Promise<unknown>
}

export async function startAutomationRun(
  runtime: AutomationRunRuntime,
  orgId: string,
  runId: string,
): Promise<void> {
  const { env, dependencies } = runtime
  const run = await storedAutomationRun(env.DB, orgId, runId)
  if (!run || run.state !== 'queued') return
  try {
    const attempt = await runCreationAttempt(env.DB, run)
    if (attempt?.state === 'failed') {
      await finishAutomationRun(
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
    let automation = await readAutomation(env.DB, orgId, run.automationId)
    const choice =
      run.choice ??
      (await recordRunChoice(env.DB, orgId, runId, automation.choice))
    let admission = attempt
      ? { owner: attempt.owner }
      : await runAdmission(env.DB, automation, run)
    if ('code' in admission) {
      await skipAutomationRun(
        env.DB,
        orgId,
        runId,
        admission,
        dependencies.now(),
      )
      return
    }
    if (!attempt) {
      if (
        !(await resolveDefaultLogin(
          env,
          { orgId },
          admission.owner.id,
          choice.agent,
        ))
      )
        throw new HttpError(
          409,
          'agent_login_required',
          `Connect ${choice.agent === 'claude' ? 'Claude' : 'Codex'} to run this automation.`,
        )
      await freshGitHubUserToken(env, admission.owner.id, dependencies)
      automation = await readAutomation(env.DB, orgId, run.automationId)
      admission = await runAdmission(env.DB, automation, run)
      if ('code' in admission) {
        await skipAutomationRun(
          env.DB,
          orgId,
          runId,
          admission,
          dependencies.now(),
        )
        return
      }
    }
    const create = async () =>
      createWorkspace(
        runtime,
        orgId,
        admission.owner,
        {
          repositoryId: automation.repositoryId,
          sectionId: automation.sectionId,
          capabilities: {
            ...(await readAutomationCapabilities(env.DB, orgId, automation.id)),
            macAccess: false,
          },
          firstMessage: {
            id: run.messageId,
            text: automationRunText(automation, run.trigger),
            attachmentIds: [],
            choice,
          },
        },
        admission.owner,
        run.trigger.kind === 'pull-request'
          ? {
              branch:
                run.trigger.event === 'merged'
                  ? run.trigger.baseBranch
                  : run.trigger.headBranch,
              startSha:
                run.trigger.event === 'merged'
                  ? undefined
                  : run.trigger.headSha,
            }
          : undefined,
      )
    let created: Awaited<ReturnType<typeof createWorkspace>>
    try {
      created = await create()
    } catch (error) {
      if (!(error instanceof HttpError) || error.code !== 'secret_not_found')
        throw error
      created = await create()
    }
    await runtime.acceptFirstMessage(created.first)
    await attachRunWorkspace(
      env.DB,
      orgId,
      runId,
      created.workspace.id,
      dependencies.now(),
    )
  } catch (error) {
    const attempt = await runCreationAttempt(env.DB, run)
    if (attempt && attempt.state !== 'failed') {
      warnWorker({ kind: 'automation_queued_start_failed' })
      return
    }
    await finishAutomationRun(
      env.DB,
      orgId,
      runId,
      {
        state: 'failed',
        error: attempt
          ? {
              code: attempt.errorCode ?? 'workspace_start_failed',
              message:
                attempt.errorMessage ??
                'The cloud computer could not start. Try again.',
            }
          : error instanceof HttpError
            ? { code: error.code, message: error.message }
            : {
                code: 'workspace_start_failed',
                message: 'The cloud computer could not start. Try again.',
              },
      },
      dependencies.now(),
      attempt?.id,
    )
  }
}
