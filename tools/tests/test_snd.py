import io
import struct
import unittest
import wave

from tools.az.mace import mace3_decode
from tools.az.snd import parse_snd, snd_to_wav, SndError

_MACE_TAB_SHA256 = ("2d7875ce06077795d98f9c2e4b0d966"
                    "52ed6e25e70a16d7c127998c450aa52bf")


def snd_fmt1_u8(pcm: bytes, rate: float = 22254.5454) -> bytes:
    """Format-1 'snd ' (stdSH: u32 length at +4, u8 data)."""
    hdr = struct.pack(">IIIII BB", 0, len(pcm), int(rate * 65536),
                      0, len(pcm), 0, 60)
    head = struct.pack(">HHHIHHI", 1, 1, 5, 0xA0, 1, 0x8050, 20)
    return head[:14] + b"\x00\x00" + head[14:] + hdr + pcm


def snd_fmt2_u8(pcm: bytes, rate: float = 11127.2727) -> bytes:
    """Format-2 'snd ' (extSH-style: u32 channels at +4, data to EOF)."""
    hdr = struct.pack(">IIIII BB", 0, 1, int(rate * 65536), 0, 0, 0, 60)
    body = struct.pack(">HHHHHI", 2, 0, 1, 0x8050, 0, 14)
    return body + hdr + pcm


def snd_fmt1_mace(frames: bytes, nframes: int,
                  rate: float = 22254.5454, comp: int = 3) -> bytes:
    """Format-1 'snd ' with a cmpSH (encode=0xfe, MACE3) header."""
    hdr = struct.pack(">II I I I BB I", 0, 1, int(rate * 65536),
                      0, 0, 0xFE, 60, nframes)
    hdr += b"\x40\x0c\xad\xdd\x17\x3e\xab\x36\x7a\x0f"  # AIFF ext80 rate
    hdr += b"\x00" * 12                                # chunks
    hdr += struct.pack(">HHI", 0, 0, 0)[:8]            # size + future
    hdr += struct.pack(">HHHH", comp, 16, 11, 8)       # compID ...
    assert len(hdr) == 64
    head = struct.pack(">HHHIHHI", 1, 1, 5, 0x3A0, 1, 0x8051, 20)
    head = head[:14] + b"\x00\x00" + head[14:]  # p1 field
    return head + hdr + frames


def snd_fmt2_extsh(pcm: bytes, nframes: int | None = None,
                   rate: float = 11127.2727, size: int = 8) -> bytes:
    """Format-2 'snd ' with an extSH (encode=0xff) header: u32 channels
    at +4, u32 numFrames at +22, u16 sampleSize at +48; data after the
    64-byte header. Matches the option-installer embedded resources."""
    if nframes is None:
        nframes = len(pcm) // (size // 8)
    hdr = struct.pack(">II I I I BB I", 0, 1, int(rate * 65536),
                      0, 0, 0xFF, 60, nframes)
    hdr += b"\x40\x0c\xad\xdd\x17\x46\x00\x00\x00\x00"  # AIFF ext80 rate
    hdr += b"\x00" * 12                                # chunks
    hdr += struct.pack(">H", size) + b"\x00" * 14      # size + futureUse
    assert len(hdr) == 64
    body = struct.pack(">HHHHHI", 2, 0, 1, 0x8050, 0, 14)
    return body + hdr + pcm


