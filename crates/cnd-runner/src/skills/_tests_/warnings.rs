//! In-memory tracing sink used to count actual runner warnings.

#![allow(clippy::unwrap_used)]

use std::sync::{Arc, Mutex};

use tracing::span::{Attributes, Id, Record};
use tracing::{Event, Metadata, Subscriber};

#[derive(Clone, Default)]
pub(super) struct Warnings(pub(super) Arc<Mutex<usize>>);

impl Subscriber for Warnings {
    fn enabled(&self, _: &Metadata<'_>) -> bool {
        true
    }
    fn new_span(&self, _: &Attributes<'_>) -> Id {
        Id::from_u64(1)
    }
    fn record(&self, _: &Id, _: &Record<'_>) {}
    fn record_follows_from(&self, _: &Id, _: &Id) {}
    fn enter(&self, _: &Id) {}
    fn exit(&self, _: &Id) {}
    fn event(&self, event: &Event<'_>) {
        if *event.metadata().level() == tracing::Level::WARN {
            *self.0.lock().unwrap() += 1;
        }
    }
}
