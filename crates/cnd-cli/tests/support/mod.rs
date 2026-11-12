//! Local HTTP fixture and deterministic release archives.

#![expect(
    clippy::unwrap_used,
    reason = "A failed test setup must stop the test."
)]

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};

use async_trait::async_trait;
use cli_release_interface::ReleaseAssetInfo;
use cli_updater::{HttpReleaseClient, ReleaseClient};
use flate2::{Compression, GzBuilder};
use tar::{Builder, Header};

pub(super) fn archive(files: &[(&str, &[u8])]) -> Vec<u8> {
    let mut archive = Builder::new(
        GzBuilder::new()
            .mtime(0)
            .write(Vec::new(), Compression::default()),
    );
    for (name, bytes) in files {
        let mut header = Header::new_gnu();
        header.set_size(bytes.len() as u64);
        header.set_mode(0o755);
        header.set_cksum();
        archive.append_data(&mut header, name, *bytes).unwrap();
    }
    archive.into_inner().unwrap().finish().unwrap()
}

pub(super) struct Server {
    pub(super) client: LocalClient,
    pub(super) requests: Arc<Mutex<Vec<String>>>,
    thread: Option<JoinHandle<()>>,
}

impl Server {
    pub(super) fn start(responses: HashMap<String, Vec<u8>>, count: usize) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let requests = Arc::new(Mutex::new(Vec::new()));
        let captured = requests.clone();
        let thread = thread::spawn(move || {
            for stream in listener.incoming().take(count) {
                let mut stream = stream.unwrap();
                let mut request = Vec::new();
                while !request.ends_with(b"\r\n\r\n") {
                    let mut byte = [0];
                    assert_eq!(stream.read(&mut byte).unwrap(), 1);
                    request.push(byte[0]);
                }
                let line = String::from_utf8(request).unwrap();
                let path = line.split_whitespace().nth(1).unwrap().to_owned();
                captured.lock().unwrap().push(path.clone());
                let bytes = &responses[&path];
                write!(stream, "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n", bytes.len()).unwrap();
                stream.write_all(bytes).unwrap();
            }
        });
        Self {
            client: LocalClient {
                inner: HttpReleaseClient::new(&base).unwrap(),
                base,
            },
            requests,
            thread: Some(thread),
        }
    }

    pub(super) fn finish(mut self) {
        self.thread.take().unwrap().join().unwrap();
    }
}

#[derive(Clone)]
pub(super) struct LocalClient {
    inner: HttpReleaseClient,
    base: String,
}

#[async_trait]
impl ReleaseClient for LocalClient {
    async fn latest(&self, binary: &str, target: &str) -> cli_updater::Result<ReleaseAssetInfo> {
        self.inner.latest(binary, target).await
    }
    async fn download(&self, release: &ReleaseAssetInfo) -> cli_updater::Result<Vec<u8>> {
        let mut local = release.clone();
        local.download_url = local
            .download_url
            .replace("https://releases.test", &self.base);
        self.inner.download(&local).await
    }
}
