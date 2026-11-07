import {
  appDomain,
  productDomain,
  productName,
} from '../../docs/mockups/src/brand'
import {
  abuseAddress,
  draft,
  legalTitles,
  list,
  mailLink,
  paragraph,
  text,
  type LegalDocument,
} from './legal-text'

/**
 * The terms of use, as a draft for a lawyer, as decision 35 asks. The facts
 * come from the architecture and the protocol docs. The rules of acceptable
 * use pass on the rules of the providers of the service, as decision 28
 * asks, and name no provider. Each fact that the operator or the lawyer
 * must supply is a draft field.
 */
export const termsDocument: LegalDocument = {
  title: legalTitles.terms,
  description: `The terms of use of ${productName}, as a draft for lawyer review.`,
  lead: text`These terms cover your use of ${productName} at ${productDomain}
  and ${appDomain}. You accept them when you continue with GitHub to sign
  up. Effective date:
  ${draft('To confirm: the date when these terms start')}.`,
  sections: [
    {
      title: `Who runs ${productName}`,
      blocks: [
        paragraph`${productName} is run by
          ${draft('To confirm: the legal name of the operator')},
          ${draft('To confirm: the registered address')}.`,
        paragraph`Contact:
          ${draft('To confirm: the contact address for these terms')}.`,
      ],
    },
    {
      title: 'The service',
      blocks: [
        paragraph`${productName} is a coding tool in the browser. Each
          workspace is one task with its own branch and its own cloud
          computer, where agents powered by Claude and Codex work.`,
        paragraph`${productName} is free for now. It has no plans and no
          billing.`,
      ],
    },
    {
      title: 'Your accounts',
      blocks: [
        list(
          text`You sign in with GitHub, through the GitHub App of
            ${productName}. The app can reach each repository where you
            install its GitHub App and have access.`,
          text`${productName} runs the cloud computers of every org in its
            own account with its cloud computer provider. You need no
            account or key of your own for them.`,
          text`The agents run on the Claude or OpenAI login that you connect.
            The model use of each message bills to the account of the person
            who sent the message, under the terms of Anthropic or OpenAI.`,
          text`Keep your keys and logins safe.
            ${draft('To write: your duties for the use of your keys and logins')}`,
        ),
      ],
    },
    {
      title: 'Working in an org',
      blocks: [
        list(
          text`Every member of an org sees all of its workspaces, and can send
            messages in each of them.`,
          text`Each message runs on the agent login of the person who sends
            it. Its git calls use a GitHub token of that person, so pushes and
            pull requests show as that person.`,
          text`That GitHub token reaches every repository where that person
            installed the GitHub App and has access, not only the
            repositories of the org.`,
          text`While a turn runs, its agent login is in the cloud computer of
            the workspace. A member with a terminal in that cloud computer can
            read it. Work in an org only with people whom you trust with your
            logins.`,
          text`Admins manage the members, the repositories, the scripts, and
            the env vars of the org.`,
        ),
      ],
    },
    {
      title: 'Acceptable use',
      blocks: [
        paragraph`Use ${productName} only for lawful purposes that you have
          the right to carry out, and that harm no other person or system.
          Also follow the terms of GitHub, Anthropic, and OpenAI. Do not use
          ${productName} or its cloud computers to:`,
        list(
          text`break a law, a sanction, or an export control, or the rights
            of other people, such as their privacy or their intellectual
            property`,
          text`store, make, or share content that is illegal, such as child
            sexual abuse material, or content that supports terrorism or
            violent extremism`,
          text`run malware, ransomware, botnets, or command and control
            servers, or send spam, phishing, scams, or other fraud`,
          text`attack other systems, for example with denial of service,
            credential stuffing, account takeover, intrusion, scans that the
            owner did not allow, or aggressive scraping`,
          text`mine cryptocurrency, or run work whose main purpose is to use
            computing resources and not to build software`,
          text`keep cloud computers busy without a purpose, get around limits
            or protections against abuse, hide what you do, or harm
            ${productName}, its cloud computers, or other networks`,
          text`share, rent, or sell your account or your access, or resell
            the cloud computers as computing capacity`,
          text`break the rules of the providers that run ${productName}`,
        ),
        paragraph`You are responsible for what your cloud computers make
          public, such as a port preview. Public content must be lawful, and
          it must not be abusive.`,
        paragraph`${draft('To confirm: that these rules give the providers of the service at least the protection of their own rules')}`,
      ],
    },
    {
      title: 'Suspension',
      blocks: [
        paragraph`The operator can suspend an account that breaks these
          terms, or whose use puts other people or the service at risk. A
          suspension stops the cloud computers of the workspaces that the
          account owns, closes their previews, and blocks new starts. When
          the risk is urgent, the operator can suspend an account without
          notice.`,
        paragraph`${draft('To write: how the operator tells you about a suspension, how you ask for a review, and what happens to your data')}`,
      ],
    },
    {
      title: 'Report abuse',
      blocks: [
        paragraph`To report abuse of ${productName}, such as spam, an attack,
          or harmful content in a preview, write to
          ${mailLink(abuseAddress)}. Include the address of the preview or a
          description of what you saw.`,
        paragraph`The operator also answers notices about security,
          copyright, and law enforcement at the same address.`,
      ],
    },
    {
      title: 'Your work',
      blocks: [
        paragraph`Your repositories, files, and agent sessions live in the
          cloud computers that ${productName} runs for your org.
          ${productName} keeps the chat history of each workspace, so that
          you can read it while the cloud computer is stopped.`,
        paragraph`${draft('To write: the rights in your content, and the permission that the operator needs to run the service')}`,
      ],
    },
    {
      title: 'Ending your use',
      blocks: [
        paragraph`An admin can delete an org. ${productName} then stops the
          cloud computers of the org at once. It deletes the org after 7
          days, unless an admin restores it.`,
        paragraph`${draft('To write: how you close your account, and what the operator deletes then')}`,
      ],
    },
    {
      title: 'Availability and liability',
      blocks: [
        paragraph`${draft('To write: the availability of the service, its warranties, and the limits of liability')}`,
      ],
    },
    {
      title: 'Changes to these terms',
      blocks: [
        paragraph`${draft('To write: how the operator tells you about a change, and when it takes effect')}`,
      ],
    },
    {
      title: 'Law and disputes',
      blocks: [
        paragraph`${draft('To confirm: the law that governs these terms, and the courts for disputes')}`,
      ],
    },
  ],
}
