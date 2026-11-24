import type { SchemaProps } from '@mokly/mokly'
import {
  accountGeneral,
  accountSchema,
  type AccountState,
} from './accountState'

const shared = accountSchema.properties

/**
 * The state of the Preferences tab of the Account page in the phone apps:
 * the notices of the device, and the states that Preferences shares with
 * the web app. It offers no other tab and no host of the shortcuts, so no
 * control draws a tab of the web app inside the phone apps, such as the
 * Keyboard shortcuts of Chrome on a Mac.
 */
export const phonePreferencesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['notices', 'favourites', 'save', 'view', 'modelMenu'],
  properties: {
    notices: shared.notices,
    favourites: shared.favourites,
    save: shared.save,
    view: shared.view,
    modelMenu: shared.modelMenu,
  },
} as const

type PhonePreferencesState = SchemaProps<typeof phonePreferencesSchema>

/** The saved Preferences of Cal, with the notices off after a denial. */
export const deniedPreferences: PhonePreferencesState = {
  notices: 'denied',
  favourites: accountGeneral.favourites,
  save: accountGeneral.save,
  view: accountGeneral.view,
  modelMenu: accountGeneral.modelMenu,
}

/** The Account page of Cal on Preferences, in a state of the phone apps. */
export function phonePreferences(state: PhonePreferencesState): AccountState {
  return { ...accountGeneral, tab: 'preferences', ...state }
}
