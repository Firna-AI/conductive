//! Keep runtime TypeScript constants aligned with Rust protocol budgets.

#![expect(
    clippy::unwrap_used,
    reason = "Missing runtime constants must stop the test."
)]

use cnd_runner_interface::computer;
use cnd_runner_interface::host::{limits, literals::HostStreamPort};
use cnd_runner_interface::services::logs;
use cnd_runner_interface::{chat_events, file_tree, files, ports, runner_handshake, skills};

#[test]
fn typescript_and_rust_share_protocol_version_and_budgets() {
    let runner = include_str!("../../../src/shared/runner.ts");
    let chat = include_str!("../../../src/shared/chat-events.ts");
    let file = include_str!("../../../src/shared/files.ts");
    let port = include_str!("../../../src/shared/ports.ts");
    let skill = include_str!("../../../src/shared/skills.ts");
    let service = include_str!("../../../src/shared/services.ts");
    let constants = [
        (
            service,
            "SERVICE_APP_LOG_MAX_LINES",
            logs::SERVICE_APP_LOG_MAX_LINES,
        ),
        (
            service,
            "SERVICE_APP_LOG_MAX_BYTES",
            logs::SERVICE_APP_LOG_MAX_BYTES,
        ),
        (
            skill,
            "SKILL_REPORT_MAX_SKILLS",
            skills::SKILL_REPORT_MAX_SKILLS as u64,
        ),
        (
            skill,
            "SKILL_DESCRIPTION_MAX_CHARACTERS",
            skills::SKILL_DESCRIPTION_MAX_CHARACTERS as u64,
        ),
        (
            skill,
            "SKILL_DESCRIPTION_REPORT_MAX_CHARACTERS",
            skills::SKILL_DESCRIPTION_REPORT_MAX_CHARACTERS as u64,
        ),
        (
            runner,
            "RUNNER_PROTOCOL_VERSION",
            u64::from(runner_handshake::RUNNER_PROTOCOL_VERSION),
        ),
        (
            runner,
            "RUNNER_EVENT_MAX_BYTES",
            runner_handshake::RUNNER_EVENT_MAX_BYTES,
        ),
        (
            chat,
            "TOOL_DETAIL_MAX_BYTES",
            chat_events::TOOL_DETAIL_MAX_BYTES,
        ),
        (
            chat,
            "TURN_COMPLETED_MAX_FILES",
            chat_events::TURN_COMPLETED_MAX_FILES,
        ),
        (
            chat,
            "TURN_COMPLETED_FILES_MAX_BYTES",
            chat_events::TURN_COMPLETED_FILES_MAX_BYTES,
        ),
        (
            file,
            "FILE_EVENT_MAX_BYTES",
            file_tree::FILE_EVENT_MAX_BYTES,
        ),
        (
            file,
            "FILE_TREE_DELTA_MAX_CHANGES",
            file_tree::FILE_TREE_DELTA_MAX_CHANGES,
        ),
        (file, "FILE_READ_MAX_BYTES", files::FILE_READ_MAX_BYTES),
        (port, "PORT_REPORT_MAX_PORTS", ports::PORT_REPORT_MAX_PORTS),
        (
            port,
            "PORT_NAME_MAX_CHARACTERS",
            ports::PORT_NAME_MAX_CHARACTERS,
        ),
        (
            port,
            "PORT_FOLDER_MAX_CHARACTERS",
            ports::PORT_FOLDER_MAX_CHARACTERS,
        ),
    ];
    for (source, name, expected) in constants {
        let line = constant_value(source, name);
        let literal: String = line
            .chars()
            .take_while(|c| c.is_ascii_digit() || *c == '_')
            .filter(|c| *c != '_')
            .collect();
        assert_eq!(literal.parse::<u64>().unwrap(), expected, "{name}");
    }
}

