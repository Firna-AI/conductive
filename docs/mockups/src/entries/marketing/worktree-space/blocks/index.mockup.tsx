import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { WorktreeSpaceScreen } from '../../../../screens/WorktreeSpaceScreen'
import { variationNotes, variationRationale } from '../variations'

export const worktreeSpaceBlocks = defineScreen({
  title: variationNotes.blocks.title,
  description: variationNotes.blocks.description,
  rationale: variationRationale,
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => (
    <WorktreeSpaceScreen variation="blocks" viewport={context.viewport} />
  ),
})
