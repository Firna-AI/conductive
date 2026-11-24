//! Message parts preserve byte order and enforce inline and assembly budgets.

use cnd_runner_interface::host::frames::{self, HostFrame};
use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::HostResult;

use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::Incoming;
use crate::wire::{self, Packet, Reader};

fn part(id: u32, last: bool, bytes: &[u8]) -> Result<Vec<u8>> {
    frames::encode(&HostFrame::MessagePart {
        request_id: id,
        last,
        data: bytes.to_vec(),
    })
    .internal()
}

#[test]
fn large_replies_use_ordered_parts_and_ping_stays_exact_inline_json() -> Result<()> {
    assert_eq!(
        wire::encode(&HostToWorker::Ping)?,
        [Packet::Text(r#"{"type":"ping"}"#.into())]
    );
    let reply = HostToWorker::Reply {
        request_id: 7,
        result: HostResult::CommandResult {
            exit_code: Some(0),
            stdout: "€".repeat(100_000),
            stderr: String::new(),
            timed_out: false,
        },
    };
    let packets = wire::encode(&reply)?;
    assert_eq!(packets.len(), 2);
    let mut joined = Vec::new();
    for (index, packet) in packets.into_iter().enumerate() {
        let Packet::Binary(bytes) = packet else {
            return Err(Error::Protocol);
        };
        let HostFrame::MessagePart {
            request_id,
            last,
            data,
        } = frames::decode(&bytes).internal()?
        else {
            return Err(Error::Protocol);
        };
        assert_eq!(request_id, 7);
        assert_eq!(last, index == 1);
        assert!(data.len() <= 262_144);
        joined.extend(data);
    }
    assert_eq!(
        serde_json::from_slice::<HostToWorker>(&joined).internal()?,
        reply
    );
    Ok(())
}

#[test]
fn requests_join_before_utf8_decoding_and_must_match_the_part_id() -> Result<()> {
    let request = WorkerToHost::Request {
        request_id: 7,
        operation: HostOperation::CommandStart {
            command: "€".repeat(400_000),
        },
    };
    let bytes = serde_json::to_vec(&request).internal()?;
    let split = bytes
        .iter()
        .position(|byte| *byte == 226)
        .ok_or(Error::Protocol)?
        + 1;
    let mut reader = Reader::default();
    assert_eq!(
        reader.binary(&part(7, false, &bytes[..split])?)?,
        Incoming::Activity
    );
    let chunks: Vec<_> = bytes[split..].chunks(262_144).collect();
    for chunk in &chunks[..chunks.len() - 1] {
        assert_eq!(reader.binary(&part(7, false, chunk)?)?, Incoming::Activity);
    }
    assert_eq!(
        reader.binary(&part(7, true, chunks[chunks.len() - 1])?)?,
        Incoming::Message(request)
    );
    assert!(matches!(reader.text(&bytes), Err(Error::Protocol)));
    let mismatched =
        br#"{"type":"request","requestId":8,"operation":{"kind":"file.info","path":"/file"}}"#;
    assert!(matches!(
        reader.binary(&part(7, true, mismatched)?),
        Err(Error::Protocol)
    ));
    Ok(())
}

#[test]
fn malformed_json_and_incomplete_requests_cannot_exceed_their_budgets() -> Result<()> {
    let mut reader = Reader::default();
    assert!(matches!(reader.text(b"{"), Err(Error::Protocol)));
    for id in 0..64 {
        assert_eq!(reader.binary(&part(id, false, &[])?)?, Incoming::Activity);
    }
    assert!(matches!(
        reader.binary(&part(64, false, &[])?),
        Err(Error::Protocol)
    ));
    let mut reader = Reader::default();
    let full = part(1, false, &vec![b'x'; 262_144])?;
    for _ in 0..16 {
        assert_eq!(reader.binary(&full)?, Incoming::Activity);
    }
    assert!(matches!(
        reader.binary(&part(1, true, b"x")?),
        Err(Error::Protocol)
    ));
    Ok(())
}
