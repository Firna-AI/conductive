//! Isolated Bash sessions and process-group cleanup on timeout or cancellation.

use std::os::unix::process::ExitStatusExt;
use std::path::Path;
use std::process::{ExitStatus, Stdio};

use rustix::process::{Pid, Signal, kill_process_group};
use tokio::process::{Child, Command};

use crate::error::{Error, Result};

pub(super) fn shell(home: &Path, text: &str) -> Command {
    let mut command = Command::new("/usr/bin/setsid");
    command
        .args(["/bin/bash", "-lc", text])
        .current_dir(home)
        .env_clear()
        .env("HOME", home)
        .env("USER", "user")
        .env("LOGNAME", "user")
        .env("SHELL", "/bin/bash")
        .env("LANG", "C.UTF-8")
        .env(
            "PATH",
            "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        )
        .stdin(Stdio::null())
        .kill_on_drop(true);
    command
}

pub(super) fn exit_code(status: ExitStatus) -> i32 {
    status
        .code()
        .unwrap_or_else(|| 128 + status.signal().unwrap_or(0))
}

pub(super) struct Group {
    pid: Pid,
    armed: bool,
}

impl Group {
    pub(super) fn child(child: &Child) -> Result<Self> {
        let pid = child
            .id()
            .and_then(|id| i32::try_from(id).ok())
            .and_then(Pid::from_raw)
            .ok_or_else(|| Error::internal_message("command process identity missing"))?;
        Ok(Self { pid, armed: true })
    }

    pub(super) fn kill(&self) {
        let _ = kill_process_group(self.pid, Signal::KILL);
    }

    pub(super) fn disarm(&mut self) {
        self.armed = false;
    }
}

impl Drop for Group {
    fn drop(&mut self) {
        if self.armed {
            self.kill();
        }
    }
}
