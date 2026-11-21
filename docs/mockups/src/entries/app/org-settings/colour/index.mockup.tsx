import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../screens/orgSettingsState'

export const orgColour = defineScreen({
  title: 'Org colour',
  description:
    'An admin picked Green for Acme in the Colour section of the General tab. The tile of Acme in the rail now shows its initials and its outline in green while Acme is open. The tiles of the other orgs stay grey. Each swatch is a radio button, and a choice saves at once, without Save.',
  rationale:
    'Every open org drew the same blue tile, so a person in several orgs could miss which org was open. On 17 November 2026 the user chose one colour for each org that an admin sets, like the initials (org colour decision 1 A). Only the tile of the open org shows it, so the colour still marks the open org (decision 2 A). An org without a colour stays blue (decision 3 A). Each preset has its own ink for light and dark, at a contrast of 4.5:1 or more on the tile.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, color: 'green' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
