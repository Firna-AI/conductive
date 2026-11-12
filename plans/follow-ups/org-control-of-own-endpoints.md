# Org admins cannot see or limit own endpoints

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the options check of decisions 5 to 7 of the own endpoint plan on branch `calummoore/cli-proxy-setup`.
- **Location:** "Agent logins" in `docs/protocol/tokens-and-secrets.md`, `docs/protocol/model-gateway.md`, and the org settings under `src/shell/settings/`.
- **Reason:** the own endpoint change gives each member a personal login kind, and a rule for org admins is new behaviour that the user must choose.

- **Terms:**
  - **Own endpoint login:** an agent login that holds the address of a gateway or a proxy that its owner chose, and its key. A turn on it sends the messages and the files of the turn to that endpoint.
  - **Org admin:** a member who can change the shared settings of an org, such as its scripts and env vars.
- **Background:**
  - The own endpoint plan adds the own endpoint login on 8 November 2026. Each member saves it on their own account page, and it serves all of that member's orgs.
  - A turn on an own endpoint login sends the messages and the files of the turn to that endpoint. The repository code of the org can be in those files.
  - A new own endpoint login is shared by default (choice of 9 November 2026). So the turns of other members can also go to it.
  - No rule lets an org admin see which endpoints receive the code of the org, or limit them.
- **Problem:** An org cannot control where its code goes when a member uses an own endpoint.
- **Impact if no action:** An org with rules about where code may go cannot enforce them in the app.
- **Root question:** How does an org learn, or limit, which servers receive its code through own endpoint logins?
- **Options:**
  - **A.** State in the protocol that an org admin cannot see or limit own endpoints. Effort: Small.
  - **B.** An org setting that turns own endpoint logins off for the turns of that org. Cost: a setting, its check at each turn, and a mockup state. Effort: Medium.
  - **C.** An org list of allowed endpoint hosts. Turns on other hosts are refused in that org. Cost: as B, plus a host list to manage. Effort: Medium.
  - **D.** Show org admins the hosts of the own endpoints that the org's turns used. Cost: a new record of hosts for each org. Effort: Medium.
- **Left out:** A rule for API keys and subscription tokens too. Those logins send code only to Anthropic or OpenAI, so they do not raise this question.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A now. It states the gap at a small cost, and B or C can follow when an org asks for control.
- **Action:** ask the user, because each option sets new behaviour for orgs that no requirement covers.
