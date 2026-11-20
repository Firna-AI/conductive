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
async fn apply_restores_lost_part_files_while_the_download_lock_is_held()
-> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let root = tempfile::tempdir()?;
    let mut responses = HashMap::new();
    let mut parts = Vec::new();
    for (name, files) in [
        (
            "sdk-helper",
            vec![("sdk-helper.mjs", b"helper bytes".as_slice())],
        ),
        ("node", vec![("node-v24-linux-x64/bin/node", b"node bytes")]),
        (
            "system",
            vec![
                ("runner-start.sh", b"start bytes"),
                ("install-system.sh", b"install bytes"),
            ],
        ),
    ] {
        let bytes = archive(&files)?;
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
    let part_folder = |name: &str| {
        let part = parts.parts.iter().find(|part| part.name == name);
        part.map(|part| root.path().join("parts").join(&part.sha256))
    };
    fs::remove_dir_all(part_folder("node").ok_or("missing node part")?)?;
    fs::remove_file(
        part_folder("system")
            .ok_or("missing system part")?
            .join("runner-start.sh"),
    )?;
    let engine = Engine {
        store: disk.clone(),
        client: Arc::new(server.client.clone()),
        installer: Arc::new(TarGzBinaryInstaller::new()),
        processes: Arc::new(SystemProcesses),
    };
    let engine: &dyn UpdateEngine = &engine;
    let _background_check = disk.lock()?.ok_or("expected download lock")?;
    tokio::time::timeout(std::time::Duration::from_secs(30), engine.apply()).await??;
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

#[test]
fn unpack_keeps_a_part_that_is_present() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let root = tempfile::tempdir()?;
    let disk = DiskStore::new(root.path().to_path_buf());
    let first = archive(&[("sdk-helper.mjs", b"first".as_slice())])?;
    let part = Part {
        name: "sdk-helper".into(),
        url: "https://releases.test/sdk-helper".into(),
        sha256: sha256(&first),
    };
    disk.unpack(&part, &first)?;
    disk.unpack(
        &part,
        &archive(&[("sdk-helper.mjs", b"second".as_slice())])?,
    )?;
    let folder = root.path().join("parts").join(&part.sha256);
    assert_eq!(fs::read(folder.join("sdk-helper.mjs"))?, b"first");
    assert_eq!(
        fs::read_dir(root.path().join("parts"))?.count(),
        1,
        "an unpack left a private folder"
    );
    Ok(())
}
