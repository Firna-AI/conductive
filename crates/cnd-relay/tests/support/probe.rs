//! Run the shipped preview probe with its real HTTP and WebSocket listeners.

use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicUsize, Ordering};

use serde::Deserialize;

use crate::support::wire::TestResult;

#[derive(Deserialize)]
pub(crate) struct Ports {
    pub(crate) ipv4: u16,
    pub(crate) ipv6: u16,
    pub(crate) network: u16,
}

pub(crate) struct Probe {
    pub(crate) ports: Ports,
    child: Child,
    directory: PathBuf,
}

impl Probe {
    pub(crate) fn start() -> TestResult<Self> {
        static SEQUENCE: AtomicUsize = AtomicUsize::new(0);
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
        let parent = root.join(".context/cnd-relay-live-probes");
        fs::create_dir_all(&parent)?;
        let directory = parent.join(format!(
            "{}-{}",
            std::process::id(),
            SEQUENCE.fetch_add(1, Ordering::SeqCst)
        ));
        fs::create_dir(&directory)?;
        let mut child = Command::new("node")
            .arg(root.join("image/e2b/preview-probe.mjs"))
            .arg(&directory)
            .arg(r#"["e2b-traffic-access-token","x-access-token","e2b-sandbox-id","e2b-sandbox-port","x-conductive-preview-port"]"#)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()?;
        let mut ready = String::new();
        BufReader::new(child.stdout.take().ok_or("missing probe output")?).read_line(&mut ready)?;
        let mut probe = Self {
            ports: Ports {
                ipv4: 0,
                ipv6: 0,
                network: 0,
            },
            child,
            directory,
        };
        assert_eq!(ready, "ready\n");
        probe.ports = serde_json::from_slice(&fs::read(probe.directory.join("ports.json"))?)?;
        Ok(probe)
    }
}

impl Drop for Probe {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let _ = fs::remove_dir_all(&self.directory);
    }
}
