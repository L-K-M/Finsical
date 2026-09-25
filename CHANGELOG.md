# Changelog

## Unreleased

- In the Mac app, the Tank Stats, Tank Overview, Preferences and Add-ons
  windows no longer show a white pixel just outside their top-right
  and bottom-left corners.
- You can name your fish. Click the name in a fish's Get Info card and
  type, or select the fish in Tank Overview and choose Rename… (or
  press Return). The name shows on its name tag, hover tip, Get Info
  card, Tank Overview, Tank Stats and notices, and it is saved with the
  tank. Clear the name to go back to the species name.
- The Get Info card's text is black again. It had turned white on the
  card's white background.
- Fish no longer waggle rapidly up and down after swimming past the
  spot they were heading for. They now level out and carry on until
  they turn around.
- The alert that says the tank is full of uneaten food is now a hint
  you turn on with Tank > Turn Hints On. It no longer interrupts
  feeding by default; a refused feed is silent unless hints are on.
- Alerts no longer show the browser's rounded focus ring around their
  frame.
- The Mac app opens its tank when you run it from where you unzipped
  it, such as your Downloads folder. macOS runs an app opened there
  from a hidden temporary location, and from there the app refused to
  load any of its own files: you saw a menu bar and no tank. If the
  tank ever can't load, an alert now says so instead of showing
  nothing.
- If you close Finsical before answering the offer to stock your tank,
  the next launch asks again. The offer used to be lost for good, and
  the game's sounds then downloaded without asking. If stocking the
  tank fails or you stop it, the next launch offers the rest, and each
  launch after that does too until the rest arrives or you choose Not
  Now or Stop.
- With the CRT effect on, clicks, hovering and feeding land where the
  curved, shifted picture shows the tank. They used to follow the flat
  tank underneath, so a click could miss by several pixels, and with a
  raised Height or overscan the feeding strip could sit outside the
  area that took the click.
- At full Perspective the CRT picture's near edge now stays at the
  frame and only the far edge shrinks back. The near edge used to
  spill past the glass and hide the side of the tank.
- The CRT gains a choice of phosphor mask in Preferences: the aperture
  grille it had, a slot mask or a shadow mask. The strength slider,
  which was called Shadow grille, is now Phosphor mask.
- Bright CRT highlights now roll off smoothly instead of clipping to
  flat white patches when bloom and Bright-color boost push them past
  full brightness.
- Screen readers now say which way the CRT's position pots move the
  picture and by how much, such as "4% left" or "Centered", and the
  Preferences caption shows the same.
- A tank with any add-on installed comes back on launch again. 0.4.0
  read such a save as damaged and started a fresh default tank in its
  place, which then saved over it. A save that can't be fully read is
  also kept aside as `finsical:tank.unreadable` rather than lost.
- Tank Stats puts its readings on three Mac OS 8 tabs, General, Water
  and Keeping, so the window is little more than half as tall. It
  reopens on the tab you used last. The first time it opens after this
  update it comes up centered at its new size, since the size you left
  it at was for the old single pane.
- The CRT's scanlines now follow the picture's brightness, like a real
  tube's beam. Dark rows thin to lines with deep gaps, while bright
  rows swell to nearly fill them, so highlights look painted rather
  than striped and a lone bright pixel glows as a dot. In a small
  window the lines fade to their average brightness instead of
  beating into moire patterns.
- The CRT's bloom and glass halation are now smooth glows. Small
  bright shapes such as bubbles used to cast sharp copies of
  themselves a few pixels to each side.
- The CRT's Softening blends colors the way a tube's light does, so
  dithered patterns and the seams between two colors no longer come
  out darker than they should.
- The CRT picture's corners are rounded and its curved edges are
  smooth instead of stair-stepped.
- The CRT's Geometry group gains Horizontal and Vertical position
  pots, which shift the picture left, right, up or down on the glass.
