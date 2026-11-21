import { useEffect, useState } from "react";

type LoadState<T> = { data: T | null; error: string | null; loading: boolean };

/**
 * Load data for a screen, with loading / error states and pull-to-refresh.
 * `deps`: when any of them changes, the data is loaded again.
 * State is only set when the request finishes (never synchronously inside the
 * effect), as the React Compiler's rules ask.
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<LoadState<T>>({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify(deps);

  useEffect(() => {
    let current = true; // ignore answers that arrive after the screen moved on
    load().then(
      (data) => current && setState({ data, error: null, loading: false }),
      (e: unknown) => current && setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Something went wrong", loading: false })),
    );
    return () => {
      current = false;
    };
    // `load` is a new function on every render; `key` and `attempt` say when to load again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return {
    ...state,
    reload: () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      setAttempt((n) => n + 1);
    },
    setData: (data: T) => setState((s) => ({ ...s, data })),
  };
}
