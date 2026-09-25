# Third-party notices

Finsical's own code is released under the Unlicense (see `LICENSE`).
The files below contain third-party code under their own licenses.

## fflate

- Files: the `fflate` npm package (the version `package-lock.json`
  pins), which `core/data/inflate.ts` imports and `npm run build`
  compiles into `bundle.js` and `addons.js`.
- Source: https://github.com/101arrowz/fflate
- License: MIT (Expat). Copyright (c) 2026 Arjun Barrett.

Its license notice, from `node_modules/fflate/LICENSE`:

```text
MIT License

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## FFmpeg MACE decoder

- Files: `core/data/mace.ts`, `tools/az/mace.py`, `tools/az/mace_tab.bin`,
  `tools/az/mace_tab4.bin`
- Source: FFmpeg `libavcodec/mace.c`
  (https://github.com/FFmpeg/FFmpeg/blob/master/libavcodec/mace.c),
  Copyright (c) 2002 Laszlo Torok, adapted to libavcodec by Francois
  Revol.
- License: GNU Lesser General Public License, version 2.1 or later
  (`LGPL-2.1-or-later`). The full text is in `LICENSES/LGPL-2.1.txt`
  and at https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
- Changes: ported from C to TypeScript (`core/data/mace.ts`) and
  Python (`tools/az/mace.py`) in 2026, with the tables stored as base64
  and as the two `.bin` files.

The MACE 3:1 algorithm (`read_table`, `chomp3`, the clipping and sample
expansion) and the coefficient tables `MACEtab1` to `MACEtab4` are
ported from that file. `core/data/mace.ts` is compiled into the app's
JavaScript bundles (`bundle.js` for the tank, `addons.js` for Import
Add-ons), which carry its license header. Its readable source is that
file in this repository, and `npm run build` rebuilds the bundles from
it, so you can modify or replace the LGPL-covered decoder and relink
it. The macOS app ships this file at
`Finsical.app/Contents/Resources/core/data/mace.ts`, with the
license text (`LGPL-2.1.txt`) at `Finsical.app/Contents/Resources`.
The Linux package ships it at `/usr/share/finsical/core/data/mace.ts`;
its `/usr/share/doc/finsical/copyright` states the license and points
to the system's copy of the license text,
`/usr/share/common-licenses/LGPL-2.1`. The Android app ships it at
`core/data/mace.ts` in the APK's assets, with the license text at
`licenses/LGPL-2.1.txt`.
