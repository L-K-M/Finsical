"""Classic Mac 'snd ' resource -> WAV.

Formats handled:
  - encode 0x00: raw 8-bit samples -> 8-bit WAV. Verified unsigned on the
    AQUAZONE 1.7.9 fork: every raw resource's samples center on 0x80
    (silence), so bytes pass through unmodified — no sign flip.
  - encode 0xfe (cmpSH) with compID 3: MACE 3:1 -> 16-bit WAV
    (decoder: tools/az/mace.py, ported from FFmpeg libavcodec/mace.c)
"""
import struct
import wave
import io

from .mace import mace3_decode


class SndError(Exception):
    pass


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
            # cmpSH: numChannels at +6 (1 on every real resource),
            # sampleFrames at +22 counts 2-byte MACE packets — on every
            # MACE resource in the AQUAZONE 1.7.9 fork, field*2 equals the
            # bytes following the 64-byte header (one, 'EventTiyu', carries
            # a single trailing pad byte, so compare with < not !=).
            nch, = struct.unpack_from(">h", blob, hoff + 6)
            if nch != 1:
                raise SndError(f"unsupported channel count {nch}")
            rate, = struct.unpack_from(">I", blob, hoff + 8)
            npackets, = struct.unpack_from(">I", blob, hoff + 22)
            comp, = struct.unpack_from(">h", blob, hoff + 56)
            if comp != 3:
                raise SndError(f"unsupported compression {comp}")
            data = blob[hoff + 64:hoff + 64 + npackets * 2]
            if len(data) < npackets * 2:
                raise SndError(
                    f"truncated samples: need {npackets * 2} bytes "
                    f"for {npackets} packets, got {len(data)}")
            return rate // 65536, mace3_decode(data, npackets), 2
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
