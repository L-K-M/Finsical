"""Classic Mac 'snd ' resource -> WAV.

Formats handled:
  - encode 0x00: raw 8-bit samples -> 8-bit WAV. Verified unsigned on the
    AQUAZONE 1.7.9 fork: every raw resource's samples center on 0x80
    (silence), so bytes pass through unmodified — no sign flip.
  - encode 0xfe (cmpSH) with compID 3: MACE 3:1 -> 16-bit WAV

MACE decode is a port of FFmpeg's libavcodec/mace.c (LGPL), verified
against the Aquazone resource fork.
"""
import base64
import struct
import wave
import io

# MACE3 adaptive-delta tables, ported from FFmpeg libavcodec/mace.c
# (LGPL). _MACE_TAB2 holds 128 rows of 4 u16 coefficients, stored as a
# base64'd big-endian u16 blob — opaque binary data; the decode path is
# verified against the real AQUAZONE resource fork.
_MACE_TAB1 = (-13, 8, 76, 222, 222, 76, 8, -13)
_MACE_TAB2 = [tuple(x) for x in struct.iter_unpack(
    ">4H", base64.b64decode(
        "ACUAdADOAUoAJwB5ANgBWgApAH8A4QFpACoAhADrAXkALACJAPUBiAAuAJABAAGaADAAlgELAawA"
        "MwCdARgBwQA1AKUBJQHWADcArAEyAeoAOgCzAT8B/wA8ALsBTQIWAD8AwwFcAi0AQgDNAWwCRwBF"
        "ANYBfAJhAEgA3wGMAnsASwDpAZ4ClwBPAPQBsQK2AFIA/gHFAtUAVgEJAdgC9ABaARYB7wMYAF4B"
        "IgIEAzoAYgEvAhoDXgBmATwCMgOFAGsBSwJMA64AcAFZAmYD1wB1AWkCgQQDAHoBeQKeBDIAfwGK"
        "Ar0EYwCFAZsC3ASUAIsBrgL8BMgAkQHBAx8FAACYAdUDQwU5AJ8B6gNoBXUApgIAA48FswCtAhcD"
        "twXzALUCLgPhBjYAvQJIBA4GfwDFAmIEPQbKAM4CfQRtBxcA1wKZBJ8HZwDhArcE1Qe8AOsC1gUL"
        "CBQA9gL3BUUIcQEBAxgFgQjRAQwDPAXACTUBGANhBgIJnwElA4cGRgoMATIDsAaOCoABPwPaBtkK"
        "9wFOBAYHKAt1AV0ENAd6C/kBbARkB88MggF8BJYIKA0QAY4EywiGDaYBnwUBCOYOQQGyBTsJTA7j"
        "AcUFdgm2D44B2QW1CiYQQAHvBfYKmhD6AgUGOgsTEbwCHAaBC5EShQI0BswMFRNZAk0HGgygFDcC"
        "ZwdqDS8VHQKDB8ANxxYPAp8IGA5jFwoCvQh0DwgYEQLdCNUPtBkmAv4JOhBnGkQDIAmjESIbcANE"
        "ChIR5xyrA2kKhBKyHfADkAr9E4kfSAO4C3oUZyCsA+ML/hVRIiMEDwyHFkUjqQQ+DRYXRCVBBG4N"
        "qxhMJugEoQ5HGWEopATWDuoahCp1BQ0PlRuzLFsFRxBGHO8uVQWDEQAeOjBmBcIRwx+UMpIGBBKO"
        "IPw00gZJE2IidTcuBpAUPyP/OaQG3BUnJZo8NwcqFhknST7oB3wXFSkJQbYH0RgdKt9EpggrGTAs"
        "x0e0CIgaUC7GSucI6ht9MN5OQAlPHLczDFG+Cbod/zVUVWUKKR9VN7RZMgqdILw6MV0uCxYiMTzJ"
        "YVYLlSO4P4BlrwwZJVFCVmo5DKQm+0VMbvcNNCi4SGRz6w3LKopLn3kYDmgsb07+fn4PDS5rUoV/"
        "/w+5MH5WNX//EG0yp1oNf/8RKDTqXhJ//xHtN0diRX//Erk5v2aof/8TjzxSazx//xRvPwRwBn//"
        "FVhB03UFf/8WTETDej5//xdLR9V/s3//GFVLCn//f/8Za05jf/9//xqNUeN//3//G71Vi3//f/8c"
        "+llcf/9//x5FXVl//3//H59hhH//f/8hCGXef/9//yKBamp//3//JAxvKX//f/8lp3Qff/9//w=="))]


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
        # All sound-header variants share the stdSH 22-byte prefix, so
        # encode sits at +20 for stdSH/cmpSH/extSH alike (verified on the
        # AQUAZONE 1.7.9 resource fork: every MACE resource reads 0xFE at
        # +20, compID 3 at +56).
        enc = blob[hoff + 20]
        if enc == 0:
            rate, = struct.unpack_from(">I", blob, hoff + 8)
            # fmt1: stdSH carries a u32 numBytes at +4. fmt2 has no length
            # field (+4 holds 1 on real Aquazone resources — channels);
            # samples run to end of resource.
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
