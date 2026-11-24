//! Bounded streaming bodies for whole files and byte ranges.

use std::path::PathBuf;
use std::{future, io};

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use bytes::Bytes;
use cnd_runner_interface::file_server::FILES_ORIGIN_HEADER;
use futures_util::{StreamExt, TryStreamExt, stream};
use http_body_util::{BodyExt, StreamBody, combinators::UnsyncBoxBody};
use hyper::HeaderMap;
use hyper::body::Frame;
use sha2::{Digest, Sha256};
use tokio::io::AsyncReadExt;
use tokio_util::io::ReaderStream;

use super::files::{FileReader, Files};
use super::html;
use super::media::{CSS, HTML, SVG};
use super::rewrite::FileAddresses;

/// File bytes or an empty response without a full-file allocation.
pub type Body = UnsyncBoxBody<Bytes, io::Error>;

/// Make a body with no data frames.
pub(super) fn empty() -> Body {
    StreamBody::new(stream::empty::<io::Result<Frame<Bytes>>>()).boxed_unsync()
}

/// Send a generated body whose full bytes are already available.
pub(super) fn bytes(content: Bytes) -> Body {
    StreamBody::new(stream::iter([Ok(Frame::data(content))])).boxed_unsync()
}

/// Stream up to the opened file size or the selected range length.
pub(super) fn file(reader: Box<dyn FileReader>, length: u64) -> Body {
    StreamBody::new(ReaderStream::new(reader.take(length)).map_ok(Frame::data)).boxed_unsync()
}

/// A document transformation and the request inputs that affect its bytes.
pub(super) struct ChangedDocument {
    kind: ChangedKind,
    origin: Option<String>,
    repository: PathBuf,
}

enum ChangedKind {
    Html { stylesheet: bool },
    Text,
}

impl ChangedDocument {
    /// Select the transformation and load the inputs it needs for this request.
    pub(super) async fn prepare(
        media: &str,
        files: &dyn Files,
        headers: &HeaderMap,
        repository: PathBuf,
    ) -> Option<Self> {
        let kind = match media {
            HTML => ChangedKind::Html {
                stylesheet: !files.font_stylesheet().await.text.is_empty(),
            },
            CSS | SVG => ChangedKind::Text,
            _ => return None,
        };
        Some(Self {
            kind,
            origin: preview_origin(headers).map(str::to_owned),
            repository,
        })
    }

    /// Combine the file validator with the version and inputs of the transformation.
    pub(super) fn etag(&self, file_tag: &str) -> String {
        const VERSION: &[u8] = b"conductive-preview-rewrite-4";
        let mut digest = Sha256::new();
        digest.update(VERSION);
        match self.kind {
            ChangedKind::Html { stylesheet } => digest.update([1, u8::from(stylesheet)]),
            ChangedKind::Text => digest.update([0]),
        }
        digest.update(self.origin.as_deref().unwrap_or_default().as_bytes());
        digest.update([0]);
        digest.update(self.repository.as_os_str().as_encoded_bytes());
        format!(
            "\"{}-{}\"",
            file_tag.trim_matches('"'),
            URL_SAFE_NO_PAD.encode(digest.finalize())
        )
    }

    /// Stream changed text and keep UTF-16 HTML bytes intact.
    pub(super) fn stream(self, reader: Box<dyn FileReader>, length: u64) -> Body {
        if self.origin.is_none() && !matches!(self.kind, ChangedKind::Html { stylesheet: true }) {
            return file(reader, length);
        }
        let chunks = stream::once(async move {
            let mut reader = reader.take(length);
            let mut prefix = Vec::new();
            if let ChangedKind::Html { stylesheet } = self.kind {
                let limit = if stylesheet {
                    html::SCAN_LIMIT as u64
                } else {
                    2
                };
                (&mut reader).take(limit).read_to_end(&mut prefix).await?;
                if stylesheet && !html::is_utf16(&prefix) {
                    html::insert_link(&mut prefix, self.origin.as_deref().unwrap_or_default());
                }
            }
            let mut addresses = self
                .origin
                .filter(|_| !html::is_utf16(&prefix))
                .map(|origin| FileAddresses::new(origin, self.repository));
            let start = (!prefix.is_empty()).then(|| Ok(Bytes::from(prefix)));
            let chunks = stream::iter(start).chain(ReaderStream::new(reader));
            Ok::<_, io::Error>(
                chunks
                    .map_ok(Some)
                    .chain(stream::iter([Ok(None)]))
                    .try_filter_map(move |chunk| {
                        let output = match &mut addresses {
                            Some(addresses) => addresses.transform(chunk),
                            None => chunk,
                        };
                        future::ready(Ok(output))
                    }),
            )
        })
        .try_flatten();
        StreamBody::new(chunks.map_ok(Frame::data)).boxed_unsync()
    }
}

/// Accept a single HTTPS origin whose host can be inserted as text.
fn preview_origin(headers: &HeaderMap) -> Option<&str> {
    let mut values = headers.get_all(FILES_ORIGIN_HEADER).iter();
    let origin = values.next()?.to_str().ok()?;
    let host = origin.strip_prefix("https://")?;
    if values.next().is_some() || host.is_empty() {
        return None;
    }
    host.bytes()
        .all(|byte| matches!(byte, b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.'))
        .then_some(origin)
}
