//! Canonical credential values and bounded historical lookup for retained suffixes.

use std::sync::Arc;

use super::text::filter;

/// Values stay canonical after the independently controlled active list changes.
#[derive(Clone, Default)]
pub(super) struct Registry {
    values: Vec<Arc<str>>,
    /// Active credentials used for ordinary text and new answer matches.
    pub(super) active: Vec<Arc<str>>,
}

impl Registry {
    /// Register one payload and share it with the active list.
    pub(super) fn add(&mut self, value: String) {
        if value.is_empty() || self.active.iter().any(|secret| secret.as_ref() == value) {
            return;
        }
        let value = if let Some(value) = self.values.iter().find(|secret| secret.as_ref() == value)
        {
            value.clone()
        } else {
            let value = Arc::from(value);
            self.values.push(Arc::clone(&value));
            value
        };
        self.active.push(value);
    }

    /// Mark the last credential available to a newly retained suffix.
    pub(super) fn position(&self) -> usize {
        self.values.len()
    }

    /// Recover only historical values that supported this held or shown suffix.
    pub(super) fn supporting(&self, text: &str, position: usize) -> Vec<Arc<str>> {
        self.values[..position]
            .iter()
            .filter(|secret| {
                !filter(text, false, std::slice::from_ref(*secret), &[])
                    .1
                    .is_empty()
            })
            .cloned()
            .collect()
    }
}
