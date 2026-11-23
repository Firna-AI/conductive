//! Bounded streaming bodies for whole files and byte ranges.

use std::{future, io};

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use bytes::Bytes;
use futures_util::{StreamExt, TryStreamExt, stream};
use http_body_util::{BodyExt, StreamBody, combinators::UnsyncBoxBody};
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
pub(super) enum ChangedDocument {
    /// Read the encoding and consider inserting the system font link.
    Html {
        /// Whether the system font stylesheet has a rule.
        stylesheet: bool,
    },
    /// Stream only the address changes for CSS and SVG.
    Text,
}

impl ChangedDocument {
    /// Select the transformation and load the inputs it needs for this request.
    pub(super) async fn prepare(media: &str, files: &dyn Files) -> Option<Self> {
        match media {
            HTML => Some(Self::Html {
                stylesheet: !files.font_stylesheet().await.text.is_empty(),
            }),
            CSS | SVG => Some(Self::Text),
            _ => None,
        }
    }

    /// Combine the file validator with the version and inputs of the transformation.
    pub(super) fn etag(&self, file_tag: &str) -> String {
        const VERSION: &[u8] = b"conductive-preview-rewrite-1";
        let mut digest = Sha256::new();
        digest.update(VERSION);
        match self {
            Self::Html { stylesheet } => digest.update([u8::from(*stylesheet)]),
            Self::Text => {}
        }
        format!(
            "\"{}-{}\"",
            file_tag.trim_matches('"'),
            URL_SAFE_NO_PAD.encode(digest.finalize())
        )
    }

    /// Stream changed text and keep UTF-16 HTML bytes intact.
    pub(super) fn stream(self, reader: Box<dyn FileReader>, length: u64) -> Body {
        let chunks = stream::once(async move {
            let mut reader = reader.take(length);
            let mut prefix = Vec::new();
            if let Self::Html { stylesheet } = self {
                let limit = if stylesheet {
                    html::SCAN_LIMIT as u64
                } else {
                    2
                };
                (&mut reader).take(limit).read_to_end(&mut prefix).await?;
                if stylesheet && !html::is_utf16(&prefix) {
                    html::insert_link(&mut prefix);
                }
            }
            let rewrite = !html::is_utf16(&prefix);
            let start = (!prefix.is_empty()).then(|| Ok(Bytes::from(prefix)));
            let chunks = stream::iter(start).chain(ReaderStream::new(reader));
            let mut addresses = FileAddresses::default();
            Ok::<_, io::Error>(
                chunks
                    .map_ok(Some)
                    .chain(stream::iter([Ok(None)]))
                    .try_filter_map(move |chunk| {
                        let output = if rewrite {
                            addresses.transform(chunk)
                        } else {
                            chunk
                        };
                        future::ready(Ok(output))
                    }),
            )
        })
        .try_flatten();
        StreamBody::new(chunks.map_ok(Frame::data)).boxed_unsync()
    }
}
