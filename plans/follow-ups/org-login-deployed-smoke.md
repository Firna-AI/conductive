# Smoke-test org agent logins on the test deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from the post-merge task of the org agent login plan on branch `calummoore/delft-zjk2`.
- **Location:** the test deployment at `conductive.build`, the Agents tab of the org settings, and the composer.
- **Reason:** the check needs the merged change on the test deployment, with a real API key or endpoint.

- **Terms:**
  - **Org login:** an Anthropic or OpenAI API key, or an own endpoint, that an admin connects for one org and one agent on the Agents tab of the org settings. A member without a usable login of their own runs on it.
- **Background:** The change adds org logins. On 16 November 2026 the user chose an org login on its own tab, and said that a member with an org login needs no login of their own. The local checks and the tests used fake servers. No check ran against a real provider or a real endpoint.
- **Task:**
  1. As an admin of a test org, open the org settings, then Agents, and connect a Claude API key or an own endpoint.
  2. As a second member of that org with no Claude login of their own, open the org. Check that Get started shows the agent step as complete.
  3. Create a workspace and send a first message. Check that the composer names the org login, such as "Acme's login", and that the turn answers.
  4. Turn on "Use for every member". As a member with their own login, start a new session. Check that it names the org login.
  5. Remove the org login. Check that the next message in the old session starts a linked session.
- **Done when:** each step behaves as `docs/protocol/org-logins.md` says. Record any failure as its own follow-up item.
