//! Startup runs trial programs in the same process and collects interrupted work.

#![expect(
    clippy::unwrap_used,
    reason = "Invalid trial fixtures must fail the test."
)]

use std::env;
use std::fs;
use std::os::unix::fs::{PermissionsExt, symlink};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::time::Duration;

use futures_util::poll;
use tokio::sync::watch;

use cnd_computer::activity::Activity;
use cnd_computer::diagnostics::TracingDiagnostics;
use cnd_computer::process::NativeProcess;
use cnd_computer::releases::cache::ProgramCache;
use cnd_computer::releases::http::HttpReleases;
use cnd_computer::settings::SavedSettings;
use cnd_computer::update::disk::InstalledVersions;
use cnd_computer::update::launch::{Launch, Launcher, NativeExec, Startup};
use cnd_computer::update::ports::UpdateFiles;
use cnd_computer::update::runtime::{Updater, Updates};
use cnd_computer::update::state::{Trial, UpdateState};
use cnd_host::clock::SystemClock;
use cnd_release::signature::RELEASE_PUBLIC_KEY;
use cnd_release::version::DEVELOPMENT_VERSION;

const CURRENT: &str = "0.0.41";
const PREVIOUS: &str = "0.0.40";
const TRIAL: &str = "0.0.42";
const STALE: &str = "0.0.23";

const FIXTURE: &str = "CND_TEST_TRIAL_ROOT";
const TRACE: &str = "CND_TEST_TRIAL_TRACE";

const CANDIDATE: &str = r#"#!/bin/sh
if [ "$1" = "--version" ]; then
    printf 'conductive 0.0.42\n'
    exit 0
fi
if [ "$1" = computer ] && [ "$2" = run ]; then
    printf '%s\n' "$$" >> "$CND_TEST_TRIAL_TRACE"
    exit 1
fi
exit 2
"#;

fn layout(root: &Path) -> Arc<InstalledVersions> {
    let data = root.join("data");
    for version in [CURRENT, PREVIOUS, TRIAL] {
        let directory = data.join("versions").join(version);
        fs::create_dir_all(&directory).unwrap();
        fs::write(
            directory.join("conductive"),
            if version == TRIAL {
                CANDIDATE
            } else {
                "fixture"
            },
        )
        .unwrap();
    }
    symlink("versions/0.0.41", data.join("current")).unwrap();
    let installed = Arc::new(InstalledVersions {
        directory: data.clone(),
        executable: Some(data.join("versions/0.0.41/conductive")),
    });
    installed
        .save(&UpdateState {
            previous: Some(PREVIOUS.into()),
            trial: Some(Trial {
                from: CURRENT.into(),
                version: TRIAL.into(),
                starts: 0,
            }),
            ..UpdateState::default()
        })
        .unwrap();
    installed
}

fn launcher(root: &Path, version: &str, files: Arc<InstalledVersions>) -> Launcher {
    Launcher {
        version: version.into(),
        files,
        cache: Arc::new(ProgramCache {
            directory: root.join("cache"),
        }),
        process: Arc::new(NativeExec),
        diagnostics: Arc::new(TracingDiagnostics),
    }
}

#[test]
fn five_early_trial_exits_leave_current_in_place_and_refuse_the_candidate() {
    if let Some(root) = env::var_os(FIXTURE).map(PathBuf::from) {
        let data = root.join("data");
        let files = Arc::new(InstalledVersions {
            executable: Some(data.join("versions/0.0.41/conductive")),
            directory: data,
        });
        assert_eq!(launcher(&root, CURRENT, files).start(), Startup::Current);
        return;
    }

    let root = tempfile::tempdir().unwrap();
    let files = layout(root.path());
    let trial = files.program(TRIAL).unwrap();
    fs::set_permissions(&trial, fs::Permissions::from_mode(0o700)).unwrap();
    let program_version = Command::new(trial).arg("--version").output().unwrap();
    assert_eq!(program_version.status.code(), Some(0));
    assert_eq!(program_version.stdout, b"conductive 0.0.42\n");

    let trace = root.path().join("trials");
    let mut trial_pids = String::new();
    for attempt in 1..=6 {
        let child = Command::new(env::current_exe().unwrap())
            .args([
                "--exact",
                "five_early_trial_exits_leave_current_in_place_and_refuse_the_candidate",
            ])
            .env(FIXTURE, root.path())
            .env(TRACE, &trace)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        let pid = child.id();
        let result = child.wait_with_output().unwrap();
        assert_eq!(
            result.status.code(),
            Some(if attempt <= 5 { 1 } else { 0 }),
            "{result:?}"
        );
        assert_eq!(files.current_version().unwrap().as_deref(), Some(CURRENT));
        let expected = (attempt <= 5).then_some(attempt);
        assert_eq!(
            files.state().unwrap().trial.map(|trial| trial.starts),
            expected
        );
        if attempt <= 5 {
            trial_pids.push_str(&format!("{pid}\n"));
        }
    }
    assert_eq!(fs::read_to_string(trace).unwrap(), trial_pids);
    assert!(files.state().unwrap().refused.contains(TRIAL));
}

