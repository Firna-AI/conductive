//! Real-command fixtures and the single runtime record-path builder.

use std::error::Error;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use cnd_host::commands::native::NativeCommands;
use cnd_host::ports::Commands;
use cnd_runner_interface::host::results::{HostCommandState, HostResult};
use rustix::process::{Pid, Signal, kill_process};

pub(super) type TestResult = Result<(), Box<dyn Error>>;

pub(super) const ENVIRONMENT_COMMAND: &str = r#"
while IFS= read -r -d '' entry; do
  name=${entry%%=*}
  case "$name" in
    HOME|USER|LOGNAME|SHELL|LANG|PATH) printf '%s\000' "$entry" ;;
    *) printf '%s\000' "$name" ;;
  esac
done < "/proc/$$/environ"
printf '\000'
printf problem >&2
pwd
"#;

pub(super) struct Background(Pid);

impl Background {
    pub(super) async fn read(path: &Path) -> Result<Self, Box<dyn Error>> {
        let pid = tokio::fs::read_to_string(path).await?.parse::<i32>()?;
        Ok(Self(Pid::from_raw(pid).ok_or("invalid child PID")?))
    }
}

impl Drop for Background {
    fn drop(&mut self) {
        let _ = kill_process(self.0, Signal::KILL);
    }
}

pub(super) fn commands(folder: &Path) -> Arc<dyn Commands> {
    Arc::new(NativeCommands::new(
        folder.join("commands"),
        folder.to_path_buf(),
    ))
}

pub(super) fn record(folder: &Path, process_id: u64, name: &str) -> PathBuf {
    folder
        .join("commands")
        .join(process_id.to_string())
        .join(name)
}

pub(super) async fn exited(commands: &dyn Commands, id: u64) -> Result<HostResult, Box<dyn Error>> {
    Ok(tokio::time::timeout(Duration::from_secs(10), async {
        loop {
            let status = commands.status(id, 0, 0).await?;
            if !matches!(
                status,
                HostResult::CommandStatus {
                    state: HostCommandState::Running,
                    ..
                }
            ) {
                return Ok::<_, cnd_host::error::Error>(status);
            }
            tokio::task::yield_now().await;
        }
    })
    .await??)
}
