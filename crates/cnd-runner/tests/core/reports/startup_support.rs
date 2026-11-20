//! Tracing capture and a held ready emission for startup measurements.

use std::collections::BTreeMap;
use std::fmt::Debug;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner::emitter::EventEmitter;
use cnd_runner::error::Result;
use cnd_runner_interface::runner::{RunnerEvent, RunnerReady};
use tokio::sync::{Notify, mpsc};
use tracing::field::{Field, Visit};
use tracing::span::{Attributes, Id, Record};
use tracing::{Event, Level, Metadata, Subscriber};

use super::support::Gate;

#[derive(Clone, Default)]
pub(super) struct Logs {
    lines: Arc<Mutex<Vec<String>>>,
    changed: Arc<Notify>,
}

impl Logs {
    pub(super) fn lines(&self) -> Vec<String> {
        self.lines.lock().unwrap().clone()
    }

    pub(super) async fn wait_for(&self, count: usize) {
        let result = tokio::time::timeout(Duration::from_secs(10), async {
            loop {
                let changed = self.changed.notified();
                if self.lines.lock().unwrap().len() >= count {
                    return;
                }
                changed.await;
            }
        })
        .await;
        assert!(result.is_ok(), "missing startup logs: {:?}", self.lines());
    }
}

#[derive(Default)]
struct Fields(BTreeMap<String, String>);

impl Visit for Fields {
    fn record_debug(&mut self, field: &Field, value: &dyn Debug) {
        self.0.insert(field.name().into(), format!("{value:?}"));
    }
}

impl Subscriber for Logs {
    fn enabled(&self, metadata: &Metadata<'_>) -> bool {
        *metadata.level() == Level::INFO
    }
    fn new_span(&self, _: &Attributes<'_>) -> Id {
        Id::from_u64(1)
    }
    fn record(&self, _: &Id, _: &Record<'_>) {}
    fn record_follows_from(&self, _: &Id, _: &Id) {}
    fn enter(&self, _: &Id) {}
    fn exit(&self, _: &Id) {}
    fn event(&self, event: &Event<'_>) {
        let mut fields = Fields::default();
        event.record(&mut fields);
        let message = fields.0.remove("message").unwrap();
        let mut line = format!("{} {message}", event.metadata().level());
        for (name, value) in fields.0 {
            line.push_str(&format!(" {name}={value}"));
        }
        self.lines.lock().unwrap().push(line);
        self.changed.notify_one();
    }
}

pub(super) struct HeldReady {
    pub emitter: Arc<dyn EventEmitter>,
    pub hold: Mutex<Option<Arc<Gate>>>,
    pub emitted: mpsc::UnboundedSender<()>,
}

#[async_trait]
impl EventEmitter for HeldReady {
    async fn emit(&self, events: Vec<RunnerEvent>, receipt: Option<String>) -> Result<()> {
        let ready = events == vec![RunnerEvent::RunnerReady(RunnerReady::RunnerReady {})];
        let hold = if ready {
            self.hold.lock().unwrap().take()
        } else {
            None
        };
        if let Some(hold) = hold {
            hold.arrived.notify_one();
            hold.release.notified().await;
        }
        self.emitter.emit(events, receipt).await?;
        if ready {
            self.emitted.send(()).unwrap();
        }
        Ok(())
    }
}
