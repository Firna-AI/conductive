//! Byte filtering with a bounded suffix for matches split across reads.

pub(crate) struct Filter {
    values: Vec<Vec<u8>>,
    pending: Vec<u8>,
    hidden: Vec<bool>,
    redacting: bool,
}

impl Filter {
    pub(crate) fn new(values: impl Iterator<Item = Vec<u8>>) -> Self {
        let values: Vec<_> = values.filter(|value| !value.is_empty()).collect();
        Self {
            values,
            pending: Vec::new(),
            hidden: Vec::new(),
            redacting: false,
        }
    }

    pub(crate) fn push(&mut self, bytes: &[u8], finished: bool) -> Vec<u8> {
        self.pending.extend_from_slice(bytes);
        self.hidden.resize(self.pending.len(), false);
        for value in &self.values {
            for (index, window) in self.pending.windows(value.len()).enumerate() {
                if window == value {
                    self.hidden[index..index + value.len()].fill(true);
                }
            }
        }
        let ready = if finished {
            self.pending.len()
        } else {
            let retained = self
                .values
                .iter()
                .map(|value| {
                    let maximum = (value.len() - 1).min(self.pending.len());
                    (1..=maximum)
                        .rev()
                        .find(|length| self.pending.ends_with(&value[..*length]))
                        .unwrap_or(0)
                })
                .max()
                .unwrap_or(0);
            self.pending.len() - retained
        };
        let mut output = Vec::new();
        for index in 0..ready {
            if self.hidden[index] {
                if !self.redacting {
                    output.extend_from_slice(b"[redacted]");
                }
                self.redacting = true;
            } else {
                output.push(self.pending[index]);
                self.redacting = false;
            }
        }
        self.pending.drain(..ready);
        self.hidden.drain(..ready);
        output
    }
}

#[cfg(test)]
#[path = "../_tests_/secret_filter_tests.rs"]
mod secret_filter_tests;
