import { useEffect } from 'react'
import { useToast } from '@firna/ui/toast'
import { InputFrame } from '@firna/ui/input'
import { CirclePause, Copy, DoorOpen } from 'lucide-react'
import { InlineText } from '../../../docs/mockups/src/components/common/InlineText'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import {
  inviteCodeCopy as copy,
  type InviteState,
} from '../../../docs/mockups/src/components/settings/inviteCodeCopy'
import styles from '../../../docs/mockups/src/components/settings/InviteCodeSection.module.css'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import { joinPath, type WaitlistStateResponse } from '../../shared/waitlist'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import { useAction } from '../ui/useAction'

type InviteCode = NonNullable<WaitlistStateResponse['referralCode']>

/**
 * The state of the code: turned off by an operator, every invite used,
 * sign-ups paused, or invites left. A code that is off or used up lets
 * nobody in, so the pause does not matter for it.
 */
function inviteState(code: InviteCode, paused: boolean): InviteState {
  if (code.disabled) return 'disabled'
  if (code.uses >= code.useLimit) return 'used-up'
  return paused ? 'paused' : 'left'
}

/** How many of the invites are left, beside the title. */
function Count(props: { code: InviteCode }) {
  const left = Math.max(props.code.useLimit - props.code.uses, 0)
  return (
    <span className={styles.count}>{copy.left(left, props.code.useLimit)}</span>
  )
}

/** The invite link with Copy, then the code alone, for a person who types it. */
function Share(props: { code: string }) {
  const services = useServices()
  const { field } = useControlSizes()
  const { toast } = useToast()
  const link = new URL(joinPath(props.code), services.appOrigin).href
  const copyLink = useAction(async () => {
    await services.copy(link)
    toast({ title: 'The invite link is copied.', tone: 'success' })
  }, "The invite link didn't copy.")
  return (
    <>
      <div className={styles.link}>
        <InputFrame
          accessibilityLabel={copy.link}
          editable={false}
          onChangeText={() => undefined}
          selectTextOnFocus
          size={field}
          value={link}
        />
        <ActionButton
          accessibilityLabel={copy.copyLink}
          icon={Copy}
          onPress={copyLink.run}
        >
          {copy.copy}
        </ActionButton>
      </div>
      <SectionText muted>
        <InlineText text={copy.code(props.code)} />
      </SectionText>
    </>
  )
}

/**
 * The section of one invite code, in the state of the code. During open
 * sign-up, a code with invites left keeps its link under a notice that
 * anyone can sign up now. The pause wins, so its notice shows when both
 * are on.
 */
function CodeSection(props: {
  code: InviteCode
  paused: boolean
  openSignUp: boolean
}) {
  const { code } = props
  switch (inviteState(code, props.paused)) {
    case 'left':
      if (props.openSignUp) {
        return (
          <Section status={<Count code={code} />} title={copy.title}>
            <Notice
              body={copy.open.body}
              icon={DoorOpen}
              title={copy.open.title}
            />
            <Share code={code.code} />
          </Section>
        )
      }
      return (
        <Section
          description={copy.description}
          status={<Count code={code} />}
          title={copy.title}
        >
          <Share code={code.code} />
        </Section>
      )
    case 'paused':
      return (
        <Section status={<Count code={code} />} title={copy.title}>
          <Notice
            body={copy.paused.body}
            icon={CirclePause}
            title={copy.paused.title}
          />
          <Share code={code.code} />
        </Section>
      )
    case 'used-up':
      return (
        <Section status={<Count code={code} />} title={copy.title}>
          <SectionText>{copy.usedUp(code.useLimit)}</SectionText>
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

/**
 * The invite code of the user, at the end of the account: the invite link
 * with Copy, the code, and how many of the invites are left. During the
 * pause the link stays, and a notice says when it works again. During open
 * sign-up, while the waitlist is off and sign-ups are not paused, the link
 * stays under a notice that anyone can sign up now. A code that is used up
 * or turned off shows no link. The section names nobody who used an
 * invite. It reads the code each time that the account opens.
 */
export function InviteCodeSection() {
  const app = useApp()
  const waitlist = useStore(app.account.waitlist)
  useEffect(() => {
    void app.account.loadWaitlist()
  }, [app])
  switch (waitlist.state) {
    case 'loading':
      return <Section title={copy.title} />
    case 'failed':
      return (
        <Section title={copy.title}>
          <LoadFailure
            error={waitlist.error}
            retry={() => app.account.loadWaitlist()}
            title="Your invite code didn't load"
          />
        </Section>
      )
    case 'ready': {
      const { referralCode: code, signupsPaused, waitlistOn } = waitlist.value
      if (code === null) return null
      return (
        <CodeSection
          code={code}
          openSignUp={!waitlistOn}
          paused={signupsPaused}
        />
      )
    }
  }
}
