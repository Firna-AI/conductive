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
| Codex | An OpenAI API key or an own endpoint |

Use a login that you have permission to use.
A subscription token or provider API key bills model use to its connected account.
An own endpoint is a gateway or proxy that you choose, with its address and key.
Model use on an own endpoint bills where its owner runs it.

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
5. Choose **API key**.
6. Paste your OpenAI API key into **OpenAI API key**.
7. Select **Connect**.

The form has a link to create a key with OpenAI.
The row shows **Connected** after you save it.

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
2. Open **General**.
3. Find the agent under **Agents**.
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

The hint shows where requests go through Conductive.
If Conductive changes the address format, the hint also shows the address that saves.
For Claude, Conductive adds routes such as `/v1/messages` to the endpoint.
For Codex, it adds `/responses` to the endpoint.

After you connect, the account page shows **Connected** and **Own endpoint**, with the host below the agent.
It includes the port when the port is not the default.
Conductive keeps the address and key encrypted.
Your browser gets neither the saved key nor the full saved address back.

The endpoint gets the messages, files, and command results of each turn on the login, whoever sent the message.
Its owner is responsible for the endpoint and its terms.
Claude asks for a one-hour prompt cache on every turn with an own endpoint login.
Check the endpoint's support and charges for that cache.

### Keep the model list current

Conductive reads the endpoint's model list with its key when you save the login.
When that list omits an app model, the account page names the missing models, their IDs, and the last successful read.
Select **Refresh** there to read the list again.
Conductive also reads the list in the background when a turn on the login starts, at most once in 10 minutes.

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

Sharing starts off for a new subscription token.
It starts on for a new API key or own endpoint login.
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

Check the error from the provider.
Make sure the token or key belongs to the account you want to use.
Note your choice for **Let other members use this login** before removing the login.
Remove the saved login if you need to replace it.
Then connect the correct token, key, or endpoint.

Check **Let other members use this login** after connecting.
Set the switch to your preferred choice if needed.

A failed save keeps the secret in its field.
Correct the cause shown by the form before you try again.
If a share-setting change fails, the switch returns to its saved value.

## Understand access to credentials

Conductive stores agent logins encrypted.

A newer cloud computer starts from a shared setup that requires Conductive to keep agent logins outside the computer.
Its model requests and answers pass through Conductive on Cloudflare.
Conductive adds the session starter's login before sending each request to Anthropic, OpenAI, or the chosen endpoint.
Each turn there gets a temporary credential called a turn token.
Code and members with terminal access can read or copy that credential.

They can use it only through Conductive on the session starter's login while the turn runs.
A copied token also works from outside the computer during that turn.
A copied token cannot start a new model request after the turn ends.

An own endpoint's address and key never reach a cloud computer, including an older computer.
Its turn needs agent software that supports temporary credentials.
If the software cannot use them, the turn cannot start.

For subscription tokens and provider API keys, an older cloud computer still permits software to receive the session starter's agent login itself.
Code and members with terminal access can read or copy that login during a turn.
A copied login can remain usable after the turn ends.
Installing newer software on that computer does not remove this risk.
A new build gives the protection to new cloud computers created from its setup.
Ask an admin to run **Build computer**.
After it succeeds, create a new workspace to get the newer protection.

The share switch does not hide either kind of credential from code or members with terminal access.
Work in an org with people you trust with your agent and GitHub logins.

- [Understand sessions and chat](/docs/sessions-and-chat)
- [Read the security guide](/docs/security)
