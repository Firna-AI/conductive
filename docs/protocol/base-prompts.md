# Base prompts

This doc holds the requirements and the decisions in force for the base
prompt of Claude agents and the base instructions of Codex agents.
[Agent instructions](agent-instructions.md) states the agent
instructions that come after them, and gives the terms of this page.

## Base prompts

- A Claude agent gets a short base prompt of the app, then the agent
  instructions, as one text of system instructions.
- The base prompt holds seven rules. They tell the agent to:
  - complete the task that the user authorized, and read the relevant code
    and docs before it changes files
  - keep each change focused: prefer the existing files, and add no
    unrelated feature, clean-up, or abstraction
  - write secure code, and fix each security problem that its change adds
  - protect the work of the user: ask before a destructive action or a
    change to a shared system, unless the user authorized it
  - use the tools efficiently: prefer the dedicated file and search tools,
    and run independent tool calls together
  - check the results: test a change of an interface in a browser, and
    report each check that failed or could not run
  - write short and accurate replies: keep checked facts apart from
    assumptions, and give the file path and the line of each code
    reference
- The base prompt names tools by their purpose, because the tools of an
  agent can vary.
- The base prompt holds no fact that changes, such as the date or the Git
  state.
- The base prompt does not copy the default system prompt of the agent
  SDK. It does not promise each rule or behaviour of that prompt.
- Reason: the app keeps a short, fixed text of its own. That text changes
  only when the app changes it.
- These base prompts were rejected:
  - No base prompt. The agent instructions are then the whole prompt, with
    no base guidance below them.
  - The default system prompt of the agent SDK, with the agent
    instructions after it. It changes with each SDK update, and parts of
    it name another product. It also holds sections that change, such as
    the Git state, so each turn can rewrite the prompt cache.
  - A setting for each org that chooses between these two. It needs a
    setting, a mockup, storage, and a runner field, for a choice that no
    user asked for.
- A Codex agent keeps the default base instructions of Codex. It gets the
  agent instructions in addition to them.
- Reason: Codex gives its agents base instructions of its own. The Claude
  agent SDK gives none by default.
