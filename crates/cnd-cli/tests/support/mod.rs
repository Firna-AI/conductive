//! Local HTTP fixture and deterministic release archives.

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};

use async_trait::async_trait;
use cli_release_interface::ReleaseAssetInfo;
use cli_updater::{HttpReleaseClient, ReleaseClient};
use cnd_cli::update::http::release_client;
use cnd_cli::update::ports::ReleaseSource;
use cnd_release::signature::ReleaseSigner;
use flate2::{Compression, GzBuilder};
use tar::{Builder, Header};

pub(crate) mod download;
pub(crate) mod locking;

pub(super) type TestResult<T = ()> = Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub(super) fn test_signer() -> cnd_release::error::Result<ReleaseSigner> {
    ReleaseSigner::from_pem(include_str!(
        "../../../cnd-release/tests/fixtures/rfc8032-test-key.pem"
    ))
}

pub(super) fn archive(files: &[(&str, &[u8])]) -> std::io::Result<Vec<u8>> {
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
        archive.append_data(&mut header, name, *bytes)?;
    }
    archive.into_inner()?.finish()
}

pub(super) struct Server {
    pub(super) client: LocalClient,
    pub(super) requests: Arc<Mutex<Vec<String>>>,
    thread: JoinHandle<TestResult>,
    stopped: Arc<AtomicBool>,
    address: SocketAddr,
}

impl Server {
    pub(super) fn start(responses: HashMap<String, Vec<u8>>) -> TestResult<Self> {
        Self::start_with_missing_status(responses, "404 Not Found")
    }

    pub(super) fn start_with_missing_status(
        responses: HashMap<String, Vec<u8>>,
        missing_status: &'static str,
    ) -> TestResult<Self> {
        let public_key = test_signer()?.public_key();
        let listener = TcpListener::bind("127.0.0.1:0")?;
        let address = listener.local_addr()?;
        let base = format!("http://{address}");
        let requests = Arc::new(Mutex::new(Vec::new()));
        let captured = requests.clone();
        let stopped = Arc::new(AtomicBool::new(false));
        let stop = stopped.clone();
        let thread = thread::spawn(move || {
            for stream in listener.incoming() {
                let mut stream = stream?;
                if stop.load(Ordering::Acquire) {
                    break;
                }
                let mut request = Vec::new();
                while !request.ends_with(b"\r\n\r\n") {
                    let mut byte = [0];
                    assert_eq!(stream.read(&mut byte)?, 1);
                    request.push(byte[0]);
                }
                let line = String::from_utf8(request)?;
                let path = line
                    .split_whitespace()
                    .nth(1)
                    .ok_or("missing request path")?;
                captured
                    .lock()
                    .map_err(|_| "request lock poisoned")?
                    .push(path.to_owned());
                let (status, bytes) = match responses.get(path) {
                    Some(bytes) => ("200 OK", bytes.as_slice()),
                    None => (missing_status, [].as_slice()),
                };
                write!(
                    stream,
                    "HTTP/1.1 {status}\r\nContent-Length: {}\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n",
                    bytes.len()
                )?;
                stream.write_all(bytes)?;
            }
            Ok(())
        });
        Ok(Self {
            client: LocalClient {
                inner: release_client(&base)?,
                base,
                public_key,
            },
            requests,
            thread,
            stopped,
            address,
        })
    }

    pub(super) fn finish(self) -> TestResult {
        self.stopped.store(true, Ordering::Release);
        let _wake = TcpStream::connect(self.address);
        self.thread.join().map_err(|_| "HTTP server panicked")?
    }
}

#[derive(Clone)]
pub(super) struct LocalClient {
    inner: HttpReleaseClient,
    base: String,
    public_key: [u8; 32],
}

#[async_trait]
impl ReleaseSource for LocalClient {
    async fn download(&self, release: &ReleaseAssetInfo) -> cli_updater::Result<Vec<u8>> {
        let mut local = release.clone();
        local.download_url = local
            .download_url
            .replace("https://releases.test", &self.base);
        ReleaseClient::download(&self.inner, &local).await
    }

    fn verification_key(&self) -> &[u8; 32] {
        &self.public_key
    }
}
