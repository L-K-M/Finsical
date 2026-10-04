# Ported from FFmpeg libavcodec/mace.c — FFmpeg is LGPL-2.1+; see
# https://ffmpeg.org/legal.html. This is a build-time asset tool, not
# distributed with the app.
"""MACE 3:1 mono decoder, ported from FFmpeg libavcodec/mace.c (LGPL).

The coefficient table lives in the sibling mace_tab.bin — a byte-level
copy of FFmpeg libavcodec/mace.c's mace table (LGPL-2.1+), 128 rows of
4 big-endian u16 = 1024 bytes; keeping it out of the source keeps the
patch reviewable. Decode is verified against the real AQUAZONE 1.7.9
resource fork.
"""
import os
import struct

with open(os.path.join(os.path.dirname(__file__), "mace_tab.bin"),
          "rb") as _f:
    raw = _f.read()
    if len(raw) != 1024:
        raise ValueError(
            f"mace_tab.bin: expected 1024 bytes, got {len(raw)}")
    _TAB2 = [tuple(x) for x in struct.iter_unpack(">4H", raw)]
_TAB1 = (-13, 8, 76, 222, 222, 76, 8, -13)


def _clip16(n):
    # FFmpeg's mace_broken_clip_int16: the original QuickTime quirk only
    # clips strictly below -32768 (to -32767), so -32768 itself passes
    # through. Do not "fix" — the asymmetry is the reference behavior.
    return 32767 if n > 32767 else (-32767 if n < -32768 else n)


def _to_s16(current):
    """FFmpeg's QT_8S_2_16S: expand the top byte into a 16-bit sample."""
    return ((current & 0xFF00) | ((current >> 8) & 0xFF)) - \
        (0x10000 if current & 0x8000 else 0)


def mace3_decode(data: bytes, npackets: int) -> bytes:
    """MACE 3:1 mono: each 2-byte packet decodes to 6 samples.
    Returns s16-LE PCM."""
    if len(data) < npackets * 2:
        raise ValueError(
            f"MACE3: need {npackets} packets "
            f"({npackets * 2} bytes), got {len(data)}")
    index = level = 0
    out = bytearray()
    for j in range(npackets):
        for k in range(2):
            pkt = data[j * 2 + k]
            for val in (pkt & 7, (pkt >> 3) & 3, pkt >> 5):
                row = _TAB2[(index & 0x7F0) >> 4]
                cur = row[val] if val < 4 else -1 - row[7 - val]
                index += _TAB1[val] - (index >> 5)
                if index < 0:
                    index = 0
                cur = _clip16(cur + level)
                level = cur - (cur >> 3)
                out += struct.pack("<h", _to_s16(cur))
    return bytes(out)
