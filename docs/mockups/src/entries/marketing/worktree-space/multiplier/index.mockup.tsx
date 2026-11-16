import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { WorktreeSpaceScreen } from '../../../../screens/WorktreeSpaceScreen'
import { variationNotes, variationRationale } from '../variations'

export const worktreeSpaceMultiplier = defineScreen({
  title: variationNotes.multiplier.title,
  description: variationNotes.multiplier.description,
  rationale: variationRationale,
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => (
    <WorktreeSpaceScreen variation="multiplier" viewport={context.viewport} />
  ),
})
