# Claude event order after background work is unknown

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Low. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-21, from the branch `calummoore/follow-up-the-idle-boundary-wait-has-no-ldfz`, PR #624. It keeps the two related cases of `plans/follow-ups/idle-boundary-wait-has-no-deadline.md`, which that branch deletes. That item came on 2026-11-11 from peer review of PR #245, finding 1.
- **Location:** `runner/sdk-helper/src/providers/claude-background.ts` lines 27, 32, 40, 49, 70, and 78, `runner/sdk-helper/src/providers/claude-events.ts` lines 99 and 179, `runner/sdk-helper/src/providers/claude.ts` lines 94, 101, 148, 208, and 244, `crates/cnd-runner/src/engine/background.rs` lines 23, 29, 37, 45, and 60, `crates/cnd-runner/src/engine/results.rs` lines 81, 121, 150, and 180, `crates/cnd-runner/src/engine/actor.rs` lines 34 and 49, `crates/cnd-runner/src/engine/input.rs` line 135, `crates/cnd-runner/tests/engine/background_tests.rs` lines 199 and 218, `runner/sdk-helper/src/providers/claude-background-wait.test.ts` line 54, `runner/background-work.md` lines 26 and 107, and `docs/protocol/background-work.md` lines 18, 20, 22, and 80.
- **Reason:** Its branch only closes a fixed item, and the work needs a controlled run of the pinned program that costs the same later.

- **Terms:**
  - **Wait:** a time when a Claude turn stays open after a reply, for live background work, or after ended work until a fresh idle message.
  - **Notification reply:** a reply that the agent program starts by itself after a background task ends or a wake-up fires.
  - **Idle message:** a `system/session_state_changed` message of the program with the state `idle`, which says that no reply runs.
  - **Running message:** a `system/session_state_changed` message of the program with the state `running` or `requires_action`, which says that a reply runs.
  - **Stop hook:** the root `Stop` hook of the SDK helper, which the program calls each time a reply tries to end.
- **Background:**
  - The Claude agent of a workspace runs in a pinned agent program. The SDK helper in `runner/sdk-helper/` reads its messages and sends provider events to the Rust engine in `crates/cnd-runner/src/engine/`.
  - A Claude turn stays open after a reply while live background work remains (`docs/protocol/background-work.md:18`). It ends when the agent is idle and no live work remains (`docs/protocol/background-work.md:22`).
  - When a task ends or a wake-up fires, the program notifies the agent. The agent then works again in the same turn (`docs/protocol/background-work.md:20`).
  - A wait lasts at most 30 days. When the limit passes during a reply, the limit applies at the end of that reply. Reason: a cut tool call can leave half-done work, such as a push without its merge (`docs/protocol/background-work.md:80`).
  - Ended work is background work that was live earlier in the same agent process and is no longer live. After ended work, the runner waits after a result until a fresh idle message. The helper and the engine use this same rule (`runner/background-work.md:26`).
  - The adapter sets `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS=1` (`runner/sdk-helper/src/providers/claude.ts:101`). Without it, the pinned program sends no idle or running messages.
  - The helper sends an `activity` event for each idle or running message (`runner/sdk-helper/src/providers/claude-background.ts:49`). It also sends `activity` with `idle: false` at the start of each Stop hook (`runner/sdk-helper/src/providers/claude-background.ts:40`, called at `runner/sdk-helper/src/providers/claude.ts:148`).
  - The helper reports the end of a notification reply as a `wake-up` event (`runner/sdk-helper/src/providers/claude-events.ts:179`). It drops that result while `waited` is false, except when it completes a reply continued after a dropped answer (`runner/sdk-helper/src/providers/claude-events.ts:99`).
  - A result that answers each member message sets `waited` while work is live, or after ended work with no fresh idle message (`runner/sdk-helper/src/providers/claude-background.ts:27`, `runner/sdk-helper/src/providers/claude.ts:208`). Member input clears `waited` (`runner/sdk-helper/src/providers/claude-background.ts:32`, `runner/sdk-helper/src/providers/claude.ts:244`).
  - The engine keeps three flags in `crates/cnd-runner/src/engine/background.rs`. `observed` says that this agent process had live work (line 26). `replied` says that a result came after the last `activity` with `idle: false` (line 49). `waiting` lets the limit timer run (line 53).
  - The engine calls `Background::reply` at a result that answers each member message, and at a `wake-up` event (`crates/cnd-runner/src/engine/results.rs:121`, `crates/cnd-runner/src/engine/results.rs:150`). Past the deadline it returns `Limit`.
  - While work is live, or after ended work with no fresh idle message, `Background::reply` sets `waiting` and the deadline, and it returns `Wait` (`crates/cnd-runner/src/engine/background.rs:45`). Otherwise it returns `Finish`.
  - An idle `activity` ends a waiting turn when `replied` is true and no work is live (`crates/cnd-runner/src/engine/background.rs:35`, `crates/cnd-runner/src/engine/results.rs:81`).
  - Only three things clear `waiting`:
    - an `activity` with `idle: false` (`crates/cnd-runner/src/engine/background.rs:29`)
    - member input (`crates/cnd-runner/src/engine/background.rs:37`, `crates/cnd-runner/src/engine/input.rs:135`)
    - a handoff to a new agent process (`crates/cnd-runner/src/engine/background.rs:60`, `crates/cnd-runner/src/engine/results.rs:180`)
  - Agent output and tool events do not clear `waiting`.
  - The limit timer of the engine runs only while `waiting` is true (`crates/cnd-runner/src/engine/actor.rs:34`). At the deadline it ends the turn with the end reason `background_work_limit` (`crates/cnd-runner/src/engine/actor.rs:49`). It does not check whether a reply runs.
