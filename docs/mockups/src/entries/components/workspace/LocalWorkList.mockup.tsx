import { defineComponent } from '@mokly/mokly'
import { LocalWorkList } from '../../../../../../src/ui/components/workspace/LocalWorkList'
import { unpushedWork } from '../../../fixtures/barActions'

/** The local work that the question of Continue lists, registered with Mokly. */
export const localWorkList = defineComponent({
  slug: 'local-work-list',
  title: 'Local work list',
  description:
    'The local work that the question of Continue lists: each changed file that is not committed, and the commits that no remote branch holds, on every local branch, and the rows that a caller adds after them, such as a pull request. The app and the mockups share it. Its own page shows two changed files and one commit.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['files', 'commits'],
    properties: {
      /** The paths of the changed files that are not committed. */
      files: { type: 'array', items: { type: 'string' } },
      /** The commits that no remote branch holds. */
      commits: { type: 'integer', minimum: 0 },
      /** The name of the list, such as the work that stays behind. */
      label: { type: 'string' },
    },
  } as const,
  slots: ['children'],
  props: { files: unpushedWork.files, commits: unpushedWork.commits },
  render: (props) => (
    <LocalWorkList
      commits={props.commits}
      files={props.files}
      label={props.label}
    >
      {props.children}
    </LocalWorkList>
  ),
  variants: [
    {
      slug: 'commits',
      title: 'Only commits',
      description: 'Commits that no remote branch holds, and no changed file.',
      props: { files: [], commits: 2 },
    },
  ],
})
