import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../../screens/AccountScreen'
import {
  accountGeneral,
  accountSchema,
} from '../../../../../screens/accountState'

export const modelFavouritesAdd = defineScreen({
  title: 'Add a favourite',
  description:
    'Cal keeps four favourites, so Add a favourite is on. A press opens the list of every model, in the two groups of All models: the Claude models, then the Codex models, with no brand names. The list marks no model, and it has no efforts and no Fast switch. On a computer it opens below the button. A phone opens it in a sheet, as Add trigger of an automation does. The pointer is on Opus 5.5. A pick adds the model at the end of the list, at the effort of the default of new workspaces, here High, or at the nearest lower effort of the model, or at its lowest effort, with Fast off. When that choice is already a favourite, the pick takes the nearest effort of the model that no favourite holds, lower efforts first. The list then saves at once, as each change of the section does.',
  rationale:
    'The user chose D of decision 4 on 22 November 2026, so one pick adds a favourite and never adds an exact copy, which the save would drop with no word. The picker of the new row then changes its effort and Fast. Option A, a new row with the default of new workspaces, option B, a pick that adds nothing for a copy, option C, a panel with a picker and Add, and the wider fix E were not chosen. The list is a menu of the section, not a model picker, so a phone opens it in a sheet: decision 5 B moves only the model pickers to a menu beside the picker, and the other menus stay a sheet. Add trigger also opens a list whose pick adds a row, and a phone opens it in a sheet.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, tab: 'preferences', favourites: 'add-open' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'added',
      title: 'After a pick',
      description:
        'Cal picked Opus 5.5. The default of new workspaces is Opus 5.5 High, which the list already holds, so the new favourite takes Medium: the nearest effort of Opus 5.5 that no favourite holds, lower efforts first. Opus 5.5 Medium joins the end of the list, with Fast off, and the list saves at once. The list now holds five, so Add a favourite is off, and the line under the list says that the menu shows five favourites at most. A pick of a model that no favourite holds at High, such as GPT-6 Astra, adds it at High. The keyboard focus moves to the picker of the new row, which changes its effort and Fast.',
      rationale:
        'Decision 4 D: a pick of a choice that the list already holds takes the nearest free effort, so the pick still adds a favourite. The member can get an effort that they did not pick, and the picker of the row changes it. A new favourite goes to the end, so the order that the member set stays, and a drag moves the new row. The focus goes to the new row, because the fifth favourite turns Add a favourite off, and the member often changes the effort next.',
      props: { favourites: 'added' },
    },
    {
      slug: 'no-free-effort',
      title: 'No free effort',
      description:
        'Cal keeps Opus 5.5 High, then Fable 5.1 at each of its three efforts: Low, Medium, and High. Fable 5.1 has no fast mode. Cal picked Fable 5.1 in the list of Add a favourite. No effort of Fable 5.1 is free, so the pick adds nothing, and the list does not save. The line under the list says "Fable 5.1 is already a favourite at every effort." It stays until the next pick or change. Add a favourite stays on, because the list holds four.',
      rationale:
        'Decision 4 D: when no effort of the picked model is free, the pick adds nothing, and a line says so, so a pick never ends with no word. Nothing failed, so the line is in the muted colour of the other lines of the section, not in the rose colour of an error. A screen reader reads it out when it shows.',
      props: { favourites: 'no-free-effort' },
    },
  ],
})
