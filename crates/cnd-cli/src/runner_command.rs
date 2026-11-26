//! Compose the full unprivileged runner and graceful signal shutdown.

use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::Arc;

use cnd_cli::runner_update::idle::IdleUpdates;
use cnd_cli::runner_update::ports::RunnerSwap;
use cnd_cli::runner_update::process::SystemSwap;
use cnd_cli::runner_update::releases::RunnerReleases;
use cnd_cli::runner_update::swap::UpdateRunner;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::presence::SDK_HELPER_PART;
use cnd_cli::update::staging::NODE_PART;
use cnd_runner::config::Configuration;
use cnd_runner::file_server::files::RepositoryFiles;
use cnd_runner::file_server::font_files::{PreviewFiles, SYSTEM_FONT_FOLDERS};
use cnd_runner::file_server::listener::LoopbackListener;
use cnd_runner::file_server::policy::FilePolicy;
use cnd_runner::file_server::server::{FileServer, HttpFileServer};
use cnd_runner::runtime::RunExit;
use cnd_runner::startup_log::{ProcessStartupLog, StartupLog};
use cnd_runner::update::ReleaseReadiness;
use cnd_runner_interface::file_server::FILE_SERVER_PORT;
use tokio::signal::unix::{SignalKind, signal};
use tokio::sync::watch;
use tokio::time::Instant;

use crate::error::{ErrorResultExt, Result};
use crate::release::VERSION;
use crate::runner_round::{RoundResources, run_once};
use crate::runner_services;
use crate::runner_start::RunnerStart;

pub(crate) async fn execute() -> Result<()> {
    let startup_log: Arc<dyn StartupLog> = Arc::new(ProcessStartupLog::new(Instant::now()));
    let environment: BTreeMap<String, String> = std::env::vars().collect();
    let cwd = std::env::current_dir().internal()?;
    let home = environment
        .get("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("/home/user"));
    let mut configuration = Configuration::parse(&environment, &cwd, &home).internal()?;
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
    let services = runner_services::manager(&configuration, executable.clone(), development);
    let helper = RoundResources {
        node,
        program,
        services: services.clone(),
    };
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
    let (repository_root, served_root) = watch::channel(configuration.cwd.clone());
    let file_server = match LoopbackListener::bind(FILE_SERVER_PORT).await {
        Ok(listener) => {
            let server: Arc<dyn FileServer> = Arc::new(HttpFileServer {
                listener: Arc::new(listener),
                requests: Arc::new(FilePolicy {
                    files: Arc::new(PreviewFiles::new(
                        Arc::new(RepositoryFiles { root: served_root }),
                        SYSTEM_FONT_FOLDERS.map(PathBuf::from),
                    )),
                }),
            });
            let stopped = shutdown.clone();
            Some(tokio::spawn(async move { server.run(stopped).await }))
        }
        Err(_) => {
            tracing::warn!("The repository file server could not bind its loopback port.");
            None
        }
    };
    if services.reconcile().await.is_err() {
        tracing::warn!("The local service state could not be restored.");
    }
    let server = runner_services::server(services);
    let stopped = shutdown.clone();
    let service_socket = tokio::spawn(async move {
        if server.serve(stopped).await.is_err() {
            tracing::warn!("The local service controls could not start.");
        }
    });
    let start = RunnerStart::new(file_server.is_some());
    let result = async {
        while !*shutdown.borrow() && shutdown.has_changed().is_ok() {
            let exit = run_once(
                &start,
                configuration.clone(),
                &helper,
                executable.clone(),
                updates.clone(),
                startup_log.clone(),
                shutdown.clone(),
            )
            .await?;
            if exit == RunExit::Shutdown || *shutdown.borrow() || shutdown.has_changed().is_err() {
                return Ok(());
            }
            match exit {
                RunExit::Relocate(target) => {
                    target.apply(&mut configuration);
                    repository_root.send_replace(configuration.cwd.clone());
                }
                _ => updates.swap(shutdown.clone()).await.internal()?,
            }
        }
        Ok(())
    }
    .await;
    signals.abort();
    let _ = signals.await;
    if let Some(task) = file_server {
        task.abort();
        let _ = task.await;
    }
    service_socket.abort();
    let _ = service_socket.await;
    result
}
