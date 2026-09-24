# SPDX-License-Identifier: LGPL-2.1-or-later
# Ported from FFmpeg libavcodec/mace.c (Copyright (c) 2002 Laszlo Torok,
# adapted by Francois Revol) to Python for Finsical in 2026; licensed
# under the GNU LGPL 2.1 or later (LICENSES/LGPL-2.1.txt). See
# THIRD_PARTY_NOTICES.md. The browser port in core/data/mace.ts ships
# inside the app bundle.
"""MACE 3:1 mono decoder, ported from FFmpeg libavcodec/mace.c (LGPL).

The coefficient tables live in the sibling mace_tab.bin (MACEtab2, 128
rows of 4 big-endian u16 = 1024 bytes) and mace_tab4.bin (MACEtab4, 128
rows of 2 = 512 bytes), byte-level copies of FFmpeg's tables; keeping
them out of the source keeps the patch reviewable. Goldens come from a
line-by-line port of FFmpeg's read_table/chomp3.
"""
import os
import struct


def _load_rows(name, ncols):
    with open(os.path.join(os.path.dirname(__file__), name), "rb") as f:
        raw = f.read()
    if len(raw) != 128 * ncols * 2:
        raise ValueError(
            f"{name}: expected {128 * ncols * 2} bytes, got {len(raw)}")
    return [tuple(x) for x in struct.iter_unpack(f">{ncols}H", raw)]


_TAB1 = (-13, 8, 76, 222, 222, 76, 8, -13)
_TAB2 = _load_rows("mace_tab.bin", 4)
_TAB3 = (-18, 140, 140, -18)
_TAB4 = _load_rows("mace_tab4.bin", 2)
# FFmpeg's tabs[]: (index step table, coefficient rows, stride) for the
# three codes of each byte, low bits first. The middle code is 2 bits
# wide and uses its own pair of tables.
_TABS = ((_TAB1, _TAB2, 4), (_TAB3, _TAB4, 2), (_TAB1, _TAB2, 4))


def _i16(n):
    """Wrap to int16_t, as FFmpeg's ChannelData fields do."""
    n &= 0xFFFF
    return n - 0x10000 if n & 0x8000 else n


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
            for (tab1, tab2, stride), val in zip(
                    _TABS, (pkt & 7, (pkt >> 3) & 3, pkt >> 5)):
                row = tab2[(index & 0x7F0) >> 4]
                cur = row[val] if val < stride else \
                    -1 - row[2 * stride - val - 1]
                index = _i16(index + tab1[val] - (index >> 5))
                if index < 0:
                    index = 0
                cur = _clip16(cur + level)
                level = cur - (cur >> 3)
                out += struct.pack("<h", _to_s16(cur))
    return bytes(out)
