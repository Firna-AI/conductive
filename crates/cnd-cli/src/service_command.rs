//! Compose the unit-owned helper without any runner or tool credentials.

use std::path::PathBuf;
use std::sync::Arc;

use cnd_services::files::RuntimeFiles;
use cnd_services::helper::{Execution, NativeExecution};
use cnd_services::logs::files::RuntimeLogFiles;
use cnd_services::logs::rotating::RotatingLogs;
use cnd_services::runtime::NativeRuntime;

use crate::error::{Error, ErrorResultExt, Result};

pub(crate) async fn execute(record: PathBuf) -> Result<()> {
    let root = record
        .parent()
        .and_then(|folder| folder.parent())
        .ok_or_else(|| Error::internal_message("service runtime parent missing"))?
        .to_owned();
    let execution: Arc<dyn Execution> = Arc::new(NativeExecution {
        files: Arc::new(RuntimeFiles::new(root.clone())),
        logs: Arc::new(RotatingLogs {
            files: Arc::new(RuntimeLogFiles { root }),
        }),
        runtime: Arc::new(NativeRuntime::default()),
    });
    if execution.run(record).await.internal()? != 0 {
        return Err(Error::ServiceExit);
    }
    Ok(())
}
