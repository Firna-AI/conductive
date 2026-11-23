import { sessionsPath } from '../../src/shared/sessions'
import {
  workspaceEventsPath,
  type WorkspaceSocketMessage,
} from '../../src/shared/events'
import { githubSummary } from '../../src/shared/github'
import { array } from '../chat/agent-events'
import { record, string } from '../chat/inputs'
import { createSession } from '../chat/sessions'
import { chatDependencies } from '../chat/dependencies'
import { sessionUser } from '../data/users'
import { createHarness, TEST_ORIGIN } from '../test-support/harness'
import type { NativeWorkspaceOptions } from '../test-support/native-workspace-api'
import { saveWorkspaceGitHubSummary } from './summary-data'
import { seedGitHubSQLite } from './sqlite-seed.test-support'
import {
  SQLITE_CHOICE,
  SQLITE_TIME,
  SQLITE_WORKSPACE_ID,
  sqliteSnapshot,
  sqlitePullSnapshot,
} from './sqlite-fixtures.test-support'

export async function createGitHubSQLiteHarness() {
  const base = await createHarness()
  const headers = await seedGitHubSQLite(base)
  const options: NativeWorkspaceOptions = { idFallback: 'first-session' }
  const actor = base.native.actor(SQLITE_WORKSPACE_ID, options)
  const messages: WorkspaceSocketMessage[] = []
  const staged: unknown[] = []
  let tabs: string[] = []
  let reads = 0
  let now = SQLITE_TIME
  let failReceipt = false
  let interleave = false
  const takeMessages = async () => {
    for (const tab of tabs)
      for (const message of (await actor.api.peers.take(tab)).messages)
        if (message.type === 'event' || message.type === 'history')
          messages.push(message)
  }
  options.hooks = {
    beforeCommit: async (commit) => {
      if (
        failReceipt &&
        commit.writes.some((key) => key.startsWith('github:delivery:'))
      )
        throw new Error('Injected receipt write failure')
      const snapshot = await commit.storage.get('github:state')
      if (snapshot === undefined) return
      await takeMessages()
      staged.push({
        snapshot,
        records: [...(await commit.storage.list({ prefix: '' }))].filter(
          ([key]) => !key.startsWith('__test:'),
        ),
        messages: structuredClone(messages),
      })
      if (interleave) {
        interleave = false
        await actor.api.controls.enqueueWorkspaceChange(
          SQLITE_WORKSPACE_ID,
          async (transaction) => {
            const startedBy = await sessionUser(base.env.DB, 'session', now)
            if (!startedBy) throw new Error('The fixture session is missing.')
            return createSession(
              transaction,
              SQLITE_CHOICE,
              'interleaved',
              startedBy,
              chatDependencies(
                base.env,
                () => SQLITE_WORKSPACE_ID,
                actor.api.storage,
              ),
            )
          },
        )
      }
    },
  }
  await actor.configure(options)
  const request = async (path: string, body?: unknown): Promise<Response> => {
    const url = new URL(path, TEST_ORIGIN)
    try {
      if (url.pathname === '/access-race') {
        const result = await actor.api.github.accessRace(
          url.searchParams.get('operation') === 'replay',
        )
        return Response.json(result.body, { status: result.status })
      }
      if (url.pathname === '/observe') {
        const tab = `sqlite-tab-${tabs.length}`
        await actor.api.peers.openBrowser(tab, {
          url: `${TEST_ORIGIN}${workspaceEventsPath('org', SQLITE_WORKSPACE_ID)}`,
          headers,
        })
        tabs.push(tab)
        return new Response(null, { status: 204 })
      }
      if (url.pathname === '/refresh') {
        now = Number(url.searchParams.get('time') ?? SQLITE_TIME)
        await actor.api.controls.setTime(now)
        failReceipt = url.searchParams.has('fail-receipt')
        interleave = url.searchParams.has('interleave')
        const deliveryId = url.searchParams.get('delivery')
        const snapshot = await actor.api.github.refresh(
          async () => {
            reads++
            if (url.searchParams.has('forbid-read'))
              throw new Error('Replay read GitHub')
            return url.searchParams.has('pull-request')
              ? sqlitePullSnapshot()
              : sqliteSnapshot()
          },
          async () => undefined,
          deliveryId === null ? {} : { deliveryId },
          (committed) =>
            saveWorkspaceGitHubSummary(
              base.env.DB,
              {
                id: SQLITE_WORKSPACE_ID,
                orgId: 'org',
                branch: 'owner/workspace',
                repositoryId: 10,
                fullName: 'owner/repo',
                defaultBranch: 'main',
                installationId: 10,
              },
              githubSummary(committed.banner),
            ),
        )
        await actor.api.controls.drainBackground()
        return Response.json({ snapshot })
      }
      return actor.fetch(
        new Request(url, {
          headers,
          ...(body === undefined
            ? {}
            : {
                method: 'POST',
                body: JSON.stringify(body),
              }),
        }),
      )
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      )
    }
  }
  return {
    db: base.env.DB,
    request,
    async inspect() {
      await takeMessages()
      return {
        records: [...(await actor.api.controls.snapshot()).records],
        messages: structuredClone(messages),
        staged: structuredClone(staged),
        reads,
      }
    },
    createSession: () =>
      request(sessionsPath('org', SQLITE_WORKSPACE_ID), {
        choice: SQLITE_CHOICE,
      }),
    evict: async () => {
      await actor.restart()
      tabs = []
      messages.length = 0
      staged.length = 0
      reads = 0
    },
    dispose: () => base.dispose(),
  }
}

export function storedRecords(inspection: Record<string, unknown>) {
  return new Map(
    array(inspection.records, (value): [string, unknown] => {
      const pair = array(value, (item) => item)
      return [string(pair[0]), pair[1]]
    }),
  )
}

export function liveEvents(inspection: Record<string, unknown>) {
  return array(inspection.messages, record)
    .filter((message) => message.type === 'event')
    .map((message) => record(message.envelope))
}

export function historyMessages(inspection: Record<string, unknown>) {
  return array(inspection.messages, record)
    .filter((message) => message.type === 'history')
    .map((message) => record(message.history))
}

export function eventOrder(events: unknown) {
  return array(events, record).map((envelope) => ({
    eventNumber: envelope.eventNumber,
    type: record(envelope.event).type,
  }))
}

export type GitHubSQLiteHarness = Awaited<
  ReturnType<typeof createGitHubSQLiteHarness>
>
