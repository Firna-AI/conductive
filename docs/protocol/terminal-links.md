# Terminal links

This doc holds the requirements and the decisions in force for the links
in the output of a terminal. It belongs to [Terminal](terminal.md#links).
A terminal links decision number names a decision of the change that makes
the addresses in the terminal open, as [Terminal](terminal.md) says.

## Links

- Each `http` and `https` address in the output is a link. A held Cmd on
  a Mac, or Ctrl on Windows and Linux, and a click open it (terminal links
  decision 2 A). Such a click does not reach a program that uses the
  mouse.
- Reason: a plain click starts a selection, so a plain click that opens a
  link was rejected. A rule that gives the click to a program that uses
  the mouse was rejected, because the same click would then act in two
  ways.
- A local address opens the Preview tool at its port, as
  [Port previews](port-previews.md) says. Its host is `localhost`,
  `127.0.0.1`, `[::1]`, or `0.0.0.0`. Every other link opens in a new tab
  of the browser, or in the default browser from the Mac app (terminal
  links decision 1 B).
- Reason: a local address in the terminal names the cloud computer, not
  the user's computer. A new tab with the preview was rejected, because
  the Preview tool keeps the user in the workspace.
- A link under the mouse pointer shows an underline and a hint with the
  key, such as "⌘-click to open".
- A touch on a link opens it with no key, on each screen size. A mouse
  always needs the key (terminal links decision 3 D).
- Reason: a touch screen has no Cmd or Ctrl key. A rule by screen size
  was rejected, because a narrow desktop window has a mouse, and a tablet
  has the desktop layout. A menu, a long press, and Ctrl of the key row
  then a tap were rejected, because each needs a second step or is hard
  to find.
- A program can print a link with a label, an OSC 8 link. The hint of
  such a link also names the host of its real address, such as
  "⌘-click to open reports.storefront.dev" (terminal links decision 4 B).
- Reason: a label can hide where its link leads, and code in the sandbox
  is untrusted. A dialog before each such link was rejected, because it
  adds a step. A rule that such links open nothing was rejected, because
  tools such as `ls --hyperlink` lose their links.
- An address with a user name or a password, and an address with another
  scheme, open nothing and show no hint.
