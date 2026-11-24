//! Compose the unprivileged host program and its service shutdown signals.

use std::path::PathBuf;
use std::sync::Arc;

use cnd_host::clock::SystemClock;
use cnd_host::commands::native::NativeCommands;
use cnd_host::config::SavedConfiguration;
use cnd_host::diagnostics::{Diagnostics, TracingDiagnostics};
use cnd_host::dispatch::Dispatcher;
use cnd_host::files::NativeFiles;
use cnd_host::ports::Clock;
use cnd_host::runtime::{Host, HostRuntime};
use cnd_host::session::host::HostSession;
use cnd_host::socket::connect::WebSocketConnector;
use cnd_host::streams::group::StreamGroups;
use cnd_host::streams::local::LoopbackNetwork;
use tokio::signal::unix::{SignalKind, signal};
use tokio::sync::watch;

use crate::error::{ErrorResultExt, Result};
use crate::release;

pub(crate) async fn execute() -> Result<()> {
    let clock: Arc<dyn Clock> = Arc::new(SystemClock);
    let diagnostics: Arc<dyn Diagnostics> = Arc::new(TracingDiagnostics);
    let operations = Arc::new(Dispatcher {
        commands: Arc::new(NativeCommands::new(
            PathBuf::from("/run/conductive-host/commands"),
            PathBuf::from("/home/user"),
        )),
        files: Arc::new(NativeFiles),
    });
    let host: Arc<dyn Host> = Arc::new(HostRuntime {
        configuration: Arc::new(SavedConfiguration {
            path: PathBuf::from("/run/ascii-secrets/env.sh"),
        }),
        connector: Arc::new(WebSocketConnector),
        session: Arc::new(HostSession {
            operations,
            streams: Arc::new(StreamGroups {
                network: Arc::new(LoopbackNetwork),
                clock: clock.clone(),
            }),
            clock: clock.clone(),
            diagnostics: diagnostics.clone(),
        }),
        clock,
        diagnostics,
        program_version: release::VERSION.into(),
    });
    let (stop, shutdown) = watch::channel(false);
    let mut terminate = signal(SignalKind::terminate()).internal()?;
    let mut interrupt = signal(SignalKind::interrupt()).internal()?;
    let signals = tokio::spawn(async move {
        tokio::select! { _ = terminate.recv() => {}, _ = interrupt.recv() => {} }
        stop.send_replace(true);
    });
    let result = host.run(shutdown).await.internal();
    signals.abort();
    let _ = signals.await;
    result
}
