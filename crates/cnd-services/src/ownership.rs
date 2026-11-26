//! Existing eligible socket selection, matched to exact generation control groups.

use std::collections::{BTreeMap, BTreeSet};
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner::ports::proc::ProcReader;
use cnd_runner::ports::sockets::listening_sockets;

use crate::error::{ErrorResultExt, Result};
use crate::ports::OwnedPorts;

/// Selected process reads, with no environment or arbitrary command execution.
#[cfg_attr(test, unimock::unimock(api = ProcessesMock))]
#[async_trait]
pub trait Processes: Send + Sync {
    /// Read one proc table or cgroup record.
    async fn read(&self, path: String) -> Result<String>;
    /// List process or descriptor names.
    async fn list(&self, path: String) -> Result<Vec<String>>;
    /// Read a descriptor target.
    async fn link(&self, path: String) -> Result<String>;
}

/// Reuse the runner's native proc reader through the service error boundary.
pub struct ProcSource {
    /// Existing reader. It never reads process environment values.
    pub reader: Arc<dyn ProcReader>,
}

#[async_trait]
impl Processes for ProcSource {
    async fn read(&self, path: String) -> Result<String> {
        self.reader.read(path).await.internal()
    }
    async fn list(&self, path: String) -> Result<Vec<String>> {
        self.reader.list(path).await.internal()
    }
    async fn link(&self, path: String) -> Result<String> {
        self.reader.link(path).await.internal()
    }
}

/// Process and descriptor reads preserve the runner's existing listener rules.
pub struct CgroupPorts {
    /// Process reads, including cgroups and descriptor links, never environments.
    pub reader: Arc<dyn Processes>,
    /// Sandbox user's numeric identity.
    pub uid: u32,
}

#[async_trait]
impl OwnedPorts for CgroupPorts {
    async fn scan(&self, cgroup: &str) -> Result<Vec<u16>> {
        let mut sockets = listening_sockets(
            &self.reader.read("/proc/net/tcp".into()).await.internal()?,
            false,
            self.uid,
        );
        sockets.extend(listening_sockets(
            &self.reader.read("/proc/net/tcp6".into()).await.internal()?,
            true,
            self.uid,
        ));
        let inodes: BTreeMap<_, _> = sockets
            .into_iter()
            .map(|socket| (socket.inode, socket.port as u16))
            .collect();
        let mut ports = BTreeSet::new();
        for pid in self.reader.list("/proc".into()).await.internal()? {
            if pid.is_empty() || !pid.bytes().all(|byte| byte.is_ascii_digit()) {
                continue;
            }
            let Ok(groups) = self.reader.read(format!("/proc/{pid}/cgroup")).await else {
                continue;
            };
            if !groups
                .lines()
                .filter_map(|line| line.split_once("::").map(|(_, value)| value))
                .any(|group| {
                    group == cgroup
                        || group
                            .strip_prefix(cgroup)
                            .is_some_and(|tail| tail.starts_with('/'))
                })
            {
                continue;
            }
            let Ok(descriptors) = self.reader.list(format!("/proc/{pid}/fd")).await else {
                continue;
            };
            for descriptor in descriptors {
                let Ok(link) = self
                    .reader
                    .link(format!("/proc/{pid}/fd/{descriptor}"))
                    .await
                else {
                    continue;
                };
                if let Some(port) = link
                    .strip_prefix("socket:[")
                    .and_then(|value| value.strip_suffix(']'))
                    .and_then(|inode| inodes.get(inode))
                {
                    ports.insert(*port);
                }
            }
        }
        Ok(ports.into_iter().collect())
    }
}
