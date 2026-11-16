import { defineComponent } from '@mokly/mokly'
import { FileTree } from '../../../components/files/FileTree'
import { fileTree as branchTree } from '../../../fixtures/files'
import { treeEntrySchema, treePreviews } from './fileSchemas'

/**
 * All files as a tree, registered with Mokly. Its pages show the tree of
 * the branch, and the same tree with a file open.
 */
export const fileTree = defineComponent({
  slug: 'file-tree',
  title: 'File tree',
  description:
    'Every file of the workspace branch, as a tree: a chevron for each folder, the icon and the name of each entry, and the mark of each change. A file opens as a tab of the centre column, and the row of the open file is marked. Its own page shows the tree of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['entries'],
    properties: {
      entries: { type: 'array', items: treeEntrySchema },
      /** The tab of the open file, whose row is marked. */
      open: { enum: treePreviews },
    },
  } as const,
  props: { entries: branchTree },
  render: (props) => <FileTree entries={props.entries} open={props.open} />,
  variants: [
    {
      slug: 'file-open',
      title: 'File open',
      description: 'The hook of the branch is the open tab.',
      props: { open: 'code' },
    },
  ],
})
