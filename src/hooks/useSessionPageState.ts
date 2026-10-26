"use client";

import * as React from "react";

export function useSessionPageState<T extends string>(key: string, initialValue: T, valid: (value: string) => value is T) {
  const [value, setValue] = React.useState<T>(initialValue);
  const [restored, setRestored] = React.useState(false);

  React.useEffect(() => {
    queueMicrotask(() => {
      const saved = window.sessionStorage.getItem(key);
      if (saved && valid(saved)) setValue(saved);
      setRestored(true);
    });
  }, [key, valid]);

  const update = React.useCallback((next: T) => {
    window.sessionStorage.setItem(key, next);
    setValue(next);
  }, [key]);

  return [value, update, restored] as const;
}