class TestParse(unittest.TestCase):
    def test_fmt1_u8(self):
        pcm = bytes(range(200))
        rate, out, width = parse_snd(snd_fmt1_u8(pcm))
        self.assertEqual(out, pcm)
        self.assertEqual(width, 1)
        self.assertEqual(rate, 22254)

    def test_fmt2_u8(self):
        pcm = bytes(range(64))
        rate, out, width = parse_snd(snd_fmt2_u8(pcm))
        self.assertEqual(out, pcm)
        self.assertEqual(rate, 11127)

    def test_fmt1_mace3(self):
        rate, out, width = parse_snd(snd_fmt1_mace(b"\x24" * 20, 10))
        self.assertEqual(width, 2)
        self.assertEqual(rate, 22254)
        self.assertEqual(len(out), 10 * 6 * 2)  # 6 s16 samples per frame

    def test_fmt1_mace_truncated(self):
        # nframes claims 11 frames but only 20 bytes (10 frames) follow.
        with self.assertRaisesRegex(SndError, "truncated"):
            parse_snd(snd_fmt1_mace(b"\x24" * 20, 11))

    def test_fmt1_mace_truncated_header(self):
        # 64-byte cmpSH header cut one byte short at hoff (= 20).
        blob = snd_fmt1_mace(b"\x24" * 20, 10)
        with self.assertRaisesRegex(SndError, "truncated cmpSH header"):
            parse_snd(blob[:20 + 63])

    def test_fmt1_mace_bad_comp(self):
        with self.assertRaisesRegex(SndError, "unsupported compression 6"):
            parse_snd(snd_fmt1_mace(b"\x24" * 20, 10, comp=6))

    def test_mace3_is_deterministic_and_bounded(self):
        a = mace3_decode(b"\x39\xf1" * 100, 100)
        b = mace3_decode(b"\x39\xf1" * 100, 100)
        self.assertEqual(a, b)
        s = struct.unpack(f"<{len(a) // 2}h", a)
        self.assertTrue(all(-32768 <= x <= 32767 for x in s))
        self.assertTrue(any(abs(x) > 1000 for x in s))  # real signal, not mute

    def test_mace3_golden_vector(self):
        # Pins the verified decode (checked against the AQUAZONE 1.7.9
        # resource fork) — catches table-endianness/column regressions.
        import hashlib
        out = mace3_decode(b"\x39\xf1" * 100, 100)
        self.assertEqual(hashlib.sha256(out).hexdigest(),
                         "150be20e43645c06031f3dbde785d2a7"
                         "e996450eb07766e331a5ad94656b9eac")

    def test_parse_snd_mace3_golden(self):
        # End-to-end pin of the 0xFE branch: header reads at hoff+8/+22/+56
        # and the +64 data slice. Synthetic fixture — no original sample
        # data committed.
        import hashlib
        rate, pcm, width = parse_snd(snd_fmt1_mace(b"\x24" * 20, 10))
        self.assertEqual(width, 2)
        self.assertEqual(rate, 22254)
        self.assertEqual(len(pcm), 10 * 6 * 2)
        self.assertEqual(hashlib.sha256(pcm).hexdigest(),
                         "39205b11a9f1c4636aa66013b7f36ee6"
                         "87e6ac5993d325ecab0835b6e91a016f")

    def test_extsh_u8(self):
        # encode 0xff / sampleSize 8: raw unsigned u8 behind 64-byte hdr.
        pcm = bytes(range(200))
        rate, out, width = parse_snd(snd_fmt2_extsh(pcm))
        self.assertEqual(out, pcm)
        self.assertEqual(width, 1)
        self.assertEqual(rate, 11127)

    def test_extsh_s16_byteswapped(self):
        # encode 0xff / sampleSize 16: Mac big-endian s16 -> WAV LE.
        be = b"\x12\x34\xff\x00\x80\x00\x7f\xff"
        rate, out, width = parse_snd(snd_fmt2_extsh(be, size=16))
        self.assertEqual(width, 2)
        self.assertEqual(out, b"\x34\x12\x00\xff\x00\x80\xff\x7f")
        self.assertEqual(rate, 11127)

    def test_extsh_truncated(self):
        # numFrames claims 4 frames but only 2 bytes follow.
        with self.assertRaisesRegex(SndError, "truncated"):
            parse_snd(snd_fmt2_extsh(b"\x80\x80", nframes=4))

    def test_extsh_truncated_header(self):
        # The fmt2 builder puts the header at hoff=14; cut inside it.
        blob = snd_fmt2_extsh(b"\x80" * 8)
        with self.assertRaisesRegex(SndError, "truncated extSH header"):
            parse_snd(blob[:14 + 63])

    def test_extsh_bad_size(self):
        blob = bytearray(snd_fmt2_extsh(b"\x80" * 8))
        blob[14 + 48:14 + 50] = struct.pack(">H", 24)
        with self.assertRaisesRegex(SndError, "unsupported sample size"):
            parse_snd(bytes(blob))

    def test_extsh_stereo_rejected(self):
        blob = bytearray(snd_fmt2_extsh(b"\x80" * 16))
        blob[14 + 4:14 + 8] = struct.pack(">I", 2)
        with self.assertRaisesRegex(SndError, "channel count"):
            parse_snd(bytes(blob))

    def test_mace_table_hash(self):
        # Table corruption fails loudly instead of silently altering output.
        import hashlib, os
        from tools.az import mace
        with open(os.path.join(os.path.dirname(mace.__file__),
                               "mace_tab.bin"), "rb") as f:
            self.assertEqual(hashlib.sha256(f.read()).hexdigest(),
                             _MACE_TAB_SHA256)

    def test_rejects_bad_format(self):
        with self.assertRaises(SndError):
            parse_snd(b"\x00\x07" + b"\x00" * 20)

    def test_rejects_truncated(self):
        with self.assertRaises(SndError):
            parse_snd(b"\x00\x01")

    def test_wav_roundtrip(self):
        wav = snd_to_wav(snd_fmt1_u8(bytes(range(64)), 11025))
        w = wave.open(io.BytesIO(wav))
        self.assertEqual(w.getnchannels(), 1)
        self.assertEqual(w.getsampwidth(), 1)
        self.assertEqual(w.getframerate(), 11025)
        self.assertEqual(w.readframes(64), bytes(range(64)))


class TestEmitSounds(unittest.TestCase):
    def test_sanitized_name_collisions_deduped(self):
        import tempfile, os, json
        from tools.az import emit
        wav = snd_to_wav(snd_fmt1_u8(b"\x80" * 8))
        src = emit.sounds_from_rsrc
        emit.sounds_from_rsrc = lambda d: iter(
            [("A!B", wav), ("A?B", wav), ("", wav), ("a_b", wav)])
        try:
            with tempfile.TemporaryDirectory() as td:
                m = emit.emit_sounds(b"x", td)
                files = [s["file"] for s in m["sounds"]]
                self.assertEqual(len(set(files)), 4)
                self.assertTrue(all(
                    os.path.exists(os.path.join(td, f)) for f in files))
                json.dumps(m)  # manifest stays serializable
        finally:
            emit.sounds_from_rsrc = src


class TestCliSounds(unittest.TestCase):
    def test_all_undecodable_snd_fails(self):
        import os, sys, tempfile
        sys.path.insert(0, os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.abspath(__file__)))))
        from tools.tests.fixtures import build_rsrc
        from tools.azpack import main
        # fmt 99 is neither 1 nor 2 → every resource undecodable.
        fork = build_rsrc({b"snd ": [(1, "bad", 0, struct.pack(">H", 99)
                                     + b"\x00" * 20)]})
        with tempfile.TemporaryDirectory() as td:
            src = os.path.join(td, "x.rsrc")
            out = os.path.join(td, "o")
            with open(src, "wb") as f:
                f.write(fork)
            self.assertEqual(main([src, "-o", out]), 1)
            self.assertFalse(os.path.exists(
                os.path.join(out, "manifest.json")))
            self.assertFalse(os.path.exists(
                os.path.join(out, "sounds")))


if __name__ == "__main__":
    unittest.main()
