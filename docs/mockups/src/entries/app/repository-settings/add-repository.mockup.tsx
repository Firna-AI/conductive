import { defineScreen } from '@mokly/mokly'
import { AddRepositoryScreen } from '../../../screens/AddRepositoryScreen'

export const addRepository = defineScreen({
  title: 'Add repository',
  description:
    'Choose a GitHub repository and an optional startup script. Adding it prepares its first base.',
  relatedDocs: [],
  render: (_props, context) => (
    <AddRepositoryScreen viewport={context.viewport} />
  ),
})
