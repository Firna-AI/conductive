import type { BannerState } from '../../../../../src/ui/components/workspace/barModel'
import { checksPaths, paths } from '../../paths'
import { linkTabs } from '../../entries/components/common/LinkTabs.mockup'
import { panelBar } from '../../entries/components/workspace/PanelBar.mockup'
import type { FileList } from './FilesPanel'

/**
 * The All files, Changes, and Checks tabs, as links. `changes` is the count
 * of the Changes tab: the files of the whole change. While the lists of the
 * workspace are limited, `ScreenLink` opens the limited pages of All files
 * and Changes, and Checks keeps its page.
 */
export function FileTabs(props: {
  view: FileList
  changes: number
  banner: BannerState
}) {
  return (
    <panelBar.Component moklyInstance="files-bar">
      <linkTabs.Component
        label="Files"
        moklyInstance="files-tabs"
        tabs={[
          {
            label: 'All files',
            to: paths.filesAll,
            selected: props.view === 'all',
          },
          {
            label: 'Changes',
            to: paths.filesChanges,
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
