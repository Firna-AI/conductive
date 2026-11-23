//! Record the `part` field of each warning that one test thread logs.

use std::fmt::Debug;
use std::sync::{Arc, Mutex};

use tracing::field::{Field, Visit};
use tracing::subscriber::DefaultGuard;
use tracing::{Event, Level, Subscriber};
use tracing_subscriber::layer::{Context, Layer};
use tracing_subscriber::{Registry, prelude::*};

/// The warned parts of the current thread while this value lives.
pub(super) struct WarnedParts {
    parts: Arc<Mutex<Vec<String>>>,
    _guard: DefaultGuard,
}

impl WarnedParts {
    /// Start recording. A per-thread subscriber leaves the process-wide one alone.
    pub(super) fn capture() -> Self {
        let parts = Arc::new(Mutex::new(Vec::new()));
        let guard =
            tracing::subscriber::set_default(Registry::default().with(PartLayer(parts.clone())));
        Self {
            parts,
            _guard: guard,
        }
    }

    /// The `part` field of each warning so far, in log order.
    pub(super) fn parts(&self) -> Vec<String> {
        self.parts
            .lock()
            .map(|parts| parts.clone())
            .unwrap_or_default()
    }
}

struct PartLayer(Arc<Mutex<Vec<String>>>);

impl<S: Subscriber> Layer<S> for PartLayer {
    fn on_event(&self, event: &Event<'_>, _: Context<'_, S>) {
        if *event.metadata().level() != Level::WARN {
            return;
        }
        let mut field = PartField(None);
        event.record(&mut field);
        if let (Some(part), Ok(mut parts)) = (field.0, self.0.lock()) {
            parts.push(part);
        }
    }
}

struct PartField(Option<String>);

impl Visit for PartField {
    fn record_debug(&mut self, field: &Field, value: &dyn Debug) {
        if field.name() == "part" {
            self.0 = Some(format!("{value:?}"));
        }
    }
}
