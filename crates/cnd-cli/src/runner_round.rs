//! Compose one runner round while services keep their independent lifetime.

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

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
use cnd_runner::relocation::RepositoryFolders;
use cnd_runner::reports::files::FileReporter;
use cnd_runner::reports::handler::{ReportCommandHandler, ReportDependencies};
use cnd_runner::repository::git::{Cancellation, ChildGit};
use cnd_runner::repository::io::LocalRepositoryIo;
use cnd_runner::runtime::{RunExit, Runner, RunnerCore};
use cnd_runner::skills::helper::{NodeSkillScanner, ScannedOrgSkills, SkillHelpers};
use cnd_runner::skills::reporter::SkillReporter;
use cnd_runner::skills::service::SkillsCopy;
use cnd_runner::socket::WebSocketConnector;
use cnd_runner::startup_log::StartupLog;
use cnd_runner::state::store::{DurableStore, EventStore};
use cnd_runner::update::ReleaseReadiness;
use cnd_runner::watcher::linux::LinuxWatchDriver;
use cnd_runner::watcher::service::ReportWatchService;
use cnd_services::manager::state::ServiceManager;
use cnd_services::port_reports::ServicePortScanner;
use cnd_services::runner::RunnerServices;
use tokio::sync::watch;
use uuid::Uuid;

use crate::error::{ErrorResultExt, Result};
use crate::runner_start::RunnerStart;

/// SDK paths and the one shared manager retained across runner rounds.
pub(crate) struct RoundResources {
    pub(crate) node: PathBuf,
    pub(crate) program: PathBuf,
    pub(crate) services: Arc<dyn ServiceManager>,
}

pub(crate) async fn run_once(
    start: &RunnerStart,
    configuration: Configuration,
    helper: &RoundResources,
    executable: PathBuf,
    releases: Arc<dyn ReleaseReadiness>,
    startup_log: Arc<dyn StartupLog>,
    shutdown: watch::Receiver<bool>,
) -> Result<RunExit> {
    let service_root = configuration.cwd.clone();
    let helpers = Arc::new(NodeHelpers {
        node: helper.node.clone(),
        program: helper.program.clone(),
        environment: NodeHelpers::workspace_environment(&configuration),
    });
    let clock = Arc::new(SystemClock);
    let store: Arc<dyn EventStore> = Arc::new(DurableStore::new(
        Arc::new(AtomicDisk::new(configuration.state_path.clone())),
        Uuid::new_v4().to_string(),
    ));
    store.load().await.internal()?;
    let loaded = store.snapshot().await;
    let link = Arc::new(
        start
            .link(
                configuration.workspace_id.clone(),
                configuration.request.clone(),
                Arc::new(WebSocketConnector),
                clock.clone(),
                store.clone(),
            )
            .with_repository_folder(&configuration.cwd)
            .with_services(),
    );
    let io = Arc::new(LocalRepositoryIo);
    let folders = RepositoryFolders::new(&configuration, io.clone());
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
        io,
    });
    let files = Arc::new(
        FileReporter::new(
            repositories.open(Cancellation::default()),
            configuration.default_branch.clone(),
            saving.clone(),
            filter.clone(),
            loaded.file_revisions.clone(),
        )
        .with_startup_log(startup_log.clone()),
    );
    let ports: Arc<dyn PortReports> = Arc::new(PortReporter::new(
        Arc::new(ServicePortScanner {
            scanner: Arc::new(ProcPortScanner::new(
                Arc::new(DiskProcReader),
                rustix::process::getuid().as_raw(),
                configuration.home.clone(),
                configuration.cwd.clone(),
            )),
            manager: helper.services.clone(),
        }),
        saving.clone(),
        filter.clone(),
    ));
    // The agent starts and the skill lists share one org skills copy.
    let org_skills = Arc::new(SkillsCopy::on_disk(
        configuration.skills_repository.clone(),
        configuration.home.clone(),
    ));
    let mut scanner = NodeSkillScanner::new(
        helpers.clone(),
        filter.clone(),
        configuration.cwd.to_string_lossy().into_owned(),
        configuration.home.to_string_lossy().into_owned(),
    );
    if let Some(repository) = &configuration.skills_repository {
        scanner = scanner.with_org_skills(ScannedOrgSkills {
            copy: org_skills.clone(),
            repository: repository.clone(),
            trusted_repository: configuration.trusted_skills_repository.clone(),
        });
    }
    let skills = Arc::new(SkillReporter::new(
        Arc::new(scanner),
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
        .with_skills(skills.clone())
        .with_org_skills(org_skills.changes()),
    );
    let startup = Arc::new(RunnerStartup {
        home: configuration.home.clone(),
        executable,
    });
    let engine = Arc::new(
        AgentEngine::new(
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
        )
        .with_skills(org_skills),
    );
    let handler = Arc::new(
        ReportCommandHandler::new(
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
        )
        .with_startup_log(startup_log.clone()),
    );
    let runner: Arc<dyn Runner> = Arc::new(
        RunnerCore::new(link, store, clock, handler, releases)
            .with_folders(folders)
            .with_services(Arc::new(RunnerServices {
                manager: helper.services.clone(),
                repository: service_root.clone(),
            }))
            .with_startup_log(startup_log),
    );
    let manager = helper.services.clone();
    let metadata = tokio::spawn(async move {
        if manager.repository(service_root).await.is_err() {
            tracing::warn!("The service display folder could not be updated.");
        }
    });
    let result = runner.run(shutdown).await.internal();
    metadata.abort();
    let _ = metadata.await;
    result
}
