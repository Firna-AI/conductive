import { expect } from 'vitest'
import { workspaceSecretValuePath } from '../../src/shared/secret-requests'
import { encrypt } from '../security/crypto'
import { temporaryValueContext } from '../secrets/request-records'
import { WORKSPACE_ID } from './harness.test-support'
import { captureEnvironment, outputFixture } from './runner-output.test-support'
import { readToolDetail } from './tool-detail-records'
import { readToolDetailSource } from './tool-detail-source'
import { part } from './tool-detail.test-support'

export interface HeldScenario {
  name: string
  first: string
  removed: string
  remaining: string[]
  held: string
  removeNext?: string
  nextHeld?: string
  middle?: string
  later?: string[]
  final: string
  expected: string
}

export function setHeldValues(
  f: Awaited<ReturnType<typeof outputFixture>>,
  values: string[],
) {
  return captureEnvironment(
    f,
    Object.fromEntries(
      values.map((value, i) => [`VALUE_${i}`, { value, secret: true }]),
    ),
  )
}

export async function saveHeldTemporary(
  f: Awaited<ReturnType<typeof outputFixture>>,
  value: string,
) {
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    await view.secrets.saveValue({
      id: 'held-temporary',
      name: 'HELD_TOKEN',
      suppliedBy: {
        id: f.owner.id,
        githubLogin: 'owner',
        displayName: null,
        avatarUrl: null,
      },
      createdAt: f.clock.now(),
      sessionId: null,
      expiresAt: null,
      ciphertext: await encrypt(
        value,
        temporaryValueContext(WORKSPACE_ID, 'held-temporary'),
        f.env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    })
  })
}

export async function readHeldTool(
  f: Awaited<ReturnType<typeof outputFixture>>,
) {
  return f.chat.store.read(WORKSPACE_ID, (view) =>
    readToolDetail(
      f.env,
      { output: view.output, workspaceId: WORKSPACE_ID },
      'fake-stream-1',
    ),
  )
}

export async function readHeldSource(
  f: Awaited<ReturnType<typeof outputFixture>>,
) {
  return f.chat.store.read(WORKSPACE_ID, async (view) => {
    const owner = { output: view.output, workspaceId: WORKSPACE_ID }
    const state = await readToolDetail(f.env, owner, 'fake-stream-1')
    if (!state) throw new Error('Missing retained tool source')
    let text = ''
    for await (const block of readToolDetailSource(
      f.env,
      owner,
      'fake-stream-1',
      state,
    ))
      text += block
    return { ...state, text }
  })
}

export async function heldScenario(
  f: Awaited<ReturnType<typeof outputFixture>>,
  scenario: HeldScenario,
) {
  await setHeldValues(f, scenario.remaining)
  await saveHeldTemporary(f, scenario.removed)
  await f.emit(part(f.context, scenario.first, 1))
  const path = workspaceSecretValuePath(
    f.org.id,
    WORKSPACE_ID,
    'held-temporary',
  )
  expect(
    (await f.fetch(path, undefined, f.ownerCookie, 'DELETE')).status,
    scenario.name,
  ).toBe(204)
  const state = await readHeldTool(f)
  expect.soft(state?.held, scenario.name).toBe(scenario.held)
  expect.soft(Object.hasOwn(state ?? {}, 'values'), scenario.name).toBe(false)
  if (scenario.removeNext !== undefined) {
    await setHeldValues(
      f,
      scenario.remaining.filter((value) => value !== scenario.removeNext),
    )
    await saveHeldTemporary(f, scenario.removeNext)
    expect(
      (await f.fetch(path, undefined, f.ownerCookie, 'DELETE')).status,
    ).toBe(204)
    expect
      .soft((await readHeldTool(f))?.held, scenario.name)
      .toBe(scenario.nextHeld)
  }
  let next = 2
  if (scenario.middle !== undefined)
    await f.emit(part(f.context, scenario.middle, next++))
  if (scenario.later) await setHeldValues(f, scenario.later)
  await f.emit(part(f.context, scenario.final, next, true))
  const history = await f.history(f.context.sessionId)
  expect.soft(history.events.at(-1)?.event, scenario.name).toMatchObject({
    type: 'tool.updated',
    tool: { detail: scenario.expected, omittedDetailBytes: 17 },
  })
}
