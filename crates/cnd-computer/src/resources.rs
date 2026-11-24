//! Resource report and pure Linux text readers.

use async_trait::async_trait;
use cnd_runner_interface::computer::messages::ComputerResources;

use crate::error::{Error, Result};

/// Read current server resources for an outbound hello.
#[cfg_attr(test, unimock::unimock(api = ResourcesMock))]
#[async_trait]
pub trait Resources: Send + Sync {
    /// Sample available CPUs, total memory, and the OS label.
    async fn read(&self) -> Result<ComputerResources>;
}

/// Linux resource files and process CPU availability.
pub struct LinuxResources;

#[async_trait]
impl Resources for LinuxResources {
    async fn read(&self) -> Result<ComputerResources> {
        let cpus = std::thread::available_parallelism()?;
        let Ok(cpus) = u32::try_from(cpus.get()) else {
            return Err(Error::ResourcesUnavailable);
        };
        let (memory, system) = tokio::join!(
            tokio::fs::read_to_string("/proc/meminfo"),
            tokio::fs::read_to_string("/etc/os-release"),
        );
        let memory_bytes = memory_bytes(&memory?).ok_or(Error::ResourcesUnavailable)?;
        Ok(ComputerResources {
            cpus,
            memory_bytes,
            system: system_label(&system.unwrap_or_default(), std::env::consts::ARCH),
        })
    }
}

const MAX_SAFE_INTEGER: u64 = (1 << 53) - 1;
const SYSTEM_LIMIT: usize = 256;

fn memory_bytes(text: &str) -> Option<u64> {
    let value = text
        .lines()
        .find_map(|line| line.strip_prefix("MemTotal:"))?;
    let mut fields = value.split_ascii_whitespace();
    let bytes = fields.next()?.parse::<u64>().ok()?.checked_mul(1024)?;
    (fields.next() == Some("kB") && (1..=MAX_SAFE_INTEGER).contains(&bytes)).then_some(bytes)
}

fn system_label(text: &str, arch: &str) -> String {
    let name = os_value(text, "NAME");
    let version = os_value(text, "VERSION_ID");
    let label = match (name, version) {
        (Some(name), Some(version)) => format!("{name} {version}"),
        _ => os_value(text, "PRETTY_NAME").unwrap_or_else(|| "Linux".into()),
    };
    let suffix = format!(" · {arch}");
    let mut units = suffix.encode_utf16().count();
    let label: String = label
        .chars()
        .take_while(|character| {
            units += character.len_utf16();
            units <= SYSTEM_LIMIT
        })
        .collect();
    format!("{label}{suffix}")
}

fn os_value(text: &str, key: &str) -> Option<String> {
    let value = text.lines().rev().find_map(|line| {
        let (name, value) = line.split_once('=')?;
        (name == key).then_some(value.trim())
    })?;
    let mut clean = String::new();
    if let Some(quoted) = value.strip_prefix('"').and_then(|s| s.strip_suffix('"')) {
        let mut characters = quoted.chars().peekable();
        while let Some(character) = characters.next() {
            if character == '\\' && matches!(characters.peek(), Some('"' | '\\' | '$' | '`')) {
                if let Some(escaped) = characters.next() {
                    clean.push(escaped);
                }
            } else {
                clean.push(character);
            }
        }
    } else {
        clean.push_str(
            value
                .strip_prefix('\'')
                .and_then(|s| s.strip_suffix('\''))
                .unwrap_or(value),
        );
    }
    clean.retain(|character| !character.is_control());
    let clean = clean.trim();
    (!clean.is_empty()).then(|| clean.to_owned())
}

#[cfg(test)]
#[path = "_tests_/resources_tests.rs"]
mod tests;
