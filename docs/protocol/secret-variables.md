# Secret variables

This doc holds the requirements and the decisions in force for the
environment of a command that runs with secrets. It covers the names of new
secrets, the variable name of each secret, the entries of the command
environment, and conflicting variable names. It also covers what the tools
give and older tools. It belongs to [Secrets](secrets.md), whose
[How an agent uses a secret](secrets.md#how-an-agent-uses-a-secret) says
how a run gives the values to one command.
[Run a command with secrets](secret-requests.md#run-a-command-with-secrets)
states the run call. The terms are those of [Secrets](secrets.md#terms) and
of the [architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A
variable-name decision number, such as variable-name decision 1, names the
dated record of one decision of the change that adds variable names. Its
plan keeps these records while the change is open. Its pull request keeps
them after the merge.

## Terms

- **Variable name:** the name of the environment variable that gives the
  value of one secret to the command of a run.
- **Shell name:** a name that starts with an ASCII letter or `_`, and that
  holds only ASCII letters, digits, and `_`.
- **Original entry:** the entry of the command environment under the exact
  name of a secret.
- **Conflict:** two different names of one run that need the same entry of
  the command environment.

## New names

- The name of a new secret holds only ASCII letters, digits, and `_`. The
  name can start with a digit.
- The rule applies to Add secret and to Save as secret. Add secret first
  removes the white space at both ends of the name. Save as secret checks
  the name of the request as it is.
- The Worker refuses a new name with any other character, also from an
  older app. It then creates no secret.
- [The Secrets tab](secrets.md#the-secrets-tab) and
  [Temporary values](secret-temporary-values.md#temporary-values) say what
  Add secret and Save as secret show for such a name.
- The rule applies only when a secret is created. The list, runs, grants,
  Reveal, Replace, a change of description, and Delete take each existing
  name as it is.
- An existing secret keeps its name, also with other characters. Replace
  does not change that name.
- The app has no rename. A later rename applies the rule to the new name.
- Reason: each new name then gives a predictable variable name.
- A rule for existing names, and a rename of existing secrets, were
  rejected. Reason: existing commands and grants use those names.

## Variable names

- Each name of a run has one variable name. The tools derive it from that
  name alone.
- A shell name is its own variable name, with its exact case. Reason: a
  command that reads that name keeps working.
- For each other name, the tools change each ASCII letter to uppercase.
  They replace each run of characters other than ASCII letters, digits,
  and `_` with one `_`. Then they remove each `_` at both ends.
- An empty result becomes `SECRET`. A result that starts with a digit gets
  a `_` in front.
- Each character outside ASCII gets the replacement too. The rule uses no
  locale and no transliteration.
- So `Cloudflare (read-only)` gets `CLOUDFLARE_READ_ONLY`, and `9-key`
  gets `_9_KEY`.
- The names of the secrets of the org and of temporary values follow the
  same rule.
- Reason: a shell drops an environment entry with a name such as
  `Cloudflare (read-only)`. Its command can then end with no error and
  without the value.

## The command environment

- The command gets the value of each name of the run under its variable
  name.
- The command also gets the value in its original entry, except for a
  name that is empty or holds `=` or NUL.
- Reason: a program that reads the exact name keeps working. A shell reads
  only shell names, so a shell command reads the variable name.
- Reason: an empty name or a name with `=` does not reach a program as
  that name, and a NUL stops the command from starting. The variable name
  still gives the value.
- Each of these entries replaces an inherited variable with the same name,
  such as `PATH` or `GITHUB_TOKEN`, in the command only. The environment of
  the tool and of the agent stays as it is.
- A [service](services.md) that the command starts gets none of these
  entries, as [The environment](services.md#the-environment) says.
- Risk: a secret can hide an inherited variable from its command. The list
  gives each variable name before a run, so the agent can see this first.

## Conflicting variable names

- Two different names of one run never share an entry of the command
  environment. The check covers each variable name and each original
  entry.
- For example, `Cloudflare (read-only)` and `CLOUDFLARE_READ_ONLY` need the
  same entry. So do `9key` and `9KEY`.
- The tools refuse a run with a conflict before they call the Worker
  (variable-name decision 1 A). So no request and no result in the chat
  name a command that cannot start.
- The refusal gives both names and the variable name that they share. It
  holds no value, and the command does not start.
- Each of these names still works in a run of its own.
- Reason: one value would otherwise replace the other, and the command
  could use the wrong account.
- Numbered suffixes from the names of the org were rejected, because a new
  secret could change a variable name between the list and the run.
- Stored variable names were rejected, because they need a schema change
  and refuse some new names.
- Hashed suffixes were rejected, because they make variable names hard to
  read.
- A variable name that the agent chooses was rejected, because it adds
  input and help to both tools.
- A refusal of a new secret with a conflicting variable name was rejected.
  Reason: it adds a refusal, and older names and temporary values still
  conflict.

## What the tools give

- Each entry of the list gives the variable name of its secret, as
  [List the secrets](secret-requests.md#list-the-secrets) says.
- The result of a command that ran gives each name with its variable name.
  MCP gives them in its result.
- The CLI writes them in one line on standard error, after the command
  ends. The line escapes each name as JSON does, so it stays one line.
- Reason: the standard output of the CLI then holds only the output of the
  command.

## Older tools

- The Worker returns each value under the exact name that the run asked
  for, and under no other name.
- Reason: an older tool refuses a reply with a value for a name that it did
  not ask for.
- The tools derive each variable name themselves. They need no variable
  name and no other call from the Worker.
- A cloud computer gets newer tools with its sandbox software, as
  [Updates](sandbox-software.md#updates) says.
- Until then, its older tools give each value only in its original entry.
  So a shell command there still misses a value with a name such as
  `Cloudflare (read-only)`.
- The original entries stay. Reason: programs outside Conductive can read
  the exact names.
