import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { DISK_KEEPALIVE_MS } from '../lifecycle/durable-types'
import {
  authenticateWorkspaceToken,
  readWorkspaceToken,
  storeWorkspaceToken,
} from '../lifecycle/tokens'
import { resumeCompletedWorkspace as resumeWorkspace } from '../lifecycle/completed-resume-test-support'
import { existingWorkspace, joinedMember } from './suspension-test-support'
import { suspendUser } from './suspend-user'

const backendFixture = setupBackendTests()

it.each(['resume', 'maintenance'] as const)(
  'revokes only owned workspace tokens and replaces a revoked token at the next %s',
  async (start) => {
    const fixture = backendFixture()
    const { env, dependencies } = fixture.runtime
    const owned = await existingWorkspace(fixture, 'owned-workspace')
    const colleague = await joinedMember(fixture)
    const unaffected = await existingWorkspace(
      fixture,
      'colleague-workspace',
      colleague,
    )
    await storeWorkspaceToken(env, owned.id, 'owned-secret', dependencies.now())
    await storeWorkspaceToken(
      env,
      unaffected.id,
      'colleague-secret',
      dependencies.now(),
    )
    await suspendUser(fixture.runtime, fixture.user.githubId, colleague.id)
    await expect(readWorkspaceToken(env, owned.id)).rejects.toMatchObject({
      code: 'workspace_token_unavailable',
    })
    expect(await readWorkspaceToken(env, unaffected.id)).toBe(
      'colleague-secret',
    )
    expect(await authenticateWorkspaceToken(env, 'colleague-secret')).toEqual({
      workspaceId: unaffected.id,
      orgId: fixture.org.id,
    })
    await env.DB.prepare('UPDATE workspaces SET owner_user_id = ? WHERE id = ?')
      .bind(colleague.id, owned.id)
      .run()
    if (start === 'resume') {
      await fixture.run(() =>
        resumeWorkspace(
          fixture.runtime,
          fixture.org.id,
          owned.id,
          colleague.id,
        ),
      )
    } else {
      await fixture.runtime
        .workspace(owned.id)
        .reconcileLifecycleAccess(owned.id)
      await fixture.setTime(dependencies.now() + DISK_KEEPALIVE_MS)
      const actor = fixture.actors.get(owned.id)
      if (!actor) throw new Error('Missing maintenance actor')
      await actor.endpoint().advance()
    }
    const token = readWorkspaceToken(env, owned.id)
    await expect(token).resolves.not.toBe('owned-secret')
    const replacement = await token
    await expect(
      authenticateWorkspaceToken(env, 'owned-secret'),
    ).rejects.toMatchObject({
      code: 'workspace_token_refused',
    })
    expect(await authenticateWorkspaceToken(env, replacement)).toEqual({
      workspaceId: owned.id,
      orgId: fixture.org.id,
    })
    expect(await readWorkspaceToken(env, unaffected.id)).toBe(
      'colleague-secret',
    )
  },
)
