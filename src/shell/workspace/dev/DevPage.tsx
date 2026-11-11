import { useMemo, useState } from 'react'
import type { AppModel } from '../../../app/app-model'
import { memoryNavigation, NavigationContext } from '../../../app/navigation'
import { PanelLayout } from '../../../app/panels'
import { routes } from '../../../app/router'
import { ServicesContext } from '../../../app/services'
import type { FileListKind, FilesNavigation } from '../../../files/navigation'
import { FilesPanel } from '../../../files/panel/FilesPanel'
import type { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { AppModelContext } from '../../context'
import { PanelContext } from '../../layout/panels'
import { PaletteProvider } from '../../palette/PaletteProvider'
import { Shell } from '../../Shell'
import { ThemeRoot } from '../../ui/ThemeRoot'
import { useViewport, ViewportProvider } from '../../ui/viewport'
import {
  FeaturesContext,
  type WorkspaceContext,
  type WorkspaceFeatures,
} from '../features'
import { useKeptFiles } from '../files/workspace-files'
import type { DevOptions } from './dev-options'
import { DevControls } from './DevControls'

/**
 * The Files panel in its place, with its list in the memory of the page. It
 * reads the kept files, which the workspace screen connects.
 */
function DevFiles(props: {
  context: WorkspaceContext
  list: FileListKind
  now: () => number
}) {
  const files = useKeptFiles(props.context)
  const [list, setList] = useState(props.list)
  const navigation = useMemo<FilesNavigation>(
    () => ({
      href: (target) => (target.kind === 'list' ? `?list=${target.list}` : '#'),
      navigate: (target) => {
        if (target.kind === 'list') setList(target.list)
      },
    }),
    [],
  )
  return (
    <FilesPanel
      activeTab={null}
      files={files}
      layout={props.context.viewport}
      list={list}
      navigation={navigation}
      now={props.now}
    />
  )
}

/**
 * The development page of the notices of a failed repair and of the actions
 * of the pull request bar: the app shell with the open workspace and its
 * Files panel, over the fake API. The address sets the stored failures, the
 * layout, and the bar, as `DevOptions` says. A first-start state opens
 * `workspaceId`, the new workspace, with the app's own Files part, so the
 * panel shows the state of its sandbox. The bar uses the app's own Files
 * part too, so a phone shows the actions at the top of Checks.
 */
export function DevPage(props: {
  app: AppModel
  server: FakeApiServer
  options: DevOptions
  now: () => number
  /** The workspace that the page opens. */
  workspaceId: string
}) {
  const { app, options, now } = props
  const measured = useViewport()
  const [mounts, setMounts] = useState(0)
  const [navigation] = useState(() =>
    memoryNavigation(
      routes.workspace(
        FAKE_IDS.org,
        props.workspaceId,
        ...(options.view === 'chat' ? [] : [options.view]),
        // The app's own Files part reads its list from the address.
        ...(options.bar && options.view === 'files' ? [options.list] : []),
      ),
    ),
  )
  const [panels] = useState(() => new PanelLayout(null))
  const features = useMemo<WorkspaceFeatures>(
    () =>
      options.start || options.bar
        ? {}
        : {
            files: (context) => (
              <DevFiles context={context} list={options.list} now={now} />
            ),
          },
    [options.start, options.bar, options.list, now],
  )
  return (
    <ServicesContext.Provider value={app.services}>
      <AppModelContext.Provider value={app}>
        <NavigationContext.Provider value={navigation}>
          <PanelContext.Provider value={panels}>
            <FeaturesContext.Provider value={features}>
              <ViewportProvider viewport={options.viewport ?? measured}>
                <ThemeRoot scheme={options.scheme}>
                  <PaletteProvider>
                    <Shell key={mounts} />
                  </PaletteProvider>
                  {options.controls ? (
                    <DevControls
                      now={now}
                      onNewView={() => setMounts((count) => count + 1)}
                      server={props.server}
                    />
                  ) : null}
                </ThemeRoot>
              </ViewportProvider>
            </FeaturesContext.Provider>
          </PanelContext.Provider>
        </NavigationContext.Provider>
      </AppModelContext.Provider>
    </ServicesContext.Provider>
  )
}