- **Problem:** The rules that end a wait depend on the order of idle messages, running messages, Stop hooks, and results after background work ends. Static readings give two orders that can end a turn wrongly, and only injected test orders back the current rules. No real run showed or ruled out either order.
- **Impact if no action:** If the real order differs from the injected order, a turn can end wrongly. It can hold its sandbox until the 30-day limit, lose a notification reply, or cut a running reply at the limit.
- **Root question:** In the real order of the program's activity and completion signals after work ends, does each wait end without a lost or cut reply?
- **Options:**
  - **A.** Reproduce both orders in a controlled run with no model login. Effort: Medium.
    - Run the pinned program through the SDK helper and the engine. Point the program at a local scripted endpoint that serves the Anthropic Messages API.
    - Give the program a placeholder key. Give the engine a short `background_limit`.
    - Record what "What a reproduction needs" below gives.
    - Keep the harness as a developer script, so that a later SDK update can run it again.
    - Risk: a script can miss an order that only real model timing gives.
  - **B.** Reproduce both orders in a live run, in a disposable workspace with an authorized existing model login. Effort: Medium.
    - Ask the agent to start and stop disposable work inside its first reply.
    - The run shows real model timing.
    - The run needs an authorized existing model login. When no such login is available, the later task reports that missing prerequisite.
    - The model can fail to follow the request, so the run can need more tries.
  - **C.** Record a sanitized order of signals for each real wait in the runner journal. Effort: Medium.
    - Each end of a wait writes the order of the signal kinds and their times, with no content.
    - It adds production code. It gives evidence only after a rare case happens to a member.
  - **D.** Change the wait rules now, so that they do not depend on the unknown order. Effort: Medium.
    - For example, count agent output during a wait as the start of a reply.
    - Risk: without the real order, a wrong rule can remove the bound of a wait, or end a turn before a notification reply.
  - Each option keeps these assumptions:
    - A notification reply runs in the same turn. Source: `docs/protocol/background-work.md:20`.
    - The limit applies at the end of a running reply. Source: `docs/protocol/background-work.md:80`.
    - A wait lasts at most 30 days. Source: the choice of the user on 13 November 2026, in `docs/protocol/background-work.md:67`.
    - The runner learns the order only from the messages and the hooks of the pinned program. Source: the code. No option can change the program.
- **Left out:**
  - Change nothing, and close this item. It fails the goal, because nobody learns the real order. `runner/background-work.md:107` asks for that check after each SDK update, and no tool does it now.
  - A static read of the bundled program of the pinned SDK alone. It gives another static reading, not the real order. A can use such a read to plan its script.
  - A ceiling that ends a turn some time after the limit, also during a reply. It changes the no-cut rule, and the 30-day limit already bounds each wait outside a reply.
  - A shorter limit for a wait after ended work. It changes the 30-day limit that the user chose for each wait.
- **Wider fix:** A, with its harness kept as a developer script. It detects a later change of the real order at each SDK update. No structural fix is known before the real order is known.
- **Previous examples:**
  - Before PR #417, merged on 16 November 2026 as commit `5fcf1df4b`, the helper and the engine used different wait rules after ended work. That wait had no deadline.
  - The description of PR #417 reports one session that showed "running" for more than 76 hours. It gives a diagnosis from the code, not a trace of the program's messages.
  - On 11 November 2026, commit `6b21ea341` of PR #245 checked the pinned program with a local scripted model endpoint. The repository keeps no harness or trace of that check.
- **Recommendation:** A. It gives the real order of the pinned program with no model login, and its harness can check each later SDK update. D waits for that evidence.
  - In A, do not inject the two orders. Let the program produce each order, or show that it does not.
  - Answer the questions under "What a reproduction needs".
  - If A shows a defect, add the confirmed order and the fix options to this item. Then apply the fix rule again.
  - Keep the same-turn notification rule and the no-cut rule in each fix.
  - If the scripted endpoint cannot make the program run an order, use B. B needs an authorized existing model login. When none is available, report that missing prerequisite.
  - If A rules out both orders, record the evidence, and delete this item in the same branch.
  - Promise no code fix before the reproduction.
- **Action:** fix after merge, apply A, because the concern is Rare and Medium, its work costs the same later, and a reproduction comes before any change.

## Order 1: a notification reply after the first result

