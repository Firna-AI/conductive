// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { byRole } from '../../test-support/dom-queries'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { mount, MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { ChatOverlays } from './ChatOverlays'
import { debounce } from './tab-drag-test-kit'
import { pressOn } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const sessions = workspaceFixtures().sessions.sessions

/** The text of the question with this title, before these sessions close. */
async function question(sessionIds: readonly string[], title: string) {
  await mount(
    <ChatOverlays
      history={[]}
      mobile={false}
      onConfirmClose={() => {}}
      onDismiss={() => {}}
      overlay={{ kind: 'close', sessionIds }}
      sessions={sessions}
    />,
  )
  return byRole('dialog', title).querySelector('p')?.textContent
}

describe('the question before a close', () => {
  it('names one running session in the singular', async () => {
    expect(
      await question([sessions[0].id], 'Stop the turn and close the tab?'),
    ).toBe(
      'The agent is working in Address autocomplete. The session moves to the session history, where you can reopen it.',
    )
  })

  it('names each running session of one close in the plural', async () => {
    const ids = [sessions[0].id, sessions[1].id]
    expect(await question(ids, 'Stop the turns and close the tabs?')).toBe(
      `The agents are working in Address autocomplete and ${debounce}. The sessions move to the session history, where you can reopen them.`,
    )
  })

  it('keeps Shift+Tab inside after the short text body takes focus', async () => {
    const title = 'Stop the turn and close the tab?'
    await question([sessions[0].id], title)
    const dialog = byRole('dialog', title)
    const body = dialog.querySelector<HTMLElement>('[tabindex="-1"]')
    if (!body) throw new Error('The question has no focusable text body')
    act(() => body.focus())
    expect(document.activeElement).toBe(body)

    const keyReachesBrowser = pressOn(body, 'Tab', { shiftKey: true })

    expect(document.activeElement).toBe(
      byRole('button', 'Stop and close', dialog),
    )
    expect(keyReachesBrowser).toBe(false)
  })
})
