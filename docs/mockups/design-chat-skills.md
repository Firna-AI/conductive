# Skill lines in the chat

This page belongs to [the design of the chat](design-chat.md).
It gives the skill lines and the skill names on each fold line.

- A tool call that loads a skill shows as a skill line at its place among
  the calls, from decision 277. A skill is a folder with a `SKILL.md` file
  of instructions. `CallLine` in `ToolGroup.tsx` draws the line of each call
  that has `skills`.
  - The line starts with `BookOpen` from `lucide-react`, an open book. Then
    it says "Using skill" while the call runs and "Used skill" after it, from
    decision 279. A command that loads two skills says "Using skills" and
    "Used skills". The skill names follow, joined by ", ", as the agent gives
    them, such as `release-notes`. Then the detail follows: the arguments of
    a Claude skill call, such as "high", as `app/chat/work` shows, or the
    command of a Codex call that read the skill files, as
    `app/chat/work/five-skills` shows.
  - The call keeps its tool kind: `other` for a Claude skill call, and `run`
    for a Codex command. Its target holds the skill names. The names and the
    detail form one text, and an ellipsis cuts the end of that text. So a
    narrow chat cuts the detail before the names.
  - Each fold line names the skills of its calls after its counts, such as
    "4 tool calls · Skill: brainstorming" or "13 tool calls, 2 messages ·
    Skills: brainstorming, testing". It names each skill once, in
    the order of first use, and no skill of a stopped call. Among the icons
    of the tool kinds, the open book takes the place of the kind icon of a
    skill call, as `app/chat/turns` shows.
  - On a narrow chat, the text of such a fold line wraps beside the chevron,
    which stays at the first line. The text wraps only after the dot, after
    "Skills:", or between two names. A name keeps its comma and never breaks
    at its hyphen, and the icons stay with the last name, as
    `app/chat/work/five-skills` shows.
  - A session runs one agent, so a chat never mixes the skill lines of
    Claude and Codex. `sessionChoices.ts` in `src/fixtures/` names the
    agent of each chat whose session runs Codex. The screen gives the
    workspace that choice, so the model picker of
    `app/chat/work/five-skills` shows "GPT-6.1 Sol Medium". A Codex read of
    another file stays a plain command line.
