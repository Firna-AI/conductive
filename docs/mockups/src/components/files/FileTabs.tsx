import type { ListState } from '../../fixtures/limitedFiles'
import type { BannerState } from '../../../../../src/ui/components/workspace/barModel'
import { checksPaths, paths } from '../../paths'
import { limitedListPaths } from '../../limitedListPaths'
import { linkTabs } from '../../entries/components/common/LinkTabs.mockup'
import { panelBar } from '../../entries/components/workspace/PanelBar.mockup'
import type { FileList } from './FilesPanel'

/** The pages that the All files and Changes tabs link to. */
type ListPages = { all: string; changes: string }

/**
 * The pages of the tabs for each state of the lists, so the tabs of limited
 * lists keep to the limited lists.
 */
const listPages: Readonly<Record<ListState, ListPages>> = {
  complete: { all: paths.filesAll, changes: paths.filesChanges },
  limited: {
    all: limitedListPaths.allFiles,
    changes: limitedListPaths.changes,
  },
}

/**
 * The All files, Changes, and Checks tabs, as links. `changes` is the count
 * of the Changes tab: the files of the whole change.
 */
export function FileTabs(props: {
  view: FileList
  changes: number
  banner: BannerState
  lists: ListState
}) {
  const pages = listPages[props.lists]
  return (
    <panelBar.Component moklyInstance="files-bar">
      <linkTabs.Component
        label="Files"
        moklyInstance="files-tabs"
        tabs={[
          {
            label: 'All files',
            to: pages.all,
            selected: props.view === 'all',
          },
          {
            label: 'Changes',
            to: pages.changes,
            ...(props.changes > 0 ? { count: props.changes } : {}),
            selected: props.view === 'changes',
          },
          {
            label: 'Checks',
            to: checksPaths[props.banner],
            selected: props.view === 'checks',
          },
        ]}
      />
    </panelBar.Component>
  )
}
