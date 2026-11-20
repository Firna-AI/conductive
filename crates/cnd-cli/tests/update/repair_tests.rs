//! Apply restores lost parts of the active release on a real disk.

use std::collections::HashMap;
use std::fs;
use std::sync::Arc;

use cli_updater::TarGzBinaryInstaller;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::engine::Engine;
use cnd_cli::update::ports::{State, Store, UpdateEngine};
use cnd_cli::update::process::SystemProcesses;
use cnd_release::files::sha256;
use cnd_release::parts::{Part, PartsList};

use crate::support::{Server, archive};

#[tokio::test]
async fn apply_downloads_lost_parts_of_the_active_release_again()
-> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let root = tempfile::tempdir()?;
    let mut responses = HashMap::new();
    let mut parts = Vec::new();
    for (name, file, bytes) in [
        ("sdk-helper", "sdk-helper.mjs", b"helper bytes".as_slice()),
        ("node", "node-v24-linux-x64/bin/node", b"node bytes"),
        ("system", "runner-start.sh", b"start bytes"),
    ] {
        let bytes = archive(&[(file, bytes)])?;
        parts.push(Part {
            name: name.into(),
            url: format!("https://releases.test/{name}"),
            sha256: sha256(&bytes),
        });
        responses.insert(format!("/{name}"), bytes);
    }
    let parts = PartsList::new(parts)?;
    let disk = Arc::new(DiskStore::new(root.path().to_path_buf()));
    let server = Server::start(responses.clone())?;
    for part in &parts.parts {
        disk.unpack(part, &responses[&format!("/{}", part.name)])?;
    }
    disk.prepare("0.0.3")?;
    disk.complete("0.0.3", &parts)?;
    disk.transition(&State {
        current: Some("0.0.3".into()),
        ..State::default()
    })?;
    for lost in &parts.parts[1..] {
        fs::remove_dir_all(root.path().join("parts").join(&lost.sha256))?;
    }
    let engine = Engine {
        store: disk.clone(),
        client: Arc::new(server.client.clone()),
        installer: Arc::new(TarGzBinaryInstaller::new()),
        processes: Arc::new(SystemProcesses),
    };
    let engine: &dyn UpdateEngine = &engine;
    engine.apply().await?;
    let active = disk.version_path("0.0.3");
    assert_eq!(fs::read(active.join("node/bin/node"))?, b"node bytes");
    assert_eq!(
        fs::read(active.join("system/runner-start.sh"))?,
        b"start bytes"
    );
    assert_eq!(
        *server
            .requests
            .lock()
            .map_err(|_| "request lock poisoned")?,
        ["/node", "/system"],
        "apply downloaded a part that was on disk"
    );
    assert_eq!(disk.state()?.current.as_deref(), Some("0.0.3"));
    server.finish()?;
    Ok(())
}
