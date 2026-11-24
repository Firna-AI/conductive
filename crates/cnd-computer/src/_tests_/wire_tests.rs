//! Byte limits, complete JSON decoding, and request IDs on binary message parts.

#![expect(
    clippy::unwrap_used,
    clippy::panic,
    reason = "Invalid fixtures must fail the test."
)]

use cnd_runner_interface::computer::limits::{
    COMPUTER_MESSAGE_PART_BYTES, COMPUTER_REQUEST_MAX_BYTES,
};
use cnd_runner_interface::computer::messages::{ComputerToWorker, WorkerToComputer};
use cnd_runner_interface::computer::results::{ComputerResult, ContainerState};
use cnd_runner_interface::host::frames::{self, HostFrame};
use tokio_tungstenite::tungstenite::Message;

use crate::error::Error;
use crate::socket::Incoming;

use super::{Reader, encode};

fn part(request_id: u32, data: &[u8], last: bool) -> Vec<u8> {
    frames::encode(&HostFrame::MessagePart {
        request_id,
        last,
        data: data.to_vec(),
    })
    .unwrap()
}

#[test]
fn assembles_a_request_across_utf8_cuts_and_checks_its_id() {
    let json = r#"{"type":"request","requestId":4,"operation":{"kind":"container.start","container":"a","env":[{"name":"A","value":"🧪"}]}}"#;
    let cut = json.find('🧪').unwrap() + 1;
    let mut reader = Reader::default();
    assert_eq!(
        reader.binary(&part(4, &json.as_bytes()[..cut], false)).ok(),
        Some(Incoming::Part(4))
    );
    let request = serde_json::from_str::<WorkerToComputer>(json).unwrap();
    assert_eq!(
        reader
            .binary(&part(4, &json.as_bytes()[cut..], true))
            .unwrap(),
        Incoming::Message(request)
    );
    assert!(matches!(
        reader.binary(&part(5, json.as_bytes(), true)),
        Err(Error::Protocol)
    ));
}

#[test]
fn rejects_oversized_requests_and_zero_request_ids() {
    let reader = Reader::default();
    let json = format!(
        r#"{{"type":"pong","padding":"{}"}}"#,
        "x".repeat(COMPUTER_REQUEST_MAX_BYTES)
    );
    assert!(matches!(reader.text(json.as_bytes()), Err(Error::Protocol)));
    assert!(matches!(
        reader.text(br#"{"type":"request","requestId":0,"operation":{"kind":"container.get","container":"a"}}"#),
        Err(Error::Protocol)
    ));
}

#[test]
fn sends_a_large_reply_as_bounded_parts_of_the_same_request() {
    let reply = ComputerToWorker::Reply {
        request_id: 7,
        result: ComputerResult::Container {
            container: "x".repeat(COMPUTER_MESSAGE_PART_BYTES),
            state: ContainerState::Running,
        },
    };
    let packets = encode(&reply).unwrap();
    assert_eq!(packets.len(), 2);
    let mut joined = Vec::new();
    for (index, packet) in packets.into_iter().enumerate() {
        let Message::Binary(bytes) = packet else {
            panic!("expected a binary message part");
        };
        let frame = frames::decode(&bytes).unwrap();
        let HostFrame::MessagePart {
            request_id,
            last,
            data,
        } = frame
        else {
            panic!("expected message part framing");
        };
        assert_eq!(request_id, 7);
        assert_eq!(last, index == 1);
        assert!(data.len() <= COMPUTER_MESSAGE_PART_BYTES);
        joined.extend(data);
    }
    assert_eq!(
        serde_json::from_slice::<ComputerToWorker>(&joined).unwrap(),
        reply
    );
}
