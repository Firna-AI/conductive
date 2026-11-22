# Skills of a message

This page belongs to [Agent instructions](agent-instructions.md). It states
how each agent gets the skills that a member names in a message.
[Skill mentions](skill-mentions.md) states the list and the chips. A skill
list decision number names a decision of that change.

- A message can hold skill texts, such as `/plans`, as
  [The stored text](skill-mentions.md#the-stored-text) says. The runner
  gives each skill of the message in the form of the agent that runs the
  message (skill list decision 2).
- A skill of the message is a skill text that names a skill of the list of
  that agent. Every other `/` text, and a skill text in inline code or in
  a code block, reaches the agent as text only.
- Claude gets the text of the message unchanged. Claude runs a skill that
  the text names as `/name`.
- A skill text at the start of the text starts the message, because the
  sender line comes at the end. Claude then runs that skill, also a
  manual-only skill, whose `SKILL.md` sets `disable-model-invocation: true`
  (skill list decision 3).
- Claude can skip a manual-only skill whose skill text comes later in the
  text. So the list of `/` offers such a skill only at the start of the
  text, as
  [Manual-only Claude skills](skill-mentions.md#manual-only-claude-skills)
  says.
- Codex gets the text of the message unchanged too. Beside the text, it
  gets one skill input for each skill of the message. The skill input
  gives the name of the skill and the absolute path of its `SKILL.md`, as
  the Codex list of the runner gives it.
- Reason: the skill input names the exact skill, and the text of each
  agent stays the stored text. The text `$name` for Codex was not chosen,
  because the text that Codex gets would then differ from the stored text.
- A skill chip whose skill is not in the list of the agent of the send
  reaches that agent as the text `/name`, with no skill input.
- Risk: Codex drops a skill input whose path names no skill, with no
  error. So a skill that moves after the latest list does not run.
- The skill inputs exist only in the input of the agent, as the sender
  line does. The stored message, the chat, and the titles from messages
  hold the stored text.
