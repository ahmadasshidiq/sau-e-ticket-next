"use client";

import { useEffect, useRef, useState } from "react";

type UseDebouncedRemoteSearchOptions<TItem> = {
  query: string;
  enabled?: boolean;
  delay?: number;
  deps?: unknown[];
  search: (query: string, signal: AbortSignal) => Promise<TItem[]>;
  onError?: (error: unknown) => void;
};

export function useDebouncedRemoteSearch<TItem>({
  query,
  enabled = true,
  delay = 400,
  deps = [],
  search,
  onError,
}: UseDebouncedRemoteSearchOptions<TItem>) {
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(search);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const result = await searchRef.current(query, controller.signal);
        setItems(result);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setItems([]);
        onErrorRef.current?.(error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [delay, enabled, query, ...deps]);

  return {
    items,
    loading,
    setItems,
  };
}
