import type { ReactElement } from 'react'
import { EmailLayout, Paragraphs } from './EmailLayout'
import { approvalWords, type ApprovalValues } from './emailWords'

/**
 * The approval email: the account of a person who waited is ready, and the
 * button opens the app. `logoSrc` is the address of the app icon.
 */
export function approvalEmail(
  values: ApprovalValues,
  logoSrc: string,
): ReactElement {
  const words = approvalWords()
  return (
    <EmailLayout
      button={{ label: words.button, href: values.link }}
      footer={words.footer}
      heading={words.heading}
      linkIntro={words.linkIntro}
      logoSrc={logoSrc}
      preview={words.preview}
    >
      <Paragraphs lines={words.paragraphs} />
    </EmailLayout>
  )
}
