import { staffSession, type StaffSession } from "./session";

export type OwnProfile = StaffSession["user"] & { active: boolean };
export type ProfileField = "email" | "currentPassword" | "newPassword";
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;
export interface OwnCredentialsInput { currentPassword: string; email?: string; newPassword?: string }

export class OwnProfileRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly fieldErrors: ProfileFieldErrors = {}) { super(message); }
}

async function request<T>(input?: OwnCredentialsInput): Promise<T> {
  const response = await fetch("/api/auth/staff/profile", {
    method: input ? "PATCH" : "GET",
    headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}`, ...(input ? { "content-type": "application/json" } : {}) },
    ...(input ? { body: JSON.stringify(input) } : {})
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "No se pudo actualizar el perfil." })) as { message?: string; issues?: { fieldErrors?: Partial<Record<ProfileField, string[]>> } };
    const errors: ProfileFieldErrors = {};
    for (const field of ["email", "currentPassword", "newPassword"] as const) {
      const message = body.issues?.fieldErrors?.[field]?.[0];
      if (message) errors[field] = message;
    }
    throw new OwnProfileRequestError(body.message ?? "No se pudo actualizar el perfil.", response.status, errors);
  }
  return response.json() as Promise<T>;
}

export const getOwnProfile = () => request<OwnProfile>();
export const updateOwnCredentials = (input: OwnCredentialsInput) => request<StaffSession>(input);