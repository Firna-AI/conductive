# Keyboard shortcuts: the hosts

This doc holds the requirements and the decisions in force for the keys
in each host: the Mac app, an installed app, and a normal browser tab. It
covers the kept keys, the second keys, and the keys that the app leaves to
the browser. It belongs to [Keyboard shortcuts](keyboard-shortcuts.md),
which gives the rules and the terms. A decision number names a dated
record, as [Decision numbers](../architecture.md#decision-numbers) says.

## Hosts

- The app runs in three hosts: the Mac app, an installed app, and a normal
  browser tab. The supported browsers are Chrome, Edge, Firefox, and
  Safari.
- The Mac app and an installed app give the page every key, except a key
  that the system takes first, such as ⌘Space on a Mac. So every default
  key works there.
- A web app of Firefox or Safari is not an installed app. It keeps the
  keys of a normal tab of its browser.
- A normal tab keeps some keys for the browser, such as ⌘T, which opens a
  new tab of the browser.
  [Keys that a tab keeps](keyboard-shortcuts-keys.md#keys-that-a-tab-keeps)
  lists the default keys that each browser keeps.
- In a normal tab, a kept key runs no command, also when the page gets it.
  Reason: the browser acts on the key anyway.
- An unknown browser counts each key that a supported browser keeps as
  kept.
- Each command whose key from Conductor a supported browser keeps also
  gets a second key, which every normal tab lets through (decision 191).
  For example, New workspace has ⌘N and the second key ⌥⌘N. The Mac app
  and an installed app take both keys.
- Reason: a person then reaches each command from the keyboard in every
  host, as in VS Code for the Web. One set of keys for every host was
  rejected, because the Mac app would then lose ⌘N, ⌘T, and ⌘W. The keys of
  Conductor alone were rejected, because these commands would then have no
  key in a normal tab.
- In a normal tab, the app leaves some keys to the browser (decision 192).
  They are the keys that the browser uses on its system to select a tab or
  to open its address bar. Such a key runs no command there, as a kept key
  does.
- [Keys that the app leaves to the browser](keyboard-shortcuts-keys.md#keys-that-the-app-leaves-to-the-browser)
  lists these keys for each browser and system, such as ⌘1 to ⌘9 and ⌘L
  on a Mac.
- So Open workspace 1 to 9 and Focus the message field use their second
  keys where the browser uses their keys from Conductor. The Mac app and
  an installed app take both keys.
- Reason: people use these keys of the browser the most. After ⌘L, an
  address that the person types and sends would go to the agent. A tab
  that takes every key that the browser lets through was rejected for
  these reasons.
- Chrome, Edge, and Firefox on Linux select a tab on Alt+1 to Alt+9. So in
  a normal tab on Linux, Switch to org 1 to 9 have no default key that
  works (decision 196). An installed app takes Alt+1 to Alt+9.
- Firefox on Linux has no action on Ctrl+1 to Ctrl+9. So in Firefox on
  Linux, Open workspace 1 to 9 keep Ctrl+1 to Ctrl+9.
- Reason: the person keeps each tab key of the browser, and the Switch to
  rows of the palette still open every other org. Alt+1 to Alt+9 for the
  orgs in a Linux tab were rejected for this reason. Other org keys were
  rejected: Ctrl+Alt+1 to Ctrl+Alt+9 would work on Linux only, and a layout
  switch can take Ctrl+Shift+1 to Ctrl+Shift+9.
- Each other key of the browser that a tab lets the page take stays a
  default key, such as ⇧⌘A, which is tab search in Chrome. Where the page
  offers the command, the key runs the command in place of the action of
  the browser. Reason: these keys of the browser cost little, and the
  person can remove any key.
- In a normal tab, Back and Forward stay with the browser. Only the Mac app
  has the commands Back and Forward, because only the Mac app has their
  buttons.
