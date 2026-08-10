import { apiFetch } from "./api";
import { getToken } from "./auth";

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organization: {
    id: string;
    name: string;
  };
};

let cachedToken: string | null = null;
let cached: Promise<CurrentUser> | null = null;

export function getCurrentUser(): Promise<CurrentUser> {
  const token = getToken();
  if (!token) {
    cached = null;
    cachedToken = null;
    return Promise.reject(new Error("Unauthorized"));
  }

  if (!cached || cachedToken !== token) {
    cachedToken = token;
    cached = apiFetch<CurrentUser>("/auth/me").catch((error) => {
      if (cachedToken === token) {
        cached = null;
        cachedToken = null;
      }
      throw error;
    });
  }

  return cached;
}

export function userDisplayName(user: CurrentUser): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function userInitials(user: CurrentUser): string {
  const first = user.firstName.trim().charAt(0);
  const last = user.lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "?";
}