- A tank saved by 0.3.0 or earlier keeps the look of each fish from an
  add-on that holds several fish. The first launch after the update
  would otherwise turn them all into the add-on's last fish: angels.zip
  gave an angel and a black angel, and both came back black angels.
- A fish add-on whose fish don't all fit in the tank is refused as a
  whole, with a note of how much room is left. It used to add as many
  as fit and report success.
- A fish add-on that holds several fish now names each fish after its
  own pack. Adding angels.zip used to give two fish both called
  "angels"; they are now "angel" and "blackangel".
- A pointer left resting over the tank loses the fish's interest after
  about 20 seconds, so the fish gathered to look at it swim off again
  instead of waiting there for hours. Moving the pointer brings them
  back.
- A bubble you pop by tapping it now bursts with a soft plip from its
  side of the tank, or with a sound of your own that has "pop" in its
  name. The Bubble sounds switch in Preferences turns it off.
- In a browser, Preferences, Tank Overview and Tank Stats open in
  small windows beside the tank, at the size the app gives them. They
  used to open as full-size tabs that stretched their panes and sent
  the tank's tab to the background, where the fish stop and the sound
  pauses, so a change made in Preferences couldn't be seen.
- New machine cases: Performa 450 (II), Performa 5200 and 5200
  (Black), PowerBook G3 and iBook (Tangerine) join the Macintosh Plus,
  20th Anniversary Mac, iMac G3 and G4 and the bare tank.
- Fish Names, from AquaZone's Options menu: press N, or choose Fish
  Names from the Tank menu, and every fish wears a name tag that swims
  with it. Pointing names only one fish at a time, and never on a touch
  screen. The setting is remembered.
- You can use your own picture as the backdrop, as in AquaZone: drag a
  256-color BMP of at least 160 by 100 pixels onto the tank. It is
  kept, so it comes back at every launch, and Tank Overview lists it
  with Remove. A picture Finsical can't use, such as a 24-bit BMP or
  a smaller one, gets a note on the glass saying which pictures work.
- In the Machine list the Performas drop "Macintosh" from their names,
  so "Performa 5200 (Black)" and "Performa 450 (II)" are no longer cut
  off mid-letter; a name still too long for the list ends in an
  ellipsis.
- Mekasia's G_Debris gravel lists under Gravel and lays a gravel bed.
  It used to list under Accessories, where adding it dropped a big
  textured block into the tank; a tank that added it that way gets the
  gravel instead on its next launch. The Mekasia plant and accessory
  lists now hold only plants and accessories.
- A malformed sound file can no longer freeze the tank. A small crafted
  sound bank or resource fork could list one sound thousands of times
  and hold the tank up for seconds to minutes, then leave thousands of
  sounds that came back at every launch. Each sound in a file now
  imports once, at most 1,024 per file.
- Fish go to sleep in a tank that opens in the dark. With the light
  timer past its off hour, or the lamp left off, they used to swim all
  night, because they only bedded down after seeing daylight first.
  Fish also settle one at a time, each between 2 and 22 seconds after
  dark, and wake one by one within 11 seconds of dawn, instead of all
  on the same instant.
- A hungry fish between two pellets picks one and eats it. Near the
  midpoint it used to roll back and forth between them, sometimes for a
  minute, while both sank and fouled the water.
- Adding a big fish add-on stalls the tank for less time: decoding
  the gup, discus and angel packs' sprites takes under a third as
  long, which shortens the pause while one goes in.
- At night, the pointer works as a torch. When you hover over the dark
  tank with a mouse or pen, a warm, soft circle of light shows the
  fish and plants under it in their daytime colors while the rest of
  the tank stays moonlit. The beam widens as the night deepens and
  follows the pointer even while the tank is paused.
- The CRT's Geometry group gains three pots. Horizontal skew leans the
  whole picture into a parallelogram, Vertical skew slopes it up or
  down, and Perspective swings it like the tube turning on its stand —
  one edge looming large while the other shrinks back. The Preferences
  window is a little taller to fit them.
