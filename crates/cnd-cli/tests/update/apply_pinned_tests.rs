//! Pinned activation, rollback, and collection in a real release store.

use std::collections::HashMap;
use std::fs;
use std::process::{Command, Output};
use std::sync::Arc;

use cli_updater::TarGzBinaryInstaller;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::engine::Engine;
use cnd_cli::update::error::Error;
use cnd_cli::update::http::release_client;
use cnd_cli::update::ports::{State, Store, UpdateEngine};
use cnd_cli::update::process::{SYSTEM_PART, SystemProcesses};
use cnd_release::files::sha256;
use cnd_release::parts::{Part, PartsList};
use tempfile::TempDir;

use crate::support::{Server, TestResult, archive};

const PREVIOUS: &str = "0.0.1";
const EARLIER: &str = "0.0.2";
const PIN: &str = "0.0.3";
const NEWER: &str = "0.0.4";

#[test]
fn pinned_apply_activates_the_requested_release_and_collection_keeps_the_newer_one() -> TestResult {
    let fixture = ApplyFixture::new()?;
    for version in [PREVIOUS, PIN, NEWER] {
        fixture.stage(version)?;
    }
    fixture
        .disk
        .transition(&state(Some(PREVIOUS), None, None))?;

    let output = fixture.apply_command(PIN)?;
    assert!(output.status.success(), "{output:?}");
    assert_eq!(
        fixture.disk.state()?,
        state(Some(PIN), Some(PREVIOUS), Some(PIN))
    );
    assert_eq!(fixture.installed()?, PIN);

    fixture.engine()?.started(PIN)?;
    assert_eq!(
        fixture.disk.state()?,
        state(Some(PIN), Some(PREVIOUS), None)
    );
    let mut versions = fixture.disk.versions()?;
    versions.sort();
    assert_eq!(versions, [PREVIOUS, PIN, NEWER]);
    Ok(())
}

#[tokio::test]
async fn pinned_apply_refuses_a_newer_active_release() -> TestResult {
    let fixture = ApplyFixture::new()?;
    for version in [PIN, NEWER] {
        fixture.stage(version)?;
    }
    let active = state(Some(NEWER), Some(PIN), None);
    fixture.disk.transition(&active)?;
    let result = fixture.engine()?.apply_pinned(PIN).await;
    let expected = Error::NewerReleaseActive {
        requested: PIN.into(),
        active: NEWER.into(),
    };
    assert!(
        matches!(result, Err(Error::NewerReleaseActive { requested, active }) if requested == PIN && active == NEWER),
        "{expected}"
    );
    let output = fixture.apply_command(PIN)?;
    assert_eq!(output.status.code(), Some(1), "{output:?}");
    assert!(String::from_utf8(output.stderr)?.contains(&expected.to_string()));
    assert_eq!(fixture.disk.state()?, active);
    assert!(!fixture.root.path().join("installed").exists());
    Ok(())
}

#[tokio::test]
async fn pinned_apply_repairs_the_current_release_without_switching_or_installing_system_files()
-> TestResult {
    let fixture = ApplyFixture::new()?;
    let helper = archive(&[("sdk-helper.mjs", b"restored helper")])?;
    let parts = PartsList::new(vec![Part {
        name: "sdk-helper".into(),
        url: "https://releases.test/sdk-helper".into(),
        sha256: sha256(&helper),
    }])?;
    fixture.complete(PIN, &parts)?;
    fixture.stage(NEWER)?;
    let active = state(Some(PIN), Some(PREVIOUS), None);
    fixture.disk.transition(&active)?;
    let server = Server::start(HashMap::from([("/sdk-helper".into(), helper)]))?;
    let mut engine = fixture.engine()?;
    engine.client = Arc::new(server.client.clone());
    let result = engine.apply_pinned(PIN).await;
    let requests = server.requests.clone();
    server.finish()?;

    assert!(result.is_ok(), "{result:?}");
    assert_eq!(fixture.disk.state()?, active);
    assert!(!fixture.root.path().join("installed").exists());
    assert_eq!(
        *requests.lock().map_err(|_| "request lock poisoned")?,
        ["/sdk-helper"]
    );
    assert_eq!(
        fs::read(
            fixture
                .disk
                .version_path(PIN)
                .join("sdk-helper/sdk-helper.mjs")
        )?,
        b"restored helper"
    );
    Ok(())
}

#[tokio::test]
async fn pinned_apply_rolls_back_an_older_pending_release_and_activates_the_pin() -> TestResult {
    let fixture = ApplyFixture::new()?;
    for version in [PREVIOUS, EARLIER, PIN] {
        fixture.stage(version)?;
    }
    fixture
        .disk
        .transition(&state(Some(EARLIER), Some(PREVIOUS), Some(EARLIER)))?;

    let result = fixture.engine()?.apply_pinned(PIN).await;
    assert!(result.is_ok(), "{result:?}");
    assert_eq!(
        fixture.disk.state()?,
        state(Some(PIN), Some(PREVIOUS), Some(PIN))
    );
    assert!(fixture.disk.rejected(EARLIER)?);
    assert_eq!(fixture.installed()?, "0.0.1\n0.0.3");
    Ok(())
}

