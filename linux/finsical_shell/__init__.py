"""Finsical's Linux shell: GTK 4 windows around WebKitGTK 6 web views.

`logic` holds the rules that need no GTK (paths, geometry, window
state, the bus script) so they can be unit-tested on a machine without
python3-gi; `app.main()` is the entry point the launcher calls.
"""
