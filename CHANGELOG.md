# Changelog

## Unreleased

- Fish look like their species. Every AquaZone fish pack carries a
  generic hatchling set alongside the adult art, and the tank drew the
  hatchlings: a clownfish, a comet and a ryukin were the same grey fry.
  Each fish now swims as its adult, at half the art's original size so
  species keep their sizes relative to each other, shrunk with a box
  filter so fins and outlines stay whole. Big fish keep their bodies
  inside the glass and blow bubbles from their mouths.
  The Import Add-ons preview, its list and Tank Overview show the same
  fish in its level profile, and cached previews are redrawn.
- Preferences' pane buttons are now the size of Desktop Pictures' own,
  54 x 40, instead of Monitors & Sound's 40 x 40.
- Sound add-ons show a speaker icon in the add-on browser, its preview
  and Tank Overview, where an empty box used to be. The browser no
  longer downloads a sound add-on just to look for art it doesn't have.
- On touch screens, a tap that stops a scrolling list no longer selects
  the row under it (Osmium UI 0.2.0).
- The macOS app is ready for Swift 6's stricter concurrency checks: CI
  also builds it, with Osmium UI's window host, in Swift 6 mode.
- The Mac OS 8 look now comes from Osmium UI
  (https://github.com/L-K-M/osmium-ui), a separate library extracted
  from Finsical: the stylesheet, windows, controls, bitmap fonts and
  the native window host. Every window looks and behaves as before.
- The app is now compiled for macOS 12.0, the minimum it promises.
  Earlier builds targeted the build machine's macOS, so binaries from
  the macOS 15 release runner declared macOS 15 as their minimum and
  nothing checked that they avoided APIs missing from macOS 12 to 14.
  The build now fails if the binary and the app's stated minimum
  disagree.
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
  reusable module for other windows (since moved to Osmium UI).
  Earlier history lives in the commit log and any GitHub releases.
