//! A bound server per test, with raw HTTP paths that no URL parser normalizes.

use std::collections::BTreeMap;
use std::fs::{self, File};
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::SystemTime;

use cnd_runner::file_server::files::RepositoryFiles;
use cnd_runner::file_server::listener::LoopbackListener;
use cnd_runner::file_server::policy::FilePolicy;
use cnd_runner::file_server::server::{FileServer, HttpFileServer};
use tempfile::TempDir;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::watch;
use tokio::task::JoinHandle;

pub(super) struct Reply {
    pub(super) status: u16,
    pub(super) headers: BTreeMap<String, String>,
    pub(super) body: Vec<u8>,
}

pub(super) struct Fixture {
    pub(super) directory: TempDir,
    pub(super) address: SocketAddr,
    root: watch::Sender<PathBuf>,
    stop: watch::Sender<bool>,
    task: JoinHandle<()>,
}

impl Fixture {
    pub(super) async fn new() -> Self {
        let directory = TempDir::new().unwrap();
        let listener = LoopbackListener::bind(0).await.unwrap();
        let address = listener.address().unwrap();
        assert_eq!(address.ip().to_string(), "127.0.0.1");
        let (root, served_root) = watch::channel(directory.path().to_path_buf());
        let server: Arc<dyn FileServer> = Arc::new(HttpFileServer {
            listener: Arc::new(listener),
            requests: Arc::new(FilePolicy {
                files: Arc::new(RepositoryFiles { root: served_root }),
            }),
        });
        let (stop, shutdown) = watch::channel(false);
        let task = tokio::spawn(async move { server.run(shutdown).await });
        Self {
            directory,
            address,
            root,
            stop,
            task,
        }
    }

    /// Point the server at another folder, as a repository move of the runner does.
    pub(super) fn move_to(&self, folder: &Path) {
        self.root.send_replace(folder.to_path_buf());
    }

    pub(super) fn write(&self, path: &str, content: &[u8]) {
        let target = self.directory.path().join(path);
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        fs::write(target, content).unwrap();
    }

    pub(super) fn set_modified(&self, path: &str, modified: SystemTime) {
        File::options()
            .write(true)
            .open(self.directory.path().join(path))
            .unwrap()
            .set_modified(modified)
            .unwrap();
    }

    pub(super) async fn get(&self, path: &str) -> Reply {
        self.request(
            "GET",
            path,
            &[("Host", "localhost:7683"), ("X-Conductive-Files", "1")],
        )
        .await
    }

    pub(super) async fn marked(&self, method: &str, path: &str, extra: &[(&str, &str)]) -> Reply {
        let mut headers = vec![("Host", "localhost:7683"), ("X-Conductive-Files", "1")];
        headers.extend_from_slice(extra);
        self.request(method, path, &headers).await
    }

    pub(super) async fn request(
        &self,
        method: &str,
        path: &str,
        headers: &[(&str, &str)],
    ) -> Reply {
        let mut stream = TcpStream::connect(self.address).await.unwrap();
        let mut request = format!("{method} {path} HTTP/1.1\r\nConnection: close\r\n");
        for (name, value) in headers {
            request.push_str(&format!("{name}: {value}\r\n"));
        }
        request.push_str("\r\n");
        stream.write_all(request.as_bytes()).await.unwrap();
        let mut bytes = Vec::new();
        stream.read_to_end(&mut bytes).await.unwrap();
        let split = bytes
            .windows(4)
            .position(|part| part == b"\r\n\r\n")
            .unwrap();
        let head = std::str::from_utf8(&bytes[..split]).unwrap();
        let mut lines = head.split("\r\n");
        let status = lines
            .next()
            .unwrap()
            .split(' ')
            .nth(1)
            .unwrap()
            .parse()
            .unwrap();
        let headers: BTreeMap<String, String> = lines
            .map(|line| {
                let (key, value) = line.split_once(':').unwrap();
                (key.to_ascii_lowercase(), value.trim().to_owned())
            })
            .collect();
        let wire = &bytes[split + 4..];
        let body = if headers
            .get("transfer-encoding")
            .is_some_and(|value| value == "chunked")
            && !wire.is_empty()
        {
            chunked_body(wire)
        } else {
            wire.to_vec()
        };
        Reply {
            status,
            headers,
            body,
        }
    }

    pub(super) async fn finish(self) {
        self.stop.send_replace(true);
        self.task.await.unwrap();
    }
}

/// Decode data frames from the server's HTTP/1.1 chunked body.
fn chunked_body(mut wire: &[u8]) -> Vec<u8> {
    let mut body = Vec::new();
    loop {
        let end = wire.windows(2).position(|part| part == b"\r\n").unwrap();
        let size = std::str::from_utf8(&wire[..end]).unwrap();
        let size = usize::from_str_radix(size, 16).unwrap();
        if size == 0 {
            return body;
        }
        let (data, tail) = wire[end + 2..].split_at(size);
        body.extend_from_slice(data);
        wire = tail.strip_prefix(b"\r\n").unwrap();
    }
}
