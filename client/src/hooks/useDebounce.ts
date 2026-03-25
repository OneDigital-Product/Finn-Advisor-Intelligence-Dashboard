import { useRef, useCallback } from "react";

export function useDebounce<T>(callback: (value: T) => void, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  return useCallback(
    (value: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(value), delay);
    },
    [callback, delay]
  );
}
