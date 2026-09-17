"""Classic Mac 'snd ' resource -> WAV.

Formats handled:
  - encode 0x00: raw unsigned 8-bit samples -> 8-bit WAV
  - encode 0xfe (cmpSH) with compID 3: MACE 3:1 -> 16-bit WAV

MACE decode is a port of FFmpeg's libavcodec/mace.c (LGPL), verified
against the Aquazone resource fork. Stdlib only.
"""
import struct
import wave
import io

_MACE_TAB1 = (-13, 8, 76, 222, 222, 76, 8, -13)
_MACE_TAB2 = (
    (37, 116, 206, 330), (39, 121, 216, 346), (41, 127, 225, 361),
    (42, 132, 235, 377), (44, 137, 245, 392), (46, 144, 256, 410),
    (48, 150, 267, 428), (51, 157, 280, 449), (53, 165, 293, 470),
    (55, 172, 306, 490), (58, 179, 319, 511), (60, 187, 333, 534),
    (63, 195, 348, 557), (66, 205, 364, 583), (69, 214, 380, 609),
    (72, 223, 396, 635), (75, 233, 414, 663), (79, 244, 433, 694),
    (82, 254, 453, 725), (86, 265, 472, 756), (90, 278, 495, 792),
    (94, 290, 516, 826), (98, 303, 538, 862), (102, 316, 562, 901),
    (107, 331, 588, 942), (112, 345, 614, 983), (117, 361, 641, 1027),
    (122, 377, 670, 1074), (127, 394, 701, 1123), (133, 411, 732, 1172),
    (139, 430, 764, 1224), (145, 449, 799, 1280), (152, 469, 835, 1337),
    (159, 490, 872, 1397), (166, 512, 911, 1459), (173, 535, 951, 1523),
    (181, 558, 993, 1590), (189, 584, 1038, 1663), (197, 610, 1085, 1738),
    (206, 637, 1133, 1815), (215, 665, 1183, 1895), (225, 695, 1237, 1980),
    (235, 726, 1291, 2068), (246, 759, 1349, 2161), (257, 792, 1409, 2257),
    (268, 828, 1472, 2357), (280, 865, 1538, 2463), (293, 903, 1606, 2572),
    (306, 944, 1678, 2688), (319, 986, 1753, 2807), (334, 1030, 1832, 2933),
    (349, 1076, 1914, 3065), (364, 1124, 1999, 3202), (380, 1174, 2088, 3344),
    (398, 1227, 2182, 3494), (415, 1281, 2278, 3649), (434, 1339, 2380, 3811),
    (453, 1398, 2486, 3982), (473, 1461, 2598, 4160), (495, 1526, 2714, 4346),
    (517, 1594, 2835, 4540), (540, 1665, 2961, 4741), (564, 1740, 3093, 4953),
    (589, 1818, 3232, 5175), (615, 1898, 3375, 5405), (643, 1984, 3527, 5647),
    (671, 2072, 3683, 5898), (701, 2164, 3848, 6161), (733, 2261, 4020, 6438),
    (766, 2362, 4199, 6724), (800, 2467, 4386, 7024), (836, 2578, 4583, 7339),
    (873, 2692, 4786, 7664), (912, 2813, 5001, 8008), (952, 2938, 5223, 8364),
    (995, 3070, 5457, 8739), (1039, 3207, 5701, 9129),
    (1086, 3350, 5956, 9537), (1134, 3499, 6220, 9960),
    (1185, 3655, 6497, 10404), (1238, 3818, 6788, 10869),
    (1293, 3989, 7091, 11355), (1351, 4166, 7407, 11861),
    (1411, 4352, 7738, 12390), (1474, 4547, 8084, 12946),
    (1540, 4750, 8444, 13522), (1609, 4962, 8821, 14126),
    (1680, 5183, 9215, 14756), (1756, 5415, 9626, 15415),
    (1834, 5657, 10057, 16104), (1916, 5909, 10505, 16822),
    (2001, 6173, 10975, 17574), (2091, 6448, 11463, 18356),
    (2184, 6736, 11974, 19175), (2282, 7037, 12510, 20032),
    (2383, 7351, 13068, 20926), (2490, 7679, 13652, 21861),
    (2601, 8021, 14260, 22834), (2717, 8380, 14897, 23854),
    (2838, 8753, 15561, 24918), (2965, 9144, 16256, 26031),
    (3097, 9553, 16982, 27193), (3236, 9979, 17740, 28407),
    (3380, 10424, 18532, 29675), (3531, 10890, 19359, 31000),
    (3688, 11375, 20222, 32382), (3853, 11883, 21125, 32767),
    (4025, 12414, 22069, 32767), (4205, 12967, 23053, 32767),
    (4392, 13546, 24082, 32767), (4589, 14151, 25157, 32767),
    (4793, 14783, 26280, 32767), (5007, 15442, 27452, 32767),
    (5231, 16132, 28678, 32767), (5464, 16851, 29957, 32767),
    (5708, 17603, 31294, 32767), (5963, 18389, 32691, 32767),
    (6229, 19210, 32767, 32767), (6507, 20067, 32767, 32767),
    (6797, 20963, 32767, 32767), (7101, 21899, 32767, 32767),
    (7418, 22876, 32767, 32767), (7749, 23897, 32767, 32767),
    (8095, 24964, 32767, 32767), (8456, 26078, 32767, 32767),
    (8833, 27242, 32767, 32767), (9228, 28457, 32767, 32767),
    (9639, 29727, 32767, 32767),
)


