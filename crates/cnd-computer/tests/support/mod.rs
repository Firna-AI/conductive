//! Loopback HTTP fixtures for the real client.

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::task::JoinHandle;

pub(crate) async fn http(
    respond: impl Fn(&str) -> (u16, Vec<u8>) + Send + 'static,
    count: usize,
) -> (String, JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let server = format!("http://{}", listener.local_addr().unwrap());
    let capture = tokio::spawn(async move {
        let mut requests = Vec::new();
        for _ in 0..count {
            let (mut socket, _) = listener.accept().await.unwrap();
            let request = read_headers(&mut socket).await;
            let (status, body) = respond(&request);
            let response = format!(
                "HTTP/1.1 {status} Fixture\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len()
            );
            socket.write_all(response.as_bytes()).await.unwrap();
            socket.write_all(&body).await.unwrap();
            requests.push(request);
        }
        requests
    });
    (server, capture)
}

async fn read_headers(socket: &mut TcpStream) -> String {
    let mut reader = BufReader::new(socket);
    let mut lines = String::new();
    loop {
        let start = lines.len();
        assert_ne!(reader.read_line(&mut lines).await.unwrap(), 0);
        if &lines[start..] == "\r\n" {
            return lines;
        }
    }
}
