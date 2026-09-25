# How the original AquaZone ran its tank

This is the reference for `core/aquarium/`, Finsical's reimplementation
of the original game's life-support simulation. It records what the
original did, where each rule came from, and where Finsical
deliberately differs.

## Sources and method

- **Mac AquaZone 1.7.9 (68k build).** Its 43 `CODE` segments still carry
  MacsBug debug names for about 3,500 functions (`Sim_Filter`,
  `Calc_Filter_OutO2`, `Spread_Disease`, …). The segments use
  CodeWarrior's far model: a compressed `DATA 0` resource holds the jump
  table, and each segment ends with three delta-coded relocation lists.
  Rebuilding one relocated image makes it decompile in Ghidra with its
  real names. Floating point goes through Apple's SANE trap (`_FP68K`);
  rewriting each `move.w #op,-(sp); _FP68K` into a call to a stub that
  pops its own arguments makes that arithmetic readable too.
- **Windows `AQUAZONE.DLL` (1999).** The same engine, stripped of names,
  but its x87 arithmetic decompiles cleanly with real constants. Routines
  were matched to their Mac twins through the call graph, and the maths
  read from the DLL.
- **Data.** `AQUAZONE.REZ` carries the base tables (water `Watr`, heater
  `HtrI`, filter `FltI`, diseases `SicI`, medicines `DrgI`); every fish
  pack carries its species record `FsTI`, disease list `SuS#` and
  breathing table `FsT2`. `core/data/rsrc.ts` reads the resource map
  those live in.

None of the original's code, art or text ships with Finsical: the
disease names are the common ailment names, the medicines are named for
what they do, and the numbers are reimplemented game rules.

## Time

- Timestamps are real seconds. At speed `s` (0–100, default 1) a real
  second is `s` simulated seconds, so **at the default speed the tank
  runs in real time**: a stomach empties in 18 hours and a fish lives
  for years.
- Every routine is a separate object with its own timestamp. The live
  loop visits one object at a time and passes it the whole minutes it
  has accumulated; a routine that finds nothing whole to apply returns
  "wait" and keeps accumulating. `Aquarium` reproduces this with a clock
  per routine.
- On launch the time since the last save is replayed in six-hour steps
  (`Simulate_All` with the catch-up flag): minimum intervals are waived,
  fish don't chase food and medicines don't act on fish.

## Water

All dissolved substances are **tank totals in mg**; concentration is
total ÷ litres. Setters clamp per litre: chlorine 20, ammonia 10,
nitrate and CO2 100, calcium and magnesium 300, the four nutrients 100,
oxygen to saturation.

| Rule | Original |
| --- | --- |
| Oxygen saturation | table, 9.56 mg/L at 16 °C to 6.83 at 37 °C; warming drives the excess out |
| Hardness | gH = (Ca + Mg) ÷ 13 ÷ litres, 0.1–20 °dH |
| pH | bilinear lookup by gH and CO2 (11 × 12 table), 5–9 |
| Tap water | O2 saturated, CO2 15, chlorine 1.1, Ca 42, Mg 10 mg/L → gH 4, pH 7.0 |
| Chlorine | gasses off linearly: 1.1 mg/L in 4 days lit, 7 dark |
| Heater | 50 W; thermostat moving (minutes ÷ 60) × watts ÷ litres °C toward the target (16–36 °C) |
| **Filter aeration** | adds 2 mg O2 per minute per unit of power (power 50): this is the aeration; there is no air pump |
| Filter biology | removes ammonia at power × efficiency per day, where efficiency rises with dirt to a peak just under 50% and falls to 0 when clogged; **a spotless filter removes none**; ammonia becomes twice its mass in nitrate |
| Filter trapping | traps `power × 8e-5 × (100 − dirt)` of the dissolved nutrients per day; dirt grows by 0.1 × ammonia + 0.15 × nutrients trapped |
| Clean Filter | −5 dirt per cleaning |
| Plants | per (width × height ÷ 1000): O2 ±0.1, CO2 ∓0.01 per day by light; nitrate −0.025 per day in light |
| Uneaten food | dissolves a unit per 10 minutes into protein, carbohydrate, fat, vitamin, Ca and Mg |
| Eaten food | comes back as ammonia, 0.05 mg a unit, a unit per 6 minutes |
| Water change | 1–90%; each total keeps (1 − f) and gains f of tap water; temperature mixes; food, waste and undissolved medicine are scaled by (1 − f) |

## Fish

