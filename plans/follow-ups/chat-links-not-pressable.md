# Links in chat text cannot be pressed

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from `calummoore/workspace-link-widget-brainstorm`, Milestone 1 of the workspace link chips plan.
- **Location:** `src/chat/components/AgentText.tsx`, `src/chat/components/agent-text.ts`, `src/chat/components/TranscriptItem.tsx`, `docs/mockups/src/components/common/InlineText.tsx`
- **Reason:** The workspace link chips change turns only links to workspaces of the same org into chips, and every other link stays plain text there.

- **Terms:**
  - **Agent answer:** the text that an agent writes in the chat. `AgentText` draws it with a small Markdown set: paragraphs, lists, code blocks, inline code, and strong text.
  - **Workspace chip:** a small label in chat text that shows the state, the number such as `W-395`, and the name of a workspace of the same org. A press opens that workspace.
  - **Mac app:** the Electron shell for macOS. Its window has no address bar. It opens a link of the app hostname in its window, and every other web address in the default browser, as `docs/protocol/desktop-app.md` says under Navigation.
- **Background:** Chat text draws no links. A user message draws only backtick code, with `InlineText`. An agent answer draws no Markdown links. The workspace link chips change turns a link to a workspace of the same org into a chip that opens it. Every other link stays plain text: a pull request, a port preview, a docs page, or a workspace of another org.
- **Problem:** A person cannot press a link in chat text. A member of two orgs cannot open a link to a workspace of the other org from the chat.
- **Impact if no action:** People copy each link by hand into a browser. In the Mac app, even a link to the app needs that copy, because the window has no address bar.
- **Root question:** How does a person open a web address that a message or an agent answer holds?
- **Options:**
  - **A.** Draw each `http` and `https` link in chat text as a pressable link. A link of the app hostname opens in the app. Every other link opens in a new browser tab, or in the default browser from the Mac app. Cost: agent text comes from untrusted sandbox code, so each link must show its real address, and the app must refuse other schemes. Effort: Medium.
  - **B.** Draw only links of the app hostname as pressable links, such as a workspace of another org. Other links stay plain text. Cost: a pull request or a preview link still needs a copy. Effort: Small.
  - **C.** Do A, and also draw Markdown links of agent answers with their text. Cost: the text of a Markdown link can hide its real address, so the link needs a mark or a title with that address. Effort: Medium.
- **Left out:** Change nothing, because people then keep copying links by hand.
- **Wider fix:** None, because this is a missing feature, not a class of defect.
- **Previous examples:** None found. The workspace link chips change draws chips only for links to workspaces of the same org.
- **Recommendation:** A. One press opens each common link, and the Mac app already sends app links to its window and other links to the browser.
- **Action:** ask the user, because pressable links in agent answers add behaviour that no requirement covers, and agent text comes from untrusted sandbox code.
