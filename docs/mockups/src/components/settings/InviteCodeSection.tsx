import { InputFrame } from '@firna/ui/input'
import { inviteLimit, joinLink, ownInvite } from '../../fixtures/waitlist'
import { noop } from '../../../../../src/ui/noop'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { inlineText } from '../../entries/components/common/InlineText.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import {
  inviteCodeCopy as copy,
  type InviteState,
} from '../../../../../src/ui/components/settings/inviteCodeCopy'
import {
  section,
  sectionText,
} from '../../entries/components/settings/Section.mockup'
import styles from '../../../../../src/ui/components/settings/InviteCodeSection.module.css'

/** How many of the invites are left, beside the title. */
function Count(props: { left: number }) {
  return (
    <span className={styles.count}>{copy.left(props.left, inviteLimit)}</span>
  )
}

/** The invite link with Copy, then the code alone, for a person who types it. */
function Share() {
  const { field } = useControlSizes()
  return (
    <>
      <div className={styles.link}>
        <InputFrame
          accessibilityLabel={copy.link}
          editable={false}
          onChangeText={noop}
          selectTextOnFocus
          size={field}
          value={joinLink(ownInvite.code)}
        />
        <actionButton.Component
          accessibilityLabel={copy.copyLink}
          icon="copy"
          moklyInstance="copy-invite-link"
        >
          {copy.copy}
        </actionButton.Component>
      </div>
      <sectionText.Component moklyInstance="invite-code-text" muted>
        <inlineText.Component
          moklyInstance="invite-code"
          text={copy.code(ownInvite.code)}
        />
      </sectionText.Component>
    </>
  )
}

/**
 * The invite code of the user, at the end of the account: the invite link
 * with Copy, the code, and how many of the invites are left. During the
 * pause the link stays, and a notice says when it works again. During open
 * sign-up the link stays too, and a notice says that anyone can sign up
 * now. The pause wins, so its notice shows when both are on. A code that
 * is used up or turned off shows no link, because it lets nobody in. A
 * user who just got in has used no invite yet.
 */
export function InviteCodeSection(props: {
  state: InviteState
  fresh: boolean
  openSignUp: boolean
}) {
  const left = inviteLimit - (props.fresh ? 0 : ownInvite.used)
  switch (props.state) {
    case 'left':
      if (props.openSignUp) {
        return (
          <section.Component
            moklyInstance="section"
            status={<Count left={left} />}
            title={copy.title}
          >
            <notice.Component
              body={copy.open.body}
              icon="door-open"
              moklyInstance="open-sign-up"
              title={copy.open.title}
            />
            <Share />
          </section.Component>
        )
      }
      return (
        <section.Component
          description={copy.description}
          moklyInstance="section"
          status={<Count left={left} />}
          title={copy.title}
        >
          <Share />
        </section.Component>
      )
    case 'paused':
      return (
        <section.Component
          moklyInstance="section"
          status={<Count left={left} />}
          title={copy.title}
        >
          <notice.Component
            body={copy.paused.body}
            icon="circle-pause"
            moklyInstance="invites-paused"
            title={copy.paused.title}
          />
          <Share />
        </section.Component>
      )
    case 'used-up':
      return (
        <section.Component
          moklyInstance="section"
          status={<Count left={0} />}
          title={copy.title}
        >
          <sectionText.Component moklyInstance="used-up-text">
            {copy.usedUp(inviteLimit)}
          </sectionText.Component>
        </section.Component>
      )
    case 'disabled':
      return (
        <section.Component
          moklyInstance="section"
          status={
            <statusText.Component
              label={copy.off}
              moklyInstance="invite-code-off"
              tone="muted"
            />
          }
          title={copy.title}
        >
          <sectionText.Component moklyInstance="disabled-text">
            {copy.disabled}
          </sectionText.Component>
        </section.Component>
      )
  }
}
