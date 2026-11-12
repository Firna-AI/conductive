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
| Claude | A Claude subscription token or an Anthropic API key |
| Codex | An OpenAI API key or a ChatGPT plan |

Use a login that you have permission to use.
Model use goes to its connected account.

- [Get access to Conductive](/docs/get-started#get-access)

## Connect Claude

1. Open **Account**.
2. Open **General**.
3. Find Claude under **Agents**.
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
2. Open **General**.
3. Find Codex under **Agents**.
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

## Choose who can use your login

Each session uses the login of the member who started it.
Other members can spend that login when you let them use it.

In **Account**, find **Let other members use this login** under the connected agent.
The switch saves each change at once.

| Setting | What another member's message does in your session |
| --- | --- |
| On | Uses your login and connected account |
| Off | Starts a new session on that member's own login |

Sharing starts off for a new Claude subscription token or ChatGPT sign-in.
It starts on for a new API key.
The share switch stays available for a ChatGPT plan.
Only its owner may use a ChatGPT plan under OpenAI's terms.

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

Check the error from the provider.
Make sure you connected the account you want to use.
Note your choice for **Let other members use this login** before removing the login.
Remove the saved login if you need to replace it.
Then connect the correct account.

Check **Let other members use this login** after connecting.
Set the switch to your preferred choice if needed.

A failed token or API key save keeps the secret in its field.
Correct the cause shown by the form before you try again.
If a share-setting change fails, the switch returns to its saved value.

## Understand access to credentials

Conductive stores agent logins encrypted.

A newer cloud computer starts from a shared setup that requires Conductive to keep agent logins outside the computer.
Its model requests and answers pass through Conductive on Cloudflare.
Conductive adds the session starter's login before sending each request to Anthropic or OpenAI.
Each turn there gets a temporary credential called a turn token.
Through Conductive, it can use the login of the member who started the session.

Programs and members with terminal access can read or copy that token.
A copy can spend the login while the turn runs, including from outside the computer.
A copied token cannot start a new model request after the turn ends.
A program that keeps running can read tokens of later turns, including turns in other members' sessions.
Your ChatGPT sign-in never enters a cloud computer.
An older cloud computer cannot run Codex with ChatGPT.

An older cloud computer starts from an earlier setup that still permits software to receive the session starter's agent login itself.
Programs and members with terminal access can read or copy that login during a turn.
A copied login can remain usable after the turn ends.
If a login is exposed, revoke it with its provider.
Removing it from Conductive does not revoke a copy held elsewhere.

Ask an org admin to select **Build computer** in **Settings**, under **Cloud computer**.
After the build succeeds, create a new workspace to get the current protection.
Stopping or resuming an older computer does not remove its login exposure risk.
Installing newer software in that computer does not remove that risk either.
A new workspace does not revoke logins already copied from an older computer.

The share switch does not hide either kind of credential from programs or members with terminal access.
Work in an org with people you trust with your agent and GitHub logins.

- [Understand sessions and chat](/docs/sessions-and-chat)
- [Read the security guide](/docs/security)
- [Build the current computer setup](/docs/cloud-computer#apply-setup-changes)
