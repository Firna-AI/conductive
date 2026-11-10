# Check deployed feedback with a screenshot

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge follow-up of the plan `plans/command-palette-feedback.md`, branch `calummoore/command-palette-feedback-option`.
- **Location:** `docs/protocol/feedback.md`, the feedback routes in `worker/app-api/feedback.ts`, the email in `worker/app-api/feedback-mail.ts` and `worker/mail-sender.ts`, the dialog under `src/shell/feedback/`, and the `FEEDBACK_EMAIL` row of `docs/deployment.md`.
- **Reason:** This check needs the merged feature on the test deployment at `app.conductive.build`, its team inbox, and one real email.

- **Terms:**
  - **Team inbox:** the mailbox of the operator that gets each feedback email. The Worker secret `FEEDBACK_EMAIL` holds its address.
  - **Reply address:** the primary verified email of the GitHub account of the sender, which the Worker keeps at each sign-in.
- **Background:** The Send feedback row of the command palette opens the Feedback dialog. The person writes a message and adds screenshots: PNG, JPEG, GIF, or WebP images, up to 7 MB in all. The dialog removes the metadata of each image, such as the location of a photo, and a JPEG keeps its orientation.

  The Worker emails the message, the screenshots, and the context to the team inbox through Resend. The email comes from `Conductive feedback <feedback@mail.conductive.build>`, with the subject `Feedback from <login>`. Its reply address is the reply address of the sender. Its plain text holds the message, then a `Context` block: the user ID, the GitHub login and ID, the operator pages of the user and of the org, the org and workspace IDs that the person can reach, the app version, the Mac app flag, and the browser. Each screenshot is an attachment named `screenshot-<n>`, with the extension and the media type of its kind.

  Without `FEEDBACK_EMAIL`, each send gets HTTP 503. A send that Resend refuses, or a deployment without `RESEND_API_KEY`, gets HTTP 502. The Worker tests use a fake Resend, and `npm run dev` uses a dev fake, so no check before the merge sends a real email.
- **Task:**
  1. Confirm that the deployment sets the Worker secrets `FEEDBACK_EMAIL`, to the team inbox, and `RESEND_API_KEY`. `npx wrangler secret list` shows their names.
  2. Sign in to `app.conductive.build` as a tester with app access, whose GitHub account has a primary verified email. Open a workspace of an org.
  3. Open the command palette, search for `feedback`, and select Send feedback. Confirm that the reply line names the primary verified email of the tester.
  4. Write a short message that says that it is a test. Add a photo with a location in its EXIF data with Add screenshots. Paste a screenshot, and drop one more image on the dialog.
  5. Select Send. Confirm that the dialog closes and the toast "Thanks for your feedback" shows. Record the HTTP status of `POST /api/feedback` from the network panel of the browser.
  6. In the team inbox, open the email. Confirm the sender, the subject, the message, and each line of the `Context` block. Confirm one attachment for each screenshot, each with the media type of its image.
  7. Open the photo attachment. Confirm that it shows the right way up, and that an EXIF viewer finds no location in it.
  8. Select Reply in the team inbox. Confirm that the reply goes to the primary verified email of the tester. Do not send the reply.
  9. Save the results and the screenshots under the git-ignored `.context/` folder of the workspace that runs this check. Record the error code and message of a failed send. Record each needed fix in its own follow-up item.
- **Impact if no action:** The fakes and CI do not confirm the real delivery through Resend, the team inbox, the reply address, or the attachments.
- **Needs:** The merged feature deployed to `app.conductive.build`, `FEEDBACK_EMAIL` set to the team inbox, a working `RESEND_API_KEY`, access to the team inbox, a tester account with app access and a primary verified GitHub email, a photo with a location in its EXIF data, and a browser with a network panel.
- **Done when:** One feedback send from the deployed app reaches the team inbox. The email has the right sender, subject, message, and context. It has one attachment of the right type for each screenshot, and the photo has no location. A reply from the inbox goes to the tester. The results record the HTTP status of the send.