- The CRT Softening control now smears only along each scanline, as
  its description says. The rows used to blend into each other at
  every setting, so the whole picture turned soft, and even Sharp and
  Pixel Perfect were slightly blurred. Softening also reaches further:
  the old maximum now sits at 40%, and the rest of the slider widens
  the smear. Your saved setting converts, so the picture looks the
  same as before apart from the sharper rows.
- The tank reopens exactly where you left it, even when part of it was
  off the edge of the screen. It used to be pushed back onto the
  screen at launch.
- The tank window can shrink much smaller: its minimum size is now a
  quarter of the machine case instead of just under half.
- With the CRT effect on, the Height control can now stretch the
  picture to fill the whole screen glass. On machines whose glass is
  taller than the tank, such as the Performa 450, the stretched
  picture used to be cut off by black bars above and below it.
- The tank now lives the way the original AquaZone's did, reimplemented
  from its Mac and Windows engines. Water has a temperature, pH,
  hardness, oxygen, CO2, nitrate, ammonia, chlorine and dissolved food,
  each fish needs the ranges its species' pack records, and time passes
  in real time, including while Finsical is closed. Fish get hungry
  over a day, age over years, and can fall sick with White Spot,
  Tailrot, Bellworm, Chilodonella or Water Mold when their health runs
  down; a sick fish can infect others. Fish that die float belly-up and
  sink, and you are told why they died.
- Tank Stats shows the water and has a heater, Clean Filter, a water
  change with amount and temperature, a medicine cabinet (three remedies
  and five water treatments) and a Time setting from real time to 100
  times faster. The filter is what aerates the water, as in the
  original.
- The tank plays AquaZone's own sound effects. Finsical downloads the
  game's 25 sounds (AZ_WAVES) from the Internet Archive: the first-run
  starter set now includes them, and Import Add-ons lists them under
  Sounds. They play when the original game played them. The filter's
  bubbling loops under everything, and the game's water sound plays
  once as the tank opens. Feeding, tapping the glass by where you tap,
  a fish going in or out, scenery going in, Change Water and the lamp
  switch each have their own sound. Dropping your copy of AZ_WAVES.REZ
  on the tank works too. Water ambience now switches the bubbling;
  Bubble sounds only plays a short bubble sound you add, since the game
  has none for single bubbles. A tank set up before this gets the
  game's sounds once on its next launch; removing them afterwards
  sticks.
- Until your first pack lands, the stand-in fish are a pixel-art guppy
  with a wagging tail instead of a few rectangles.
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
  Each fish now swims as its adult. Small species draw at half the
  art's original size and bigger ones shrink further, so a discus or an
  angelfish stands a quarter of the tank's height instead of nearly
  half, and a bigger species still looks bigger. The art is shrunk with
  a box filter so fins and outlines stay whole, translucent fins
  included. Big fish keep their bodies inside the glass and blow
  bubbles from their mouths.
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
  on, whatever the Lighting setting: Tank > Lamp On (Cmd-L) in the
  app, the L key, or Lamp on in the Lighting pane. It is kept with the
  lighting settings, and Tank Stats says when the lamp is off.
- The water comes alive. It ends at a surface that moves: food, new
  fish, bubbles popping, knocks on the glass and fish cruising along
  the top send waves along it that spread, bounce off the glass and
  settle. A silvery band under the waterline catches the light, and
  above it the back of the tank carries on behind dry air, dimmed and
  drained of color, under the tank's top frame. Just under the surface the view
  wavers, bubbles wobble, grow as they rise and pop where the surface
  is, and by day sunlight slants through the water and shimmering
  caustics ripple over the lower tank and the gravel (the swell and
  shimmer hold still if you prefer reduced motion). Feed Fish scatters a pinch of pellets, one per
  hungry fish, around a spot on the surface; they drift as they sink
  instead of stacking in one column in the middle. Fouled water now
  turns visibly green-brown and murky, with debris drifting in it.
