// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '../shared/api'
import {
  membersPath,
  workspaceOwnerPath,
  type OrgMember,
} from '../shared/members'
import type { Workspace } from '../shared/workspaces'
import {
  accessibleName,
  byRole,
  queryByRole,
} from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../test-support/fixtures/core'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import {
  deferred,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../test-support/mount'
import { createMembersApi, type FetchLike, type MembersApi } from './api/client'
import { OwnerPicker } from './OwnerPicker'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const org = FAKE_IDS.org
const workspace = workspaceFixtures().detail.workspace
const [cal, priya] = coreFixtures().members.members.map((member) => member.user)
const keep = () => undefined

function choiceNames(): string[] {
  return Array.from(
    document.querySelectorAll('[role="menuitemradio"]'),
    accessibleName,
  )
}

describe('OwnerPicker on a phone', () => {
  it('selects_another_owner_and_reports_the_answer_of_the_api', async () => {
    const server = new FakeApiServer()
    const ownerPath = workspaceOwnerPath(org, workspace.id)
    server.json('PUT', ownerPath, { workspace: { ...workspace, owner: priya } })
    const reports: Workspace[] = []
    await mount(
      <OwnerPicker
        api={createMembersApi(server.fetch)}
        canReassign
        onReassigned={(next) => reports.push(next)}
        viewport="mobile"
        workspace={workspace}
      />,
    )
    await press(byRole('button', 'Owner: Cal'))
    const choice = await waitFor(
      () => queryByRole('menuitemradio', 'Priya Raman'),
      'the choice of Priya Raman',
    )
    await press(choice)
    const request = server.requests.at(-1)
    expect({
      method: request?.method,
      path: request && new URL(request.url).pathname,
      body: await request?.text(),
    }).toEqual({ method: 'PUT', path: ownerPath, body: '{"userId":"priya"}' })
    await waitFor(() => reports.length > 0, 'the report of the new owner')
    expect(reports.map((next) => next.owner.id)).toEqual(['priya'])
    expect(queryByRole('dialog', workspace.name)).toBeNull()
  })

  it('starts_again_for_another_workspace_and_drops_the_old_members_answer', async () => {
    const server = new FakeApiServer()
    const ana: User = {
      id: 'ana',
      githubId: 4,
      githubLogin: 'analima',
      displayName: 'Ana Lima',
      avatarUrl: null,
    }
    const members: OrgMember[] = [cal, priya, ana].map((user, index) => ({
      user,
      role: index === 0 ? 'admin' : 'member',
      joinedAt: 0,
    }))
    server.json('GET', membersPath('futex'), { members, invites: [] })
    const futex: Workspace = {
      ...workspace,
      id: 'rail-drag',
      orgId: 'futex',
      name: 'Rail drag and drop',
      owner: priya,
    }
    const oldReply = deferred()
    const newReply = deferred()
    const gated: FetchLike = async (input, init) => {
      if (input === membersPath(org)) await oldReply.promise
      if (input === membersPath('futex')) await newReply.promise
      return server.fetch(input, init)
    }
    const client = createMembersApi(gated)
    const loads: Promise<unknown>[] = []
    const api: MembersApi = {
      ...client,
      members: (orgId) => {
        const load = client.members(orgId)
        loads.push(load)
        return load
      },
    }
    const picker = (shown: Workspace) => (
      <OwnerPicker
        api={api}
        canReassign
        onReassigned={keep}
        viewport="mobile"
        workspace={shown}
      />
    )
    const view = await mount(picker(workspace))
    await press(byRole('button', 'Owner: Cal'))
    await view.rerender(picker(futex))
    expect(document.querySelectorAll('dialog[open]').length).toBe(0)
    await press(byRole('button', 'Owner: Priya Raman'))
    oldReply.resolve()
    await act(async () => {
      await loads[0]
    })
    expect(choiceNames()).toEqual([])
    byRole('status', 'Loading the members')
    newReply.resolve()
    await waitFor(
      () => queryByRole('menuitemradio', 'Ana Lima'),
      'Futex members',
    )
    expect(choiceNames()).toEqual(['Cal', 'Priya Raman', 'Ana Lima'])
  })
})