| Rule | Original |
| --- | --- |
| Stomach | 0.2 × weight units (weight ≈ the sprite's mean side in px); empties in 18 h; a meal gives `30 × eaten ÷ stomach` health points' worth |
| Starvation | once empty, `minutes ÷ 720 × 100` damage (about two weeks to die) |
| Damage | health −= trunc(damage ÷ 20 × (1.2 − vitality ÷ 99)); healing × (1 + vitality ÷ 99), halved while sick |
| Water | per species (FsTI): ideal and survivable band for temperature, pH, gH, CO2, nitrate, ammonia, chlorine, minerals. All ideal: heal `minutes ÷ 600 × 10`. Otherwise each reading outside ideal deals `minutes ÷ 2160 × pct`, where pct is 0 at the ideal edge and 100 at the survivable edge |
| Shock | a jump beyond the species' rate of change: `(Δ ÷ roc) × 250` damage; for temperature a 40% chance of White Spot instead |
| Breathing | O2 −(T × 0.0076 + 0.00496) ÷ 60 × weight × 0.096 ÷ litres per minute; CO2 in step; no oxygen: 60 damage a minute (dead within the hour) |
| Age | vitality rises by up to 30 until 80% of the life span, then falls by 40; past the span, old-age damage kills within about ten days |
| Low health | below the species' sickness threshold a fish swims 1% slower per missing point |
| Death | the body rises belly-up, floats a while, sinks and stays until removed, decaying into ammonia |

Tapping the glass never hurts a fish: the original's stress hit
truncates to zero.

## Disease and medicine

- A fish falls sick when damage leaves it below its species' sickness
  threshold: each such hit has a 1 in 5 chance of a disease from the
  species' `SuS#` list (the five common ones for every stock species).
  There is no background infection chance.
- A disease starts at its severity and grows `growth` points every 12960
  minutes (nine days); each time it grows it may infect the weakest
  healthy fish (`contagion` in 500). Once six hours have built up it
  deals `minutes × amount ÷ 1440` damage. Nothing cures it but
  medicine.

| Disease | Growth | Severity | Contagion |
| --- | --- | --- | --- |
| White Spot | 35 | 18 | 65 |
| Tailrot | 9 | 17 | 35 |
| Bellworm | 10 | 3 | 15 |
| Chilodonella | 13 | 2 | 7 |
| Water Mold | 8 | 5 | 18 |
| Red Rust, Red Rust B, ARDS | Meka species only | | |

- A dose dissolves at 1.2 ml a minute (medicines) or 0.2 ml (water
  treatments). A medicine acts once a release is strong enough for the
  tank (strength × ml ÷ litres ≥ 1): it lowers a matching disease by
  that strength 89% of the time; past 5 it poisons every fish ("Drug
  poisoning"). Its water effects apply per dissolved ml.

| Medicine | Kind | Cures | Per ml |
| --- | --- | --- | --- |
| Water Conditioner | treatment | — | Ca −0.5, Mg −0.08 (softens) |
| Chlorine Remover | treatment | — | chlorine −70, ammonia +2.5, O2 −5 |
| Green Remedy | medicine, strength 6 | White Spot, Tailrot, Bellworm, Chilodonella, Water Mold | O2 −0.05 |
| Methylene Blue | medicine, strength 5 | White Spot, Tailrot, Water Mold | O2 −4.5 |
| Hardness Minus, pH Up, pH Down | treatment | — | Ca/Mg and CO2 |
| Rust Remedy | medicine, strength 5 | Red Rust, Red Rust B | — |

## Where Finsical differs

- **Water damage builds up per reading.** In the original, a reading
  still in its ideal band restarted the shared clock, so one bad reading
  never accumulated enough time to hurt unless it was far past
  survivable. Finsical restarts the clock only when damage lands, the
  rate the formula describes.
- **Sickness grows at its stated rate.** The original re-applied the
  growth for the whole six-hour clock on every visit until a health
  point fell, so past six hours a disease grew, and rolled contagion,
  every minute: a tank could go from one sick fish to all sick within
  the half hour. Finsical grows it by `growth` per nine days.
- **Old age builds up.** The original applied old age in 11-minute
  steps that each truncated to no damage, so outside catch-up an old
  fish never died of it. Finsical accumulates it, killing within about
  ten days of the life span as the formula describes.
- **A dose banks at most an hour.** A dose too weak for the tank waits,
  as in the original, but a top-up no longer releases the whole backlog
  at once as an overdose.
- **Waste breaks down linearly.** The original measured its waste from
  when it first appeared, so release sped up with age; Finsical uses the
  intended rate of a unit per six minutes.
- **Medicine during catch-up** dissolves into the water without acting
  on fish; the original kept it undissolved and then released the whole
  dose at once as an overdose.
- **The heater keeps regulating after a water change**; the original
  dropped its thermostat object until the tank was reloaded.
- **New tanks start with aged water** (no chlorine), so a first tank
  doesn't poison its fish; water changes bring fresh chlorine as in the
  original.
- **Breeding is paced, not modelled.** The original's Start_Coupling
  gives each female one try a tank day once she is breedAge days old:
  15 in 100 to couple, then 50% to conceive, so a healthy pair has
  young about every 13 tank days, after a gestation or egg time.
  Finsical rolls the same odds once a tank day for each species with a
  healthy pair of breeding age, and the fry arrives at once: fish have
  no sex, and there are no couplings, eggs or pregnancies yet.
- **Not yet reimplemented:** the rest of breeding (courtship, eggs,
  pregnancy, genetics), fighting, the auto feeder, sickness pictures
  and the Mekasia story mail.