#[tokio::test]
async fn pinned_apply_rolls_back_and_refuses_the_requested_pending_release() -> TestResult {
    let fixture = ApplyFixture::new()?;
    for version in [PREVIOUS, PIN] {
        fixture.stage(version)?;
    }
    fixture
        .disk
        .transition(&state(Some(PIN), Some(PREVIOUS), Some(PIN)))?;

    let result = fixture.engine()?.apply_pinned(PIN).await;
    assert!(
        matches!(&result, Err(Error::ReleaseRejected { version }) if version == PIN),
        "{result:?}"
    );
    assert_eq!(fixture.disk.state()?, state(Some(PREVIOUS), None, None));
    assert!(fixture.disk.rejected(PIN)?);
    assert_eq!(fixture.installed()?, PREVIOUS);
    Ok(())
}

#[tokio::test]
async fn pinned_apply_refuses_an_incomplete_or_rejected_release() -> TestResult {
    for rejected in [false, true] {
        let fixture = ApplyFixture::new()?;
        fixture.stage(PREVIOUS)?;
        fixture.stage(NEWER)?;
        if rejected {
            fixture.stage(PIN)?;
            fixture.disk.reject(PIN)?;
        } else {
            fs::create_dir_all(fixture.disk.version_path(PIN))?;
        }
        let active = state(Some(PREVIOUS), None, None);
        fixture.disk.transition(&active)?;

        let result = fixture.engine()?.apply_pinned(PIN).await;
        assert!(
            match &result {
                Err(Error::ReleaseRejected { version }) => rejected && version == PIN,
                Err(Error::ReleaseNotComplete { version }) => !rejected && version == PIN,
                _ => false,
            },
            "rejected={rejected}: {result:?}"
        );
        assert_eq!(fixture.disk.state()?, active);
        assert!(!fixture.root.path().join("installed").exists());
    }
    Ok(())
}

#[tokio::test]
async fn pinned_apply_reports_a_busy_activation_lock() -> TestResult {
    let fixture = ApplyFixture::new()?;
    fixture.stage(PIN)?;
    let _lock = fixture.disk.apply_lock()?.ok_or("expected apply lock")?;
    let result = fixture.engine()?.apply_pinned(PIN).await;
    assert!(matches!(result, Err(Error::ApplyBusy)), "{result:?}");
    assert_eq!(fixture.disk.state()?, State::default());
    Ok(())
}

struct ApplyFixture {
    root: TempDir,
    disk: Arc<DiskStore>,
}

impl ApplyFixture {
    fn new() -> TestResult<Self> {
        let root = tempfile::tempdir()?;
        let disk = Arc::new(DiskStore::new(root.path().to_path_buf()));
        Ok(Self { root, disk })
    }

    fn complete(&self, version: &str, parts: &PartsList) -> TestResult {
        fs::create_dir_all(self.disk.version_path(version))?;
        self.disk.complete(version, parts)?;
        Ok(())
    }

    fn stage(&self, version: &str) -> TestResult {
        let installer = format!(
            "#!/bin/sh\nprintf '%s\\n' '{version}' >> '{}'\n",
            self.root.path().join("installed").display()
        );
        let bytes = archive(&[
            ("install-system.sh", installer.as_bytes()),
            ("runner-start.sh", b"#!/bin/sh\n"),
        ])?;
        let part = Part {
            name: SYSTEM_PART.into(),
            url: "https://releases.test/system".into(),
            sha256: sha256(&bytes),
        };
        self.disk.unpack(&part, &bytes)?;
        self.complete(version, &PartsList::new(vec![part])?)
    }

    fn installed(&self) -> TestResult<String> {
        Ok(fs::read_to_string(self.root.path().join("installed"))?
            .trim_end()
            .to_owned())
    }

    fn engine(&self) -> TestResult<Engine> {
        Ok(Engine {
            store: self.disk.clone(),
            client: Arc::new(release_client("http://127.0.0.1:1")?),
            installer: Arc::new(TarGzBinaryInstaller::new()),
            processes: Arc::new(SystemProcesses),
        })
    }

    fn apply_command(&self, version: &str) -> TestResult<Output> {
        Ok(Command::new(env!("CARGO_BIN_EXE_conductive"))
            .args(["update", "apply", "--release", version, "--root"])
            .arg(self.root.path())
            .output()?)
    }
}

fn state(current: Option<&str>, previous: Option<&str>, pending: Option<&str>) -> State {
    State {
        current: current.map(str::to_owned),
        previous: previous.map(str::to_owned),
        pending: pending.map(str::to_owned),
    }
}
