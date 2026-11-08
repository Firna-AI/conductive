import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import styles from '../../../docs/mockups/src/components/palette/CommandPalette.module.css'
import { useNavigation } from '../../app/navigation'
import type { PaletteController } from '../../app/palette/controller'
import { paletteResults } from '../../app/palette/palette-results'
import type { PaletteRow } from '../../app/palette/palette-rows'
import type { PaletteQuery } from '../../app/palette/palette-source'
import { useNow } from '../../app/time'
import { ActionButton } from '../ui/actions'
import { Overlay, useLayerFocus, usePressOutside } from '../ui/Overlay'
import { trapTab } from '../ui/Sheet'
import { useViewport } from '../ui/viewport'
import local from './palette.module.css'
import { PaletteTabs, SearchField, type FieldHandle } from './PaletteControls'
import { PaletteFilters } from './PaletteFilters'
import { PaletteList } from './PaletteList'
import { PaletteSurface } from './PaletteSurface'
import { usePaletteSource } from './use-palette-source'

/** Each open starts on the All tab, with an empty field and the first filters. */
const firstQuery: PaletteQuery = {
  tab: 'all',
  text: '',
  repositoryId: null,
  archived: false,
}

/** What running a row does: its own action, or the page that it opens. */
function rowAction(row: PaletteRow, go: (to: string) => void): () => void {
  if (row.kind === 'command' && row.run) return row.run
  const { href } = row
  return href === undefined ? () => undefined : () => go(href)
}

/**
 * The open command palette: a dialog near the top of the window on
 * desktop, and a page that fills the screen on a phone. The search field
 * keeps the focus: Up and Down move the highlight, with a wrap at each
 * end, and Enter runs the highlighted row. Tab reaches the tabs and the
 * filters and stays inside. A row closes the palette, then runs.
 */
export function PalettePanel(props: { controller: PaletteController }) {
  const { controller } = props
  const phone = useViewport() === 'phone'
  const navigation = useNavigation()
  const panel = useRef<HTMLElement>(null)
  const fieldRef = useRef<FieldHandle>(null)
  const [query, setQuery] = useState(firstQuery)
  const [highlight, setHighlight] = useState(0)
  const { source, retry } = usePaletteSource()
  const now = useNow(30_000)
  const id = useId()
  const close = () => controller.close()
  // The dialog of the palette does not hold the palette key: the key closes it.
  useLayerFocus(panel, { modal: true, owner: controller })
  usePressOutside(!phone, panel, close)
  const focusField = () => fieldRef.current?.focus()
  // A control that goes away, such as a filter after a change of the tab,
  // takes the focus with it. The field takes the lost focus back, so the
  // keys of the palette still work.
  useEffect(() => {
    const active = document.activeElement
    if (active === null || active === document.body) focusField()
  })
  const results = paletteResults(query, source)
  const rows = results.groups.flatMap((group) => group.rows)
  const active = rows.length === 0 ? -1 : Math.min(highlight, rows.length - 1)
  const optionId = (index: number) => `${id}-option-${index}`
  const change = (next: Partial<PaletteQuery>) => {
    setQuery((current) => ({ ...current, ...next }))
    setHighlight(0)
  }
  const run = (row: PaletteRow) =>
    controller.close(rowAction(row, (to) => navigation.push(to)))
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const { target } = event
    // A sheet of a filter lies outside the panel, with its own keys.
    if (!(target instanceof Node) || !event.currentTarget.contains(target)) {
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'Tab') {
      trapTab(event)
      return
    }
    if (!(target instanceof HTMLInputElement) || rows.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setHighlight((active + step + rows.length) % rows.length)
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      const row = rows[active]
      if (row) run(row)
    }
  }
  const listboxId = `${id}-results`
  const field = (
    <SearchField
      activeId={active < 0 ? undefined : optionId(active)}
      fieldRef={fieldRef}
      listboxId={rows.length > 0 ? listboxId : undefined}
      onChange={(text) => change({ text })}
      phone={phone}
      tab={query.tab}
      text={query.text}
    />
  )
  const tabs = (
    <PaletteTabs
      onChange={(tab) => change({ tab })}
      panelId={listboxId}
      tab={query.tab}
      tabId={(tab) => `${id}-tab-${tab}`}
    />
  )
  const filters =
    query.tab === 'workspaces' ? (
      <PaletteFilters
        archived={query.archived}
        choices={results.repositories}
        onArchived={(archived) => change({ archived })}
        onRepository={(repositoryId) => change({ repositoryId })}
        repositoryId={query.repositoryId}
      />
    ) : null
  const list = (
    <PaletteList
      active={active}
      listboxId={listboxId}
      now={now}
      onRun={run}
      optionId={optionId}
      results={results}
      retry={retry}
    />
  )
  if (phone) {
    return (
      <Overlay>
        <div className={local.pageLayer}>
          <PaletteSurface
            className={styles.page}
            focusField={focusField}
            onKeyDown={onKeyDown}
            ref={panel}
          >
            <header className={styles.pageHeader}>
              <div className={styles.pageField}>{field}</div>
              <ActionButton onPress={close} tone="plain">
                Cancel
              </ActionButton>
            </header>
            <div className={styles.bar}>{tabs}</div>
            {filters ? (
              <div className={styles.pageFilters}>{filters}</div>
            ) : null}
            {list}
          </PaletteSurface>
        </div>
      </Overlay>
    )
  }
  return (
    <Overlay>
      <div className={styles.layer}>
        <div aria-hidden className={styles.scrim} />
        <PaletteSurface
          className={styles.dialog}
          focusField={focusField}
          onKeyDown={onKeyDown}
          ref={panel}
        >
          <div className={styles.field}>{field}</div>
          <div className={styles.bar}>
            {tabs}
            {filters}
          </div>
          {list}
        </PaletteSurface>
      </div>
    </Overlay>
  )
}
