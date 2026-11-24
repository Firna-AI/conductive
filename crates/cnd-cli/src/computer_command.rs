//! Compose the own computer setup and service commands.

use std::fmt;
use std::io::{self, BufRead, Read};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use clap::Subcommand;
use cnd_computer::activity::Activity;
use cnd_computer::diagnostics::{Diagnostics, TracingDiagnostics};
use cnd_computer::engine::podman::Podman;
use cnd_computer::engine::ports::Engine;
use cnd_computer::enrollment::{Enrollment, HttpEnrollment};
use cnd_computer::error::{Error, Result};
use cnd_computer::operations::Operations;
use cnd_computer::operations::dispatch::Dispatcher;
use cnd_computer::preflight::{Check, Preflight};
use cnd_computer::process::{NativeProcess, Process};
use cnd_computer::releases::base::BaseImageLoader;
use cnd_computer::releases::cache::{ProgramCache, ProgramCacheFiles};
use cnd_computer::releases::http::HttpReleases;
use cnd_computer::releases::journal::LoadJournal;
use cnd_computer::releases::ports::Releases;
use cnd_computer::resources::LinuxResources;
use cnd_computer::runtime::{Computer, ComputerRuntime};
use cnd_computer::service::{Service, UnitFile, UserService};
use cnd_computer::session::serve::ComputerSession;
use cnd_computer::settings::{
    DEFAULT_ORIGIN, DEFAULT_RELEASE_SERVER, Paths, SavedSettings, ServerUrl, SettingsStore,
};
use cnd_computer::socket::WebSocketConnector;
use cnd_computer::timer::Timer;
use cnd_computer::update::disk::InstalledVersions;
use cnd_computer::update::launch::{Launch, Launcher, NativeExec};
use cnd_computer::update::ports::UpdateFiles;
use cnd_computer::update::runtime::{Updater, Updates};
use cnd_host::clock::SystemClock;
use cnd_release::signature::RELEASE_PUBLIC_KEY;
use tokio::signal::unix::{SignalKind, signal};
use tokio::sync::watch;

use crate::release;

/// Commands for a Linux server that belongs to a Conductive org.
#[derive(Subcommand)]
pub(crate) enum ComputerCommand {
    /// Check the server and its rootless container engine.
    Check,
    /// Read a one-time code from standard input and enroll this computer.
    Enroll {
        /// Conductive API origin.
        #[arg(long, default_value = DEFAULT_ORIGIN)]
        origin: String,
        /// Server for signed releases.
        #[arg(long, default_value = DEFAULT_RELEASE_SERVER)]
        release_server: String,
    },
    /// Install and start the systemd user service.
    Service,
    /// Run the outbound computer connection.
    Run,
}

impl fmt::Debug for ComputerCommand {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Check => "Check",
            Self::Enroll { .. } => "Enroll",
            Self::Service => "Service",
            Self::Run => "Run",
        })
    }
}

