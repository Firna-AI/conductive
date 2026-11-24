//! Command parsing for the implemented relay.

use clap::Parser;
use clap::error::ErrorKind;

use crate::cli::Cli;

#[test]
fn host_accepts_no_runtime_credentials_or_address_options() {
    let parsed = Cli::try_parse_from(["conductive", "host"]);
    assert_eq!(parsed.err().map(|error| error.kind()), None);
    let error = Cli::try_parse_from(["conductive", "host", "--token", "private"]).err();
    assert_eq!(
        error.map(|error| error.kind()),
        Some(clap::error::ErrorKind::UnknownArgument)
    );
}

#[test]
fn relay_uses_the_private_socket_without_address_options() {
    let cli = Cli::try_parse_from(["conductive", "relay"]);
    assert!(cli.is_ok());
    let error = Cli::try_parse_from(["conductive", "relay", "--port", "7682"]).err();
    assert_eq!(
        error.map(|value| value.kind()),
        Some(clap::error::ErrorKind::UnknownArgument)
    );
}

#[test]
fn computer_enroll_accepts_server_options_and_rejects_a_code_argument() {
    for name in ["check", "enroll", "service", "run"] {
        assert!(
            Cli::try_parse_from(["conductive", "computer", name]).is_ok(),
            "{name}"
        );
    }
    assert!(
        Cli::try_parse_from([
            "conductive",
            "computer",
            "enroll",
            "--origin",
            "http://localhost:4010",
            "--release-server",
            "http://[::1]:4011",
        ])
        .is_ok()
    );
    for name in ["enroll", "run"] {
        assert_eq!(
            Cli::try_parse_from(["conductive", "computer", name, "--code", "fixture"])
                .err()
                .map(|error| error.kind()),
            Some(ErrorKind::UnknownArgument),
        );
    }
}
