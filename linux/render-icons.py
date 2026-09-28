#!/usr/bin/env python3
"""Render the app icon into a hicolor theme tree, one PNG per size.
Usage: render-icons.py SOURCE THEME_DIR NAME SIZE...

Used by build-deb.sh and build-tarball.sh. GdkPixbuf writes no
timestamps into the PNGs, so they are reproducible.
"""

import os
import sys

import gi

gi.require_version("GdkPixbuf", "2.0")
from gi.repository import GdkPixbuf  # noqa: E402

if len(sys.argv) < 5:
    sys.exit("usage: render-icons.py SOURCE THEME_DIR NAME SIZE...")
source, theme, name, *sizes = sys.argv[1:]
art = GdkPixbuf.Pixbuf.new_from_file(source)
if art.get_width() != art.get_height():
    sys.exit(f"render-icons.py: {source} is not square")
for size in map(int, sizes):
    folder = os.path.join(theme, f"{size}x{size}", "apps")
    os.makedirs(folder, exist_ok=True)
    icon = art.scale_simple(size, size, GdkPixbuf.InterpType.HYPER)
    icon.savev(os.path.join(folder, f"{name}.png"), "png", [], [])
