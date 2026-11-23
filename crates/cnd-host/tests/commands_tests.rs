//! Real local command sessions, timeouts, detached records, and byte offsets.

use std::collections::BTreeMap;
use std::os::unix::fs::PermissionsExt;

use cnd_runner_interface::host::results::{HostCommandState, HostResult};

#[path = "commands/support.rs"]
mod support;

use support::{Background, ENVIRONMENT_COMMAND, TestResult, commands, exited, record};

#[tokio::test]
async fn run_captures_both_pipes_uses_home_and_clears_machine_credentials() -> TestResult {
    assert!(
        std::env::var_os("CARGO_MANIFEST_DIR").is_some_and(|value| !value.is_empty()),
        "cargo test must supply a nonempty inherited variable outside the allowed six"
    );
    let folder = tempfile::tempdir()?;
    let commands = commands(folder.path());
    let result = commands.run(ENVIRONMENT_COMMAND, 10).await?;
    let HostResult::CommandResult {
        exit_code,
        stdout,
        stderr,
        timed_out,
    } = result
    else {
        return Err("expected the command result".into());
    };
    let (environment, directory) = stdout
        .split_once("\0\0")
        .ok_or("environment probe separator missing")?;
    let environment: BTreeMap<_, _> = environment
        .split('\0')
        .map(|entry| entry.split_once('=').unwrap_or((entry, "")))
        .collect();
    assert_eq!(
        environment,
        BTreeMap::from([
            (
                "HOME",
                folder.path().to_str().ok_or("fixture home is not UTF-8")?
            ),
            ("USER", "user"),
            ("LOGNAME", "user"),
            ("SHELL", "/bin/bash"),
            ("LANG", "C.UTF-8"),
            (
                "PATH",
                "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
            ),
        ])
    );
    assert_eq!(
        (exit_code, stderr, timed_out),
        (Some(0), "problem".into(), false)
    );
    assert_eq!(directory, format!("{}\n", folder.path().display()));
    let signaled = commands.run("kill -TERM $$", 10).await?;
    assert_eq!(
        signaled,
        HostResult::CommandResult {
            exit_code: Some(143),
            stdout: String::new(),
            stderr: String::new(),
            timed_out: false
        }
    );
    let pid_file = folder.path().join("background.pid");
    let background = commands
        .run(
            &format!(
                "sleep 60 & printf '%s' \"$!\" > '{}'; printf launched; printf spawned >&2; exit 7",
                pid_file.display()
            ),
            10,
        )
        .await?;
    let _background = Background::read(&pid_file).await?;
    assert_eq!(
        background,
        HostResult::CommandResult {
            exit_code: Some(7),
            stdout: "launched".into(),
            stderr: "spawned".into(),
            timed_out: false
        }
    );
    assert!(
        tokio::fs::read_dir(folder.path().join("commands"))
            .await?
            .next_entry()
            .await?
            .is_none()
    );
    Ok(())
}

#[tokio::test]
async fn run_timeout_kills_the_whole_process_group_and_retains_output() -> TestResult {
    let folder = tempfile::tempdir()?;
    let commands = commands(folder.path());
    let pid_file = folder.path().join("child.pid");
    let script = format!(
        "sleep 60 & printf '%s' \"$!\" > '{}'; printf before; wait",
        pid_file.display()
    );
    let result = commands.run(&script, 1).await?;
    assert_eq!(
        result,
        HostResult::CommandResult {
            exit_code: None,
            stdout: "before".into(),
            stderr: String::new(),
            timed_out: true
        }
    );
    let pid = tokio::fs::read_to_string(pid_file).await?;
    let state = match tokio::fs::read_to_string(format!("/proc/{pid}/stat")).await {
        Ok(stat) => stat
            .rsplit_once(") ")
            .and_then(|(_, fields)| fields.chars().next()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(error.into()),
    };
    assert!(matches!(state, None | Some('Z')), "child state: {state:?}");
    Ok(())
}

#[tokio::test]
async fn started_commands_keep_private_records_and_utf8_safe_byte_offsets() -> TestResult {
    let folder = tempfile::tempdir()?;
    let commands = commands(folder.path());
    let first_chunk = 18_874_368 / 16;
    let script = format!(
        "head -c {} /dev/zero | tr '\\0' x; printf '€tail'; printf oops >&2",
        first_chunk - 1
    );
    let result = commands.start(&script).await?;
    assert!(
        matches!(result, HostResult::CommandStarted { process_id } if process_id > 0 && process_id <= 9_007_199_254_740_991)
    );
    let HostResult::CommandStarted { process_id } = result else {
        return Err("wrong started result".into());
    };
    let status = exited(commands.as_ref(), process_id).await?;
    assert_eq!(
        status,
        HostResult::CommandStatus {
            process_id,
            state: HostCommandState::Exited,
            running: false,
            exit_code: Some(0),
            timed_out: None,
            stdout: "x".repeat(first_chunk - 1),
            stderr: "oops".into(),
            stdout_next_offset: (first_chunk - 1) as u64,
            stderr_next_offset: 4,
            more: true
        }
    );
    let recovered = support::commands(folder.path())
        .status(process_id, 0, 0)
        .await?;
    assert_eq!(recovered, status);
    let next = commands
        .status(process_id, (first_chunk - 1) as u64, 2)
        .await?;
    assert_eq!(
        next,
        HostResult::CommandStatus {
            process_id,
            state: HostCommandState::Exited,
            running: false,
            exit_code: Some(0),
            timed_out: None,
            stdout: "€tail".into(),
            stderr: "ps".into(),
            stdout_next_offset: (first_chunk + 6) as u64,
            stderr_next_offset: 4,
            more: false
        }
    );
    let mode = tokio::fs::metadata(record(folder.path(), process_id, ""))
        .await?
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(mode, 0o700);
    for name in ["stdout", "stderr", "exit.json"] {
        assert_eq!(
            tokio::fs::metadata(record(folder.path(), process_id, name))
                .await?
                .permissions()
                .mode()
                & 0o777,
            0o600,
            "{name}"
        );
    }
    Ok(())
}

#[tokio::test]
async fn missing_or_orphaned_command_records_report_lost() -> TestResult {
    let folder = tempfile::tempdir()?;
    let commands = commands(folder.path());
    let missing = commands.status(1, 4, 2).await?;
    assert_eq!(
        missing,
        HostResult::CommandStatus {
            process_id: 1,
            state: HostCommandState::Lost,
            running: false,
            exit_code: None,
            timed_out: None,
            stdout: String::new(),
            stderr: String::new(),
            stdout_next_offset: 4,
            stderr_next_offset: 2,
            more: false
        }
    );
    tokio::fs::create_dir_all(record(folder.path(), 2, "")).await?;
    tokio::fs::write(record(folder.path(), 2, "stdout"), b"retained").await?;
    let orphan = commands.status(2, 0, 0).await?;
    assert_eq!(
        orphan,
        HostResult::CommandStatus {
            process_id: 2,
            state: HostCommandState::Lost,
            running: false,
            exit_code: None,
            timed_out: None,
            stdout: "retained".into(),
            stderr: String::new(),
            stdout_next_offset: 8,
            stderr_next_offset: 0,
            more: false
        }
    );
    Ok(())
}