class SndError(Exception):
    pass


def _clip16(n):
    return 32767 if n > 32767 else (-32767 if n < -32768 else n)


def _to_s16(current):
    """FFmpeg's QT_8S_2_16S: expand the top byte into a 16-bit sample."""
    return ((current & 0xFF00) | ((current >> 8) & 0xFF)) - \
        (0x10000 if current & 0x8000 else 0)


def mace3_decode(data: bytes, nframes: int) -> bytes:
    """MACE 3:1 mono: 2 bytes -> 6 samples. Returns s16-LE PCM."""
    index = level = 0
    out = bytearray()
    for j in range(min(nframes, len(data) // 2)):
        for k in range(2):
            pkt = data[j * 2 + k]
            for val in (pkt & 7, (pkt >> 3) & 3, pkt >> 5):
                row = _MACE_TAB2[(index & 0x7F0) >> 4]
                cur = row[val] if val < 4 else -1 - row[7 - val]
                index += _MACE_TAB1[val] - (index >> 5)
                if index < 0:
                    index = 0
                cur = _clip16(cur + level)
                level = cur - (cur >> 3)
                out += struct.pack("<h", _to_s16(cur))
    return bytes(out)


def parse_snd(blob: bytes):
    """Return (rate_hz, pcm_bytes, sampwidth) or raise SndError."""
    if len(blob) < 14:
        raise SndError("snd resource too short")
    fmt, = struct.unpack_from(">H", blob, 0)
    try:
        if fmt == 1:
            ndt, = struct.unpack_from(">H", blob, 2)
            p = 4 + ndt * 6
        elif fmt == 2:
            p = 4
        else:
            raise SndError(f"unsupported snd format {fmt}")
        ncmd, = struct.unpack_from(">H", blob, p)
        p += 2
        hoff = None
        for i in range(ncmd):
            cmd, _p1, p2 = struct.unpack_from(">HHI", blob, p + i * 8)
            if cmd & 0x7FFF in (0x50, 0x51):  # soundCmd / bufferCmd
                hoff = p2
        if hoff is None or hoff + 22 > len(blob):
            raise SndError("no buffer command")
    except (struct.error, IndexError) as e:
        raise SndError(f"malformed snd header: {e}") from e
    try:
        enc = blob[hoff + 20]
        if enc == 0:
            rate, = struct.unpack_from(">I", blob, hoff + 8)
            # fmt1: stdSH with u32 length at +4; fmt2: u32 channels,
            # data runs to end of resource.
            ln = struct.unpack_from(">I", blob, hoff + 4)[0] if fmt == 1 \
                else len(blob) - hoff - 22
            pcm = blob[hoff + 22:hoff + 22 + ln]
            if len(pcm) < ln:
                raise SndError("truncated samples")
            return rate // 65536, pcm, 1
        if enc == 0xFE:
            rate, = struct.unpack_from(">I", blob, hoff + 8)
            nframes, = struct.unpack_from(">I", blob, hoff + 22)
            comp, = struct.unpack_from(">h", blob, hoff + 56)
            if comp != 3:
                raise SndError(f"unsupported compression {comp}")
            data = blob[hoff + 64:hoff + 64 + nframes * 2]
            return rate // 65536, mace3_decode(data, nframes), 2
    except (struct.error, IndexError) as e:
        raise SndError(f"malformed snd data: {e}") from e
    raise SndError(f"unsupported encode {enc:#x}")


def snd_to_wav(blob: bytes) -> bytes:
    rate, pcm, width = parse_snd(blob)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(width)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


def sounds_from_rsrc(data: bytes):
    """Yield (name, wav_bytes) for every decodable 'snd ' resource."""
    from .rsrc import ResFile
    rf = ResFile.from_bytes(data)
    for rid, name, _attr, blob in rf.resources(b"snd "):
        label = name if name else f"snd_{rid & 0xffff}"
        try:
            yield label, snd_to_wav(blob)
        except (SndError, struct.error, IndexError, wave.Error):
            continue


def has_sounds(data: bytes) -> bool:
    """True if data parses as a resource fork holding a 'snd ' resource."""
    from .rsrc import ResFile
    try:
        rf = ResFile.from_bytes(data)
        return next(iter(rf.resources(b"snd ")), None) is not None
    except Exception:
        return False
