//! Health report for an own computer service account.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use serde::Deserialize;

use crate::process::{Invocation, Output, Process};
use crate::settings::SettingsStore;

/// Health report with one row per requirement and one optional credential row.
pub struct Report {
    needs: Vec<(&'static str, Option<&'static str>)>,
    token_saved: bool,
}

impl Report {
    /// Whether all required checks passed.
    pub fn passed(&self) -> bool {
        self.needs.iter().all(|(_, action)| action.is_none())
    }

    /// Render the command's health report.
    pub fn lines(&self) -> impl Iterator<Item = String> + '_ {
        self.needs
            .iter()
            .map(|(name, action)| match action {
                Some(action) => format!("fail {name}: {action}"),
                None => format!("ok {name}"),
            })
            .chain([if self.token_saved {
                "Computer token saved.".into()
            } else {
                "Computer token is missing.".into()
            }])
    }
}

/// Run the local computer checks.
#[async_trait]
pub trait Check: Send + Sync {
    /// Read native capabilities and report the action for each failed need.
    async fn report(&self) -> Report;
}

/// Native check composed with the credential store.
pub struct Preflight {
    process: Arc<dyn Process>,
    store: Arc<dyn SettingsStore>,
    supported_system: bool,
}

impl Preflight {
    /// Adopt the local process runner and saved settings.
    pub fn new(process: Arc<dyn Process>, store: Arc<dyn SettingsStore>) -> Self {
        Self {
            process,
            store,
            supported_system: cfg!(all(target_os = "linux", target_arch = "x86_64")),
        }
    }

    async fn command(&self, invocation: Invocation) -> Option<Output> {
        tokio::time::timeout(Duration::from_secs(10), self.process.run(invocation))
            .await
            .ok()?
            .ok()
    }
}

#[async_trait]
impl Check for Preflight {
    async fn report(&self) -> Report {
        let (systemd, version, info, settings) = tokio::join!(
            self.command(Invocation::new(
                "systemctl",
                ["--user", "is-system-running"]
            )),
            self.command(Invocation::new("podman", ["version", "--format", "json"])),
            self.command(Invocation::new("podman", ["info", "--format", "json"])),
            self.store.read(),
        );
        let systemd = systemd.is_some_and(|result| {
            std::str::from_utf8(&result.stdout)
                .is_ok_and(|text| matches!(text.trim(), "running" | "degraded"))
        });
        let version = read_json::<Version>(version).and_then(|version| {
            version
                .client
                .version
                .split('.')
                .next()?
                .parse::<u32>()
                .ok()
        });
        let info = read_json::<Info>(info)
            .map(|info| info.host)
            .unwrap_or_default();
        let controller = |name: &str| info.cgroup_controllers.iter().any(|value| value == name);
        let needs = vec![
            need(
                "Linux x86_64",
                self.supported_system,
                "Use an x86_64 Linux server.",
            ),
            need(
                "systemd user manager",
                systemd,
                "Start the systemd user manager for this user.",
            ),
            need(
                "Podman 4 or later",
                version.is_some_and(|major| major >= 4),
                "Install Podman 4 or later.",
            ),
            need(
                "rootless Podman",
                info.security.rootless,
                "Run Podman as the dedicated user without sudo.",
            ),
            need(
                "cgroups v2",
                info.cgroup_version == "v2",
                "Enable cgroups v2 on this server.",
            ),
            need(
                "cpu controller",
                controller("cpu"),
                "Delegate the cpu controller to the user manager.",
            ),
            need(
                "memory controller",
                controller("memory"),
                "Delegate the memory controller to the user manager.",
            ),
            need(
                "pids controller",
                controller("pids"),
                "Delegate the pids controller to the user manager.",
            ),
            need(
                "subordinate user IDs",
                subordinate(&info.id_mappings.uidmap),
                "Assign subordinate user IDs in /etc/subuid.",
            ),
            need(
                "subordinate group IDs",
                subordinate(&info.id_mappings.gidmap),
                "Assign subordinate group IDs in /etc/subgid.",
            ),
        ];
        Report {
            needs,
            token_saved: matches!(settings, Ok(Some(_))),
        }
    }
}

fn need(
    name: &'static str,
    passes: bool,
    action: &'static str,
) -> (&'static str, Option<&'static str>) {
    (name, (!passes).then_some(action))
}

fn read_json<T: serde::de::DeserializeOwned>(output: Option<Output>) -> Option<T> {
    let output = output?;
    output
        .status
        .success()
        .then(|| serde_json::from_slice(&output.stdout).ok())
        .flatten()
}

fn subordinate(mappings: &[IdMap]) -> bool {
    mappings
        .iter()
        .any(|mapping| mapping.container_id != 0 && mapping.size != 0)
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct Version {
    client: ClientVersion,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct ClientVersion {
    version: String,
}

#[derive(Deserialize)]
struct Info {
    host: HostInfo,
}

#[derive(Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct HostInfo {
    cgroup_version: String,
    cgroup_controllers: Vec<String>,
    security: Security,
    id_mappings: IdMappings,
}

#[derive(Default, Deserialize)]
#[serde(default)]
struct Security {
    rootless: bool,
}

#[derive(Default, Deserialize)]
#[serde(default)]
struct IdMappings {
    uidmap: Vec<IdMap>,
    gidmap: Vec<IdMap>,
}

#[derive(Deserialize)]
struct IdMap {
    container_id: u32,
    size: u32,
}

#[cfg(test)]
#[path = "_tests_/preflight_tests.rs"]
mod tests;
