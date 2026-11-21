import { nameLabel } from '../../../../../../src/shared/name-label'
import type { WorkspaceTab } from '../../../components/workspace/TabItem'
import { workspaceSessions } from '../../../fixtures/sessions'
import { paths } from '../../../paths'

const [first, second] = workspaceSessions

/**
 * The tabs that the pages of the tab parts show: the two sessions of
 * Checkout address autocomplete, with the first one shown, and the code
 * file that stays open, as the workspace screen draws them.
 */
export const openTabs: readonly WorkspaceTab[] = [
  {
    key: first.key,
    kind: 'session',
    title: nameLabel(first.title),
    to: paths.app,
    selected: true,
  },
  {
    key: second.key,
    kind: 'session',
    title: nameLabel(second.title),
    selected: false,
  },
  {
    key: 'code',
    kind: 'code',
    title: 'useAddressAutocomplete.ts',
    to: paths.code,
    selected: false,
  },
]
