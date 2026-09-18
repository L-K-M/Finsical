"""Aquazone / FishMaker sprite streams (ELRA/ELRB chunk payloads).

Chunk payload layout (little-endian):
    u16 groups, u16 frames_per_group, u32 reserved — then groups*frames
    frame records. Each record is 10 bytes:

        u16 width, u16 height, u16 sections, u32 stream_len

    followed by `stream_len` encoded bytes. A record that is not the last
    in its group is trailed by 4 zero bytes. The last frame of each group
    except the final one is followed instead by a 6-byte separator holding
    u16 frames_per_group and u32 0, and the payload's final record has no
    trailing bytes.

Pixel codec — each frame's stream is a run-length encoding of signed
little-endian i16 items:

    v < 0 — emit ``-v`` pixels of the next byte (a color run; 3 bytes).
    v > 0 — emit the next ``v`` bytes as literal pixels (2+v bytes).
    v = 0 — two bytes of padding, no output.

Emitted pixels fill the frame column-major (x = i // h, y = i % h).
Every verified stream emits exactly w*h pixels and consumes exactly
`stream_len` bytes; decode still stops at w*h and pads short output with 0
to be robust to corrupt inputs. The record's `sections` field counts the
encoder's plot sections — informational, not needed to decode.
"""
import struct
from dataclasses import dataclass
from typing import Iterator


@dataclass
class Frame:
    w: int
    h: int
    sections: int
    idx: bytes  # row-major palette indices


def decode_pixels(s: bytes, w: int, h: int) -> bytes:
    """Decode one frame stream to w*h row-major palette indices."""
    n = len(s)
    col = bytearray()
    i = 0
    while i + 2 <= n and len(col) < w * h:
        v = s[i] | (s[i + 1] << 8)
        if v >= 0x8000:
            v -= 0x10000
        if v < 0:
            col.extend(bytes([s[i + 2] if i + 2 < n else 0]) * (-v))
            i += 3
        elif v > 0:
            col.extend(s[i + 2:i + 2 + v])
            i += 2 + v
        else:
            i += 2
    if len(col) < w * h:
        col += b"\0" * (w * h - len(col))
    out = bytearray(w * h)
    for k, v in enumerate(col[:w * h]):
        out[(k % h) * w + k // h] = v
    return bytes(out)


def iter_frames(b: bytes) -> Iterator[tuple[int, int, Frame]]:
    """Yield (group, frame_index, Frame) for each record in a payload."""
    if len(b) < 8:
        return
    ng, nf = struct.unpack_from("<HH", b, 0)
    if not (0 < ng < 64 and 0 < nf < 64):
        return
    p = 8
    for g in range(ng):
        for f in range(nf):
            if p + 10 > len(b):
                return
            w, h, a, ln = struct.unpack_from("<HHHI", b, p)
            # Plausibility guard: ~64 decoded pixels per stream byte, plus
            # slack for frames whose stream underfills the frame. Keep the
            # figures in sync with decode_pixels' item grammar.
            if not (0 < w < 4096 and 0 < h < 4096 and p + 10 + ln <= len(b)
                    and w * h <= 64 * ln + 0x400):
                return
            stream = b[p + 10:p + 10 + ln]
            yield g, f, Frame(w, h, a, decode_pixels(stream, w, h))
            p += 10 + ln
            if f == nf - 1:
                p += 0 if g == ng - 1 else 6
            else:
                p += 4


def is_sprite_stream(b: bytes) -> bool:
    """Cheap sniff: header sanity + first record's dims/len in bounds."""
    if len(b) < 18:
        return False
    ng, nf = struct.unpack_from("<HH", b, 0)
    if not (0 < ng < 64 and 0 < nf < 64) or b[4:8] != b"\0\0\0\0":
        return False
    w, h, _a, ln = struct.unpack_from("<HHHI", b, 8)
    return 0 < w < 4096 and 0 < h < 4096 and 18 + ln <= len(b)
