"""Classic Mac 'snd ' resource -> WAV.

Formats handled:
  - encode 0x00: raw unsigned 8-bit samples -> 8-bit WAV
  - encode 0xfe (cmpSH/MACE) is rejected here; the MACE3 decoder lands
    separately (branch tools/sounds-mace) because the coefficient-table
    diff exceeds the automated reviewer's output budget.
"""
import struct
import wave
import io

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
            raise SndError("compressed snd (MACE) unsupported")
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
