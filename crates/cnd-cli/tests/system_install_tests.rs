//! Execute the packaged system installer with stub commands on `PATH`.

use std::error::Error;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;
use std::process::{Command, Output};

const RELAY_RESTART: &str = "--no-block try-restart conductive-preview-relay.service";

/// Run the installer with logging stubs. `systemctl` exits with 1 for a relay restart when `fail_restart` is set.
fn install(fail_restart: bool) -> Result<(Output, Vec<String>), Box<dyn Error>> {
    let root = tempfile::tempdir()?;
    let bin = root.path().join("bin");
    let log = root.path().join("systemctl.log");
    fs::create_dir(&bin)?;
    for name in ["install", "ln", "git", "rm"] {
        stub(&bin.join(name), "exit 0\n")?;
    }
    let status = if fail_restart { 1 } else { 0 };
    stub(
        &bin.join("systemctl"),
        &format!(
            "printf '%s\\n' \"$*\" >> '{}'\ncase \"$*\" in *try-restart*) exit {status};; esac\n",
            log.display()
        ),
    )?;
    let script = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../image/install-system.sh");
    let path = format!("{}:{}", bin.display(), std::env::var("PATH")?);
    let output = Command::new("/bin/sh")
        .arg(script)
        .env("PATH", path)
        .output()?;
    let calls = fs::read_to_string(&log)?
        .lines()
        .map(str::to_owned)
        .collect();
    Ok((output, calls))
}

fn stub(path: &Path, body: &str) -> Result<(), Box<dyn Error>> {
    fs::write(path, format!("#!/bin/sh\n{body}"))?;
    fs::set_permissions(path, fs::Permissions::from_mode(0o755))?;
    Ok(())
}

#[test]
fn system_install_restarts_a_running_relay_after_the_units_change() -> Result<(), Box<dyn Error>> {
    let (output, calls) = install(false)?;
    assert_eq!(output.status.code(), Some(0));
    assert_eq!(output.stderr, b"");
    // The relay restart comes after the reload, and the installer starts no other service.
    assert_eq!(calls.len(), 3);
    assert_eq!(calls[0], "daemon-reload");
    assert!(calls[1].starts_with("enable "));
    let enabled: Vec<_> = calls[1].split_whitespace().skip(1).collect();
    assert!(enabled.contains(&"conductive-disk-hold.timer"));
    assert!(enabled.contains(&"conductive-disk-hold.path"));
    assert_eq!(calls[2], RELAY_RESTART);
    Ok(())
}

#[test]
fn system_install_warns_and_succeeds_when_the_relay_restart_fails() -> Result<(), Box<dyn Error>> {
    let (output, calls) = install(true)?;
    assert_eq!(output.status.code(), Some(0));
    assert_eq!(calls.last().map(String::as_str), Some(RELAY_RESTART));
    assert!(String::from_utf8(output.stderr)?.contains("preview relay did not restart"));
    Ok(())
}
