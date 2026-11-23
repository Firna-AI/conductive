import { productName } from '../../../../../src/shared/brand'
import type { NoticeKind } from '../../fixtures/phoneNotices'

/**
 * The words of the ask for notices, which the phone app shows once, after
 * the member sends the first message of a turn.
 */
export const noticeAskCopy = {
  title: 'Know when an agent needs you',
  body: 'Get a notice when an agent asks for approval, a secret, or an answer, and when your turn finishes or fails.',
  privacy: 'A notice shows the workspace name, not the chat.',
  notNow: 'Not now',
  turnOn: 'Turn on notices',
} as const

/**
 * The words of the permission alert of the system. The system writes them,
 * so they follow iOS. Android draws its own alert with its own words.
 */
export const systemAlertCopy = {
  title: `“${productName}” Would Like to Send You Notifications`,
  body: 'Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.',
  deny: 'Don’t Allow',
  allow: 'Allow',
} as const

/**
 * The text of a notice: the kind of its event. The title of a notice is
 * the name of its workspace, and a notice holds no agent text.
 */
export const noticeKindCopy: Readonly<Record<NoticeKind, string>> = {
  approval: 'Needs approval',
  secret: 'Needs a secret',
  question: 'Needs an answer',
  finished: 'Turn finished',
  failed: 'Turn failed',
}

/** The words of the Notices section of Preferences in the phone apps. */
export const noticesSectionCopy = {
  title: 'Notices',
  description:
    'Know when an agent needs you, and when your turn finishes or fails.',
  on: 'On',
  off: 'Off',
  denied: 'Notices are off in the settings of this device.',
  enabled: 'Change them in the settings of this device.',
  openSettings: 'Open device settings',
  turnOn: 'Turn on notices',
} as const
