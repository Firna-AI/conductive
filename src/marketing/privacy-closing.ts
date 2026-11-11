import {
  legalAddress,
  mailLink,
  paragraph,
  type LegalDocument,
} from './legal-text'

/**
 * The closing sections of the privacy notice: cookies, your rights,
 * complaints, and changes to the notice. They live in their own module to
 * keep the privacy notice under the file length limit.
 */
export const privacyClosingSections: LegalDocument['sections'] = [
  {
    title: 'Cookies',
    blocks: [
      paragraph`This site sets no cookies. The web app and the Mac app each
        set their own cookie that keeps you signed in. Only the Mac app's
        cookie store holds its session cookie. Another cookie protects the
        GitHub sign-in while it runs. When the web app sends you to GitHub
        to install the GitHub App or change its access, a third cookie
        keeps the screen that you left, so that the app can return you
        there.`,
      paragraph`Each sign-in cookie lasts for up to 7 days. The GitHub
        sign-in protection cookie lasts for up to 10 minutes. The GitHub
        return cookie lasts for up to 1 hour, and the app deletes it when
        you come back. These cookies support sign-in, security, and the
        return from GitHub. They use secure connections and cannot be read
        by page scripts.`,
    ],
  },
  {
    title: 'Your rights',
    blocks: [
      paragraph`Depending on where you live, the law can give you rights
        over your personal data. You can ask for a copy of it, and ask to
        correct it, to delete it, to limit its use, or to object to its
        use. You can also ask to take it to another service.`,
      paragraph`To exercise these rights, write to
        ${mailLink(legalAddress)}. Describe your request and the account
        or org it concerns. The operator may need information to verify
        your identity before acting on the request.`,
    ],
  },
  {
    title: 'Complaints',
    blocks: [
      paragraph`You can complain to the data protection authority that
        has jurisdiction over your complaint. You can also raise a
        privacy concern with the operator at ${mailLink(legalAddress)}.`,
      paragraph`In the UK, you can contact the Information Commissioner's
        Office at ico.org.uk/make-a-complaint/ or on 0303 123 1113.`,
    ],
  },
  {
    title: 'Changes to this notice',
    blocks: [
      paragraph`The operator publishes changes on this page and updates
        its effective date. Check this page for the current notice. Any
        additional notice required by applicable law still applies.`,
    ],
  },
]