- The water reacts now: knocking on the glass draws an expanding pixel
  ring at the tap, and food (or a newly installed fish) breaks the
  surface with a small splash of droplets. Both effects tick on the
  sim clock and paint as whole pixels, matching the retro bubbles.
- The waterline divides feeding from tapping: a click in the strip of
  air above it drops food, and a click anywhere in the water knocks on
  the glass (feeding used to take the top 15% of the tank). Over the
  air the pointer becomes a crosshair and the waterline brightens.
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
  on All Desktops, remembered across launches. Tank > CRT Effect, Lamp
  On and Mute Sound show a checkmark while on, and CRT Effect is dimmed
  where the effect can't run. Cmd-W on the tank no longer quits the
  app; quit with Cmd-Q.
- The browser shell now has a Mac OS 8 menu bar of its own — Platinum
  bar, pull-down menus and a clock in the corner — with an About
  Finsical window and a shortcuts list. It also opens Preferences and
  Tank Overview, which were reachable only from the native app's menu
  before. Its Tank menu feeds, changes the water, switches the lamp,
  mutes, turns the CRT effect on or off, and takes a picture of the
  tank as a PNG. The native shell keeps its real menu; the bar stays
  hidden there.

- On first launch, a Mac OS 8 alert welcomes you and offers to stock
  the tank: Stock the Tank downloads three fish, a gravel, a plant, a
  background and the game's sound effects (about 2 MB) from the
  Internet Archive, shows its
  progress (Stop ends it), and replaces the four stand-in fish. If the
  download fails, the alert says so and offers Try Again. Knock on the
  glass too often and you get the aquarium's sign: "Please don't tap
  on the glass. It frightens the fish." The console no longer warns
  about the missing bundled pack on every launch.
- Pause the tank with the P key, Tank > Pause Simulation (Cmd-P) or
  the browser's menu bar: hunger, rot, filtration and the day cycle
  stop, a PAUSED banner shows, and resuming doesn't fast-forward. The
  pause is remembered across launches.
- Change Water, in Tank Stats and the Tank menu, recovers most of the
  water quality at once and siphons settled food off the gravel.
- Tank Overview can put another installed gravel or background on
  display with Use; the rows say which one is showing, and your choice
  sticks even through a launch where its pack can't download. Empty
  Tank… removes every fish and add-on after a second click, and an
  emptied tank stays empty after relaunch.
- Point at a fish and a balloon names it and says what it is doing;
  Option-click it for a Get Info card with its hunger and mood that
  follows it around.
- Import Add-ons has a Filter field for the current section. A
  stalled archive.org download gives up after 30 seconds instead of
  hanging, and an add-on that fails to restore at launch is retried in
  the background, and again when the Mac is back online, instead of
  staying missing for the session.
- Aquazone pack files dropped on the tank land in their own section:
  gravel (.grv), plants (.plt), accessories (.acc) and tanks (.azn)
  instead of all as fish. Several files can be dropped at once, an
  unreadable one is skipped instead of stopping the rest, and dropped
  packs are kept, so they come back at every launch until you remove
  them in Tank Overview. Dropping works in browsers without folder
  drops too.
- Removing a sound add-on also removes the sounds it added, including
  ones installed before Finsical kept track.
- Turning the CRT effect on warms the tube up the way a real one does,
  a bright line opening into the picture (skipped with reduced
  motion). The Monitor pane has presets for the tube (Authentic,
  Sharp, Soft and Pixel Perfect) that leave the Picture pane's
  settings alone.
- Tank Stats draws a small history line beside water quality and
  average hunger.
- In the macOS app, sound starts at launch instead of waiting for your
  first click; in a browser, your first click or key starts it.
- Screen readers get a description of the tank, the Overview says it
  is waiting for the tank instead of showing an empty list, and phones
  lay the tank page out at their own width. Standalone web builds now
  include the machine case art.
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
