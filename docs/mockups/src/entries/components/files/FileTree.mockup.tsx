import { defineComponent } from '@mokly/mokly'
import { FileTree } from '../../../components/files/FileTree'
import { fileTree as branchTree } from '../../../fixtures/files'
import { treeEntrySchema, treePreviews } from './fileSchemas'
import { fileRowMenuSchema, pointerMenu } from './rowMenuSchemas'

/**
 * All files as a tree, registered with Mokly. Its pages show the tree of
 * the branch, the same tree with a file open, and the menu of a folder.
 */
export const fileTree = defineComponent({
  slug: 'file-tree',
  title: 'File tree',
  description:
    'Every file of the workspace branch, as a tree: a chevron for each folder, the icon and the name of each entry, and the mark of each change. A file opens as a tab of the centre column, and the row of the open file is marked. A right click opens the menu of a row at the pointer, and the row keeps the fill of a hover. Its own page shows the tree of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['entries'],
    properties: {
      entries: { type: 'array', items: treeEntrySchema },
      /** The tab of the open file, whose row is marked. */
      open: { enum: treePreviews },
      /** The page of the Markdown file, when it differs from its preview. */
      markdownTo: { type: 'string', minLength: 1 },
      /** The open menu of a row, at the pointer or under a sheet. */
      menu: fileRowMenuSchema,
    },
  } as const,
  props: { entries: branchTree },
  render: (props) => (
    <FileTree
      entries={props.entries}
      markdownTo={props.markdownTo}
      menu={props.menu}
      open={props.open}
    />
  ),
  variants: [
    {
      slug: 'file-open',
      title: 'File open',
      description: 'The hook of the branch is the open tab.',
      props: { open: 'code' },
    },
    {
      slug: 'menu',
      title: 'Row menu',
      description:
        'A right click on the folder src/app/checkout opened its menu at the pointer: Add to chat, then Copy path.',
      props: { menu: pointerMenu('src/app/checkout') },
    },
  ],
})
