# Fast mode

This doc holds the requirements and the decisions in force for fast mode.
It covers the Fast switch of the model menu, the models that show it, the
changes of the switch, and who may turn it on. It also covers the choices
that keep fast mode, the requests of the agents, and the speed of a turn.
It belongs to [Messages and attachments](messages-and-attachments.md),
which covers the messages of a session. The terms are those of the
[architecture doc](../architecture.md#terms) and the terms below. A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A fast mode
decision number, such as fast mode decision 255, names the dated record of
one decision of the change that adds fast mode. Its plan keeps these
records while the change is open. Its pull request keeps them after the
merge. An own endpoint decision number names a decision of the change that
adds the own endpoint logins, as [Tokens and secrets](tokens-and-secrets.md)
says. The [mockup catalogue](../mockups/catalogue.md) draws the switch at
`app/fast-mode`, in `app/new-workspace`, and in `app/account/preferences`.

## Terms

- **Fast mode:** a way of the provider to serve a model faster, at a
  higher price. Claude calls it fast mode. Codex calls it the Fast service
  tier.
- **Choice:** the agent, the model, the effort, and the fast mode of a
  message. A session, a saved default, and a routine each keep a choice.
- **Fast turn:** a turn that runs with fast mode on.
- **Fast fields:** the parts of a model request that ask the provider for
  fast mode.
- **Standard speed:** the speed of a model without fast mode.

## The Fast switch

- Each choice holds fast mode, on or off (fast mode decision 255).
- The model menu shows a Fast row after the effort rows, under a line. The
  row holds only the word "Fast" and a switch.
- A click or Space on the row turns fast mode on or off. The menu stays
  open, so the switch shows its new state in place. A screen reader hears
  the row as a menu item that is on or off.
- The row shows the key of the Fast mode command at its end, as
  [Key hints](keyboard-shortcuts.md#key-hints) says.
- The trigger of the picker names Fast after the effort, as
  [Names in the product](agents-and-sessions.md#names-in-the-product) says.
- The menu shows no note about the price of fast mode (fast mode decision
  256). Reason: the user asked for no extra text about fast mode.
- Reason: Conductor keeps fast mode with the model and the effort, in its
  model menu and in its CLI.
- These ways were rejected (fast mode decision 255):
  - A fast entry in the model list for each model, such as "Opus 5.5 Fast".
    The model ID then differs from the ID of the provider, and the menu
    gets one more row for each such model.
  - A speed setting of the session, outside the choice. Messages, the
    saved default, a new workspace, and the agent tools would not carry it.
  - One fast mode for each member. Each change of speed between the turns
    of two members can read the conversation again without the prompt
    cache.
  - Fast mode as an effort level, because a member could then not use fast
    mode with an effort.
  - A Fast row for each model, which moves the session to a model with fast
    mode. The switch would then change the model that the member chose.
  - A switch only in Preferences, and fast mode that the operator sets for
    each session of a model. Neither puts the choice in the model menu.

## The models with fast mode

- The model list of the app marks each model that has fast mode, as
  [Models](../deployment/models.md#models) says. The menu shows the Fast
  row only for a marked model.
- Reason: the menu needs the mark before a cloud computer and a login
  exist. A mark that the agents report at run time was rejected for that
  reason.
- For a model without the mark, the picker shows fast mode as off. Each
  route that takes a choice stores fast mode as off for such a model.
- Reason: the stored choice and the trigger then show only a speed that the
  agent can give.
- A stored choice without fast mode, such as a choice from before fast
  mode, has fast mode off.

## Changes of fast mode

- A change to a model without fast mode turns fast mode off. A change to a
  model with fast mode keeps the switch, as a change of the model keeps an
  effort that the new model has.
- Fast mode stays on until a member turns it off. Reason: the model and the
  effort stay too.
- A change of fast mode stays in the session, as a change to another model
  of the same agent does. It applies at the latest from the next turn.

## Who may turn on fast mode

- Any member who may send in a session may turn fast mode on or off, as for
  the model and the effort (fast mode decision 256).
- Each message then runs with the fast mode of the session, also a message
  of the starter. So the login of the starter pays the higher price for the
  turns of each member who uses that login. This includes the turns of the
  starter.
- Reason: fast mode follows the rule of the model and the effort, and adds
  no restriction.
- These ways were rejected (fast mode decision 256):
  - Only the starter turns fast mode on or off.
  - Fast mode only for a message on the own login of its sender. The speed
    would then change between the turns of two members, and each change
    can read the conversation again without the prompt cache.
  - A second share setting on each login, for fast mode.
  - A switch that opens a new session on the own login of the member.
- Risk: a member can make the starter pay the higher price for the
  messages of the starter. This holds also while the starter does not share
  the login. A costlier model or effort has the same risk.

## Saved defaults, new workspaces, and routines

- The saved default of Preferences keeps fast mode with the model and the
  effort, as [The preference](create-a-workspace.md#the-preference) says.
  New workspace and "+" start from that choice, with its fast mode.
- Reason: they use the same picker, and the saved default is a choice that
  the member makes in Preferences. Fast mode for one session only, with no
  fast mode in the saved default, was rejected for that reason (fast mode
  decision 255).
- The default choice of the app has fast mode off.
- A routine keeps fast mode in its choice, as
  [A routine](routines.md#a-routine) says. Reason: each choice holds fast
  mode, and a routine keeps a choice.

## Agent tools

- The calls that take a model also take fast mode. The model list of the
  tools says which models have fast mode.
- [Create a workspace](workspace-calls.md#create-a-workspace),
  [Start a session](session-calls.md#start-a-session), and
  [Send a message](session-calls.md#send-a-message) state when a call runs
  fast. A saved default gives a tool call no fast mode.

## The requests of the agents

- On a fast turn, the runner asks Claude for its fast mode, and Codex for
  its Fast service tier. On each other turn, it asks each agent for
  standard speed.
- The model gateway passes the fast fields unchanged, as it passes each
  request body and each `anthropic-*` header.
  [Model gateway: requests and answers](model-gateway-requests.md) states
  these rules.
- An own endpoint login gets the fast fields, as each other login does. An
  endpoint that refuses them fails the turn with its cause, as it does for
  a model that it does not serve (own endpoint decision 5). The member can
  then turn fast mode off.
- Reason: the app already asks each Claude own endpoint for a cache of 1
  hour, which an endpoint can refuse (own endpoint decision 12). A rule
  that never asks an own endpoint for fast mode was rejected, because an
  endpoint that serves fast mode would then lose it.
- A runner that does not support fast mode ignores it, and runs the turn at
  standard speed. The runner protocol version stays the same.
- Reason: such a runner already ignores a request of a turn that it does
  not know, such as the cache of 1 hour. A refusal of such a runner was
  rejected, because it adds a gate.

## Standard speed

- A fast turn can run at standard speed. The agent then goes on at standard
  speed, and fast mode stays on in the choice. These are the causes:
  - Claude reaches its fast rate limit, and waits for a cooldown.
  - A Claude subscription has no usage credits.
  - The Claude org of the login has not turned on fast mode.
  - OpenAI serves a fast Codex request at standard speed.
  - The cloud computer has a runner that does not support fast mode.
- A failed turn was rejected, because the agent can go on at standard
  speed. A switch that turns itself off was rejected, because the choice of
  the member would then end with a cause that passes, such as a cooldown.

### The speed of a turn

- The end of each fast turn that finishes or stops gives its speed: fast,
  or standard with its cause (fast mode decision 257).
- The speed is standard when the agent says that it ran a request of the
  turn at standard speed while fast mode was on. Otherwise the speed is
  fast.
- Codex does not say which speed OpenAI gave. So a fast Codex turn has
  fast speed. Risk: the chat then shows no Codex turn that OpenAI served at
  standard speed.
- A fast turn whose end gives no speed has standard speed, with the cause
  of an older runner.
- The end of a fast turn at standard speed shows "Standard speed" and its
  cause. Without a cause that the app knows, it shows "Standard speed"
  alone. The [mockup catalogue](../mockups/catalogue.md) draws this end at
  `app/chat/standard-speed`, with its words.
- The end of a fast turn at fast speed, and of a turn without fast mode,
  shows nothing new.
- Reason: the member learns why the answers came slowly, beside the slow
  turn, on the end that every turn already has.
- These ways were rejected (fast mode decision 257):
  - No notice. Members would then think that fast mode is broken.
  - Only a note in the public guides. The member then sees no cause beside
    the slow turn.
  - A chat line when the fast state changes. It is a new chat event, with
    its own rules of order and delivery.
  - The cause in the model picker. The session then needs a field for its
    last fast state.
  - The last fast state of each login, on the Account page. It needs a
    migration, and the stored state can go out of date.
  - A read of the speed of each Codex answer in the model gateway. The
    gateway passes each answer unread.