pub(crate) async fn execute(command: ComputerCommand) {
    match run_command(command).await {
        Ok(true) => {}
        Ok(false) => std::process::exit(1),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}

async fn run_command(command: ComputerCommand) -> Result<bool> {
    let home = std::env::var_os("HOME").ok_or(Error::MissingHome)?;
    let xdg_dir = |name| std::env::var_os(name).map(PathBuf::from);
    let paths = Paths::new(
        &PathBuf::from(home),
        xdg_dir("XDG_CONFIG_HOME"),
        xdg_dir("XDG_CACHE_HOME"),
    )?;
    match command {
        ComputerCommand::Run => run_service(paths).await,
        ComputerCommand::Check => {
            let check: Arc<dyn Check> = Arc::new(Preflight::new(
                Arc::new(NativeProcess),
                settings(paths.settings),
            ));
            let report = check.report().await;
            for line in report.lines() {
                println!("{line}");
            }
            Ok(report.passed())
        }
        ComputerCommand::Enroll {
            origin,
            release_server,
        } => {
            let origin: ServerUrl = origin.parse()?;
            let release_server: ServerUrl = release_server.parse()?;
            let enrollment: Arc<dyn Enrollment> =
                Arc::new(HttpEnrollment::new(settings(paths.settings))?);
            let mut code = String::new();
            io::stdin().lock().take(22).read_line(&mut code)?;
            let code = code
                .strip_suffix("\r\n")
                .or_else(|| code.strip_suffix('\n'))
                .unwrap_or(&code);
            enrollment.enroll(code, origin, release_server).await?;
            println!("Computer token saved.");
            Ok(true)
        }
        ComputerCommand::Service => {
            let unit = Arc::new(UnitFile { path: paths.unit });
            let service: Arc<dyn Service> =
                Arc::new(UserService::new(Arc::new(NativeProcess), unit));
            service.install().await?;
            Ok(true)
        }
    }
}

fn settings(path: PathBuf) -> Arc<dyn SettingsStore> {
    Arc::new(SavedSettings { path })
}

async fn run_service(paths: Paths) -> Result<bool> {
    let diagnostics: Arc<dyn Diagnostics> = Arc::new(TracingDiagnostics);
    let files: Arc<dyn UpdateFiles> = Arc::new(InstalledVersions {
        directory: paths.data,
        executable: Box::new(std::env::current_exe),
    });
    let cache: Arc<dyn ProgramCacheFiles> = Arc::new(ProgramCache {
        directory: paths.cache.clone(),
    });
    let launcher: Arc<dyn Launch> = Arc::new(Launcher {
        version: release::VERSION.to_owned(),
        files: files.clone(),
        cache: cache.clone(),
        process: Arc::new(NativeExec),
        diagnostics: diagnostics.clone(),
    });
    let startup = launcher.start();

    let store = settings(paths.settings);
    let process: Arc<dyn Process> = Arc::new(NativeProcess);
    let timer: Arc<dyn Timer> = Arc::new(SystemClock);
    let engine: Arc<dyn Engine> = Arc::new(Podman::new(process.clone()));
    let releases: Arc<dyn Releases> =
        Arc::new(HttpReleases::new(RELEASE_PUBLIC_KEY, paths.cache.clone())?);
    let journal = Arc::new(LoadJournal {
        path: paths.cache.join("base-loads"),
    });
    let bases = Arc::new(BaseImageLoader::new(
        engine.clone(),
        releases.clone(),
        journal,
    ));
    let operations: Arc<dyn Operations> = Arc::new(Dispatcher::new(
        engine.clone(),
        releases.clone(),
        bases,
        diagnostics.clone(),
    ));
    let activity = Arc::new(Activity::default());
    let runtime: Arc<dyn Computer> = Arc::new(ComputerRuntime {
        settings: store.clone(),
        resources: Arc::new(LinuxResources),
        connector: Arc::new(WebSocketConnector),
        session: Arc::new(ComputerSession {
            activity: activity.clone(),
            operations: operations.clone(),
            timer: timer.clone(),
            diagnostics: diagnostics.clone(),
        }),
        timer: timer.clone(),
        diagnostics: diagnostics.clone(),
        version: release::VERSION.to_owned(),
    });
    let updater: Arc<dyn Updates> = Arc::new(Updater {
        version: release::VERSION.to_owned(),
        files,
        cache,
        settings: store,
        releases,
        process,
        activity,
        timer,
        diagnostics: diagnostics.clone(),
    });
    let (stop, shutdown) = watch::channel(false);
    let mut terminate = signal(SignalKind::terminate())?;
    let mut interrupt = signal(SignalKind::interrupt())?;
    let signal_stop = stop.clone();
    let signals = tokio::spawn(async move {
        tokio::select! { _ = terminate.recv() => {}, _ = interrupt.recv() => {} }
        signal_stop.send_replace(true);
    });
    let monitor_shutdown = shutdown.clone();
    let run = async {
        let recovery = tokio::time::timeout(Duration::from_secs(50), engine.recover_paused());
        let mut startup_shutdown = shutdown.clone();
        tokio::select! {
            biased;
            _ = startup_shutdown.changed() => return Ok(()),
            recovered = recovery => {
                if !matches!(recovered, Ok(Ok(()))) {
                    diagnostics.pause_recovery_failed();
                }
            }
        }
        let result = runtime.run(shutdown).await;
        stop.send_replace(true);
        result
    };
    let monitor = updater.monitor(startup, stop.clone(), monitor_shutdown);
    let (result, ()) = tokio::join!(run, monitor);
    signals.abort();
    let _ = signals.await;
    operations.drain().await;
    result?;
    Ok(true)
}
