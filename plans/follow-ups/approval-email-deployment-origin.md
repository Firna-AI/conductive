# Approval emails ignore the deployment address

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, finding 1 of the waitlist branch review, `calummoore/waitlist-and-invite-system`.
- **Location:** `worker/operator/approval-email.ts:12`, `worker/operator/waitlist-route.ts:104`, `worker/operator/waitlist-approval.test.ts:54`, and `worker/operator/approval-local.test.ts:54`.
- **Reason:** The current deployed app uses the fixed address, so only another configured deployment meets the defect.

- **Terms:**
  - **APP_ORIGIN:** The Worker setting that gives the app address for one deployment.
  - **Worker:** The backend that approves waiting accounts and sends their approval emails.
  - **approval_emails:** The database table that saves an approval message before delivery and keeps it for retries.
- **Background:** Conductive lets an operator approve a waiting account. The approval email must return that person to the app that approved them. The approval request has an effective APP_ORIGIN. The existing org invitation already builds its link from that address.
- **Problem:** `approvalEmailContent()` takes no origin and writes `https://app.conductive.build/` from the brand module. With APP_ORIGIN `https://app.example.test`, each approval still saves the production link. Every retry sends that saved wrong destination. Both cited tests expect the production link despite using another origin.
- **Impact if no action:** An approval from another deployment sends its recipient to a different app database. The account can still wait there. The recipient must return to the original app themselves.
- **Root question:** How should an approval email return a person to the app that approved their account?
- **Options:**
  - **A.** Pass the request's effective APP_ORIGIN into the approval template. Save the complete message in the existing grant batch. Correct the expected links in both cited tests and retain the retry assertions. Update the sender README. Effort: Small.
  - **B.** Bind both email templates to one message builder that receives the request's effective APP_ORIGIN. Let it own their app links. Save the complete approval message before sending it. Update the approval, local-log, and invitation tests and the sender README. This removes separate choices of app hostname from the two templates. Effort: Medium.
- **Left out:** Only two approaches add useful behavior, because the saved message already preserves the destination across retries.
  - A separate origin column adds storage and retry code that A does not need.
  - A second email-only setting duplicates APP_ORIGIN.
  - A fixed hostname does not return people to another deployment.
  - Building the link at each send can change the saved message under one delivery key.
  - Removing the link breaks the approval email requirement.
  - A URL type alone cannot stop a template from writing a fixed hostname.
  - A class lint or class test needs approval and adds no protection that the shared builder needs.
- **Wider fix:** B. One builder supplies the deployment address to both Worker email templates.
- **Previous examples:** Org invitations already use `invitationLink(env.APP_ORIGIN, invite.id)` in `worker/members/route.ts`.
- **Recommendation:** B. It gives both templates one owner for their app links and keeps retries unchanged.
- **Action:** fix after merge, apply B, because this Medium/Rare defect needs another configured deployment and remains straightforward to fix later.

The effective origin matters in local development. `worker/application.ts` derives it from a local request before dispatch. The queued message must use that value. The scheduled retry has no original request and must send the saved body unchanged.

Both existing expected values need correction. The normal approval test uses `https://app.conductive.test`. The local-log test uses `http://127.0.0.1:5173`. Update `worker/operator/README.md`, which says that the email is built from the brand. The product name can still come from the brand module.

The shared-builder option can touch `worker/members/route.ts`, `worker/invitation-mailer.test.ts`, and `worker/members/email-invitations.test.ts`. Keep the working invitation destination and its existing assertions. No database format change is needed. Production pending messages already hold the right address.

The current email requirements are in `docs/protocol/waitlist.md`, under The approval email.
