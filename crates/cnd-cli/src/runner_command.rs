//! Compose the full unprivileged runner and graceful signal shutdown.

use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use cnd_cli::runner_update::idle::IdleUpdates;
use cnd_cli::runner_update::ports::RunnerSwap;
use cnd_cli::runner_update::process::SystemSwap;
use cnd_cli::runner_update::releases::RunnerReleases;
use cnd_cli::runner_update::swap::UpdateRunner;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::staging::NODE_PART;
use cnd_runner::clock::SystemClock;
use cnd_runner::config::Configuration;
use cnd_runner::disk::AtomicDisk;
use cnd_runner::emitter::{EventEmitter, SavingEmitter};
use cnd_runner::engine::dependencies::{EngineDependencies, GitTurnRepositories, TurnRepositories};
use cnd_runner::engine::handler::AgentEngine;
use cnd_runner::filter::service::{CredentialFilter, Credentials, FilteredEmitter};
use cnd_runner::helper::process::NodeHelpers;
use cnd_runner::helper::startup::RunnerStartup;
use cnd_runner::ports::proc::{DiskProcReader, ProcPortScanner};
use cnd_runner::ports::reporter::{PortReporter, PortReports};
use cnd_runner::reports::files::FileReporter;
use cnd_runner::reports::handler::{ReportCommandHandler, ReportDependencies};
use cnd_runner::repository::git::{Cancellation, ChildGit};
use cnd_runner::repository::io::LocalRepositoryIo;
use cnd_runner::runtime::{RunExit, Runner, RunnerCore};
use cnd_runner::skills::helper::{NodeSkillScanner, SkillHelpers};
use cnd_runner::skills::reporter::SkillReporter;
use cnd_runner::socket::WebSocketConnector;
use cnd_runner::state::store::{DurableStore, EventStore};
use cnd_runner::update::ReleaseReadiness;
use cnd_runner::watcher::linux::LinuxWatchDriver;
use cnd_runner::watcher::service::ReportWatchService;
use tokio::signal::unix::{SignalKind, signal};
use tokio::sync::watch;
use uuid::Uuid;

use crate::error::{ErrorResultExt, Result};
use crate::release::VERSION;
use crate::runner_start::RunnerStart;

/// Role containing the SDK helper and its runtime packages.
pub(crate) const SDK_HELPER_PART: &str = "sdk-helper";

pub(crate) async fn execute() -> Result<()> {
    let start = RunnerStart::new();
    let environment: BTreeMap<String, String> = std::env::vars().collect();
    let cwd = std::env::current_dir().internal()?;
    let home = environment
        .get("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("/home/user"));
    let configuration = Configuration::parse(&environment, &cwd, &home).internal()?;
    let executable = std::env::current_exe()
        .internal()?
        .canonicalize()
        .internal()?;
    let release = executable.parent().unwrap_or(&cwd);
    let development = release
        .file_name()
        .is_some_and(|name| name == "debug" || name == "release");
    let node = environment
        .get("CONDUCTIVE_NODE")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            if development {
                PathBuf::from("node")
            } else {
                release.join(NODE_PART).join("bin/node")
            }
        });
    let program = environment
        .get("CONDUCTIVE_SDK_HELPER")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            if development {
                cwd.join("dist/sdk-helper/sdk-helper.mjs")
            } else {
                release.join(SDK_HELPER_PART).join("sdk-helper.mjs")
            }
        });
    let helpers = Arc::new(NodeHelpers { node, program });
    let install_root = PathBuf::from("/opt/conductive");
    let release_store = Arc::new(DiskStore::new(install_root.clone()));
    let releases: Arc<dyn ReleaseReadiness> = Arc::new(RunnerReleases {
        store: release_store.clone(),
        running_version: VERSION.into(),
    });
    let updater: Arc<dyn RunnerSwap> = Arc::new(UpdateRunner {
        store: release_store,
        processes: Arc::new(SystemSwap),
        running_version: VERSION.into(),
        executable: executable.clone(),
        start_script: install_root.join("current/system/runner-start.sh"),
    });
    let updates = Arc::new(IdleUpdates::new(releases, updater));
    let (stop, shutdown) = watch::channel(false);
    let mut terminate = signal(SignalKind::terminate()).internal()?;
    let mut interrupt = signal(SignalKind::interrupt()).internal()?;
    let signals = tokio::spawn(async move {
        tokio::select! { _ = terminate.recv() => {}, _ = interrupt.recv() => {} }
        stop.send_replace(true);
    });
    let result = async {
        while !*shutdown.borrow() && shutdown.has_changed().is_ok() {
            let exit = run_once(
                &start,
                configuration.clone(),
                helpers.clone(),
                executable.clone(),
                updates.clone(),
                shutdown.clone(),
            )
            .await?;
            if exit == RunExit::Shutdown || *shutdown.borrow() || shutdown.has_changed().is_err() {
                return Ok(());
            }
            updates.swap(shutdown.clone()).await.internal()?;
        }
        Ok(())
    }
    .await;
    signals.abort();
    let _ = signals.await;
    result
}

