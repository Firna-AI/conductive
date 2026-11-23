import { beforeAll, expect, it } from 'vitest'

import {
  readSessionResponse,
  readSessions,
} from '../../src/chat/api/read-responses'
import { sessionPaths, sessionsPath } from '../../src/shared/sessions'
import { CLAUDE } from '../chat/harness.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA, passedRun } from '../github/fake-pull'
import { HEAD_SYNC_NEEDS_TURN } from '../lifecycle/queue-head-command'
import { mergeFixture, TOP_HEAD, TRUNK_HEAD } from './merge.test-support'
import { queueBundle } from './queue.test-support'
import { restackFixture } from './restack.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await queueBundle()
})

it('carries local work onto the rewritten GitHub branch with the old GitHub head and a plain push', async () => {
  const f = await restackFixture(bundle, 'stack')
  try {
    const id = OTHER_WORKSPACE
    const session = await f.session(id)
    const sandbox = 'bx_queue_sync_local'
    await f.db
      .prepare('UPDATE workspaces SET sandbox_id = ? WHERE id = ?')
      .bind(sandbox, id)
      .run()
    f.boat.states.set(sandbox, 'ready')
    f.boat.beforeCommand = async (command) => {
      f.boat.synchronousExitCode = command.includes('symbolic-ref --quiet HEAD')
        ? HEAD_SYNC_NEEDS_TURN
        : 0
    }
    const rewritten = '7'.repeat(40)
    f.api.pulls[2].state = 'MERGED'
    f.api.pulls[2].mergedAt = '2026-11-09T22:00:00Z'
    f.api.pulls[3].baseRefName = 'main'
    f.api.pulls[3].headRefOid = rewritten
    f.api.branches.set('refs/heads/layer-two', rewritten)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${rewritten}`, TRUNK_HEAD)
    f.api.mergeBases.set(`${HEAD_SHA}...${rewritten}`, TRUNK_HEAD)
    await f.queue.advanceStartAlarm()
    const messages = await f.messages(id, session)
    expect(messages).toMatchObject([{ sender: { id: 'member' } }])
    expect(messages[0].text).toContain(
      `git rebase --onto ${rewritten} ${TOP_HEAD}`,
    )
    expect(messages[0].text).toContain(
      `Check that \`FETCH_HEAD\` is at \`${rewritten}\``,
    )
    expect(messages[0].text).toContain('run `git push`')
    expect(messages[0].text).toContain('git fetch origin refs/pull/3/head')
    expect(messages[0].text).not.toContain('--force')
  } finally {
    await f.dispose()
  }
})

it('retries an owner-token fetch and syncs the remaining branch after GitHub rewrites it', async () => {
  const f = await mergeFixture(bundle)
  try {
    await f.db
      .prepare(
        "UPDATE workspaces SET sandbox_id = 'bx_queue_sync', state = 'ready', base_branch = 'changes' WHERE id = ?",
      )
      .bind(OTHER_WORKSPACE)
      .run()
    f.boat.states.set('bx_queue_sync', 'ready')
    const sessions = sessionsPath(OUTER_ORG, OTHER_WORKSPACE)
    const post = (path: string, value: unknown) =>
      f.request(path, {
        method: 'POST',
        body: JSON.stringify(value),
      })
    const opened = await post(sessions, { choice: CLAUDE })
    expect(opened.status).toBe(201)
    const sessionId = readSessionResponse(await opened.json()).session.id
    const running = await post(
      sessionPaths.messages(OUTER_ORG, OTHER_WORKSPACE, sessionId),
      {
        id: 'work-during-rewrite',
        text: 'Inspect this branch.',
        choice: CLAUDE,
        attachmentIds: [],
      },
    )
    expect(running.status).toBe(202)
    const read = await f.request(sessions)
    const turnId = readSessions(await read.json()).sessions.find(
      ({ id }) => id === sessionId,
    )?.activeTurnId
    if (!turnId) throw new Error('Expected a turn in the workspace.')
    const rewritten = '7'.repeat(40)
    f.api.pulls[2].state = 'MERGED'
    f.api.pulls[2].mergedAt = '2026-11-09T22:00:00Z'
    f.api.pulls[3].baseRefName = 'main'
    f.api.pulls[3].headRefOid = rewritten
    f.api.branches.set('refs/heads/layer-two', rewritten)
    f.api.mergeBases.set(`${TRUNK_HEAD}...${rewritten}`, TRUNK_HEAD)
    f.api.mergeBases.set(`${HEAD_SHA}...${rewritten}`, TRUNK_HEAD)
    f.api.checks.set(rewritten, [{ ...passedRun, conclusion: 'FAILURE' }])

    const holders: (string | null)[] = []
    let fetchId = ''
    let deny = true
    const actor = f.actor(OTHER_WORKSPACE)
    f.boat.beforeCommand = async (command) => {
      f.boat.synchronousExitCode = 0
      if (
        !command.includes('sync-') ||
        !command.includes('conductive-git-credential')
      )
        return
      const id = command.match(/baseChange-[A-Za-z0-9_-]+/)?.[0]
      if (!id) throw new Error('The guarded fetch has no credential ID.')
      fetchId = id
      holders.push(await actor.credentialSender(id))
      f.boat.synchronousExitCode = deny ? 1 : 0
    }
    const installed = () =>
      f.boat.commands.filter((command) =>
        command.includes(
          'checkout --quiet --no-track --no-overwrite-ignore -B',
        ),
      )
    await f.queue.advanceStartAlarm()
    expect(holders).toEqual([])
    expect(await f.entries()).toMatchObject([
      { syncFrom: TOP_HEAD, wait: 'active-turn' },
    ])
    expect(
      (
        await post(
          sessionPaths.interrupt(OUTER_ORG, OTHER_WORKSPACE, sessionId),
          { turnId },
        )
      ).status,
    ).toBe(200)
    await f.queue.advanceStartAlarm()
    expect(holders).toEqual(['owner'])
    expect(await actor.credentialSender(fetchId)).toBeNull()
    expect(installed()).toEqual([])
    expect(await f.entries()).toMatchObject([
      { syncFrom: TOP_HEAD, wait: 'rebase' },
    ])

    deny = false
    await f.queue.advanceStartAlarm()
    expect(holders).toEqual(['owner', 'owner'])
    expect(await actor.credentialSender(fetchId)).toBeNull()
    expect(installed()).toHaveLength(1)
    expect(installed()[0]).toContain(rewritten)
    expect(await f.entries()).toMatchObject([
      { syncFrom: null, wait: 'checks' },
    ])
    expect(
      await f.db
        .prepare('SELECT base_branch FROM workspaces WHERE id = ?')
        .bind(OTHER_WORKSPACE)
        .first('base_branch'),
    ).toBeNull()
    await actor.advanceStartAlarm()
    const settings = f.boat.commands.find((command) =>
      command.includes('gh-merge-base'),
    )
    expect(settings).toContain('branch.layer-two.gh-merge-base')
    expect(settings).toContain('refs/remotes/origin/main')
  } finally {
    await f.dispose()
  }
})
