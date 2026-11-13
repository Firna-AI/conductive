import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentChoice } from '../../shared/agents'
import { startedTurn } from '../../shared/transcript/turn-records'
import { newSessionRecord } from '../state/test-kit'
import { textOf } from './render-kit'
import { SessionTabs } from './SessionTabs'
import { rowOf } from './tab-row'

const choice: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
}

/** The tab bar with one session that has no title, as the row draws it. */
function tabBar(
  renaming: string | null,
  activeTurnId: string | null = null,
  startedAt: number | null = 0,
): string {
  const untitled = {
    ...newSessionRecord('new', choice),
    activeTurnId,
    activeTurnStartedAt: activeTurnId === null ? null : startedAt,
  }
  const tabs = rowOf(
    null,
    [untitled],
    { kind: 'session', sessionId: untitled.id },
    () => startedTurn(untitled) !== null,
    undefined,
  )
  return renderToStaticMarkup(
    <SessionTabs
      historyEntries={[]}
      historyOpen={false}
      mobile={false}
      onCancelRename={() => {}}
      onClose={() => {}}
      onCopy={() => {}}
      onMove={() => {}}
      onNew={() => {}}
      onRename={() => {}}
      onSelect={() => {}}
      onShowHistory={() => {}}
      onStartRename={() => {}}
      readOnly={false}
      renaming={renaming}
      tabs={tabs}
    />,
  )
}

describe('SessionTabs', () => {
  it('shows a working indicator only after its turn starts and until it ends', () => {
    expect(tabBar(null, 'turn-1')).toContain('aria-label="Working"')
    expect(tabBar(null)).not.toContain('aria-label="Working"')
    expect(tabBar(null, 'queued-turn', null)).not.toContain(
      'aria-label="Working"',
    )
  })

  it('shows Untitled for a session with no title, and its rename field starts empty with Untitled as its hint', () => {
    const tab = tabBar(null)
    expect(textOf(tab).trim()).toBe('Untitled')
    expect(tab).toContain('aria-label="Close Untitled"')
    const field = tabBar('new').match(/<input [^>]*>/)?.[0]
    expect(field).toContain('value=""')
    expect(field).toContain('placeholder="Untitled"')
  })
})
