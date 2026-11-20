// @vitest-environment happy-dom

import { expect, it } from 'vitest'
import { FakeTerminal } from '../test-support/fake-terminal'
import { layOut } from '../test-support/layout'
import { mount } from '../test-support/mount'
import type { TerminalFocusRequest } from './terminalFocus'
import { TerminalScreen } from './TerminalScreen'
import styles from './TerminalScreen.module.css'

/** The screen keeps its connection while `connect` stays the same. */
const connect = () => new FakeTerminal()

/** A request from no focused element, as after a click on the page. */
const request: TerminalFocusRequest = { from: null }

/** Whether the keyboard focus is in the xterm.js screen. */
function focusInScreen(): boolean {
  return document.activeElement?.closest('.xterm') != null
}

it('keeps a focus request while its screen is hidden, and takes it when the screen opens at the first size of its host', async () => {
  layOut(`.${styles.host}`, { width: 440, height: 389 })
  let done = 0
  const screen = (hidden: boolean) => (
    <div hidden={hidden}>
      <TerminalScreen
        connect={connect}
        connection={0}
        ended={false}
        focusRequest={request}
        onClosed={() => undefined}
        onFocusDone={() => done++}
        socketPath="/terminal"
      />
    </div>
  )
  const view = await mount(screen(true))
  const whileHidden = { done, focus: focusInScreen() }

  await view.rerender(screen(false))

  expect({ whileHidden, done, focus: focusInScreen() }).toEqual({
    whileHidden: { done: 0, focus: false },
    done: 1,
    focus: true,
  })
})
