---
title: Agent logins
description: Connect your own account for agents powered by Claude and Codex, and choose who can use each login.
group: Start
order: 30
---

## Before you connect

Sign in to Conductive with GitHub first.
Your account needs access before you can connect an agent.

Each login serves all your Conductive orgs.
Connect at least one of these:

| Agent | Supported login |
| --- | --- |
| Claude | A Claude subscription token, an Anthropic API key, or an own endpoint |
| Codex | An OpenAI API key, a ChatGPT plan, or an own endpoint |

Use a login that you have permission to use.
A subscription token or provider API key bills model use to its connected account.
An own endpoint is a gateway or proxy that you choose, with its address and key.
Model use on an own endpoint bills where its owner runs it.

- [Get access to Conductive](/docs/get-started#get-access)

## Connect Claude

1. Open **Account**.
2. Open **Agents**.
3. Find Claude.
4. Select **Connect**.
5. Choose **Subscription token** or **API key**.
6. Paste the token or key into its field.
7. Select **Connect**.

For a subscription token, run this command on a computer where the `claude` command is installed:

```bash
claude setup-token
```

Complete the browser authorization that the command opens.
Paste the printed token into **Subscription token**.
You can use an Anthropic API key if that command is unavailable.
The API key form has a link to create a key with Anthropic.

After you save the login, the row shows **Connected** and its kind.
Conductive keeps the stored login hidden in Account.

## Connect Codex

1. Open **Account**.
2. Open **Agents**.
3. Find Codex.
4. Select **Connect**.

### Use a ChatGPT plan

Sign-in works with any ChatGPT plan, including Plus and Pro.
First turn on device code sign-in in your ChatGPT security settings.
Ask your ChatGPT admin if you cannot change that setting.

- [Open ChatGPT settings](https://chatgpt.com/settings/security)

1. Choose **ChatGPT plan**.
2. Select **Get a code**.
3. Open [OpenAI's sign-in page](https://auth.openai.com/codex/device).
4. Sign in to ChatGPT.
5. Enter only a code that the Conductive page shows.

Never share the code.
The code expires in 15 minutes.
Keep the Conductive page open while it shows **Waiting for you to sign in**.
If the code expires, select **Get a new code**.
If ChatGPT refuses sign-in, check the security setting, then select **Get a code** again.

Conductive renews your saved ChatGPT sign-in for you.
OpenAI offers its own **Sign in with ChatGPT** for apps only to partners.
OpenAI can block this device code sign-in.
Use an OpenAI API key if that happens.

### Use an OpenAI API key

1. Choose **API key**.
2. Paste your OpenAI API key.
3. Select **Connect**.

The form has a link to create a key with OpenAI.
The row shows **Connected** after either connection succeeds.

Choose a model for the connected agent when you send a message.
The message box asks you to connect the agent if its login is missing.

## Connect an own endpoint

Connect the endpoint separately for each agent that will use it.
The endpoint must support the API and key format of that agent:

| Agent | Required API | Key format | Example endpoint |
| --- | --- | --- | --- |
| Claude | Anthropic Messages API | `x-api-key` header | `https://gateway.example.com` |
| Codex | OpenAI Responses API | Bearer token | `https://gateway.example.com/v1` |

1. Open **Account**.
2. Open **Agents**.
3. Find the agent.
4. Select **Connect**.
5. Choose **Own endpoint**.
6. Enter the address in **Endpoint**.
7. Paste the endpoint's key into **API key**.
8. Read the address hint.
9. Select **Connect**.

Use a public `https://` address with a host name.
The address must have no user name or password.
An IP address alone does not work as the host.
A host name that points to your public IP address works when the server has a certificate for that name.
For example, the free name `<IP address>.sslip.io` points to that IP address.

The hint shows the request address from the address you type.
For Claude, Conductive drops a final `/v1` before saving the address.
The hint also shows the saved Claude address when its format changes.
Conductive adds routes such as `/v1/messages` for Claude.
For Codex, it adds `/responses` to the saved address.
The saved Codex address can differ from the hint after Conductive checks the model list.

After you connect, the account page shows **Connected** and **Own endpoint**, with the host below the agent.
It includes the port when the port is not the default.
Conductive keeps the address and key encrypted.
Your browser gets neither the saved key nor the full saved address back.

The endpoint gets the messages, files, and command results of each turn on the login, whoever sent the message.
Its owner is responsible for the endpoint and its terms.
Claude asks for a one-hour prompt cache on every turn with an own endpoint login.
Check the endpoint's support and charges for that cache.
A turn with **Fast** on also asks the endpoint for fast output.
If the endpoint refuses it, the turn fails with the endpoint's cause.
Turn **Fast** off in that session to continue.

### Keep the model list current

Conductive reads the endpoint's model list with its key when you save the login.
For Codex, it first reads `<address>/models` at the address you type.
If that read fails, it also tries `<address>/v1/models` unless the address already ends with `/v1`.
It makes no second read if the endpoint gives no HTTP response.
If only the second read works, Conductive saves the address with `/v1` added.

The account page then shows this note under the Codex row:

> Conductive added /v1 to the address, because the endpoint lists its models there.

The note stays until you reload the page.
A new save or **Remove** also clears it.

When that list omits an app model, the account page names the missing models, their IDs, and the last successful read.
Select **Refresh** there to read the list again.
Conductive also reads the list in the background when a turn on the login starts, at most once in 10 minutes.
Refresh and background reads keep the saved address.

For Claude and Codex, a failed model list read during a save or **Refresh** shows this warning under the agent's row:

> Conductive couldn't read the model list of this endpoint. Check the address and the key.

Select **Refresh** beside the warning to try again.
A successful **Refresh**, a new save, **Remove**, or a page reload clears the warning.
A failed background read shows no warning.

Your model pickers hide app models that the last successful list does not name.
A failed read keeps the last successful list.
Before the first successful read, your pickers show all app models for the agent.
They also show all app models for that agent when the list names none of them.
An existing session keeps its current model.
Other members' pickers still show all app models.
Your choices remain the models that Conductive offers.

## Choose who can use your login

Each session uses the login of the member who started it.
Other members can spend that login when you let them use it.

In **Account**, find **Let other members use this login** under the connected agent.
The switch saves each change at once.

| Setting | What another member's message does in your session |
| --- | --- |
| On | Uses your login and its connected account or endpoint |
| Off | Starts a new session on that member's own login |

Sharing starts off for a new Claude subscription token or ChatGPT sign-in.
It starts on for a new API key or own endpoint login.
The share switch stays available for a ChatGPT plan.
Only its owner may use a ChatGPT plan under OpenAI's terms.
An endpoint can use personal subscriptions that other members then spend.
Turn sharing off if their terms do not allow that use.

A new session on another member's login has no copy of your conversation.
The earlier session keeps its history.

Share a login only when the provider's terms allow that use.

## Replace or remove a login

1. Open the agent's row in **Account**.
2. Note your choice for **Let other members use this login** before you remove the login.
3. Select **Remove**.
4. Select **Connect** if you want to save a replacement.
5. After connecting a replacement, check **Let other members use this login**.
6. Set the switch to your preferred choice if needed.

Removing a login keeps the session history.
A later request can need a working login before it runs.
Use **Stop** in chat to interrupt an agent that is working.

If a login is exposed, revoke it with its provider.
Removing it from Conductive does not revoke a copy held elsewhere.

## Recover from a login error

**Connected** confirms that Conductive saved the login.
The first agent request can still report an authentication error.

Conductive shows **Signed out** in place of **Connected** when OpenAI no longer accepts your ChatGPT sign-in.
This also applies after Conductive renewed it.
A turn on that sign-in stops with a login error.
The row shows the cause, such as **ChatGPT access expired.**
Select **Sign in again**.
Then complete the [ChatGPT sign-in steps](/docs/agent-logins#use-a-chatgpt-plan) again.

If the error says the agent software cannot use ChatGPT sign-in, ask an admin to run **Build computer**.
After it succeeds, create a new workspace.
You can also connect an OpenAI API key.

Check the error from the provider.
Make sure you connected the account you want to use.
Note your choice for **Let other members use this login** before removing the login.
Remove the saved login if you need to replace it.
Then connect the correct token, key, or endpoint.

Check **Let other members use this login** after connecting.
Set the switch to your preferred choice if needed.

A failed token or API key save keeps the secret in its field.
Correct the cause shown by the form before you try again.
If a share-setting change fails, the switch returns to its saved value.

## Understand access to credentials

Conductive stores agent logins encrypted.
It keeps these logins outside cloud computers.

Model requests and answers pass through Conductive on Cloudflare.
Conductive adds the session starter's login before sending each request to Anthropic, OpenAI, or the chosen endpoint.
Each turn gets a temporary credential called a turn token.
Code and members with terminal access can read or copy that credential.

They can use it only through Conductive on the session starter's login while the turn runs.
A copied token also works from outside the computer during that turn.
A copied token cannot start a new model request after the turn ends.
Your ChatGPT sign-in never enters a cloud computer.

An own endpoint's address and key never reach a cloud computer.
Each turn needs supported agent software.
If Conductive reports unsupported agent software, ask an admin to run **Build computer**.
After it succeeds, create a new workspace.

The share switch does not hide turn tokens from code or members with terminal access.
Work in an org with people you trust with your agent and GitHub logins.

- [Understand sessions and chat](/docs/sessions-and-chat)
- [Read the security guide](/docs/security)
