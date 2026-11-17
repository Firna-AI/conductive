import { afterEach, beforeAll, expect, it } from 'vitest'

import { readCreated } from '../../src/app/api/read-workspaces'
import {
  NEW_WORKSPACE_CAPABILITIES,
  workspaceCapabilitiesPath,
} from '../../src/shared/secrets'
import { workspacesPath } from '../../src/shared/workspaces'
import { CLAUDE } from '../chat/harness.test-support'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
} from '../chat/integration/outer-seed.test-support'
import { addSecret } from './secrets.test-support'

// The test chooses the Mac access that a create without a choice does not get.
const chosen = !NEW_WORKSPACE_CAPABILITIES.macAccess

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('saves the app capabilities with its workspace and keeps those choices on a repeated create', async () => {
  fixture = await createOuterRuntime(bundle, {
    configuration: {
      CONDUCTIVE_MODELS: JSON.stringify([
        { ...CLAUDE, label: 'Model', efforts: ['high'] },
      ]),
      CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify(CLAUDE),
    },
  })
  const secret = await addSecret(fixture, OUTER_ORG)
  const input = {
    repositoryId: OUTER_REPOSITORY,
    capabilities: { preapprovedSecretIds: [secret.id], macAccess: chosen },
    firstMessage: {
      id: 'capabilities-create',
      text: 'Build',
      choice: CLAUDE,
      attachmentIds: [],
    },
  }
  const create = () =>
    fixture!.request(workspacesPath(OUTER_ORG), {
      method: 'POST',
      headers: { Cookie: fixture!.cookies.memberCookie },
      body: JSON.stringify(input),
    })
  const response = await create()
  expect(response.status).toBe(201)
  const created = readCreated(await response.json())
  const path = workspaceCapabilitiesPath(OUTER_ORG, created.workspace.id)
  expect(await (await fixture.request(path)).json()).toEqual({
    capabilities: { ...input.capabilities, sessionApprovals: [] },
  })
  input.capabilities = { preapprovedSecretIds: [], macAccess: !chosen }
  const retry = await create()
  expect(retry.status).toBe(201)
  expect(readCreated(await retry.json()).workspace.id).toBe(
    created.workspace.id,
  )
  expect(await (await fixture.request(path)).json()).toEqual({
    capabilities: {
      preapprovedSecretIds: [secret.id],
      macAccess: chosen,
      sessionApprovals: [],
    },
  })
})
