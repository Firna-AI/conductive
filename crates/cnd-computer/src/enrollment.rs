//! One-time code exchange with private persistence after validation.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner_interface::computer::enrollment::ComputerEnrollment;
use cnd_runner_interface::computer::limits::COMPUTER_PATH;
use reqwest::{Client, StatusCode};

use crate::error::{Error, Result};
use crate::http;
use crate::settings::{ServerUrl, Settings, SettingsStore, valid_token};

/// Exchange a code and save the resulting credential.
#[async_trait]
pub trait Enrollment: Send + Sync {
    /// Enroll at the selected origin and save the release server for later use.
    async fn enroll(&self, code: &str, origin: ServerUrl, release_server: ServerUrl) -> Result<()>;
}

/// Native enrollment client with no browser headers or redirects.
pub struct HttpEnrollment {
    client: Client,
    store: Arc<dyn SettingsStore>,
}

impl HttpEnrollment {
    /// Construct the HTTP client with a bounded exchange time.
    pub fn new(store: Arc<dyn SettingsStore>) -> Result<Self> {
        Ok(Self {
            client: http::client(Duration::from_secs(60))?,
            store,
        })
    }
}

#[async_trait]
impl Enrollment for HttpEnrollment {
    async fn enroll(&self, code: &str, origin: ServerUrl, release_server: ServerUrl) -> Result<()> {
        if !valid_code(code) {
            return Err(Error::InvalidCode);
        }
        let Ok(response) = self
            .client
            .post(origin.endpoint(COMPUTER_PATH))
            .bearer_auth(code)
            .send()
            .await
        else {
            return Err(Error::EnrollmentUnavailable);
        };
        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(Error::CodeRefused);
        }
        if !response.status().is_success() {
            return Err(Error::EnrollmentUnavailable);
        }
        let Ok(bytes) = http::bounded_body(response, 4096).await else {
            return Err(Error::EnrollmentUnavailable);
        };
        let Ok(reply) = serde_json::from_slice::<ComputerEnrollment>(&bytes) else {
            return Err(Error::EnrollmentUnavailable);
        };
        if !valid_token(&reply.computer_token) {
            return Err(Error::EnrollmentUnavailable);
        }
        self.store.save(&Settings {
            origin,
            token: reply.computer_token,
            release_server,
        })
    }
}

fn valid_code(code: &str) -> bool {
    const ALPHABET: &[u8] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    code.len() == 19
        && code.bytes().enumerate().all(|(index, byte)| {
            if index % 5 == 4 {
                byte == b'-'
            } else {
                ALPHABET.contains(&byte)
            }
        })
}
