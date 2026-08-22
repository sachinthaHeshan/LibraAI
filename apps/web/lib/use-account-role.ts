"use client";

import { useSyncExternalStore } from "react";

import { type AccountRole, getTokenRole } from "./auth";

function subscribe() {
  return () => {};
}

/** Null on the server, so server and first client render match. */
export function useAccountRole(): AccountRole | null {
  return useSyncExternalStore(subscribe, () => getTokenRole(), () => null);
}