- Static reading: work starts and ends inside the first reply. The program sends the result of that reply. A queued notification reply for the ended work then follows, before a fresh idle message.
- Before PR #417, the helper set `waited` only while work was live. So it dropped the result of that notification reply.
- The Stop hook of the notification reply cleared `replied` in the engine. So the final idle message could not end the wait.
- That wait had no deadline. Possible effect: the turn stayed open until Stop or a shutdown, with its sandbox and its turn token.
- A running turn also keeps the idle stop from stopping its sandbox (`docs/protocol/background-work.md:96`).
- PR #417 sets `waited` also after ended work with no fresh idle message (`runner/sdk-helper/src/providers/claude-background.ts:27`).
- PR #417 also puts that wait in the engine on the common path, with `waiting`, the deadline, and the limit timer (`crates/cnd-runner/src/engine/background.rs:52`).
- Two tests inject this order. They are `ends_a_wake_up_reply_after_work_that_ended_before_the_reply` (`crates/cnd-runner/tests/engine/background_tests.rs:199`) and the test at `runner/sdk-helper/src/providers/claude-background-wait.test.ts:54`.
- `applies_the_limit_to_a_wait_for_idle_after_work_ended` (`crates/cnd-runner/tests/engine/background_tests.rs:218`) injects a missing later idle message. The wait then ends at the limit.
- This addresses the static mechanism. It is not a reproduction of the real order.
- Possible effects of a different real order, also from a static reading:
  - The program sends an idle message before a queued notification reply. The engine then ends the turn and closes the program, so that reply never runs (`crates/cnd-runner/src/engine/background.rs:35`, `crates/cnd-runner/src/engine/results.rs:81`).
  - No fresh idle message comes. The turn then waits until the 30-day limit.

## Order 2: a reply that starts with no running message

- Static reading: during a wait, the program starts a notification reply and sends no new running message.
- Then `waiting` stays true until the Stop hook of that reply, and the limit timer keeps running.
- The Stop hook comes at the end of the reply. So its `activity` does not show when the reply started.
- Possible effect: the deadline passes in that window, and the limit timer ends the turn while the reply runs. The runner then closes the program, and a cut tool call can leave half-done work.
- That breaks the rule at `docs/protocol/background-work.md:80`.
- A cut needs a reply that runs when an existing deadline passes. The deadline comes 30 days after the first wait, or after the last member message that joined during a wait.
- PR #417 does not prove or fix this premise. It also gives the limit timer to the wait after ended work, which is the state of order 1.
- No test injects this order. Each limit test in `crates/cnd-runner/tests/engine/background_tests.rs` ends at an idle wait, or it sends `activity` with `idle: false` before the reply that the limit reaches.

## Evidence limits

- No real run reproduced either exact order.
- The description of PR #417 reports one session that showed "running" for more than 76 hours after its agent had finished. It gives a diagnosis from the code, not a trace of the program's messages.
- Nobody holds a real-program trace or a controlled reproduction that shows either order.
- Fake SDK messages in the helper tests and injected events in the engine tests show the behaviour only for their injected orders.
- On 11 November 2026, PR #245 checked command completion, timeout, and limit cleanup with the pinned program and a local scripted model endpoint.
- A real-program proof with SDK 0.3.318 from that time received every expected idle message. Nobody reproduced a missing idle message with this pin.
- No such check reproduced either order. The repository keeps no harness or trace of them.
- The pin is still `@anthropic-ai/claude-agent-sdk` 0.3.318 (`runner/sdk-helper/package.json:15`).
- A static reading of SDK 0.3.318 found that its internal ten-minute ceiling closes input only for a string prompt. The adapter passes an open input stream (`runner/sdk-helper/src/providers/claude.ts:95`, `runner/sdk-helper/src/providers/claude.ts:133`), so that ceiling ends no wait.

## What a reproduction needs

- The exact pinned SDK and program version. Read them from `runner/sdk-helper/package.json`, its lock file, and the program path of `claudeBinary` (`runner/sdk-helper/src/providers/binaries.ts:8`).
- Controlled disposable work that starts and ends inside the first reply. Examples are a short background shell command that the agent stops, and one that ends by itself.
- The sanitized raw order of the program's messages: idle and running messages, `background_tasks_changed` messages, results with their origin, and Stop hook calls.
- A link from each of those messages to the helper events and the engine decisions. Engine decisions are `Wait`, `Finish`, `Limit`, and each start and stop of the limit timer.
- Answers to these questions:
  - Does a queued notification reply start and end before the idle message?
  - Does a running message come before the output of each reply, also of a notification reply during a wait?
- A controlled clock or an explicit signal that tests the deadline without a real 30-day wait. `background_limit` of `EngineDependencies` gives harnesses a shorter limit (`crates/cnd-runner/src/engine/dependencies.rs:43`).
- No copied or logged credential. Record only message types, subtypes, states, origins, task counts, and times.
- A local scripted endpoint needs no model login. The helper gives the program its endpoint in `ANTHROPIC_BASE_URL` when it writes no profile pair (`runner/sdk-helper/src/providers/claude.ts:94`). The measure tool uses that route (`runner/agent-logins.md:203`).
- A later live run may need an authorized existing model login. This item asks for none now.
