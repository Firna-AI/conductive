//! HTTPS client limits and bounded response bodies.

use std::time::Duration;

use reqwest::redirect::Policy;
use reqwest::{Client, Response};

use crate::error::{ErrorResultExt, Result};

pub(crate) fn client(total: Duration) -> Result<Client> {
    Client::builder()
        .redirect(Policy::none())
        .connect_timeout(Duration::from_secs(10))
        .timeout(total)
        .no_proxy()
        .build()
        .internal()
}

pub(crate) enum BodyError {
    Unavailable,
    TooLarge,
}

pub(crate) async fn bounded_body(
    mut response: Response,
    limit: usize,
) -> std::result::Result<Vec<u8>, BodyError> {
    let mut bytes = Vec::new();
    loop {
        match response.chunk().await {
            Ok(Some(chunk)) if chunk.len() <= limit - bytes.len() => {
                bytes.extend_from_slice(&chunk)
            }
            Ok(Some(_)) => return Err(BodyError::TooLarge),
            Ok(None) => return Ok(bytes),
            Err(_) => return Err(BodyError::Unavailable),
        }
    }
}
