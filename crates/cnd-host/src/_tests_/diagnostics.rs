//! Isolated in-memory tracing capture without timestamps or global subscribers.

#![expect(clippy::unwrap_used, reason = "Failed capture must stop the test.")]

use std::io::{self, Write};
use std::sync::{Arc, Mutex};

use tracing::{Dispatch, Level};

#[derive(Clone, Default)]
pub(crate) struct Logs(Arc<Mutex<Vec<u8>>>);

impl Logs {
    pub(crate) fn subscriber(&self) -> Dispatch {
        let logs = self.clone();
        Dispatch::new(
            tracing_subscriber::fmt()
                .without_time()
                .with_ansi(false)
                .with_target(false)
                .with_max_level(Level::INFO)
                .with_writer(move || logs.clone())
                .finish(),
        )
    }

    pub(crate) fn text(&self) -> String {
        String::from_utf8(self.0.lock().unwrap().clone()).unwrap()
    }
}

impl Write for Logs {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(bytes);
        Ok(bytes.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}
