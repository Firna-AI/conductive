//! Load shell settings without replacing the caller's turn ID.

use std::process::Command;

use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::Environment;

/// Native sandbox settings reader. The child shell never changes its parent.
pub struct NativeEnvironment;

impl Environment for NativeEnvironment {
    fn caller_turn(&self) -> String {
        std::env::var("CONDUCTIVE_TURN_ID").unwrap_or_default()
    }
    fn saved(&self) -> Result<[String; 2]> {
        let output = Command::new("/bin/sh")
            .args([
                "-c",
                r#"set -e
if [ -f /run/ascii-secrets/env.sh ]; then
  set -a
  . /run/ascii-secrets/env.sh
fi
printf '%s\000%s\000' "${CONDUCTIVE_MACHINE_ORIGIN-}" "${WORKSPACE_TOKEN-}"
"#,
            ])
            .output()
            .internal()?;
        if !output.status.success() {
            return Err(Error::Invalid);
        }
        let mut fields = output.stdout.split(|byte| *byte == 0);
        let origin = String::from_utf8_lossy(fields.next().unwrap_or_default()).into_owned();
        let token = String::from_utf8_lossy(fields.next().unwrap_or_default()).into_owned();
        Ok([origin, token])
    }
}

#[cfg(test)]
#[path = "_tests_/environment_tests.rs"]
mod environment_tests;
