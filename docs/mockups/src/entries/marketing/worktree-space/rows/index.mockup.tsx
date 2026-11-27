import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { WorktreeSpaceScreen } from '../../../../screens/WorktreeSpaceScreen'
import { variationNotes, variationRationale } from '../variations'

export const worktreeSpaceRows = defineScreen({
  title: variationNotes.rows.title,
  description: variationNotes.rows.description,
  rationale: variationRationale,
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => (
    <WorktreeSpaceScreen variation="rows" viewport={context.viewport} />
  ),
})
