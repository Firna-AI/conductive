/**
 * The plan of a turn with the code answer: a labelled Rust block, so its
 * message line in the folded work shows the code as plain text closed, and
 * in colour open. Each part is one line or one blank line.
 */
export const codePlan = [
  'I will add the wait to the lookup first:\n\n',
  '```rust\n',
  'pub const WAIT: Duration = Duration::from_millis(250);\n',
  '```',
]

/**
 * An answer with code blocks, as the mockups draw them at
 * `app/chat/code-blocks`: a Rust block with a doc comment, a string, a
 * number, and lifetimes, in the colours of a Rust file tab, then test output
 * in a block without a label, which stays plain, and inline code. Each part
 * is one line or one blank line, so the Rust block grows one line at a
 * time while the agent writes it.
 */
export const codeAnswer = [
  'Each lookup now waits for the last key press. The wait lives in Rust:\n\n',
  '```rust\n',
  'use std::time::Duration;\n',
  '\n',
  '/// Each lookup waits this long after the last key press.\n',
  'pub const WAIT: Duration = Duration::from_millis(250);\n',
  '\n',
  "pub struct Lookup<'a> {\n",
  "    query: &'a str,\n",
  '}\n',
  '\n',
  "impl<'a> Lookup<'a> {\n",
  '    pub fn path(&self) -> String {\n',
  '        format!("/v1/lookup?q={}", self.query)\n',
  '    }\n',
  '}\n',
  '```\n\n',
  'The tests print:\n\n',
  '```\n',
  'test lookup::waits_for_the_last_key ... ok\n',
  '```\n\n',
  'Run `cargo test` to check it again.',
]
