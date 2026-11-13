import { useEffect, useMemo, useState } from 'react'
import { domBackendCss } from '@firna/ui'
import { SharedUiThemeProvider } from '@firna/ui/theme'
import { themeFor, tokensCss } from '../../../docs/mockups/src/theme'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
} from '../../app/workspace-store'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { listLabel } from '../model/file-labels'
import type { WorkspaceFiles } from '../model/files-store'
import type { FilesNavigation, FilesTab, FilesTarget } from '../navigation'
import { DiffPage } from '../page/DiffPage'
import type { FileActionTargets } from '../page/file-actions'
import { FilePage } from '../page/FilePage'
import { FilesPanel, useFilesSnapshot } from '../panel/FilesPanel'
import { FileTabItem } from '../tabs/FileTabItem'
import { editOpenTab, playRecordedUpdates } from './dev-events'
import { devNow, RepairControls } from './RepairControls'
import {
  readView,
  sameTab,
  viewAfter,
  viewQuery,
  withTab,
  type DevView,
} from './dev-view'
import styles from './DevApp.module.css'

/** The workspace of the fake API. */
const workspace: WorkspaceIdentity = {
  orgId: FAKE_IDS.org,
  workspaceId: FAKE_IDS.workspace,
}

/** Starts the store: its first reads and its events. The result stops them. */
function startFiles(files: WorkspaceFiles): () => void {
  files.start()
  return () => files.stop()
}

/** The code tab that the mockup keeps open beside the other tabs. */
const codeTab: FilesTab = {
  kind: 'file',
  path: 'src/app/checkout/useAddressAutocomplete.ts',
  mode: 'preview',
}

function Page(props: {
  files: WorkspaceFiles
  tab: FilesTab
  view: DevView
  navigation: FilesNavigation
  targets: FileActionTargets
}) {
  const { tab } = props
  const common = {
    files: props.files,
    layout: props.view.layout,
    navigation: props.navigation,
    targets: props.targets,
  }
  return tab.kind === 'file' ? (
    <FilePage {...common} key={tab.path} tab={tab} />
  ) : (
    <DiffPage {...common} key={tab.path} tab={tab} />
  )
}

/**
 * Development page of the Files screens against the fake API. It stands in
 * for the shell: it keeps the view in the address and the open tabs in
 * memory, where the product keeps them in the workspace view.
 */
export function DevApp(props: {
  server: FakeApiServer
  /** Makes the store of the page. Keep it stable, as a module function. */
  createFiles: (workspace: WorkspaceIdentity) => WorkspaceFiles
  /** The Copy and Download of the page, created once. */
  targets: FileActionTargets
}) {
  const { server } = props
  const { store: files } = useWorkspaceStore(workspace, {
    create: props.createFiles,
    connect: startFiles,
  })
  const [view, setView] = useState(() => readView(location.search))
  const [tabs, setTabs] = useState(() =>
    view.active ? withTab([codeTab], view.active) : [codeTab],
  )
  const [edits, setEdits] = useState(0)
  useEffect(() => {
    const onPop = () => {
      const next = readView(location.search)
      setView(next)
      if (next.active) setTabs((open) => withTab(open, next.active ?? codeTab))
    }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])
  const show = (next: DevView) => {
    setView(next)
    if (next.active) setTabs((open) => withTab(open, next.active ?? codeTab))
    history.pushState(null, '', viewQuery(next))
  }
  const navigation: FilesNavigation = useMemo(
    () => ({
      href: (target: FilesTarget) => viewQuery(viewAfter(view, target)),
      navigate: (target: FilesTarget) => show(viewAfter(view, target)),
      // The page has no saved view, so each tab that it opens stays open.
      keep: () => {},
    }),
    [view],
  )
  const snapshot = useFilesSnapshot(files)
  const close = (tab: FilesTab) => {
    const rest = tabs.filter((open) => !sameTab(open, tab))
    setTabs(rest)
    if (view.active && sameTab(view.active, tab)) {
      show({ ...view, active: rest.at(-1) ?? null })
    }
  }
  const panel = (
    <FilesPanel
      activeTab={view.active}
      files={files}
      layout={view.layout}
      list={view.list}
      navigation={navigation}
      now={devNow}
    />
  )
  const page = view.active ? (
    <Page
      files={files}
      navigation={navigation}
      tab={view.active}
      targets={props.targets}
      view={view}
    />
  ) : null
  return (
    <SharedUiThemeProvider theme={themeFor(view.theme)}>
      <style>{domBackendCss}</style>
      <style>{tokensCss(view.theme)}</style>
      {view.layout === 'phone' ? (
        <main className={styles.phone}>{page ?? panel}</main>
      ) : (
        <div className={styles.desktop}>
          <main className={styles.center}>
            <nav aria-label="Open files" className={styles.tabBar}>
              <ul className={styles.tabs}>
                {tabs.map((tab) => (
                  <FileTabItem
                    key={`${tab.kind}:${tab.path}`}
                    label={listLabel(snapshot, tab.path, tab.kind)}
                    navigation={navigation}
                    onClose={() => close(tab)}
                    selected={view.active !== null && sameTab(view.active, tab)}
                    tab={tab}
                  />
                ))}
              </ul>
            </nav>
            {page ?? (
              <div className={styles.waiting}>
                Open a file or a change from the list.
              </div>
            )}
          </main>
          <aside aria-label="Files" className={styles.right}>
            {panel}
          </aside>
        </div>
      )}
      {view.controls ? (
        <div className={styles.controls}>
          <button
            onClick={() =>
              show({
                ...view,
                layout: view.layout === 'phone' ? 'desktop' : 'phone',
              })
            }
            type="button"
          >
            {view.layout === 'phone' ? 'Desktop' : 'Phone'}
          </button>
          <button
            onClick={() =>
              show({ ...view, theme: view.theme === 'dark' ? 'light' : 'dark' })
            }
            type="button"
          >
            {view.theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={() =>
              location.assign(
                viewQuery({
                  ...view,
                  scenario: view.scenario === 'live' ? 'mockup' : 'live',
                }),
              )
            }
            type="button"
          >
            {view.scenario === 'live' ? 'Mockup data' : 'Live data'}
          </button>
          <button onClick={() => playRecordedUpdates(server)} type="button">
            Play the recorded updates
          </button>
          <RepairControls files={files} server={server} />
          {view.active ? (
            <button
              onClick={() => {
                const edit = edits + 1
                setEdits(edit)
                if (view.active)
                  void editOpenTab(server, files, view.active, edit)
              }}
              type="button"
            >
              Edit the open file
            </button>
          ) : null}
        </div>
      ) : null}
    </SharedUiThemeProvider>
  )
}
