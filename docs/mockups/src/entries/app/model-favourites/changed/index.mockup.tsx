import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const modelFavouritesChanged = defineScreen({
  title: 'A changed effort',
  description:
    'The member picked Opus 5.5 High, then chose Max in the submenu of Effort. The trigger reads "Opus 5.5 Max". No favourite is marked, because none is Opus 5.5 Max with Fast off. The favourite Opus 5.5 Max Fast has fast mode on. The Effort row reads "Effort Max".',
  rationale:
    'The user asked on 16 November 2026 that the effort and Fast stay open to change after a pick. A favourite is marked only when it matches the current choice exactly, with its fast mode, so the menu never claims that a changed choice is a favourite. Moved here from a saved state of the Model favourites page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker', modelChoice: 'max' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
