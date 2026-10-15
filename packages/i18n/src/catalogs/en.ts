import type { MessageKey } from "../keys";
import { EN } from "../keys";

/**
 * The English catalogue is the source object itself, not a copy.
 *
 * WHY: duplicating the strings would create a second place to forget to update,
 * and the test that proves the other thirteen locales are complete would then
 * be checking a copy rather than the thing the app renders. `EN` is already
 * frozen in `keys.ts`, so re-exporting it cannot hand a mutable map to a
 * caller.
 */
export const en: Record<MessageKey, string> = EN;