#[test]
fn typescript_and_rust_share_host_constants() {
    let host = include_str!("../../../src/shared/host.ts");
    let constants = [
        (
            "HOST_PROTOCOL_VERSION",
            u64::from(limits::HOST_PROTOCOL_VERSION),
        ),
        (
            "HOST_MESSAGE_PART_BYTES",
            limits::HOST_MESSAGE_PART_BYTES as u64,
        ),
        (
            "HOST_STREAM_FRAME_BYTES",
            limits::HOST_STREAM_FRAME_BYTES as u64,
        ),
        (
            "HOST_STREAM_WINDOW_BYTES",
            limits::HOST_STREAM_WINDOW_BYTES as u64,
        ),
        (
            "HOST_REQUEST_MAX_BYTES",
            limits::HOST_REQUEST_MAX_BYTES as u64,
        ),
        ("HOST_REPLY_MAX_BYTES", limits::HOST_REPLY_MAX_BYTES as u64),
        (
            "HOST_COMMAND_REPLY_MAX_BYTES",
            limits::HOST_COMMAND_REPLY_MAX_BYTES as u64,
        ),
        (
            "HOST_FILE_READ_MAX_BYTES",
            limits::HOST_FILE_READ_MAX_BYTES as u64,
        ),
        (
            "HOST_MAX_PENDING_REQUESTS",
            limits::HOST_MAX_PENDING_REQUESTS as u64,
        ),
        (
            "HOST_MAX_OPEN_STREAMS",
            limits::HOST_MAX_OPEN_STREAMS as u64,
        ),
        (
            "HOST_CLOSE_REPLACED",
            u64::from(limits::HOST_CLOSE_REPLACED),
        ),
        (
            "HOST_CLOSE_TOKEN_CHANGED",
            u64::from(limits::HOST_CLOSE_TOKEN_CHANGED),
        ),
        (
            "HOST_CLOSE_UNSUPPORTED_VERSION",
            u64::from(limits::HOST_CLOSE_UNSUPPORTED_VERSION),
        ),
    ];
    for (name, expected) in constants {
        let value = constant_value(host, name).replace('_', "");
        assert_eq!(value.parse::<u64>().unwrap(), expected, "{name}");
    }
    assert_eq!(
        constant_value(host, "HOST_PATH").trim_matches('\''),
        limits::HOST_PATH
    );
    let ports: Vec<HostStreamPort> =
        serde_json::from_str(constant_value(host, "HOST_STREAM_PORTS")).unwrap();
    assert_eq!(
        ports,
        [HostStreamPort::Terminal, HostStreamPort::PreviewRelay]
    );
    assert_eq!(
        limits::HOST_FILE_READ_MAX_BYTES as u64,
        files::FILE_READ_MAX_BYTES
    );
}

#[test]
fn typescript_and_rust_share_computer_constants() {
    let source = include_str!("../../../src/shared/computer.ts");
    let host = include_str!("../../../src/shared/host.ts");
    let constants = [
        (
            "COMPUTER_PROTOCOL_VERSION",
            u64::from(computer::limits::COMPUTER_PROTOCOL_VERSION),
        ),
        (
            "COMPUTER_CLOSE_REPLACED",
            u64::from(computer::limits::COMPUTER_CLOSE_REPLACED),
        ),
        (
            "COMPUTER_CLOSE_REVOKED",
            u64::from(computer::limits::COMPUTER_CLOSE_REVOKED),
        ),
        (
            "COMPUTER_CLOSE_UNSUPPORTED_VERSION",
            u64::from(computer::limits::COMPUTER_CLOSE_UNSUPPORTED_VERSION),
        ),
        (
            "COMPUTER_REQUEST_MAX_BYTES",
            computer::limits::COMPUTER_REQUEST_MAX_BYTES as u64,
        ),
        (
            "COMPUTER_REPLY_MAX_BYTES",
            computer::limits::COMPUTER_REPLY_MAX_BYTES as u64,
        ),
        (
            "COMPUTER_MESSAGE_PART_BYTES",
            computer::limits::COMPUTER_MESSAGE_PART_BYTES as u64,
        ),
        (
            "COMPUTER_MAX_PENDING_REQUESTS",
            computer::limits::COMPUTER_MAX_PENDING_REQUESTS as u64,
        ),
    ];
    for (name, expected) in constants {
        let value = constant_value(source, name);
        let literal = if value.starts_with("HOST_") {
            constant_value(host, value)
        } else {
            value
        };
        assert_eq!(
            literal.replace('_', "").parse::<u64>().unwrap(),
            expected,
            "{name}"
        );
    }
    assert_eq!(
        constant_value(source, "COMPUTER_PATH").trim_matches('\''),
        computer::limits::COMPUTER_PATH
    );
}

fn constant_value<'a>(source: &'a str, name: &str) -> &'a str {
    let declaration = format!("export const {name}");
    source
        .lines()
        .find_map(|line| {
            let rest = line.strip_prefix(&declaration)?;
            if !rest.starts_with([' ', ':']) {
                return None;
            }
            let (_, value) = rest.split_once('=')?;
            Some(value.trim().trim_end_matches(';'))
        })
        .unwrap()
}
