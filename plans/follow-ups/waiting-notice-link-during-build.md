# Waiting repository notice hides settings during builds

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from branch `calummoore/cloud-computer-configuration-link`, after it merged the waiting repository notice of PR #188.
- **Location:** `docs/protocol/create-a-workspace.md:181`, `docs/mockups/src/components/new-workspace/waitingRepository.tsx:86`, and `src/shell/new-workspace/waiting-notice.test.tsx:44`.
- **Reason:** The recommended option changes a rule of the protocol doc that no user decision covers, so it waits for the user.

- **Terms:**
  - **Waiting repository:** a chosen repository of an org that its cloud computer image does not hold yet. It waits for a build.
  - **Cloud computer settings:** the link of an admin, in a notice over the New workspace composer, to the Cloud computer tab of the org settings.
  - **First build:** the build that makes the first cloud computer image of a new org.
- **Background:**
  - Two notices over the New workspace composer show the state of a build: the notice of the first build, and the notice of a waiting repository.
  - On 10 November 2026 the user asked for a link to configure the cloud computer in the notice of the first build while that build runs. The user then asked for a better word than "Open" on the link. Its label is now "Cloud computer settings", and both notices share it.
  - The notice of the first build now gives an admin the link in each state. `docs/protocol/create-a-workspace.md`, section "Before the first good build", says so. Its reason: a change that the admin saves during the first good build needs no Build computer.
  - The notice of a waiting repository gives an admin the link only while no build runs. Section "Waiting repositories" of the same doc says: "While a build runs, the notice shows that build with no link, because the admin has nothing to do on that tab." PR #188 added this rule. It was not one of the user's decisions or of the listed design calls of that pull request.
  - During a later build, the Cloud computer tab shows the build log. An admin can also save the env vars, the startup script, and the install script there. An install script change then waits for Build computer after the build.
- **Problem:** While a build runs, the two notices act differently: one links an admin to the settings, the other does not. The reason "nothing to do on that tab" is not quite true, because the admin can follow the log and change settings there.
- **Impact if no action:** An admin who waits for a new repository must find the settings through the sidebar. The two notices teach two rules for one link.
- **Root question:** Should an admin reach the cloud computer settings from each build notice over the composer, also while a later build runs?
- **Options:**
  - **A.** Keep the rule. The waiting repository notice shows no link while a later build runs. Effort: Small.
  - **B.** Show the link in each state of the waiting repository notice, as the notice of the first build does. Change the rule and its reason in the protocol doc, `WaitingRepositoryNotice` of the mockups, which the app also uses, the mockup descriptions of `app/new-workspace/waiting-repository`, and `waiting-notice.test.tsx`. Effort: Small.
- **Left out:** No link in the notice of the first build while its build runs, because it fails the request of the user. Fewer than three approaches are real, because the question is only whether the link shows during a later build.
- **Wider fix:** None. Both notices already share one label and one destination.
- **Previous examples:** The notice of the first build had the same rule until the user asked for the link on 10 November 2026.
- **Recommendation:** B. One rule for both notices is easier to learn, and the tab has work for an admin during a build. A keeps admins from saving an install script that needs one more build.
- **Action:** ask the user, because B changes a rule of the protocol doc that no user decision covers.
