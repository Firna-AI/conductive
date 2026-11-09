import { InputFrame } from '@firna/ui/input'
import { CirclePause, Copy } from 'lucide-react'
import { inviteLimit, joinLink, ownInvite } from '../../fixtures/waitlist'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { InlineText } from '../common/InlineText'
import { Notice } from '../common/Notice'
import { StatusText } from '../common/StatusText'
import { useControlSizes } from '../common/touch'
import { inviteCodeCopy as copy, type InviteState } from './inviteCodeCopy'
import { Section, SectionText } from './Section'
import styles from './InviteCodeSection.module.css'

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
        <ActionButton accessibilityLabel={copy.copyLink} icon={Copy}>
          {copy.copy}
        </ActionButton>
      </div>
      <SectionText muted>
        <InlineText text={copy.code(ownInvite.code)} />
      </SectionText>
    </>
  )
}

/**
 * The invite code of the user, beside the GitHub sign-in: the invite link
 * with Copy, the code, and how many of the invites are left. During the
 * pause the link stays, and a notice says when it works again. A code
 * that is used up or turned off shows no link, because it lets nobody in.
 * A user who just got in has used no invite yet.
 */
export function InviteCodeSection(props: {
  state: InviteState
  fresh: boolean
}) {
  const left = inviteLimit - (props.fresh ? 0 : ownInvite.used)
  switch (props.state) {
    case 'left':
      return (
        <Section
          description={copy.description}
          status={<Count left={left} />}
          title={copy.title}
        >
          <Share />
        </Section>
      )
    case 'paused':
      return (
        <Section status={<Count left={left} />} title={copy.title}>
          <Notice
            body={copy.paused.body}
            icon={CirclePause}
            title={copy.paused.title}
          />
          <Share />
        </Section>
      )
    case 'used-up':
      return (
        <Section status={<Count left={0} />} title={copy.title}>
          <SectionText>{copy.usedUp(inviteLimit)}</SectionText>
        </Section>
      )
    case 'disabled':
      return (
        <Section
          status={<StatusText label={copy.off} tone="muted" />}
          title={copy.title}
        >
          <SectionText>{copy.disabled}</SectionText>
        </Section>
      )
  }
}
