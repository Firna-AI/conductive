import { defineComponent } from '@mokly/mokly'
import { ContinueDialog } from '../../../components/workspace/ContinueDialog'
import { checkoutAutocomplete } from '../../../fixtures/workspaces'
import { viewports } from '../common/viewports'
import { workspaceSchema } from '../workspaces/workspaceSchemas'

/**
 * The question of Continue, registered with Mokly. A screen that draws a
 * screen of another viewport passes `viewport`. Without it, a page of the
 * dialog draws the layout of its own view.
 */
export const continueDialog = defineComponent({
  slug: 'continue-dialog',
  title: 'Continue dialog',
  description:
    'The question of Continue after its check found local work: the changed files move to the new branch, and the commits that no remote branch holds stay where they are. Cancel keeps the workspace on its branch. Its own page shows the question of Checkout address autocomplete.',
  relatedDocs: ['docs/mockups/design-bar.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['workspace'],
    properties: {
      workspace: workspaceSchema,
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
    },
  } as const,
  props: { workspace: checkoutAutocomplete },
  render: (props, context) => (
    <ContinueDialog
      viewport={props.viewport ?? context.viewport}
      workspace={props.workspace}
    />
  ),
})
