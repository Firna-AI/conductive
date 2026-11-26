import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { InputFrame } from '@firna/ui/input'
import { ChevronDown, Search } from 'lucide-react'
import { repositories } from '../../fixtures/repositories'
import { pageHost } from '../../fixtures/shortcutHosts'
import { noop } from '../../../../../src/ui/noop'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { linkTabs } from '../../entries/components/common/LinkTabs.mockup'
import { menu } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { ScreenLink } from '../common/ScreenLink'
import { sheet } from '../../entries/components/common/Sheet.mockup'
import {
  paletteContent,
  type PaletteContent,
  type PaletteContext,
} from './paletteContent'
import type { PaletteFilters } from './paletteFilters'
import type { PaletteKeys } from './PaletteRows'
import { paletteResults } from '../../entries/components/palette/PaletteRows.mockup'
import {
  macPaletteTabPaths,
  paletteTabLabels,
  paletteTabPaths,
  paletteTabs,
  type OpenPaletteView,
} from './paletteViews'
import styles from '../../../../../src/ui/components/palette/CommandPalette.module.css'

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
function repositoryEntries(selected: string): MenuEntryData[] {
  return [
    {
      kind: 'item',
      label: 'All repositories',
      checked: selected === 'All repositories',
      highlighted: true,
    },
    { kind: 'divider' },
    ...Object.values(repositories).map((repository): MenuEntryData => ({
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
          <actionButton.Component
            expanded={filters.repositoryMenu}
            icon="folder-git-2"
            menu
            moklyInstance="repository-filter"
            tone="plain"
            trailing={chevron}
          >
            {filters.repository}
          </actionButton.Component>
        </ScreenLink>
        {filters.repositoryMenu && !props.mobile ? (
          <menu.Component
            entries={repositoryEntries(filters.repository)}
            label="Repository"
            moklyInstance="repository-menu"
            placement="below-end"
          />
        ) : null}
      </span>
      <ScreenLink
        asChild
        to={archived ? paths.paletteWorkspaces : paths.paletteArchived}
      >
        <actionButton.Component
          icon="archive"
          menu
          moklyInstance="state-filter"
          tone="plain"
          trailing={chevron}
        >
          {filters.state}
        </actionButton.Component>
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
      <linkTabs.Component
        label="Search in"
        moklyInstance="palette-tabs"
        tabs={tabs}
      />
      {content.filters && !props.mobile ? (
        <Filters filters={content.filters} mobile={false} />
      ) : null}
    </div>
  )
}

/**
 * The palette on a phone: a page that fills the screen, with the search
 * field and Cancel at the top. Cancel goes back to the list, where the
 * Search row opened it. `content` is the content of `view` and `context`.
 */
function PalettePage(props: {
  content: PaletteContent
  view: OpenPaletteView
  context: PaletteContext
}) {
  const { content } = props
  return (
    <section aria-label="Search" className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageField}>
          <SearchField content={content} mobile />
        </div>
        <ScreenLink asChild to={paths.shell}>
          <actionButton.Component moklyInstance="cancel-search" tone="plain">
            Cancel
          </actionButton.Component>
        </ScreenLink>
      </header>
      <TabBar content={content} mobile />
      {content.filters ? (
        <div className={styles.pageFilters}>
          <Filters filters={content.filters} mobile />
        </div>
      ) : null}
      <paletteResults.Component context={props.context} view={props.view} />
      {content.filters?.repositoryMenu ? (
        <sheet.Component moklyInstance="repository-sheet" title="Repository">
          <menu.Component
            entries={repositoryEntries(content.filters.repository)}
            label="Repository"
            moklyInstance="repository-menu"
            placement="sheet"
          />
        </sheet.Component>
      ) : null}
    </section>
  )
}

/**
 * The command palette: one search for the workspaces of the org, the
 * actions of the current page, and the settings. A desktop shows it as a
 * dialog near the top of the window, over the dimmed app, and each command
 * row ends with the first key of its command that works there. A browser
 * page draws a normal Chrome tab on a Mac, which keeps ⌘N, so New
 * workspace shows ⌥⌘N. A phone shows the palette as a page, without keys.
 */
export function CommandPalette(props: {
  view: OpenPaletteView
  context: PaletteContext
  viewport: Viewport
}) {
  const { context } = props
  const content = paletteContent(props.view, context)
  if (props.viewport === 'mobile') {
    return <PalettePage content={content} context={context} view={props.view} />
  }
  const keys: PaletteKeys = {
    changes: context.shortcuts ?? {},
    host: pageHost(context.mac === true),
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
        <TabBar content={content} mac={context.mac} mobile={false} />
        <paletteResults.Component
          context={context}
          keys={keys}
          view={props.view}
        />
      </section>
    </div>
  )
}
