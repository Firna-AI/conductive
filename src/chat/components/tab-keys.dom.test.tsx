// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import type { TranscriptDetail } from '../../shared/generated/TranscriptDetail'
import {
  ShortcutContext,
  type ShortcutLayer,
} from '../../shell/shortcuts/shortcut-context'
import { ShortcutOffers } from '../../shell/shortcuts/shortcut-offers'
import { mount } from '../../test-support/mount'
import { paneChat } from '../state/pane-test-kit'
import { useTabKeys } from './tab-keys'

it('copies the other shown session from a file row and offers no copy command when no pane shows a session', async () => {
  const chat = paneChat()
  const offers = new ShortcutOffers()
  const layer: ShortcutLayer = {
    offers,
    terminals: new Set(),
    recorders: new Set(),
    keymap: new Map(),
  }
  const copied: { sessionId: string; detail: TranscriptDetail }[] = []
  function Keys({ sessionId }: { sessionId: string | null }) {
    useTabKeys({
      tabs: [],
      controller: chat.controller,
      history: [],
      sessionId,
      copy: (id, detail) => copied.push({ sessionId: id, detail }),
    })
    return null
  }
  const render = (sessionId: string | null) => (
    <ShortcutContext value={layer}>
      <Keys sessionId={sessionId} />
    </ShortcutContext>
  )
  const view = await mount(render('debounce'))
  offers.run('copy-concise-transcript')
  offers.run('copy-full-transcript')
  expect(copied).toEqual([
    { sessionId: 'debounce', detail: 'concise' },
    { sessionId: 'debounce', detail: 'full' },
  ])
  await view.rerender(render(null))
  expect([...offers.commands()]).toEqual([])
  await view.unmount()
})
