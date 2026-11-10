import type { ReactNode } from 'react'
import { replacesLists } from '../../../../docs/mockups/src/components/workspace/sandboxNoticeState'
import { useServices } from '../../../app/services'
import type { WorkspaceFiles } from '../../../files/model/files-store'
import type {
  FilesLayout,
  FilesNavigation,
  FilesTab,
} from '../../../files/navigation'
import { DiffPage } from '../../../files/page/DiffPage'
import { FilePage } from '../../../files/page/FilePage'
import { FilesPanel } from '../../../files/panel/FilesPanel'
import { ChecksActions } from '../../../github/BarButtons'
import { ChecksList } from '../../../github/ChecksList'
import type { WorkspaceContext, WorkspaceFeatures } from '../features'
import { useGitHubFeed, useScreenBar } from '../github/WorkspaceGitHub'
import { SandboxPanel } from '../SandboxNotice'
import { useSavedView } from '../saved-view'
import { filesPlace, tabOf } from './files-address'
import {
  useAddressList,
  useFilesNavigation,
  useOpenTab,
} from './files-navigation'
import { useFileTargets, useKeptFiles } from './workspace-files'

/** A file tab or a diff tab as a page, which keeps its tab in the saved view. */
function TabPage(props: {
  context: WorkspaceContext
  files: WorkspaceFiles
  tab: FilesTab
  navigation: FilesNavigation
  layout: FilesLayout
}) {
  const { tab } = props
  useOpenTab(props.context.savedView, tab)
  const targets = useFileTargets(props.context.org.id)
  const common = {
    files: props.files,
    layout: props.layout,
    navigation: props.navigation,
    targets,
  }
  return tab.kind === 'file' ? (
    <FilePage {...common} key={tab.path} tab={tab} />
  ) : (
    <DiffPage {...common} key={tab.path} tab={tab} />
  )
}

/**
 * The state of the sandbox in place of All files and Changes: while it
 * starts, while the app refuses its start, with the words of the refusal,
 * and after a failed first start, with Try again on a phone. A stopped
 * sandbox, and one whose later start failed, keep the lists, from the copy
 * that the workspace keeps.
 */
function sandboxPlaceholder(context: WorkspaceContext): ReactNode {
  const { panel } = context
  if (!panel || !replacesLists(panel)) return undefined
  return (
    <SandboxPanel
      phone={context.viewport === 'phone'}
      resume={context.resume}
      state={panel}
      workspace={context.workspace}
    />
  )
}

/**
 * All files, Changes, and Checks, in the right column on desktop and in the
 * Files tab of a phone, where a file or a diff shows as a page. This part
 * reads the kept files that the workspace screen connects. Checks shows the
 * GitHub state of the workspace screen, also while the sandbox shows in
 * place of the lists. On a phone, the actions of the bar top the Checks tab.
 */
function FilesPart(props: { context: WorkspaceContext }) {
  const { context } = props
  const files = useKeptFiles(context)
  const navigation = useFilesNavigation(context)
  const github = useGitHubFeed()
  const bar = useScreenBar()
  const { now } = useServices()
  const saved = useSavedView(context.savedView)
  const place = filesPlace(context.view)
  useAddressList(context.savedView, place?.kind === 'list' ? place.list : null)
  const tab = tabOf(place)
  const layout = context.viewport === 'phone' ? 'phone' : 'desktop'
  if (layout === 'phone' && tab) {
    return (
      <TabPage
        context={context}
        files={files}
        layout={layout}
        navigation={navigation}
        tab={tab}
      />
    )
  }
  const checks = github ? (
    <>
      {layout === 'phone' ? (
        <ChecksActions controls={bar?.controls ?? null} />
      ) : null}
      <ChecksList github={github} />
    </>
  ) : undefined
  return (
    <FilesPanel
      activeTab={tab}
      checks={checks}
      files={files}
      layout={layout}
      list={place?.kind === 'list' ? place.list : (saved?.fileList ?? 'all')}
      navigation={navigation}
      now={now}
      placeholder={sandboxPlaceholder(context)}
    />
  )
}

/** The file or diff tab of the address, in the centre of a desktop. */
function FilesCenter(props: { context: WorkspaceContext; tab: FilesTab }) {
  const { context } = props
  const files = useKeptFiles(context)
  const navigation = useFilesNavigation(context)
  return (
    <TabPage
      context={context}
      files={files}
      layout="desktop"
      navigation={navigation}
      tab={props.tab}
    />
  )
}

/** The Files screens as a part of the workspace: the lists, and their pages on a phone. */
export const filesFeatures: WorkspaceFeatures = {
  files: (context) => <FilesPart context={context} />,
}

/**
 * The file or diff tab of the address, which the kept chat shows in place
 * of the chat of its session on desktop, or null. A phone shows it in the
 * Files tab, and an archived workspace keeps its chat only.
 */
export function filesCenter(context: WorkspaceContext): ReactNode {
  if (context.viewport === 'phone' || context.sandbox === 'archived') {
    return null
  }
  const tab = tabOf(filesPlace(context.view))
  return tab ? <FilesCenter context={context} tab={tab} /> : null
}
