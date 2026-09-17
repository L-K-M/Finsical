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

Pixel codec — each frame's stream is a sequence of items:

    - command: ``op 0xFF col n lit…`` — emit (0x100 - op) pixels of
      `col`, then `n` raw literal pixels.
    - any other byte — one literal pixel.

Emitted pixels fill the frame column-major (x = i // h, y = i % h).
Streams routinely emit a few pixels more or less than w*h (a small
trailer follows the image data), so decode stops at w*h and pads short
output with 0. The record's `sections` field counts the encoder's plot
sections — informational, not needed to decode.
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
    while i < n and len(col) < w * h:
        if i + 3 < n and s[i + 1] == 0xFF:
            col += bytes([s[i + 2]]) * (0x100 - s[i])
            nl = s[i + 3]
            col += s[i + 4:i + 4 + nl]
            i += 4 + nl
        else:
            col.append(s[i])
            i += 1
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
            # the codec emits at most ~64 run pixels per stream byte plus
            # 1 literal per byte, so w*h can't exceed ~64*ln; a small
            # slack covers real streams that underfill slightly.
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
