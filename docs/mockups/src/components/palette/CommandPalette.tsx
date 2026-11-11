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
import { useMacApp } from '../mac/MacApp'
import type { PaletteContext } from './paletteActions'
import {
  paletteContent,
  type PaletteContent,
  type PaletteFilters,
} from './paletteContent'
import { PaletteResults } from './PaletteRows'
import {
  macPaletteTabPaths,
  paletteTabLabels,
  paletteTabPaths,
  paletteTabs,
  type OpenPaletteView,
  type PaletteTab,
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

/** The page of each tab. A tab without a page stays static. */
type TabPaths = Readonly<Record<PaletteTab, string | undefined>>

/** The tabs, each a link to its own view. A desktop puts the filters after them. */
function TabBar(props: {
  content: PaletteContent
  mobile: boolean
  tabPaths: TabPaths
}) {
  const { content } = props
  const tabs = paletteTabs.map((tab) => ({
    label: paletteTabLabels[tab],
    to: props.tabPaths[tab],
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
function PalettePage(props: { content: PaletteContent; tabPaths: TabPaths }) {
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
      <TabBar content={content} mobile tabPaths={props.tabPaths} />
      {content.filters ? (
        <div className={styles.pageFilters}>
          <Filters filters={content.filters} mobile />
        </div>
      ) : null}
      <PaletteResults content={content} />
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
 * as a page. In the window of the Mac app it adds the actions of the Mac
 * app, and its tabs keep to the pages of the Mac app.
 */
export function CommandPalette(props: {
  view: OpenPaletteView
  context: PaletteContext
  viewport: Viewport
}) {
  const mac = useMacApp() !== undefined
  const content = paletteContent(props.view, { ...props.context, mac })
  const tabPaths = mac ? macPaletteTabPaths : paletteTabPaths
  if (props.viewport === 'mobile') {
    return <PalettePage content={content} tabPaths={tabPaths} />
  }
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
        <TabBar content={content} mobile={false} tabPaths={tabPaths} />
        <PaletteResults content={content} />
      </section>
    </div>
  )
}
