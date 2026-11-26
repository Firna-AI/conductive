import { expect, it } from 'vitest'

import { updateShellWorkspace } from '../app-api/feature-workspaces-data'
import { updateWorkspaceTitle } from '../chat/queries'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { lifecycleCommandBody } from './command-test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'

const backendFixture = setupBackendTests()

it('creates the branch that took the title before the branch step, and keeps it after', async () => {
  const fixture = await backendFixture()
  try {
    const { runtime, org, user, boat } = fixture
    const db = runtime.env.DB
    let titled = false
    // The title comes while the sandbox runs its first command.
    boat.beforeCommand = async (command) => {
      if (
        titled ||
        lifecycleCommandBody(command).includes('checkout --no-track -b')
      )
        return
      titled = true
      const row = await db
        .prepare('SELECT id FROM workspaces WHERE org_id = ?')
        .bind(org.id)
        .first<{ id: string }>()
      if (!row) throw new Error('Expected the new workspace.')
      expect(
        await updateWorkspaceTitle(db, row.id, 'Saved carts', TEST_TIME),
      ).toEqual({ branchOrgId: org.id })
    }
    const created = await fixture.run(() =>
      createCompletedWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: structuredClone(FIRST_MESSAGE),
      }),
    )
    expect(titled).toBe(true)
    const stored = await db
      .prepare(
        'SELECT branch, branch_placeholder AS placeholder FROM workspaces WHERE id = ?',
      )
      .bind(created.workspace.id)
      .first<{ branch: string; placeholder: number }>()
    // The create replied with the placeholder, before the title came.
    expect(created.workspace.branch).toMatch(
      new RegExp(`^octocat/[a-z]+-${stored?.branch.slice(-4)}$`),
    )
    const branch = stored?.branch ?? ''
    expect(branch).toMatch(/^octocat\/saved-carts-[a-z0-9]{4}$/)
    expect(stored?.placeholder).toBe(0)
    const branchCommand = boat.commands
      .map(lifecycleCommandBody)
      .find((body) => body.includes('checkout --no-track -b'))
    expect(branchCommand).toContain(`git checkout --no-track -b '${branch}'`)
  } finally {
    await fixture.dispose()
  }
})

it('puts back the city when a later name has no letter or digit', async () => {
  const fixture = await backendFixture()
  try {
    const { runtime, org, user, boat } = fixture
    const db = runtime.env.DB
    let renamed = false
    boat.beforeCommand = async (command) => {
      if (
        renamed ||
        lifecycleCommandBody(command).includes('checkout --no-track -b')
      )
        return
      renamed = true
      const row = await db
        .prepare('SELECT id FROM workspaces WHERE org_id = ?')
        .bind(org.id)
        .first<{ id: string }>()
      if (!row) throw new Error('Expected the new workspace.')
      for (const name of ['Saved carts', '…'])
        expect(
          await updateShellWorkspace(db, {
            orgId: org.id,
            userId: user.id,
            workspaceId: row.id,
            name,
            now: TEST_TIME,
          }),
        ).toBe(true)
    }
    const created = await fixture.run(() =>
      createCompletedWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: structuredClone(FIRST_MESSAGE),
      }),
    )
    expect(renamed).toBe(true)
    expect(
      await db
        .prepare('SELECT name, branch FROM workspaces WHERE id = ?')
        .bind(created.workspace.id)
        .first(),
    ).toEqual({ name: '…', branch: created.workspace.branch })
  } finally {
    await fixture.dispose()
  }
})
