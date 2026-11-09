import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { textOf } from './render-kit'
import { SessionTabs, type SessionTab } from './SessionTabs'

/** The tab bar with one session tab, and the tab that shows its field. */
function tabBar(tab: SessionTab, renaming: string | null): string {
  return renderToStaticMarkup(
    <SessionTabs
      historyEntries={[]}
      historyOpen={false}
      mobile={false}
      onCancelRename={() => {}}
      onClose={() => {}}
      onNew={() => {}}
      onRename={() => {}}
      onSelect={() => {}}
      onShowHistory={() => {}}
      onStartRename={() => {}}
      readOnly={false}
      renaming={renaming}
      tabs={[tab]}
    />,
  )
}

describe('SessionTabs', () => {
  it('shows Untitled for a session with no title, and its rename field starts empty with Untitled as its hint', () => {
    const untitled: SessionTab = { id: 'new', title: null, selected: true }
    const tab = tabBar(untitled, null)
    expect(textOf(tab).trim()).toBe('Untitled')
    expect(tab).toContain('aria-label="Rename Untitled"')
    expect(tab).toContain('aria-label="Close Untitled"')
    const field = tabBar(untitled, untitled.id).match(/<input [^>]*>/)?.[0]
    expect(field).toContain('value=""')
    expect(field).toContain('placeholder="Untitled"')
  })
})
