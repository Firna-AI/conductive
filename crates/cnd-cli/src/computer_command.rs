//! Compose the own computer setup and service commands.

use std::fmt;
use std::path::PathBuf;
use std::sync::Arc;

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
use cnd_computer::update::runtime::{Startup, Updater, Updates};
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
    /// Exchange a one-time code for a computer token.
    Enroll {
        /// One-time code from Add computer.
        #[arg(long)]
        code: String,
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
    let process: Arc<dyn Process> = Arc::new(NativeProcess);
    let store: Arc<dyn SettingsStore> = Arc::new(SavedSettings {
        path: paths.settings,
    });
    match command {
        ComputerCommand::Check => {
            let check: Arc<dyn Check> = Arc::new(Preflight::new(process, store));
            let report = check.report().await;
            for line in report.lines() {
                println!("{line}");
            }
            Ok(report.passed())
        }
        ComputerCommand::Enroll {
            code,
            origin,
            release_server,
        } => {
            let origin: ServerUrl = origin.parse()?;
            let release_server: ServerUrl = release_server.parse()?;
            let enrollment: Arc<dyn Enrollment> = Arc::new(HttpEnrollment::new(store)?);
            enrollment.enroll(&code, origin, release_server).await?;
            println!("Computer token saved.");
            Ok(true)
        }
        ComputerCommand::Service => {
            let unit = Arc::new(UnitFile { path: paths.unit });
            let service: Arc<dyn Service> = Arc::new(UserService::new(process, unit));
            service.install().await?;
            Ok(true)
        }
        ComputerCommand::Run => run_service(store, process, paths.cache, paths.data).await,
    }
}

async fn run_service(
    store: Arc<dyn SettingsStore>,
    process: Arc<dyn Process>,
    cache: PathBuf,
    data: PathBuf,
) -> Result<bool> {
    let timer: Arc<dyn Timer> = Arc::new(SystemClock);
    let diagnostics: Arc<dyn Diagnostics> = Arc::new(TracingDiagnostics);
    let engine: Arc<dyn Engine> = Arc::new(Podman::new(process.clone()));
    let releases: Arc<dyn Releases> =
        Arc::new(HttpReleases::new(RELEASE_PUBLIC_KEY, cache.clone())?);
    let journal = Arc::new(LoadJournal {
        path: cache.join("base-loads"),
    });
    let bases = Arc::new(BaseImageLoader::new(
        engine.clone(),
        releases.clone(),
        journal,
    ));
    let operations: Arc<dyn Operations> = Arc::new(Dispatcher::new(
        engine,
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
        files: Arc::new(InstalledVersions {
            directory: data,
            executable: std::env::current_exe().ok(),
        }),
        settings: store,
        releases,
        process,
        activity,
        timer,
        diagnostics,
    });
    let startup = updater.start()?;
    if startup == Startup::RolledBack {
        return Ok(false);
    }
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
        let result = runtime.run(shutdown).await;
        stop.send_replace(true);
        result
    };
    let monitor = async {
        if startup == Startup::Ready {
            updater.monitor(stop.clone(), monitor_shutdown).await;
        }
    };
    let (result, ()) = tokio::join!(run, monitor);
    signals.abort();
    let _ = signals.await;
    operations.drain().await;
    result?;
    Ok(true)
}
