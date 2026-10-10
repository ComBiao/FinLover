import type { TransactionType } from "@/types/category";

import { delay } from "./mockDelay";
import { readCategories } from "./mockStore";

// TODO(backend): replace with fetch('/api/v1/categories?type=...')
export function getCategories(type?: TransactionType) {
  const categories = readCategories();
  return delay(type ? categories.filter((category) => category.type === type) : categories);
}
