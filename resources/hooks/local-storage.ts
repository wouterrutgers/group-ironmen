import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  // Add "local-storage" as a valid window event listener target. We use
  // CustomEvent since StorageEvent has a specific purpose already.
  interface WindowEventMap {
    "local-storage": CustomEvent;
  }
}

interface UseLocalStorageProps<Value> {
  /**
   * The local storage key to use.
   */
  key: string;
  /**
   * The default value for the localStorage entry.
   */
  defaultValue: Value;
  /**
   * @param value The value to validate.
   * @returns The parsed valid Value, or undefined if defaultValue should be
   * used instead.
   */
  validator: (value: string | undefined) => Value | undefined;
}

/**
 * Local storage hook that only supports strings.
 */
export const useLocalStorage = <Value extends string | undefined>({
  key,
  defaultValue,
  validator,
}: UseLocalStorageProps<Value>): [Value, (value: Value | undefined) => void] => {
  const propsRef = useRef<UseLocalStorageProps<Value>>({ key, defaultValue, validator });

  const stored = validator(localStorage.getItem(key) ?? undefined);

  const [value, setValue] = useState<Value>(stored ?? defaultValue);

  const handleStorageEvent = useCallback(
    (event: CustomEvent | StorageEvent) => {
      let eventKey: string | undefined = undefined;
      if (event.type === "local-storage") {
        eventKey = (event as CustomEvent<{ key: string }>).detail?.key;
      } else if (event.type === "storage") {
        eventKey = (event as StorageEvent).key ?? undefined;
      }

      if (!eventKey || eventKey !== key) return;

      const rawValue = localStorage.getItem(eventKey) ?? undefined;
      const value = validator(rawValue);
      setValue(value ?? defaultValue);
    },
    [key, validator, defaultValue],
  );

  const set = useCallback(
    (value: Value | undefined) => {
      if (typeof value === "undefined") {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }

      window.dispatchEvent(new CustomEvent("local-storage", { detail: { key } }));
    },
    [key],
  );

  useEffect(() => {
    if (
      propsRef.current?.key === key &&
      propsRef.current?.defaultValue === defaultValue &&
      propsRef.current?.validator === validator
    )
      return;

    console.warn("One or more props changed between renders of useLocalStorage, values will be unexpected.");
  }, [key, defaultValue, validator]);

  useEffect(() => {
    // 'local-storage' is a custom event that we fire for changes within this
    // current window. 'storage' is the builtin event that fires for localStorage
    // changes across window instances.

    window.addEventListener("local-storage", handleStorageEvent);
    window.addEventListener("storage", handleStorageEvent);

    return (): void => {
      window.removeEventListener("local-storage", handleStorageEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [handleStorageEvent]);

  return [value, set];
};
