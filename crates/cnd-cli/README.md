# cnd-cli

This crate builds `conductive`, the command line program for Conductive
cloud computers. Use the executable to access its commands. This crate
exposes no library API.

## Responsibilities

Provide one command entry point for the agent runner, preview relay, MCP
server, Git credential helper, software updates, and workspace tools.

## What This Crate Does

The program parses command names with `clap`. `--help` and `--version`
work without runtime credentials.

`--version` prints the version embedded at build time. A deploy sets
`CONDUCTIVE_RELEASE_VERSION` to `0.0.<commit count>` and
`CONDUCTIVE_PARTS_FILE` to an absolute path to its parts JSON. Set both
variables together. The build validates the version and the parts with
`cnd-release`, then embeds both in the program. A build without the
variables uses `0.0.0-dev` and an empty parts list. This development version
sorts below every release. The program does not apply updates yet.

The commands are `runner`, `relay`, `mcp`, `git-credential`, `update`,
`workspaces`, `sessions`, `messages`, `sections`, `repositories`, `models`,
`previews`, and `mac`. Each command currently reports "not available yet"
to stderr and exits with status 1. Command arguments are accepted only to
report this error. They cause no operation.

## Quick Start

Run these commands from the repository root:

```sh
cargo run -p cnd-cli -- --help
cargo run -p cnd-cli -- --version
cargo run -p cnd-cli -- workspaces list --limit 20
```

The last command reports that `workspaces` is not available yet.

## Development

Run these commands from the repository root:

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
rustup target add x86_64-unknown-linux-musl
cargo build --release --target x86_64-unknown-linux-musl -p cnd-cli
```

The musl build needs a C compiler for musl. On Ubuntu, install the
`musl-tools` package. The release program is
`target/x86_64-unknown-linux-musl/release/conductive`.

### Key Code

- [main.rs](src/main.rs) connects command parsing, error output, and exit status.
- [cli.rs](src/cli.rs) owns `Cli` and the command execution boundary.
- [command.rs](src/command.rs) defines the command families and reserved arguments.
- [error.rs](src/error.rs) defines typed command errors and the internal error fallback.
- [build.rs](build.rs) validates and embeds the release inputs.
- [release.rs](src/release.rs) reads the embedded version and parts.
- [cli_tests.rs](src/_tests_/cli_tests.rs) checks parsing and the unavailable-command result.

### Related Docs

- [Architecture](../../docs/architecture.md) describes the system components.
- [Agent runner](../../docs/protocol/agent-runner.md) defines the runner contract.
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md) defines cloud computer behaviour.
- [Workspace tools](../../tools/README.md) describes the workspace command interface.
