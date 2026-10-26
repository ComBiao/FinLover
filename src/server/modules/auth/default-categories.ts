import { SHARED_CATEGORY_PRESETS } from '@/shared/contracts';
import type { SystemCategorySeed } from '@/server/shared/ports/categories';

/** Seeded for every new user; the same list shared wallets offer, so both stay in sync. */
export const DEFAULT_CATEGORIES: readonly SystemCategorySeed[] = SHARED_CATEGORY_PRESETS.map(({ name, type, color, icon }) => ({ name, type, color, icon }));
