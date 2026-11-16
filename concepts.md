> ## Documentation Index
> Fetch the complete documentation index at: https://docs.boat.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Concepts

> Every boat word defined once: sandbox, snapshot, saved snapshot, stop, resume, fork, delete, environment. The sandbox states, and the matching words at E2B, Daytona and Modal.

boat gives you sandboxes. A sandbox is a full Linux virtual machine with its own disk. You stop it to stop paying. You can resume it with the same disk for at least 14 days.

## Lifecycle

```mermaid theme={"theme":{"light":"github-light","dark":"github-dark-default"}}
%%{init: {"theme": "base", "fontFamily": "IBM Plex Mono", "themeVariables": {"fontFamily": "IBM Plex Mono", "fontSize": "14px", "primaryColor": "#F1F3F9", "primaryBorderColor": "#263FA9", "primaryTextColor": "#060606", "secondaryColor": "#E0E3F2", "tertiaryColor": "#FEFEFE", "lineColor": "#060606", "textColor": "#060606", "mainBkg": "#F1F3F9", "nodeBorder": "#263FA9", "clusterBkg": "#FEFEFE", "clusterBorder": "#C4C4C4", "edgeLabelBackground": "#FEFEFE", "actorBkg": "#F1F3F9", "actorBorder": "#263FA9", "actorTextColor": "#060606", "actorLineColor": "#9E9E9E", "signalColor": "#060606", "signalTextColor": "#060606", "labelBoxBkgColor": "#F1F3F9", "labelBoxBorderColor": "#263FA9", "noteBkgColor": "#E0E3F2", "noteBorderColor": "#E0E3F2", "noteTextColor": "#060606", "sectionBkgColor": "#F1F3F9", "altSectionBkgColor": "#FEFEFE", "taskBkgColor": "#263FA9", "taskBorderColor": "#263FA9", "taskTextColor": "#FEFEFE", "gridColor": "#E0E0E0"}, "flowchart": {"padding": 16, "nodeSpacing": 48, "rankSpacing": 48, "curve": "linear"}, "sequence": {"boxMargin": 16, "actorMargin": 48, "noteMargin": 16, "messageMargin": 32, "mirrorActors": false}, "state": {"padding": 16}, "gantt": {"barHeight": 24, "barGap": 8, "fontSize": 14, "sectionFontSize": 14}}}%%
stateDiagram-v2
  [*] --> Starting: boat new / boat fork
  Starting --> Running: ready
  Running --> Stopping: boat stop / auto-stop
  Stopping --> Stopped: disk saved
  Stopping --> Running: boat resume (same machine)
  Stopped --> Starting: boat resume
  Stopped --> Starting: boat fork (new sandbox)
  Running --> Error: machine lost
  Error --> Starting: boat resume
  Running --> Deleted: boat delete
  Stopped --> Deleted: boat delete
  Error --> Deleted: boat delete
  Deleted --> [*]

  Starting: Starting (API provisioning, provisioned, cloning)
  Running: Running (API ready, idle, running)
  Stopping: Stopping (API archiving)
  Stopped: Stopped (API archived)
  Error: Error (API error)
  Deleted: Deleted (gone from lists)
```

| State | API state names | CLI and dashboard show | Billed | Disk |
| - | - | - | - | - |
| Starting | `provisioning`, `provisioned`, `cloning` | `provisioning`, `starting`, `cloning` | From `provisioned` | Restoring |
| Running | `ready`, `idle`, `running` | same | Yes | On the machine, saved each minute |
| Stopping | `archiving` | `stopping` | No | Last save in progress |
| Stopped | `archived` | `stopped` | No | Saved for at least 14 days, then eligible for deletion |
| Error | `error` | `error` | No | Held for 3 days |
| Deleted | none | none | No | Erased |

The API calls a stopped sandbox `archived`. It is the same state. Nothing is moved or deleted.

