import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { WorktreeSpaceScreen } from '../../../../screens/WorktreeSpaceScreen'
import { variationNotes, variationRationale } from '../variations'

export const worktreeSpaceLaptop = defineScreen({
  title: variationNotes.laptop.title,
  description: variationNotes.laptop.description,
  rationale: variationRationale,
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => (
    <WorktreeSpaceScreen variation="laptop" viewport={context.viewport} />
  ),
})
