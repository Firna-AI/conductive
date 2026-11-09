// @vitest-environment happy-dom

import { act, useEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  asMessageField,
  clearMessage,
  messageText,
  pressInField,
  typeMessage,
} from '../../test-support/message-field'
import { mount, MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import { blankDraft, type Draft } from '../state/chat-snapshot'
import { Composer } from './Composer'
import {
  debounce,
  first,
  mountChat,
  second,
  shownTab,
} from './tab-drag-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** A text that the composer gave, and the session that took it. */
interface Change {
  session: string
  text: string
}

/**
 * Mounts the composer of one session, whose owner keeps its draft as the
 * chat does. `moveTo` moves the draft, with its identity, to another
 * session, which then shows, as a draft move of the chat does.
 */
async function mountComposer() {
  const changes: Change[] = []
  const control: { moveTo: ((session: string) => void) | null } = {
    moveTo: null,
  }
  function Owner() {
    const [shown, setShown] = useState<{ session: string; draft: Draft }>({
      session: 'first',
      draft: blankDraft('draft:first'),
    })
    useEffect(() => {
      control.moveTo = (session) =>
        setShown((now) => ({ session, draft: { ...now.draft } }))
    }, [])
    return (
      <Composer
        attaching={false}
        blocked={false}
        choice={{ agent: 'claude', model: 'Opus 5.5', effort: 'high' }}
        draft={shown.draft}
        models={[]}
        onAttach={() => {}}
        onChangeText={(text) => {
          changes.push({ session: shown.session, text })
          setShown((now) => ({ ...now, draft: { ...now.draft, text } }))
        }}
        onChooseModel={() => {}}
        onRemoveAttachment={() => {}}
        onSend={() => {}}
        onStop={() => {}}
        running={false}
        sending={false}
        stopping={false}
      />
    )
  }
  const { container } = await mount(<Owner />)
  return {
    field: asMessageField(byLabel('Message', container)),
    changes,
    moveTo: async (session: string) => {
      const { moveTo } = control
      if (!moveTo) throw new Error('The owner of the composer has not mounted.')
      await act(async () => moveTo(session))
    },
  }
}

describe('the drafts of the composer', () => {
  it('keeps undo with the draft of each session: after a switch to a session whose draft is empty too, undo adds no text of the last session', async () => {
    await mountChat({
      server: new FakeApiServer(),
      tabs: [first, second],
      viewport: 'desktop',
    })
    const field = asMessageField(byLabel('Message'))
    typeMessage(field, 'Only for Address autocomplete')
    clearMessage(field)
    await press(byRole('button', debounce))
    pressInField(field, 'z', { ctrlKey: true })
    const switched = {
      tab: shownTab(),
      text: messageText(field),
      sameField: byLabel('Message') === field,
    }
    await press(byRole('button', 'Address autocomplete'))
    expect({ switched, back: messageText(field) }).toEqual({
      switched: { tab: debounce, text: '', sameField: true },
      back: '',
    })
  })

  it('keeps undo with a draft that moves to another session with its identity, and the undone text goes to that session', async () => {
    const view = await mountComposer()
    typeMessage(view.field, 'Moves to the new session')
    clearMessage(view.field)
    await view.moveTo('new session')
    pressInField(view.field, 'z', { ctrlKey: true })
    expect({
      text: messageText(view.field),
      last: view.changes.at(-1),
    }).toEqual({
      text: 'Moves to the new session',
      last: { session: 'new session', text: 'Moves to the new session' },
    })
  })
})
