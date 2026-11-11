import type { ReactElement } from 'react'
import { EmailLayout, InitialsTile, Paragraphs } from './EmailLayout'
import { invitationWords, type InvitationValues } from './emailWords'

/**
 * The org invitation: who invited the person, to which org, what the
 * product is, and the account to sign in with. `logoSrc` is the address of
 * the app icon.
 */
export function invitationEmail(
  values: InvitationValues,
  logoSrc: string,
): ReactElement {
  const words = invitationWords(values)
  return (
    <EmailLayout
      button={{ label: words.button, href: values.link }}
      footer={words.footer}
      heading={words.heading}
      headingMark={<InitialsTile initials={values.orgInitials} />}
      linkIntro={words.linkIntro}
      logoSrc={logoSrc}
      note={words.note}
      preview={words.preview}
    >
      <Paragraphs lines={words.paragraphs} />
    </EmailLayout>
  )
}
