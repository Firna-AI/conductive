import { useMemo, useState } from 'react'
import type { AppModel } from '../../../app/app-model'
import { memoryNavigation, NavigationContext } from '../../../app/navigation'
import { PanelLayout } from '../../../app/panels'
import { routes } from '../../../app/router'
import { ServicesContext } from '../../../app/services'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
} from '../../../app/workspace-store'
import type { WorkspaceFiles } from '../../../files/model/files-store'
import type { FileListKind, FilesNavigation } from '../../../files/navigation'
import { FilesPanel } from '../../../files/panel/FilesPanel'
import type { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { AppModelContext } from '../../context'
import { PanelContext } from '../../layout/panels'
import { Shell } from '../../Shell'
import { ThemeRoot } from '../../ui/ThemeRoot'
import { useViewport, ViewportProvider } from '../../ui/viewport'
import {
  FeaturesContext,
  type WorkspaceContext,
  type WorkspaceFeatures,
} from '../features'
import { startFiles } from '../files/files-store'
import type { DevOptions } from './dev-options'
import { DevControls } from './DevControls'

/** The workspace of the fake API. */
const devWorkspace: WorkspaceIdentity = {
  orgId: FAKE_IDS.org,
  workspaceId: FAKE_IDS.workspace,
}

/** The Files panel in its place, with its list in the memory of the page. */
function DevFiles(props: {
  context: WorkspaceContext
  files: WorkspaceFiles
  list: FileListKind
  now: () => number
}) {
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
      files={props.files}
      layout={props.context.viewport}
      list={list}
      navigation={navigation}
      now={props.now}
    />
  )
}

/**
 * The development page of the notices of a failed repair: the app shell
 * with the open workspace and its Files panel, over the fake API. The
 * address sets the stored failures and the layout, as `DevOptions` says.
 * A first-start state opens `workspaceId`, the new workspace, with the
 * app's own Files part, so the panel shows the state of its sandbox.
 */
export function DevPage(props: {
  app: AppModel
  server: FakeApiServer
  /** Makes the store of the Files panel. Keep it stable, as a module function. */
  createFiles: (workspace: WorkspaceIdentity) => WorkspaceFiles
  options: DevOptions
  now: () => number
  /** The workspace that the page opens. */
  workspaceId: string
}) {
  const { app, options, now } = props
  const { store: files } = useWorkspaceStore(devWorkspace, {
    create: props.createFiles,
    connect: startFiles,
  })
  const measured = useViewport()
  const [mounts, setMounts] = useState(0)
  const [navigation] = useState(() =>
    memoryNavigation(
      routes.workspace(
        FAKE_IDS.org,
        props.workspaceId,
        ...(options.view === 'chat' ? [] : [options.view]),
      ),
    ),
  )
  const [panels] = useState(() => new PanelLayout(null))
  const features = useMemo<WorkspaceFeatures>(
    () =>
      options.start
        ? {}
        : {
            files: (context) => (
              <DevFiles
                context={context}
                files={files}
                list={options.list}
                now={now}
              />
            ),
          },
    [files, options.start, options.list, now],
  )
  return (
    <ServicesContext.Provider value={app.services}>
      <AppModelContext.Provider value={app}>
        <NavigationContext.Provider value={navigation}>
          <PanelContext.Provider value={panels}>
            <FeaturesContext.Provider value={features}>
              <ViewportProvider viewport={options.viewport ?? measured}>
                <ThemeRoot scheme={options.scheme}>
                  <Shell key={mounts} />
                  {options.controls ? (
                    <DevControls
                      files={files}
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
