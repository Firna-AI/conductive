# Shared transcript code

This page belongs to the [shared contracts](README.md). It names the
modules of the pure transcript fold that the browser and the Worker share.

- [Session Markdown](transcript/session-markdown.ts) folds session pages and
  builds concise or full transcripts. [Markdown items](transcript/markdown-items.ts)
  format the shared chat words, paths, and commands. A Continue note copies
  as one note with the words of the chat, the name of the member, and both
  branches as code, under no heading. [Markdown code](transcript/markdown-code.ts)
  keeps inline and block fences longer than their content's backticks.
- [Lost data](transcript/lost-data.ts) maps refusal event types to the same
  product names for the browser line and the copied transcript.
- [Duration](transcript/duration.ts) formats elapsed chat and command times.
  [Tool words](transcript/tool-words.ts) supply tool verbs, fold counts,
  and the rule that starts a run open.
- [Turn words](transcript/turn-words.ts) supply running, stopped, and failed
  lines, with omitted-file and unavailable-file data, and the member of a
  Continue note: "You" to that member, its name to others and in a copy.
- [Command words](transcript/command-words.ts) supply Mac names, command
  states, notes, and output text. Browser code supplies icons and colours.
- [Session events](transcript/session-events.ts) take stored Worker envelopes
  or parsed browser envelopes and select one session's events, with its
  Continue note.
- [Session log](transcript/session-log.ts) folds those events and session
  records in event order. It keeps the transcript and each item's first time.
- [Transcript](transcript/transcript.ts) defines the items and folds each
  session event with its [turn helpers](transcript/turn-events.ts).
- [Item placement](transcript/item-placement.ts) keeps late items in their
  turn. [Command placement](transcript/command-placement.ts) puts each Mac
  command after the items that began before it.
- [Turn work](transcript/turn-work.ts) finds each ended turn's folded work.
  [Transcript entries](transcript/transcript-entries.ts) group the items and
  generic inserts, and give each run of tool calls its default open state.
  The browser and the concise copy share that state. Browser callers use
  React nodes as the insert content.
