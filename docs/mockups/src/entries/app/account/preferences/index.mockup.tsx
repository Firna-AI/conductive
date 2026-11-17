import { defineScreen } from '@mokly/mokly'
import { AccountScreen } from '../../../../screens/AccountScreen'
import { accountGeneral, accountSchema } from '../../../../screens/accountState'

export const preferences = defineScreen({
  title: 'Preferences',
  description:
    'The Preferences tab of the account holds the New workspaces section: the model and the effort that new workspaces start with, and how New workspace opens on a computer, as the page or as a dialog over the current screen. A helper line under the choice says that a phone always opens the page. Each change saves at once. A new account gets the dialog. An account made before 12 November 2026 keeps the page, as this screen shows.',
  rationale:
    'The user asked for a Preferences screen in the user settings on 8 November 2026, with a choice to open New workspace as a dialog. The user chose option B of decision 142 of PR #73: the New workspaces section moves here from General, so all the settings of new workspaces sit together. The choice belongs to the account, so it follows the user to each browser and to the Mac app. A phone shows a dialog as a sheet that fills the screen, as the page already does, so a phone always opens the page. On 12 November 2026 the user asked for the dialog as the default for new users, so an existing account keeps the page that it had.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { ...accountGeneral, tab: 'preferences' },
  useCasePaths: ['user-flows/create-workspace-dialog'],
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'not-saved',
      title: 'Not saved',
      description:
        'The user chose Dialog, and the save failed. The choice keeps Page, the saved value, and the error under it says that the choice was not saved. Choosing Dialog again tries again.',
      rationale:
        'Each change saves at once, as Model and effort does, so the section has no Save. A failed save keeps the saved choice, so the tab never shows a choice that the account does not hold.',
      props: { view: 'page', save: 'failed' },
    },
    {
      slug: 'model-menu',
      title: 'Model menu',
      description:
        'The menu of Model and effort is open, with Fast on. New workspaces then start with fast mode on, and the trigger reads "Opus 5.5 High Fast". The Fast row shows no key here.',
      rationale:
        'The saved default is the choice of the same picker, so it carries fast mode too (fast mode decision 255). The key of Fast mode runs only where a session tab is shown (fast mode decision 258), so the row shows no key.',
      props: { modelMenu: 'open-fast' },
    },
  ],
})
