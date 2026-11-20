# Older Mac apps keep a grant after a switch-off

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-20, from branch `calummoore/mac-permission-issue-o7fv`, review round 1.
- **Location:** `worker/devices/broker.ts` (dispatch of `command.request`), `desktop/src/device/settings.ts` (`stop-workspace`), `docs/protocol/capabilities.md` ("When Mac access goes off" and "Risks").
- **Reason:** The fix changes the Mac command contract that the user chose on 20 November 2026, so it waits for the user.

- **Terms:**
  - **Grant:** a permission on one Mac that runs every command from one workspace with no question, for 15 minutes or until Stop.
  - **Mac access period:** a number of each workspace that grows by 1 at each switch-off of Mac access. A grant covers only requests of its own period.
  - **Older Mac app:** a Mac app from before the period existed. It ignores the period.
- **Background:**
  - On 20 November 2026 the user chose that a switch-off of Mac access ends every grant of the workspace on every Mac for good. The chosen mechanism is the period: the Worker sends it beside each command request, and the Mac app keeps it with each grant.
  - An older Mac app ignores the period. So its grant survives a switch-off, and covers commands again after a member turns Mac access on.
  - The protocol doc records this as a risk, and the Terms and the guides tell the user to use Stop in This Mac or in the bar, then update.
  - An older Mac app already applies the settings change `stop-workspace`, also when the message has an extra field.
  - The Worker deploys at each push to `main`, but an updated Mac app ships later, and an installed copy updates only when it quits or the user restarts it. So at first every installed Mac app ignores the period.
- **Problem:** Until each member updates, a switch-off does not end the grants of older Mac apps.
- **Impact if no action:** After one member turns Mac access off and another turns it on, an older Mac app runs every command of that workspace with no question again, with no new choice by its user.
- **Root question:** How does a switch-off end the grants of every Mac app that still connects?
- **Options:**
  - **A.** Keep the risk and the public words, and wait for the updates. Effort: Small.
  - **B.** Before the first command request of a newer period reaches a Mac, the Worker sends `stop-workspace` for that workspace, with the current period. An older Mac app ends its grant before it reads the request, and then it asks. A new Mac app ends only a grant of an older period. The broker keeps the newest period that each Mac got for each workspace, so each period needs one stop. Then remove the risk from the protocol doc and the qualifications from the Terms and the guides. Cost: new broker state, a settings change that the Worker sends by itself, and tests with a fake older app. An older app's bar still lists the dead grant until that next request. Effort: Medium.
  - **C.** Require a Mac app that supports periods before the Worker delivers commands after a switch-off. It needs a version signal, which the device connection does not have. It blocks older apps that work today. Effort: Large.
- **Left out:** A stop sent only at the switch-off, because a Mac that sleeps then misses it. B waits for each Mac's next request instead.
- **Wider fix:** B. It ends old grants on every Mac app, with no version signal.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps the unconditional promise and does not block older apps.
- **Action:** ask the user, because B and C change the Mac command contract of the period that the user chose on 20 November 2026.
