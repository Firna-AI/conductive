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
| Codex | An OpenAI API key |

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
5. Paste your OpenAI API key.
6. Select **Connect**.

The form has a link to create a key with OpenAI.
The row shows **Connected** after you save it.

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

Sharing starts off for a new subscription token.
It starts on for a new API key.

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

Check the error from the provider.
Make sure the token or key belongs to the account you want to use.
Note your choice for **Let other members use this login** before removing the login.
Remove the saved login if you need to replace it.
Then connect the correct token or key.

Check **Let other members use this login** after connecting.
Set the switch to your preferred choice if needed.

A failed save keeps the secret in its field.
Correct the cause shown by the form before you try again.
If a share-setting change fails, the switch returns to its saved value.

## Understand access to credentials

Conductive stores agent logins encrypted.
A newer cloud computer starts from an org image that keeps the real agent login outside the computer.
Its model requests and answers pass through Conductive on Cloudflare.
Conductive adds the session starter's login before sending each request to Anthropic or OpenAI.
The computer receives only a turn credential that works through Conductive while that turn runs.

Code and members with terminal access can read and copy that credential.
They can use it from outside the computer while the turn runs.
The share switch does not prevent this access.

An older cloud computer starts from an earlier org image.
It still permits older software that receives the real agent login.
Code and terminal users can copy that login and use it after the turn ends.
Installing newer agent software on that computer does not remove this risk.
A new org image build keeps real agent logins outside computers created from that image.

Work in an org with people you trust with your agent and GitHub logins.

- [Understand sessions and chat](/docs/sessions-and-chat)
- [Read the security guide](/docs/security)
