# Space before a period after a link chip

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/composer-file-drag-and-drop`, where a test of a file pick at the caret met it.
- **Location:** `src/chat/components/chip-field/field-text.ts:47`, in `textAfter`, and `:70`, in `joinFieldParts`. Callers: `$fieldText` and `$selectionText` in `src/chat/components/chip-field/field-content.ts`. Tests: `src/chat/components/chip-field/field-text.test.ts`.
- **Reason:** The separator rule of the message field is the same on `main`, and the branch that found the defect does not change that rule.

- **Terms:**
  - **Message field:** `ChipTextField` in `src/chat/components/chip-field/`, the text field of every composer. It shows workspace links, file mentions, and attached files as chips.
  - **Separator rule:** `joinFieldParts` in `field-text.ts`. It writes the plain text of the field. It puts a space beside a chip only where the text beside it would join the link or mention of the chip.
  - **Link chip:** the chip of a workspace link. Its source is the exact link, such as `https://app.conductive.test/orgs/acme/workspaces/email-dark-mode`.
  - **File chip:** the chip of a file mention, such as `@src/a.ts`, or of an attached file. The source of an attached file is its mark: U+E000, the draft ID of the file, and U+E001.
- **Background:**
  - `joinFieldParts(parts)` turns the parts of the field, text and chips, into one string. The draft text of each composer comes from it, through `$fieldText`. The text of a copy also comes from it, through `$selectionText`. The text of each sent message comes from the draft text.
  - For each chip, the rule tries no space, a space after, a space before, and both, in that order. It takes the first that keeps the chip whole.
  - For a link chip, `staysLink` reads the line with `textParts` of `src/chat/links/workspace-links.ts`. It checks that the link stays one link, as written. For a mention, `staysMention` needs a space, a line break, or the end of the text on each side.
  - The rule reads the text after a chip with `textAfter(parts, index)`. It gives the text after the chip up to the next chip. Then it adds the source of that next chip, with no space between them. The space that the next chip gets later is not in that text.
  - The comment of `joinFieldParts` gives the rule. It says: "A space goes beside a chip only where the text next to it would join its link or its mention". The developer guide `src/chat/message-field.md` gives the same rule. `field-text.test.ts` expects `` `${link}. Next` `` for a link chip and the text `. Next`, with no space before the full stop.
  - The Attach files button of each composer puts the chips of a pick at the caret. So a chip can follow a full stop directly, when the caret stands right after it. A drag of a chip inside the field can put it there too.
- **Problem:**
  - Take the parts: the text `Like `, the link chip of `https://app.conductive.test/orgs/acme/workspaces/email-dark-mode`, the text `.`, and the file chip of `@src/a.ts`.
  - At the link chip, `textAfter` gives `.@src/a.ts`. `textParts` reads `email-dark-mode.@src/a.ts` as part of one link. So with no space, the link does not stay whole. A space after the link keeps it whole. So the rule writes a space between the link and the full stop.
  - At the file chip, the text before it ends with `.`, so the mention gets a space before it.
  - Observed: `Like https://app.conductive.test/orgs/acme/workspaces/email-dark-mode . @src/a.ts`. Expected: `Like https://app.conductive.test/orgs/acme/workspaces/email-dark-mode. @src/a.ts`.
- **Evidence:**
  - A one-time probe called `joinFieldParts` on 11 November 2026. Below, `<link>` is `https://app.conductive.test/orgs/acme/workspaces/email-dark-mode`, and `<link2>` is `https://app.conductive.test/orgs/acme/workspaces/invoice-fonts`. `<U+E000>` and `<U+E001>` stand for the two characters of a mark.
  - The text `Like `, `<link>`, the text `.`, the mark `<U+E000>client-2<U+E001>` as a mention chip, and the text ` `: observed `Like <link> . <U+E000>client-2<U+E001> `. Expected `Like <link>. <U+E000>client-2<U+E001> `.
  - The text `Like `, `<link>`, the text `.`, and the file chip `@src/a.ts`: observed `Like <link> . @src/a.ts`. Expected `Like <link>. @src/a.ts`.
  - `<link>`, the text `.`, and the link chip `<link2>`: observed `<link> .<link2>`. Expected `<link>. <link2>`.
  - The text `Like `, `<link>`, and the text `.` with no chip after it: `Like <link>.`, as expected.
  - The text `Like `, `<link>`, the text `. ` with a typed space, and the mark: `Like <link>. <U+E000>client-2<U+E001>`, as expected.
  - The case of the file chip `@src/a.ts` holds only a link chip and an ordinary file chip. So the defect does not come from attached files. `field-text.ts` was the same on `main` and on the branch that found it.
  - A test of the New workspace dialog met the defect: `src/shell/new-workspace/NewWorkspaceDialog.test.tsx`. A pick right after `link.` gave `email-dark-mode . <mark> ` in place of `email-dark-mode. <mark> `. That test now picks at a caret after the first sentence. `field-text.test.ts` has no case with a chip after the full stop.
  - The probe also tried options A and B below as temporary changes of `textAfter`, and restored the file. B gave the expected text in all three cases. A gave it only in the two cases with a mention chip. Each kept 52 tests of 7 test files of the message field and the composers green.
  - Reproduction in a test beside `field-text.ts`:

    ```ts
    const link = 'https://app.conductive.test/orgs/acme/workspaces/email-dark-mode'
    joinFieldParts([
      { kind: 'text', text: 'Like ' },
      { kind: 'chip', source: link },
      { kind: 'text', text: '.' },
      { kind: 'chip', source: '@src/a.ts', mention: true },
    ])
    // Today: `Like ${link} . @src/a.ts`. Expected: `Like ${link}. @src/a.ts`.
    ```
