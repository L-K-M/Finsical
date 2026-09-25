/**
 * Feeding thresholds shared by the sim and the pages that describe it,
 * so Stats and Overview labels track what the fish actually do.
 */

/** Hunger above which a fish goes looking for food. */
export const HUNGER_SEEK = 0.4;
/** Below this water quality fish lose their appetite and stop seeking. */
export const QUALITY_SEEK = 0.3;
/** Hunger a newly added fish starts with: just past HUNGER_SEEK, so it
 * takes the first pellets a new owner drops instead of ignoring them
 * for minutes. */
export const SPAWN_HUNGER = HUNGER_SEEK + 0.05;
/** Soft population limit: the original kept tanks small, and past this
 * the water reads as soup while every save bloats. */
export const FISH_CAP = 24;
