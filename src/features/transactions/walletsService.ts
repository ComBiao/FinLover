import { delay } from "./mockDelay";
import { readWallets } from "./mockStore";

// TODO(backend): replace with fetch('/api/v1/wallets')
export function getWallets() {
  return delay(readWallets());
}