async fn run_once(
    start: &RunnerStart,
    configuration: Configuration,
    helpers: Arc<NodeHelpers>,
    executable: PathBuf,
    releases: Arc<dyn ReleaseReadiness>,
    shutdown: watch::Receiver<bool>,
) -> Result<RunExit> {
    let clock = Arc::new(SystemClock);
    let store: Arc<dyn EventStore> = Arc::new(DurableStore::new(
        Arc::new(AtomicDisk::new(configuration.state_path.clone())),
        Uuid::new_v4().to_string(),
    ));
    store.load().await.internal()?;
    let loaded = store.snapshot().await;
    let link = Arc::new(start.link(
        configuration.workspace_id.clone(),
        configuration.request.clone(),
        Arc::new(WebSocketConnector),
        clock.clone(),
        store.clone(),
    ));
    let filter = Arc::new(CredentialFilter::default());
    filter
        .add(configuration.request.workspace_token.clone())
        .internal()?;
    let saving: Arc<dyn EventEmitter> = Arc::new(SavingEmitter::new(link.clone()));
    let chat: Arc<dyn EventEmitter> =
        Arc::new(FilteredEmitter::new(filter.clone(), saving.clone()));
    let repositories = Arc::new(GitTurnRepositories {
        root: configuration.cwd.clone(),
        git: Arc::new(ChildGit),
        io: Arc::new(LocalRepositoryIo),
    });
    let files = Arc::new(FileReporter::new(
        repositories.open(Cancellation::default()),
        configuration.default_branch.clone(),
        saving.clone(),
        filter.clone(),
        loaded.file_revisions.clone(),
    ));
    let ports: Arc<dyn PortReports> = Arc::new(PortReporter::new(
        Arc::new(ProcPortScanner::new(
            Arc::new(DiskProcReader),
            rustix::process::getuid().as_raw(),
            configuration.home.clone(),
            configuration.cwd.clone(),
        )),
        saving.clone(),
        filter.clone(),
    ));
    let skills = Arc::new(SkillReporter::new(
        Arc::new(NodeSkillScanner::new(
            helpers.clone(),
            filter.clone(),
            configuration.cwd.to_string_lossy().into_owned(),
            configuration.home.to_string_lossy().into_owned(),
        )),
        saving.clone(),
        filter.clone(),
    ));
    let agent_helpers = Arc::new(SkillHelpers {
        ports: helpers.clone(),
        skills: skills.clone(),
    });
    let watches = Arc::new(
        ReportWatchService::new(
            Arc::new(LinuxWatchDriver),
            files.clone(),
            Some(ports.clone()),
            configuration.cwd.clone(),
            PathBuf::from("/run/conductive-terminal/restore-ended"),
        )
        .with_skills(skills.clone()),
    );
    let startup = Arc::new(RunnerStartup {
        home: configuration.home.clone(),
        helpers: helpers.clone(),
        executable,
    });
    let engine = Arc::new(AgentEngine::new(
        EngineDependencies {
            configuration,
            store: store.clone(),
            emitter: chat,
            credentials: filter.clone(),
            helpers: agent_helpers,
            repositories,
            clock: clock.clone(),
            startup,
            background_limit: Duration::from_secs(30 * 24 * 60 * 60),
        },
        loaded.clone(),
    ));
    let handler = Arc::new(ReportCommandHandler::new(
        ReportDependencies {
            files,
            ports: Some(ports),
            skills: Some(skills),
            emitter: saving,
            link: link.clone(),
            store: store.clone(),
            clock: clock.clone(),
            filter,
            watches: Some(watches),
            next: engine,
        },
        loaded.reports.commands,
    ));
    let runner: Arc<dyn Runner> = Arc::new(RunnerCore::new(link, store, clock, handler, releases));
    runner.run(shutdown).await.internal()
}
