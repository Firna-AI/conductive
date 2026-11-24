//! Fixed capability names and a shared lock for each target name.

use std::collections::HashMap;
use std::sync::{Arc, Weak};

use tokio::sync::{Mutex, OwnedMutexGuard};

#[derive(Default)]
pub(super) struct Names {
    locks: Mutex<HashMap<String, Weak<Mutex<()>>>>,
}

impl Names {
    pub(super) async fn lock(&self, name: &str) -> OwnedMutexGuard<()> {
        let lock = {
            let mut locks = self.locks.lock().await;
            locks.retain(|_, lock| lock.strong_count() != 0);
            match locks.get(name).and_then(Weak::upgrade) {
                Some(lock) => lock,
                None => {
                    let lock = Arc::new(Mutex::new(()));
                    locks.insert(name.to_owned(), Arc::downgrade(&lock));
                    lock
                }
            }
        };
        lock.lock_owned().await
    }
}

pub(super) fn valid_name(name: &str) -> bool {
    let mut bytes = name.bytes();
    name.len() <= 63
        && bytes.next().is_some_and(is_alphanumeric)
        && bytes.all(|byte| is_alphanumeric(byte) || byte == b'-')
}

fn is_alphanumeric(byte: u8) -> bool {
    byte.is_ascii_lowercase() || byte.is_ascii_digit()
}

pub(super) fn org_image(name: &str) -> String {
    format!("localhost/conductive/org-{name}")
}
