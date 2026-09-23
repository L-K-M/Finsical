# Changelog

## Unreleased

- Fish swim more calmly: they stroke and glide toward where they are
  going instead of changing their minds every second, turn around less
  than half as often, never stop dead between strokes, and only change
  direction with a full roll, not a one-frame flip. Hungry fish now
  catch food as it sinks instead of trailing it to the gravel, new fish
  eat the first food you drop, and a fish that loses a pellet to
  another stops showing as looking for food. A light tap no longer
  slows fish down, and a fish scared into the glass bounces off it.
  Tank Overview and Stats call a fish peckish once it would go for
  food.
- Fish have more life of their own. Fish of one species school loosely
  together; a hungry fish waits just under the surface for food; the
  nearest calm fish comes over to look at the pointer; and after dark
  fish settle on the gravel to sleep, waking at dawn, at a knock on the
  glass, or when a hungry one spots food. In foul water they crowd just
  under the surface, gasping, and now and then a bubble works loose
  from the gravel.
- Newly added fish arrive as youngsters of varying size and grow toward
  their adult size as they eat. The tank holds up to 24 fish; past that,
  adding one says the tank is full instead.
- Fish look like their species. Every AquaZone fish pack carries a
  generic hatchling set alongside the adult art, and the tank drew the
  hatchlings: a clownfish, a comet and a ryukin were the same grey fry.
  Each fish now swims as its adult, at half the art's original size so
  species keep their sizes relative to each other, shrunk with a box
  filter so fins and outlines stay whole. Big fish keep their bodies
  inside the glass and blow bubbles from their mouths.
  The Import Add-ons preview, its list and Tank Overview show the same
  fish in its level profile, and cached previews are redrawn.
- The tank redraws only when the fish have moved, 30 times a second,
  instead of on every display refresh: half the drawing work on a
  60 Hz display and a quarter on a 120 Hz one, CRT on or off. Sound
  pauses while the tank is hidden, and a fish whose sprite frame is
  missing draws as a placeholder instead of freezing the whole tank.
- Backgrounds that aren't 16:10 are cropped to fill the tank instead of
  being stretched, and backgrounds and gravel are scaled once when they
  load rather than on every frame. The CRT effect renders at no more
  than twice the display's pixel density, saving work on very dense
  displays.
- A damaged .azpack is turned away when it loads instead of breaking
  the tank while it draws, and art with an oversized or malformed image
  can no longer exhaust memory.
- Taps near the tank's corners pick the right knock sound, long add-on
  names end in an ellipsis instead of being cut off, a corrupt tank save
  is repaired on load, and the tank saves when its window hides, so
  quitting no longer loses the last few seconds.
- Plants and accessories now play the animation their packs ship:
  plants sway, bubble plumes rise, and robots, clocks and submarines
  move, each on its own beat so two copies of a plant don't sway in
  step. They show their side-view art instead of the top view or
  catalog tile (the Aquazone submarine, BUGDANCE), and draw at one
  scale, shrunk smoothly, so a small plant stays smaller than a large
  one; only items taller than the tank shrink further to fit.
- Day and night are now real halves of the cycle, with smooth ramps
  and a warm dawn and dusk, and a new tank opens in daylight instead
  of at the darkest moment. Night is a moonlit blue rather than a flat
  dark veil. A new Lighting pane in Preferences adds a light timer that
  follows your Mac's clock (lights on at 08:00 and off at 22:00 unless
  you choose other hours), with nights light enough to watch and a
  faint moonbeam that follows the real moon, or keeps the lights on
  all the time. Tank Stats says when the lights switch next.
- A lamp switch turns the tank's lights off for instant night and back
  on, whatever the Lighting setting: Tank > Toggle Lights (Cmd-L) in the
  app, the L key, or Lamp on in the Lighting pane. It is kept with the
  lighting settings, and Tank Stats says when the lamp is off.
- The water comes alive. Bubbles wobble, grow as they rise and pop at
  a surface line that catches the light, and by day sunlight slants
  through the water and ripples over the gravel (held still if you
  prefer reduced motion). Feed Fish scatters a pinch of pellets, one per
  hungry fish, around a spot on the surface; they drift as they sink
  instead of stacking in one column in the middle. Fouled water now
  turns visibly green-brown and murky, with debris drifting in it.
- The water reacts now: knocking on the glass draws an expanding pixel
  ring at the tap, and food (or a newly installed fish) breaks the
  surface with a small splash of droplets. Both effects tick on the
  sim clock and paint as whole pixels, matching the retro bubbles.
- Pointing at the top of the tank, where a click drops food, shows a
  crosshair and a faint line marking where feeding stops.
- The machine list in Preferences previews each case with a still of
  a running tank instead of a blank screen.
- Preferences has a Sound pane, laid out like Monitors & Sound: a
  volume slider, Mute, and switches for bubble sounds and the water
  ambience. Tank > Mute Sound (Option-Command-S) and the M key mute
  too. Installing a sound add-on now plays a 4-second taste
  instead of the whole song, Add Again no longer stacks copies, and
  closing Import Add-ons stops its preview.
- MACE-compressed sounds now decode correctly instead of coming out
  distorted. Sounds you imported earlier from a resource fork, .bin
  or .hqx file keep the old decode: drop them again to replace them.
- In the macOS app, Preferences, Tank Overview, Import Add-ons and
  Tank Stats open in front of the floating tank, beside it the first
  time, and on the desktop you are using. The first click on the tank
  while another app is active now feeds or taps, and Cmd-I opens the
  Import Add-ons window instead of a cramped importer inside the tank.
- The macOS app has the standard Mac menu items: About Finsical,
  Services, Hide Finsical (Cmd-H), Hide Others, Show All and a Help
  menu. The Window menu can turn off Float Above Other Windows and Show
  on All Desktops, remembered across launches, and Tank > CRT Effect
  shows a checkmark while the effect is on. Cmd-W on the tank no longer
  quits the app; quit with Cmd-Q.
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
