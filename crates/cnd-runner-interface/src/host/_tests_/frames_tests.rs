//! Golden bytes and malformed binary frames at the public codec boundary.

use super::{Error, HostFrame, Result, decode, encode};

#[test]
fn stream_data_matches_golden_bytes() -> Result<()> {
    let frame = HostFrame::StreamData {
        stream_id: 0x0102_0304,
        data: vec![0, 255, 128],
    };
    let bytes = [1, 1, 2, 3, 4, 0, 255, 128];
    assert_eq!(encode(&frame)?, bytes);
    assert_eq!(decode(&bytes)?, frame);
    Ok(())
}

#[test]
fn message_part_matches_golden_bytes() -> Result<()> {
    let frame = HostFrame::MessagePart {
        request_id: 0x0102_0304,
        last: true,
        data: b"{}".to_vec(),
    };
    let bytes = [2, 1, 2, 3, 4, 1, 123, 125];
    assert_eq!(encode(&frame)?, bytes);
    assert_eq!(decode(&bytes)?, frame);
    Ok(())
}

#[test]
fn message_parts_preserve_empty_payloads_and_utf8_cuts() -> Result<()> {
    for (last, data, bytes) in [
        (true, vec![], vec![2, 255, 255, 255, 255, 1]),
        (false, vec![226], vec![2, 255, 255, 255, 255, 0, 226]),
    ] {
        let frame = HostFrame::MessagePart {
            request_id: u32::MAX,
            last,
            data,
        };
        assert_eq!(encode(&frame)?, bytes);
        assert_eq!(decode(&bytes)?, frame);
    }
    Ok(())
}

#[test]
fn payloads_at_each_limit_are_accepted() -> Result<()> {
    for (frame, expected_bytes) in [
        (
            HostFrame::StreamData {
                stream_id: 0,
                data: vec![7; 65_536],
            },
            65_541,
        ),
        (
            HostFrame::MessagePart {
                request_id: 0,
                last: false,
                data: vec![7; 262_144],
            },
            262_150,
        ),
    ] {
        let bytes = encode(&frame)?;
        assert_eq!(bytes.len(), expected_bytes);
        assert_eq!(decode(&bytes)?, frame);
    }
    Ok(())
}

#[test]
fn rejects_unknown_frame_kinds() {
    for kind in [0, 3, 255] {
        assert!(matches!(
            decode(&[kind, 0, 0, 0, 1, 1]),
            Err(Error::InvalidKind)
        ));
    }
}

#[test]
fn rejects_short_headers() {
    for bytes in [vec![], vec![1], vec![1, 0, 0, 0], vec![2, 0, 0, 0, 1]] {
        assert!(
            matches!(decode(&bytes), Err(Error::ShortHeader)),
            "{bytes:?}"
        );
    }
}

#[test]
fn rejects_empty_stream_payloads() {
    assert!(matches!(decode(&[1, 0, 0, 0, 1]), Err(Error::EmptyStream)));
    assert!(matches!(
        encode(&HostFrame::StreamData {
            stream_id: 1,
            data: vec![]
        }),
        Err(Error::EmptyStream)
    ));
}

#[test]
fn rejects_reserved_message_flags() {
    for flags in [2, 3, 128, 255] {
        assert!(matches!(
            decode(&[2, 0, 0, 0, 1, flags]),
            Err(Error::InvalidFlags)
        ));
    }
}

#[test]
fn rejects_decoding_payloads_above_each_limit() {
    for (header, payload_bytes) in [
        (vec![1, 0, 0, 0, 1], 65_537),
        (vec![2, 0, 0, 0, 1, 1], 262_145),
    ] {
        let mut bytes = header;
        bytes.resize(bytes.len() + payload_bytes, 7);
        assert!(matches!(decode(&bytes), Err(Error::PayloadTooLarge)));
    }
}

#[test]
fn rejects_encoding_payloads_above_each_limit() {
    for frame in [
        HostFrame::StreamData {
            stream_id: 1,
            data: vec![7; 65_537],
        },
        HostFrame::MessagePart {
            request_id: 1,
            last: true,
            data: vec![7; 262_145],
        },
    ] {
        assert!(matches!(encode(&frame), Err(Error::PayloadTooLarge)));
    }
}