#[test]
fn an_exec_error_counts_a_try_and_keeps_the_confirmed_service() {
    let root = tempfile::tempdir().unwrap();
    let files = layout(root.path());
    fs::remove_file(files.program(TRIAL).unwrap()).unwrap();
    assert_eq!(
        launcher(root.path(), CURRENT, files.clone()).start(),
        Startup::Current
    );
    assert_eq!(files.current_version().unwrap().as_deref(), Some(CURRENT));
    assert_eq!(
        files.state().unwrap().trial.map(|trial| trial.starts),
        Some(1)
    );
}

#[tokio::test(start_paused = true)]
async fn an_installed_trial_confirms_and_moves_the_current_link() {
    let root = tempfile::tempdir().unwrap();
    let current = layout(root.path());
    let mut state = current.state().unwrap();
    state.trial.as_mut().unwrap().starts = 1;
    current.save(&state).unwrap();

    let files = Arc::new(InstalledVersions {
        directory: current.directory.clone(),
        executable: Some(current.program(TRIAL).unwrap()),
    });
    let startup = launcher(root.path(), TRIAL, files.clone()).start();
    assert_eq!(startup, Startup::Trial);
    let cache = root.path().join("cache");
    let updater = Updater {
        version: TRIAL.into(),
        files,
        cache: Arc::new(ProgramCache {
            directory: cache.clone(),
        }),
        settings: Arc::new(SavedSettings {
            path: root.path().join("computer.json"),
        }),
        releases: Arc::new(HttpReleases::new(RELEASE_PUBLIC_KEY, cache).unwrap()),
        process: Arc::new(NativeProcess),
        activity: Arc::new(Activity::default()),
        timer: Arc::new(SystemClock),
        diagnostics: Arc::new(TracingDiagnostics),
    };
    let (stop, shutdown) = watch::channel(false);
    let monitor = updater.monitor(startup, stop, shutdown);
    tokio::pin!(monitor);
    assert!(poll!(&mut monitor).is_pending());
    tokio::time::advance(Duration::from_secs(60)).await;
    assert!(poll!(&mut monitor).is_pending());

    assert_eq!(
        fs::read_link(current.directory.join("current")).unwrap(),
        Path::new("versions/0.0.42")
    );
    assert_eq!(
        current.state().unwrap(),
        UpdateState {
            previous: Some(CURRENT.into()),
            ..UpdateState::default()
        }
    );
}

#[test]
fn startup_prunes_stale_programs_and_interrupted_work_with_updates_disabled() {
    let root = tempfile::tempdir().unwrap();
    let files = layout(root.path());
    let cache = root.path().join("cache");
    let programs = cache.join("programs");
    for version in [CURRENT, PREVIOUS, TRIAL, STALE] {
        fs::create_dir_all(programs.join(version).join("archive-digest")).unwrap();
    }
    let base_loads = cache.join("base-loads");
    fs::create_dir_all(&base_loads).unwrap();
    let marker = base_loads.join(STALE);
    fs::write(&marker, "keep").unwrap();
    let download = tempfile::NamedTempFile::new_in(&cache)
        .unwrap()
        .into_temp_path()
        .keep()
        .unwrap();
    let staged = tempfile::tempdir_in(&files.directory).unwrap().keep();
    fs::write(staged.join("conductive"), "interrupted").unwrap();
    assert_eq!(
        launcher(root.path(), DEVELOPMENT_VERSION, files).start(),
        Startup::Disabled
    );

    assert!(!programs.join(STALE).exists());
    assert!(!download.exists());
    assert!(!staged.exists());
    for version in [CURRENT, PREVIOUS, TRIAL] {
        assert!(
            programs.join(version).join("archive-digest").exists(),
            "{version}"
        );
    }
    assert_eq!(fs::read_to_string(marker).unwrap(), "keep");
}
