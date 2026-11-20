import { byRole, queryByRole } from '../../test-support/dom-queries'

/** The Settings dialog of a desktop, or null when it does not show. */
export function settingsDialog(): HTMLElement | null {
  return queryByRole('dialog', 'Settings')
}

/** The rows of a group of the list of Settings, by their labels. */
function settingsRows(group: string): Map<string, HTMLAnchorElement> {
  const list = byRole('group', group, byRole('navigation', 'Settings'))
  const links = list.querySelectorAll<HTMLAnchorElement>('a')
  return new Map(Array.from(links, (link) => [String(link.textContent), link]))
}

/** The row of a tab of a group, which fails when the group has none. */
export function settingsRow(group: string, tab: string): HTMLAnchorElement {
  const row = settingsRows(group).get(tab)
  if (!row) throw new Error(`${group} in Settings has no ${tab} row.`)
  return row
}

/** The labels of the rows of a group, and the label of its open tab. */
export function settingsGroup(group: string): {
  rows: string[]
  open: string[]
} {
  const rows = Array.from(settingsRows(group))
  return {
    rows: rows.map(([label]) => label),
    open: rows
      .filter(([, link]) => link.getAttribute('aria-current') === 'page')
      .map(([label]) => label),
  }
}

/** The open tab of the Settings dialog, which its name labels. */
export function settingsTab(name: string): HTMLElement {
  const dialog = settingsDialog()
  if (!dialog) throw new Error('Settings does not show.')
  return byRole('region', name, dialog)
}
