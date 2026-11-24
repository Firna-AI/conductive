import { defineComponent } from '@mokly/mokly'
import {
  fileLists,
  FilesPanel,
  treeStates,
} from '../../../components/files/FilesPanel'
import { pathStates } from '../../../fixtures/maskedFiles'
import { listStates } from '../../../fixtures/limitedFiles'
import { WorkspaceLinks } from '../../../screens/workspaceLinks'
import { bannerStates } from '../../../../../../src/ui/components/workspace/barModel'
import { fileTabViews } from './fileSchemas'
import { fileRowMenuSchema } from './rowMenuSchemas'

/**
 * The files panel of the workspace, registered with Mokly. A screen
 * supplies the state of a sandbox in place of the lists, and on a phone
 * the actions of the pull request bar above the checks. Limited lists send
 * the links of the panel to the pages of the large branch, as a workspace
 * screen does. Inside such a screen, the table of the screen stays.
 */
export const filesPanel = defineComponent({
  slug: 'files-panel',
  title: 'Files panel',
  description:
    'The files of the workspace: the All files, Changes, and Checks tabs, then the shown list. When the cloud computer could not read the files, All files keeps the saved list under a notice, or says that no list is available. The limited lists of a large branch each show a notice of the entries that they leave out, and the Changes tab counts the whole change. A right click on a row of All files or Changes opens its menu at the pointer. A screen can supply the state of a sandbox in place of the lists, and the actions of the pull request bar above the checks. Its own page shows the Changes of the branch.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['view', 'edited', 'banner', 'tree'],
    properties: {
      /** The shown tab. */
      view: { enum: fileLists },
      /** The branch has edits, so Changes lists them. */
      edited: { type: 'boolean' },
      /** The state of the pull request bar, which picks the checks. */
      banner: { enum: bannerStates },
      /** The list of All files: the latest, a saved one, or none. */
      tree: { enum: treeStates },
      /** The lists of All files and Changes: complete, or limited. */
      lists: { enum: listStates },
      /** The file of the open tab, whose row the lists mark. */
      open: { enum: fileTabViews },
      /** Two files whose labels hide a secret value. */
      paths: { enum: pathStates },
      /** The changes of these paths only, as after Continue. */
      only: { type: 'array', items: { type: 'string' } },
      /** The open menu of a row of the shown list. */
      menu: fileRowMenuSchema,
    },
  } as const,
  slots: ['placeholder', 'checksTop'],
  props: {
    view: 'changes',
    edited: true,
    banner: 'ready-to-merge',
    tree: 'latest',
  },
  render: (props) => (
    <WorkspaceLinks lists={props.lists}>
      <FilesPanel
        banner={props.banner}
        checksTop={props.checksTop}
        edited={props.edited}
        lists={props.lists}
        menu={props.menu}
        only={props.only}
        open={props.open}
        paths={props.paths}
        placeholder={props.placeholder}
        tree={props.tree}
        view={props.view}
      />
    </WorkspaceLinks>
  ),
  variants: [
    {
      slug: 'all-files',
      title: 'All files',
      description: 'The tree of All files, with the open code file marked.',
      props: { view: 'all', open: 'code' },
    },
    {
      slug: 'checks',
      title: 'Checks',
      description: 'The checks of a pull request whose checks failed.',
      props: { view: 'checks', banner: 'checks-failed' },
    },
    {
      slug: 'saved-list',
      title: 'Saved list',
      description:
        'The cloud computer could not read the files, so All files keeps the saved list under a notice.',
      props: { view: 'all', tree: 'saved' },
    },
    {
      slug: 'no-list',
      title: 'No list',
      description:
        'The cloud computer could not read the files, and no list was saved before.',
      props: { view: 'all', tree: 'none' },
    },
  ],
})
