import { actionButton } from '../../entries/components/common/actions.mockup'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import {
  section,
  sectionText,
} from '../../entries/components/settings/Section.mockup'
import { phonePaths } from '../../phonePaths'
import { ScreenLink } from '../common/ScreenLink'
import { noticesSectionCopy as copy } from './noticeCopy'
import type { NoticeSetting } from './noticeSettings'

/**
 * The action of the section. After a denial only the settings of the
 * phone turn the notices on, and they also turn them off. After Not now
 * the app can still ask the system, so Turn on notices opens its alert.
 */
function NoticesAction(props: { setting: NoticeSetting }) {
  if (props.setting === 'not-now') {
    return (
      <ScreenLink asChild to={phonePaths.noticesSystemPreferences}>
        <actionButton.Component moklyInstance="notices-turn-on" tone="primary">
          {copy.turnOn}
        </actionButton.Component>
      </ScreenLink>
    )
  }
  return (
    <actionButton.Component
      icon="arrow-up-right"
      moklyInstance="notices-open-settings"
    >
      {copy.openSettings}
    </actionButton.Component>
  )
}

/**
 * The Notices section of Preferences, which only the phone apps show: what
 * the notices are for, whether they are on, and the one action that
 * changes them.
 */
export function NoticesSection(props: { setting: NoticeSetting }) {
  const on = props.setting === 'on'
  const line =
    props.setting === 'denied' ? copy.denied : on ? copy.enabled : undefined
  return (
    <section.Component
      actions={<NoticesAction setting={props.setting} />}
      description={copy.description}
      moklyInstance="notices"
      status={
        <statusText.Component
          label={on ? copy.on : copy.off}
          moklyInstance="notices-state"
          tone={on ? 'success' : 'muted'}
        />
      }
      title={copy.title}
    >
      {line === undefined ? null : (
        <sectionText.Component moklyInstance="notices-line">
          {line}
        </sectionText.Component>
      )}
    </section.Component>
  )
}
