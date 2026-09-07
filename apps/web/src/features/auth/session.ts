import { ref } from "vue";

export type StaffRole = "admin" | "technician";

export interface StaffSession {
  accessToken: string;
  user: {
    id: string;
    displayName: string;
    email: string;
    role: StaffRole;
  };
}

const storageKey = "xtechjs.staff-session";

function readSession(): StaffSession | null {
  try {
    const value = localStorage.getItem(storageKey);
    if (!value) return null;
    const session = JSON.parse(value) as StaffSession;
    return session.accessToken && (session.user.role === "admin" || session.user.role === "technician") ? session : null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export const staffSession = ref<StaffSession | null>(readSession());

export async function signIn(email: string, password: string): Promise<void> {
  const response = await fetch("/api/auth/staff/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error("Credenciales no validas para el portal interno.");

  const session = await response.json() as StaffSession;
  if (session.user.role !== "admin" && session.user.role !== "technician") {
    throw new Error("Esta cuenta no tiene acceso al portal interno.");
  }
  localStorage.setItem(storageKey, JSON.stringify(session));
  staffSession.value = session;
}

export function signOut(): void {
  localStorage.removeItem(storageKey);
  staffSession.value = null;
}