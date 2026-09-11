/**
 * Shared sentinel/encoding helpers for filter selects that offer an "all"
 * option alongside real entity ids. Real option values are encoded with a
 * prefix so an entity whose `id` happens to equal the sentinel can never
 * collide with it.
 */
export const ALL_VALUE = "all";
const OPTION_PREFIX = "option:";

export function encodeOptionValue(id: string) {
  return `${OPTION_PREFIX}${id}`;
}

export function decodeOptionValue(value: string) {
  return value.slice(OPTION_PREFIX.length);
}
