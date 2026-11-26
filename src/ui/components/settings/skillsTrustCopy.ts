import { productDomain } from '../../../shared/brand'

/**
 * The words of the trust choice of the skills repository, under the field
 * of the Skills section. Trust lets Claude run the commands that the
 * skills of the saved repository run while Claude reads them, which the
 * words call automatic commands. Off stops such commands in every skill
 * and custom slash command of the session, also those of the workspace.
 * The choice belongs to one repository, so another repository starts
 * untrusted. Each cloud computer takes the saved choice when it starts or
 * resumes. The public guide gives the details. This module imports only
 * the brand, so the app can share the words with the mockups.
 */
export const skillsTrustCopy = {
  /** The label of the switch of an admin. */
  label: 'Trust this skills repository',
  /** What a trusted repository lets Claude do. */
  on: "Claude can run automatic commands from this repository's skills, including future updates, with the workspace's access.",
  /** What an untrusted repository stops, and what agents can still do. */
  off: "Claude runs no automatic commands from any skill or custom slash command, including the workspace's own. Agents can still choose to run commands that a skill suggests.",
  /** Before the hint of off, when the field names another repository. */
  replaced: 'A new repository starts untrusted.',
  /** How long a running cloud computer keeps the choice that it started with. */
  note: 'Running cloud computers keep their current trust until their next start or resume.',
  /** The guide that gives the details, in a new tab. */
  guide: {
    label: 'How trust works',
    href: `https://${productDomain}/docs/cloud-computer#trust-a-skills-repository`,
  },
  /** The term of the saved choice in the read-only section. */
  term: 'Trust',
  trusted: 'Trusted',
  untrusted: 'Not trusted',
} as const

/**
 * The hint under the label: what the value of the choice does. When the
 * field names another repository than the saved one, the hint of off first
 * says why the choice is off.
 */
export function trustHint(props: {
  trusted: boolean
  replaced: boolean
}): string {
  const { off, on, replaced } = skillsTrustCopy
  if (props.trusted) return on
  return props.replaced ? `${replaced} ${off}` : off
}
