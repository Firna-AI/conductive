import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { WorktreeSpaceScreen } from '../../../screens/WorktreeSpaceScreen'
import { variationNotes, variationRationale } from './variations'

export const worktreeSpace = defineScreen({
  title: 'Worktree disk space (draft)',
  description: `A draft section of the home page: local worktrees fill a disk, because each one adds its own dependencies and build output, and Conductive keeps each workspace on its own cloud computer. This page shows variation ${variationNotes.rows.title}. Its child pages show each of the six variations.`,
  rationale: variationRationale,
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => (
    <WorktreeSpaceScreen variation="rows" viewport={context.viewport} />
  ),
})
