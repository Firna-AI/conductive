/**
 * A Mokly instance name from a stable key of a fixture that is not in
 * kebab-case, such as the name of a file or an email address. A name of
 * `moklyInstance` is lowercase kebab-case, and it stays the same when the
 * rows of a list move.
 */
export function instanceKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * A Mokly instance name of a shortcut: each run of letters and digits as a
 * lowercase word, and each other character as its code point, such as
 * `u2325-u2318-k` for ⌥⌘K and `ctrl-u2b-shift-u2b-t` for Ctrl+Shift+T. Two
 * shortcuts never share a name.
 */
export function shortcutKey(shortcut: string): string {
  return (shortcut.match(/[A-Za-z0-9]+|./gu) ?? [])
    .map((part) =>
      /^[A-Za-z0-9]+$/.test(part)
        ? part.toLowerCase()
        : `u${(part.codePointAt(0) ?? 0).toString(16)}`,
    )
    .join('-')
}
