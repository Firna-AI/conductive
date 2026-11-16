import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatFind = defineScreen({
  title: 'Find in a session',
  description:
    'Cal opened Find over the Address autocomplete session and typed “places”. The find bar sits at the top of the tab, under the tab row and above the chat, so it does not scroll with the chat. The field “Find in this tab” has the focus, and the count says “4 of 10”. Each match has a tint of amber, and the current match, in the call line that read `src/app/api/places/route.ts`, is solid amber. The count also holds the matches inside closed folds, such as the match in the closed work of the second turn. The current match was in the closed work of the first turn, so the bar opened that fold, and the fold stays open. Previous and Next go to the match before and after it, and their tooltips give ⌥⌘G and ⌘G. The terminal in the right column also shows “places”, but the bar searches only the shown tab, so it has no colour there. On a phone, the bar sits at the top of the tab, and the on-screen keyboard covers the message box and the tabs at the bottom, not the bar.',
  rationale:
    'The user chose B of find decision 1 on 13 November 2026: a find bar at the top of the shown tab, in a browser and in the Mac app, which ⌘F or Ctrl+F opens. It finds only the text of the shown tab, not the sidebar, the right column, or the message box. A match ignores case and stays inside one block, such as one line or one paragraph. Find skips the line numbers, the signs of a diff, the labels of controls, and the text that only screen readers hear. The app colours the matches with the CSS Custom Highlight API, which changes no element of the page, so a match has a fill and no border. A view runs no script, so a chat in which the bar opened a fold starts at its top. In the app, the bar scrolls the current match to the middle of the part of the tab that the reader sees.',
  relatedDocs: ['docs/protocol/find-in-tab.md'],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'find', find: 'found' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'no-match',
      title: 'No matches',
      description:
        'Cal typed “throttle”, which no text of the session holds. The count says “No matches”, Previous and Next are off, and the chat shows no colour. No fold opens, so the chat keeps its place at its newest message. On a phone, the keyboard stays open for the next query.',
      rationale:
        'The count is a live region, so a screen reader hears “No matches” as the query changes. The field keeps its text, so the person can correct one letter. Find decision 1 B searches only the shown tab, so in a browser a second ⌘F from the field opens the find of the browser, for text outside the tab.',
      props: { find: 'no-match' },
    },
    {
      slug: 'empty',
      title: 'Find just opened',
      description:
        'Find just opened, from ⌘F or from Find in the tab menu. The field is empty, has the focus, and shows “Find in this tab”. The bar shows no count, and Previous and Next are off. On a phone, a long press on the session tab opened the tab menu as a sheet, and Find in it opened the bar with the keyboard.',
      rationale:
        'An empty field finds nothing and shows no count, as the design of find decision 1 B says. The first Find since the page opened shows an empty field. When the shown tab changes, the bar closes and keeps its query in memory, so the next Find fills the field with that query.',
      props: { find: 'empty' },
    },
  ],
})