- **Impact if no action:**
  - The draft, a copy, and the sent message get a space before the full stop, such as `<link> . @path`. The member did not type that space.
  - A draft that the field reads again from its text gets the space too. Each reader of the sent message, such as the agent, reads it too.
  - Each chip still stays whole.
- **Root question:** When a chip follows punctuation after a link chip, how does the field keep both chips whole with no extra space?
- **Options:**
  - **A.** Give the check of a link the space of a next mention chip. Details:
    - In `textAfter`, at the next chip, return `text + (part.mention && !/\s$/.test(text) ? ' ' : '') + part.source`.
    - The space goes before the source of the next chip only when that chip is a mention. Also, the text before that chip must not end with a space.
    - It fixes the cases of a file chip and of an attached file. It leaves `<link> .<link2>` for two link chips.
    - Add the cases to `field-text.test.ts`. Effort: Small.
  - **B.** Stop the text of the check at the next chip. Details:
    - In `textAfter`, give only the text up to the next chip, with no source of that chip: `if (part.kind === 'chip') return text`.
    - Each next chip still checks the text before it. It gets a space before it where that text would join it.
    - It fixes all three cases.
    - Risk: the check of a link then relies on the check of the next chip at that edge. A review must confirm that no other text changes.
    - Add the five cases above to `field-text.test.ts`. Add a DOM test that picks a file right after `link.`. Effort: Small.
  - **C.** Check each chip in the text that the rule writes. Details:
    - Join the parts. Read the joined text back with the reader that the field uses for a draft that comes back.
    - Compare the chips. Where a chip does not come back whole, add a space at its edge, and check again.
    - Then no check reads a text that differs from the written text, for any kind of chip.
    - Add the five cases, and a DOM test that picks a file right after `link.`. Effort: Medium.
- **Left out:**
  - Change nothing: it fails the goal. The field still writes the space before the full stop, which the member did not type. That breaks the rule of its comment and of `src/chat/message-field.md`.
  - No space at all, as `<link>.@src/a.ts`: it fails the goal. `textParts` then reads the full stop and the next chip as part of the link. So the chips do not stay whole.
  - Only the shared tokenizer of the related item below: it fails the goal. The cause is the text that the check reads. So a new reader alone does not remove the cause.
- **Wider fix:** C. It decides each space against the text that the field writes. So no check can read a different text. B removes the one known difference: the source of the next chip without its space.
- **Previous examples:** `plans/follow-ups/one-tokenizer-for-chip-text.md` gives another text where the separator rule and a reader disagree. A typed `cc @alice` and a pasted link give `cc @alicehttps://…`, which a draft that comes back reads as one mention.
- **Related:** [one-tokenizer-for-chip-text.md](one-tokenizer-for-chip-text.md) has the same code, `joinFieldParts`. Its option C rewrites the separator rule with one tokenizer, so one branch can do both. That rewrite must also check the text that the rule writes, as option C here does. Otherwise this problem stays. The items stay apart. That item loses a chip that a mention touches, and this item keeps every chip and adds a space.
- **Recommendation:** C. It makes the rule check the text that it writes, which ends this case and others of the same class. B is the smallest fix of the three known cases, if C waits for the tokenizer work.
- **Action:** fix after merge, apply C, because the separator rule is the same on `main` and outside the change that found the defect.
