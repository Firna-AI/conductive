import type { Viewport } from '@mokly/mokly'
import { InputFrame } from '@firna/ui/input'
import { Archive, ChevronDown, FolderGit2, Search } from 'lucide-react'
import { repositories } from '../../fixtures/repositories'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { LinkTabs } from '../common/LinkTabs'
import { Menu, type MenuEntry } from '../common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { Sheet } from '../common/Sheet'
import {
  paletteContent,
  type PaletteContent,
  type PaletteContext,
  type PaletteFilters,
} from './paletteContent'
import { PaletteResults } from './PaletteRows'
import {
  macPaletteTabPaths,
  paletteTabLabels,
  paletteTabPaths,
  paletteTabs,
  type OpenPaletteView,
} from './paletteViews'
import styles from './CommandPalette.module.css'

const chevron = <ChevronDown aria-hidden className={styles.chevron} size={13} />

/** The search field, which keeps the focus while the palette is open. */
function SearchField(props: { content: PaletteContent; mobile: boolean }) {
  return (
    <InputFrame
      accessibilityLabel="Search"
      onChangeText={noop}
      placeholder={
        props.content.placeholder[props.mobile ? 'mobile' : 'desktop']
      }
      prefixIcon={Search}
      size={props.mobile ? 'lg' : 'md'}
      value={props.content.query}
      variant={props.mobile ? 'framed' : 'plain'}
    />
  )
}

/** The choices of the repository filter, with the current one checked. */
function repositoryEntries(selected: string): MenuEntry[] {
  return [
    {
      kind: 'item',
      label: 'All repositories',
      checked: selected === 'All repositories',
      highlighted: true,
    },
    { kind: 'divider' },
    ...Object.values(repositories).map((repository): MenuEntry => ({
      kind: 'item',
      label: repository.name,
      checked: selected === repository.name,
    })),
  ]
}

/**
 * The filters of the Workspaces tab: the repository, and the state, Active
 * or Archived. A desktop opens the menu of the repository beside its
 * button. A phone opens it as a sheet.
 */
function Filters(props: { filters: PaletteFilters; mobile: boolean }) {
  const { filters } = props
  const archived = filters.state === 'Archived'
  return (
    <div className={styles.filters}>
      <span className={styles.anchor}>
        <ScreenLink asChild to={paths.paletteRepository}>
          <ActionButton
            expanded={filters.repositoryMenu}
            icon={FolderGit2}
            menu
            tone="plain"
            trailing={chevron}
          >
            {filters.repository}
          </ActionButton>
        </ScreenLink>
        {filters.repositoryMenu && !props.mobile ? (
          <Menu
            entries={repositoryEntries(filters.repository)}
            label="Repository"
            placement="below-end"
          />
        ) : null}
      </span>
      <ScreenLink
        asChild
        to={archived ? paths.paletteWorkspaces : paths.paletteArchived}
      >
        <ActionButton icon={Archive} menu tone="plain" trailing={chevron}>
          {filters.state}
        </ActionButton>
      </ScreenLink>
    </div>
  )
}

/**
 * The tabs, each a link to its own view, which the Mac app draws on its own
 * pages where it has them. A desktop puts the filters after the tabs.
 */
function TabBar(props: {
  content: PaletteContent
  mobile: boolean
  mac?: boolean
}) {
  const { content } = props
  const tabPaths = props.mac ? macPaletteTabPaths : paletteTabPaths
  const tabs = paletteTabs.map((tab) => ({
    label: paletteTabLabels[tab],
    to: tabPaths[tab],
    selected: tab === content.tab,
  }))
  return (
    <div className={styles.bar}>
      <LinkTabs label="Search in" tabs={tabs} />
      {content.filters && !props.mobile ? (
        <Filters filters={content.filters} mobile={false} />
      ) : null}
    </div>
  )
}

/**
 * The palette on a phone: a page that fills the screen, with the search
 * field and Cancel at the top. Cancel goes back to the list, where the
 * Search row opened it.
 */
function PalettePage(props: { content: PaletteContent }) {
  const { content } = props
  return (
    <section aria-label="Search" className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageField}>
          <SearchField content={content} mobile />
        </div>
        <ScreenLink asChild to={paths.shell}>
          <ActionButton tone="plain">Cancel</ActionButton>
        </ScreenLink>
      </header>
      <TabBar content={content} mobile />
      {content.filters ? (
        <div className={styles.pageFilters}>
          <Filters filters={content.filters} mobile />
        </div>
      ) : null}
      <PaletteResults
        empty={content.empty}
        groups={content.groups}
        query={content.query}
      />
      {content.filters?.repositoryMenu ? (
        <Sheet title="Repository">
          <Menu
            entries={repositoryEntries(content.filters.repository)}
            label="Repository"
            placement="sheet"
          />
        </Sheet>
      ) : null}
    </section>
  )
}

/**
 * The command palette: one search for the workspaces of the org, the
 * actions of the current page, and the settings. A desktop shows it as a
 * dialog near the top of the window, over the dimmed app. A phone shows it
 * as a page.
 */
export function CommandPalette(props: {
  view: OpenPaletteView
  context: PaletteContext
  viewport: Viewport
}) {
  const content = paletteContent(props.view, props.context)
  if (props.viewport === 'mobile') return <PalettePage content={content} />
  return (
    <div className={styles.layer}>
      <div aria-hidden className={styles.scrim} />
      <section
        aria-label="Search"
        aria-modal
        className={styles.dialog}
        role="dialog"
      >
        <div className={styles.field}>
          <SearchField content={content} mobile={false} />
        </div>
        <TabBar content={content} mac={props.context.mac} mobile={false} />
        <PaletteResults
          empty={content.empty}
          groups={content.groups}
          query={content.query}
          shortcuts={props.context.shortcuts}
        />
      </section>
    </div>
  )
}
