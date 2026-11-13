//! Runtime context keeps explicit values ahead of saved shell variables.

use std::process::Command;

use crate::client::Configuration;
use crate::error::{Error, ErrorResultExt, InputError, Result};

const NAMES: [&str; 3] = [
    "CONDUCTIVE_MACHINE_ORIGIN",
    "CONDUCTIVE_WORKSPACE_TOKEN",
    "CONDUCTIVE_TURN_ID",
];

/// Process environment and the sandbox's saved environment file.
#[cfg_attr(test, unimock::unimock(api = EnvironmentMock))]
pub trait Environment: Send + Sync {
    /// Return a variable, including an explicitly supplied empty string.
    fn variable(&self, name: &str) -> Option<String>;
    /// Read saved values using the shell syntax of the sandbox environment.
    fn saved(&self) -> Result<[Option<String>; 3]>;
    /// Resolve runtime fields before saved values can replace them.
    fn configuration(&self) -> Result<Configuration> {
        let mut values = NAMES.map(|name| self.variable(name));
        if values.iter().any(Option::is_none) {
            for (value, saved) in values.iter_mut().zip(self.saved()?) {
                if value.is_none() {
                    *value = saved;
                }
            }
        }
        let [origin, token, turn] = values;
        Configuration::new(origin, token, turn)
    }
}

/// Native process environment. Saved context never changes the parent process.
pub struct NativeEnvironment;

impl Environment for NativeEnvironment {
    fn variable(&self, name: &str) -> Option<String> {
        std::env::var(name).ok()
    }
    fn saved(&self) -> Result<[Option<String>; 3]> {
        let output = Command::new("/bin/sh").args(["-c",r#"set -e
if [ -r /run/ascii-secrets/env.sh ]; then
  set -a
  . /run/ascii-secrets/env.sh
fi
printf '%s\000%s\000%s\000' "${CONDUCTIVE_MACHINE_ORIGIN-}" "${CONDUCTIVE_WORKSPACE_TOKEN-}" "${CONDUCTIVE_TURN_ID-}"
"#]).output().internal()?;
        if !output.status.success() {
            return Err(Error::Input(InputError::Credentials));
        }
        let mut values = output.stdout.split(|byte| *byte == 0);
        Ok(std::array::from_fn(|_| {
            values
                .next()
                .filter(|bytes| !bytes.is_empty())
                .map(|bytes| String::from_utf8_lossy(bytes).into_owned())
        }))
    }
}

#[cfg(test)]
#[path = "_tests_/environment_tests.rs"]
mod environment_tests;
