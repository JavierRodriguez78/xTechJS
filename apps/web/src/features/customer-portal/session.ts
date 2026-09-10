import { ref } from "vue";

export interface CustomerSession {
  accessToken: string;
  user: { id: string; displayName: string; email: string; role: "customer" };
}

const storageKey = "xtechjs.customer-session";
function readSession(): CustomerSession | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value ? JSON.parse(value) as CustomerSession : null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export const customerSession = ref<CustomerSession | null>(readSession());

export async function signInCustomer(email: string, password: string): Promise<void> {
  const response = await fetch("/api/auth/customer/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error("Credenciales de cliente no validas.");
  const session = await response.json() as CustomerSession;
  localStorage.setItem(storageKey, JSON.stringify(session));
  customerSession.value = session;
}

export function signOutCustomer(): void {
  localStorage.removeItem(storageKey);
  customerSession.value = null;
}
