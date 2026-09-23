# Third-party notices

Finsical's own code is released under the Unlicense (see `LICENSE`).
The files below contain third-party code under their own licenses.

## FFmpeg MACE decoder

- Files: `core/data/mace.ts`, `tools/az/mace.py`, `tools/az/mace_tab.bin`,
  `tools/az/mace_tab4.bin`
- Source: FFmpeg `libavcodec/mace.c`
  (https://github.com/FFmpeg/FFmpeg/blob/master/libavcodec/mace.c),
  Copyright (c) 2002 Laszlo Torok, adapted to libavcodec by Francois
  Revol.
- License: GNU Lesser General Public License, version 2.1 or later
  (`LGPL-2.1-or-later`), https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html

The MACE 3:1 algorithm (`read_table`, `chomp3`, the clipping and sample
expansion) and the coefficient tables `MACEtab1` to `MACEtab4` are
ported from that file. `core/data/mace.ts` is compiled into the app's
JavaScript bundle (`bundle.js`). Its readable source is that file in
this repository, and `npm run build` rebuilds the bundle from it, so
you can modify or replace the LGPL-covered decoder and relink it.
