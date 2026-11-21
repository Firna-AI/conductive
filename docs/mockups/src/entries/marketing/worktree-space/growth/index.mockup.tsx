import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { WorktreeSpaceScreen } from '../../../../screens/WorktreeSpaceScreen'
import { variationNotes, variationRationale } from '../variations'

export const worktreeSpaceGrowth = defineScreen({
  title: variationNotes.growth.title,
  description: variationNotes.growth.description,
  rationale: variationRationale,
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => (
    <WorktreeSpaceScreen variation="growth" viewport={context.viewport} />
  ),
})
