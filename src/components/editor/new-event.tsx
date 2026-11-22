"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { EventEditor } from "./event-editor";

const subscribe = () => () => {};

/**
 * The create flow starts from browser-only state (the saved draft and the
 * host’s timezone), so the editor mounts after hydration and the server
 * sends a skeleton in its place.
 */
export function NewEventEditor({ hostName, aiEnabled, fallback }: { hostName: string; aiEnabled: boolean; fallback: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated) return fallback;
  return <EventEditor mode="create" hostName={hostName} aiEnabled={aiEnabled} />;
}
