// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { accessibleName } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH } from '../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { filesHref } from './files/files-address'
import { emit, here, org, recordingSocket } from './kept-test-kit'
import { linkTo } from './wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { workspace: id, session: sessionId } = FAKE_IDS
const folder = workspaceFixtures().view.repositoryFolder
const turn = { sessionId, turnId: 'answer-turn' }

/** The address of the file tab of the fake file at lines 2 to 3. */
const lineHref = filesHref(
  org,
  id,
  { kind: 'file', path: FAKE_FILE_PATH, mode: 'source' },
  { start: 2, end: 3 },
)

/** The workspace screen on desktop, with an answer that names the file. */
async function openAnswer(text: string) {
  holdAnimationFrames()
  const server = new FakeApiServer()
  const app = await startedApp(server, {
    events: recordingSocket(server).source,
  })
  const navigation = memoryNavigation(here)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
    { viewport: 'desktop' },
  )
  await settle()
  emit(server, {
    ...turn,
    type: 'turn.started',
    senderId: fakeUser.id,
    choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high', fast: false },
    startedAt: FAKE_TIME,
    messageIds: [],
  })
  emit(server, {
    ...turn,
    type: 'assistant.completed',
    messageId: 'answer',
    text,
    userMessageIds: [],
  })
  await settle()
  return { view, navigation }
}

describe('file chips in an answer of the workspace screen', () => {
  test('an absolute path with lines is a chip, which opens the file tab with the lines marked', async () => {
    const { view, navigation } = await openAnswer(
      `Changed \`${folder}/${FAKE_FILE_PATH}:2-3\`.`,
    )
    const chip = linkTo(view, lineHref)
    const name = accessibleName(chip)
    click(chip)
    await settle()
    const marked = Array.from(
      view.querySelectorAll('[data-marked]'),
      (line) => line.firstElementChild?.textContent,
    )
    expect({ name, address: navigation.href(), marked }).toEqual({
      name: 'File AddressForm.tsx:2-3',
      address: lineHref,
      marked: ['2', '3'],
    })
  })
})
