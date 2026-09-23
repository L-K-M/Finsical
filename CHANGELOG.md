# Changelog

## Unreleased

- The Mac OS 8 look now comes from Osmium UI
  (https://github.com/L-K-M/osmium-ui), a separate library extracted
  from Finsical: the stylesheet, windows, controls, bitmap fonts and
  the native window host. Every window looks and behaves as before.
- Every window is now Mac OS 8 Platinum, laid out the way Mac OS 8
  would: Preferences is a control panel with Machine, Monitor and
  Picture panes (a case list with a preview, Keyboard-style sliders in
  group boxes, a caption area that explains the setting under the
  pointer, and a Defaults button per pane); Tank Overview is a Finder
  list-view window with sortable Name, Kind and Status columns and a
  Remove button; Import Add-ons is its own window, laid out like the
  Chooser, with a Show: pop-up, a list with thumbnails, a preview and
  Add to Tank as the default button. The in-tank add-on window used in
  browsers and on touch devices matches it. The kit gained push
  buttons, checkboxes, sliders, group boxes, bevel buttons, pop-up
  menus, scroll bars, list boxes and Geneva 9, all checked pixel for
  pixel against Mac OS 8.0.
- Tank Stats is now a pixel-exact Mac OS 8 Platinum window: Charcoal 12
  and Geneva 10 bitmap text, the real close/zoom/collapse boxes with
  their pressed states, the grow box, inactive and windowshade looks,
  and Platinum progress bars. The chrome and controls live in a
  reusable module (`web/platinum/`, `web/platinum.css`) for other
  windows. Earlier history lives in the commit log and any GitHub
  releases.