`idle` and `running` differ only for the [integrated agent](https://docs.boat.dev/integrated-agents.md): `running` means a prompt runs now. Commands work in both.

What works at `ready`, and what comes a few seconds later, is in [Readiness and resume speed](https://docs.boat.dev/readiness.md).

## Words

| Word | Meaning |
| - | - |
| **Sandbox** | One Linux virtual machine that you create, with its own disk, IP address and id (`bx_...`). |
| **Machine** | The hardware under a sandbox. A resume or a fork puts the sandbox on a new machine. |
| **Size** | The CPU, memory and disk of a sandbox: `small`, `default` (the medium size), `large`, `xlarge`. Read [Machines](https://docs.boat.dev/machines.md). |
| **Snapshot** | A saved copy of the disk. boat takes one every minute and one at each stop. Only the newest one is used. Read [Snapshots](https://docs.boat.dev/snapshots.md). |
| **Saved snapshot** | A snapshot that you save under a name. It has no scheduled expiry; unpaid extras can be deleted. Start new sandboxes from it with `boat new --from <name>`. Read [Saved snapshots](https://docs.boat.dev/snapshots/templates.md). |
| **Template** | Not a separate object. "Use a saved snapshot as a template" means: start many sandboxes from one saved snapshot. |
| **Stop** | Save the disk, then remove the machine. A resume within 10 minutes usually gets the same machine back, with memory and running programs. After that, they are gone. There is no pause. A stopped sandbox costs nothing, and boat keeps its disk for at least 14 days. Read [Stop a sandbox](https://docs.boat.dev/snapshots/stop.md). |
| **Auto-stop** | A timer that stops the sandbox. The default is 1 hour after the create or the last resume. Read [Auto-stop](https://docs.boat.dev/long-running-tasks/auto-stop.md). |
| **Always on** | A sandbox with auto-stop turned off. It runs until you stop it. |
| **Resume** | Start a stopped sandbox again, from its newest snapshot. Same id. Within 10 minutes of the stop, usually the same machine. After that, a new machine and a new IP address. |
| **Fork** | Make a new sandbox that copies the newest snapshot of another sandbox. The source does not change. |
| **Restore** | Get older files back. Resume and fork cannot use an older snapshot. Read [Restore an older snapshot](https://docs.boat.dev/snapshots/resume-and-fork.md#restore-an-older-snapshot-roll-back). |
| **Recover** | Restart the machine of a sandbox that does not answer. The disk is not touched. Read [Troubleshooting](https://docs.boat.dev/troubleshooting.md#a-sandbox-does-not-answer). |
| **Delete** | Erase a sandbox and its snapshots for good. You cannot get it back. Read [Delete a sandbox](https://docs.boat.dev/data-retention/delete.md). |
| **Ready** | The sandbox runs commands now. Read [Readiness](https://docs.boat.dev/readiness.md). |
| **Hydrated** | All file content has arrived after a resume or fork. Files are readable before that. |
| **Environment** | Settings that a sandbox starts with: variables, secret files, repositories and logins. Read [Environments](https://docs.boat.dev/environments.md). |
| **Setup script** | Commands that run when a sandbox starts. Read [Setup scripts](https://docs.boat.dev/setup.md). |
| **Public URL** | An HTTPS address for one port of a sandbox. Read [Public URLs](https://docs.boat.dev/hosting). |
| **Share code** | A secret code (`bsh_...`) that lets another account start a sandbox from your saved snapshot. |
| **Organization** | A team account. Members share sandboxes, a plan, a wallet and seats. Read [Organizations](https://docs.boat.dev/organizations.md). |
| **Active wallet** | The account that pays for a new sandbox: you, or an organization. Read [Active wallet](https://docs.boat.dev/organizations/active-wallet.md). |
| **Wallet balance** | Dollars on an account or organization. It pays overage, never the plan. Read [Wallet](https://docs.boat.dev/billing.md#wallet). |
| **Seat** | One paid member place in an organization. Each seat adds the plan price and the included time. It adds the full limits on the \$2000 plan, 20% of them below. |

## Words at other providers

Other providers use some of the same words for other things. This table gives the closest boat word.

| boat | E2B | Daytona | Modal |
| - | - | - | - |
| Sandbox | Sandbox | Sandbox | Sandbox |
| Stop (disk kept, memory kept only for a resume within 10 minutes) | Pause in filesystem mode. A default pause always keeps memory, a boat stop keeps it only for 10 minutes | Stop | No match. Save a filesystem snapshot, then terminate |
| Resume | Resume (connect) | Start | Create a sandbox from the saved image |
| Delete | Kill | Delete | Terminate |
| Saved snapshot | Template | Snapshot | Filesystem snapshot (an image) |
| Fork | No direct match. Create from a template or snapshot | No direct match | Create from a filesystem snapshot |
| Auto-stop | Timeout | Auto-stop interval | Timeout |
| Stopped state | Paused | Stopped. boat has no separate archive step: a stopped sandbox is already in storage | No match |

Two differences cause most surprises:

* A boat **snapshot** is automatic and per sandbox. A Daytona snapshot is closer to a boat **saved snapshot**.
* A boat **stop** keeps memory only for a resume within 10 minutes, and only usually. After that, programs that you started by hand do not come back. Enabled systemd services and Docker containers start again. Read [What a snapshot saves](https://docs.boat.dev/snapshots/whats-saved.md).


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.