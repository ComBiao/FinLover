"use client";

import * as React from "react";

export function useSessionPageState<T extends string>(key: string, initialValue: T, valid: (value: string) => value is T) {
  const [value, setValue] = React.useState<T>(initialValue);
  const [restored, setRestored] = React.useState(false);

  React.useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.sessionStorage.getItem(key);
        if (saved && valid(saved)) setValue(saved);
      } catch (error) {
        console.warn(`Could not restore ${key} from session storage`, error);
      } finally {
        setRestored(true);
      }
    });
  }, [key, valid]);

  const update = React.useCallback((next: T) => {
    try {
      window.sessionStorage.setItem(key, next);
    } catch (error) {
      console.warn(`Could not save ${key} to session storage`, error);
    }
    setValue(next);
  }, [key]);

  return [value, update, restored] as const;
}
