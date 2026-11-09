# Mac invite links ignore the build address

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, finding 5 of the waitlist branch re-review, `calummoore/waitlist-and-invite-system`.
- **Location:** `desktop/renderer/services.ts:12`, `src/app/live-services.ts:19`, `src/shell/account/InviteCodeSection.tsx:52`, and `src/shell/operator/CodeParts.tsx:62`.
- **Reason:** The packaged app uses the production origin, so only a local or test Mac build meets the defect.

- **Terms:**
  - **App origin:** The scheme and host of the Worker that the Mac build selects through `CONDUCTIVE_APP_ORIGIN`.
  - **Worker:** The backend that stores users, invite codes, and their uses.
  - **Join link:** An address under `/join/<code>` that carries an invite code through sign-in.
- **Background:** The Mac app loads its page from `conductive-app://desktop`. Its build supplies a separate app origin. The Account page and operator controls copy join links through `AppServices.appOrigin`. The desktop service already uses its configured origin for requests, sockets, and navigation.
- **Problem:** `createDesktopServices` spreads `createLiveServices` but does not override its new `appOrigin` field. The shared service substitutes `https://app.conductive.build` for every non-HTTP page origin. Both link controls therefore copy production addresses for codes stored in another deployment.
- **Impact if no action:** Recipients open production and get an unknown-code notice. They can also create a waiting account in the wrong deployment. The sender must correct the host or share the code alone.
- **Root question:** How should shared invite links reach the deployment that owns their codes?
- **Options:**
  - **A.** Override `appOrigin` with the configured address in `createDesktopServices`. Remove the now-unused brand fallback in live services. Extend the desktop service test for the origin and join link. Update the app README. This retains separate field overrides. Effort: Small.
  - **B.** Give the shared live-service construction one required app origin and credential mode. Build requests, sockets, navigation, and share links from that origin. The browser passes its page origin. The Mac app passes its configured origin and `include`. Move the desktop overrides into that construction and remove the spread and brand fallback. Extend the service test and update both READMEs. Effort: Small.
  - **C.** Return complete join links from Worker replies and use them in each client. Remove the client `AppServices.appOrigin` field and its fake values. This changes response contracts, the dev routes, and their tests. It fixes these links but leaves later desktop origin fields exposed to the same inheritance error. Effort: Medium.
- **Left out:**
  - Changing nothing keeps valid codes linked to another database.
  - Removing configured origins breaks the documented Mac setup.
  - Rebuilding the brand changes legal copy and mockup facts.
  - Loading the Mac main frame from the app origin breaks its frame restriction.
  - Rewriting only clipboard text leaves the displayed link wrong.
  - Hiding join links removes required controls.
  - Returning a separate Worker-origin field repeats the origin that the request gate already checks.
  - A class lint or test needs approval and adds no protection that B needs.
- **Wider fix:** B. Every origin-dependent service receives the same host address, so a later field cannot inherit a production default.
- **Previous examples:** Commit `a4bb0e3c` recorded an earlier desktop API-origin mismatch. The current desktop service fixes it through separate overrides. Approval emails make the same brand-host substitution in `worker/operator/approval-email.ts`.
- **Related:** `plans/follow-ups/approval-email-deployment-origin.md` has the same cause in another layer. Neither recommended fix covers the other, and neither depends on the other.
- **Recommendation:** B. It removes the field-by-field override mechanism and gives all service addresses one source.
- **Action:** fix after merge, apply B, because only a non-default Mac build meets the defect and no stored format changes.

The Mac build reads `CONDUCTIVE_APP_ORIGIN` in `desktop/vite.config.ts`. `desktop/renderer/main.tsx` passes it to `createDesktopServices`. For `https://worker.conductive.test`, the copied link currently starts with `https://app.conductive.build/join/`.

Extend `desktop/renderer/services.test.ts` for `appOrigin`, a built join URL, and `leave`, as well as its existing API and socket checks. Keep browser HTTP and HTTPS origins unchanged. Preserve the desktop credential setting. Remove `appHostOrigin` and its `appDomain` import when B replaces their purpose.

Update `src/app/README.md`, which says that the Mac app names the brand host. Update `desktop/README.md` for the shared service construction. The current origin setup is defined in that README and `docs/protocol/desktop-app.md`. Share links must still use the existing `joinPath` and the deployment that owns the code.
