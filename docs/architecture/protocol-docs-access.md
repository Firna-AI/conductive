# Access protocol docs

This page lists the protocol docs that belong to
[Access and security](../protocol/access-and-security.md), and what each
covers. [Protocol docs](protocol-docs.md) lists the other protocol docs.

- [Isolation of orgs and sandboxes](../protocol/isolation.md)
  - [The app's provider keys](../protocol/provider-keys.md): the Boat key
    and the E2B key.
  - [Agent logins in a sandbox](../protocol/sandbox-logins.md): the login
    of each turn, the checks of the runner, and the risks of the logins
    and the tokens in a sandbox.
  - [Version pins](../protocol/version-pins.md): the runner version that
    a workspace accepts, the version pin, and the risks of the turn
    token in a sandbox.
  - [The share setting](../protocol/share-setting.md): whether the
    messages of other members can run on a personal login, its default,
    its checks, and its risks.
- [Tokens and secrets](../protocol/tokens-and-secrets.md)
  - [Agent logins](../protocol/agent-logins.md): the Claude and Codex
    logins that users connect, the ChatGPT sign-in and its renewal, and
    their risks.
  - [Tool detail secrets](../protocol/tool-detail-secrets.md): the filter
    of secret values before the cut of a long tool detail, and the risk
    of older runners and fallback connections.
  - [Answer text secrets](../protocol/answer-text-secrets.md): the held
    end of an unfinished answer, the saved state of its filter, and a
    longer value that shows as two masks.
  - [Own endpoint logins](../protocol/own-endpoint-logins.md): the
    endpoint and the key of each agent, the model list of the endpoint,
    and the addresses that the app accepts.
  - [Org logins](../protocol/org-logins.md): the login that an admin
    connects for each agent of an org, the Agents tab of the org
    settings, and the default login of a new session.
  - [Secrets](../protocol/secrets.md): the secrets of an org that agents
    use in one command, their storage, the Secrets tab, the rights,
    Reveal, the mark for all agents, the grants, and their risks.
    - [Capabilities](../protocol/capabilities.md): the control of New
      workspace, of each workspace, and of an automation, with its
      secrets part.
      - [Mac access](../protocol/mac-access.md): the requests that agents
        can always send to a Mac, the Mac access switch of the Mac app,
        the grant that it starts on this Mac, and the risks.
      - [Capabilities: what agents learn](../protocol/capabilities-agents.md):
        the facts of a session that its agent learns, the change note of
        each change, where the note goes, what the chat shows, and older
        runners.
    - [Secret variables](../protocol/secret-variables.md): the names of
      new secrets, the variable name of each secret, the command
      environment, conflicting variable names, and older tools.
    - [Secret requests](../protocol/secret-requests.md): the calls that
      list the secrets and run a command with secrets, the requests and
      their time limit, temporary values, and what the chat shows.
      - [Late secret requests](../protocol/secret-late-answers.md): the
        requests after the wait of their tool call ends, and their late
        answers.
- [Terminal, previews, and desktop](../protocol/terminal-previews-and-desktop.md)
  - [Preview grants](../protocol/preview-grants.md): the launch address
    of a preview, its one-use grant, the authorizer, the browser launch,
    the credential cookie, and a launch at a path.
- [Attachment uploads](../protocol/attachment-uploads.md): the upload of
  an attached file in parts, with the gate rules and the body limit of
  its routes.
- [Step timing](../protocol/step-timing.md): the `Server-Timing` header of
  the preview replies and of the create reply, and what it may hold, and
  the job step records of builds and starts.
