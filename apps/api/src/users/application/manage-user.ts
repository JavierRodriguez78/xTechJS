import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { User, UserCredentials } from "../domain/user.js";
import type { UserRepository, UserUpdate } from "./user-repository.js";

export interface ManageEmployeeInput {
  email: string;
  displayName: string;
  role: User["role"];
  password?: string;
  defaultStoreId?: string | null;
  storeAccess?: string[] | null;
  phone?: string | null;
  nationalId?: string | null;
  addressStreet?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  addressCountry?: string | null;
}

function validateStoreAccess(role: User["role"], defaultStoreId: string | null, storeAccess: string[] | null): void {
  if (role === "technician" && (!storeAccess?.length || !defaultStoreId || !storeAccess.includes(defaultStoreId))) throw new Error("Selecciona al menos una tienda e incluyela como tienda por defecto.");
  if (role === "admin" && storeAccess !== null && (!storeAccess.length || !defaultStoreId || !storeAccess.includes(defaultStoreId))) throw new Error("Un administrador con alcance limitado debe tener tienda por defecto incluida en sus accesos.");
  if (storeAccess && new Set(storeAccess).size !== storeAccess.length) throw new Error("No repitas tiendas en el acceso del empleado.");
}

@Traceable("ManageUser")
@Service()
export class ManageUser {
  constructor(@Qualifier("userRepository") private readonly userRepository: UserRepository) {}

  async create(input: ManageEmployeeInput & { storeId?: string | null }, actorId?: string): Promise<User> {
    const email = input.email.trim().toLowerCase();
    if (!input.password || input.password.length < 12 || Buffer.byteLength(input.password, "utf8") > 72) throw new Error("La contrasena debe tener al menos 12 caracteres y como maximo 72 bytes.");
    const defaultStoreId = input.defaultStoreId ?? input.storeId ?? null;
    const storeAccess = input.storeAccess === undefined
      ? input.role === "admin" && !defaultStoreId ? null : defaultStoreId ? [defaultStoreId] : []
      : input.storeAccess;
    validateStoreAccess(input.role, defaultStoreId, storeAccess);
    if (await this.userRepository.findByEmail(email)) throw new Error("User email already exists");
    const isStaff = input.role === "admin" || input.role === "technician";
    const user: UserCredentials = {
      id: randomUUID(), email, displayName: input.displayName.trim(), role: input.role,
      storeId: defaultStoreId, defaultStoreId, storeAccess, active: true,
      phone: input.phone?.trim() || null, nationalId: input.nationalId?.trim() || null,
      addressStreet: input.addressStreet?.trim() || null, addressPostalCode: input.addressPostalCode?.trim() || null,
      addressCity: input.addressCity?.trim() || null, addressProvince: input.addressProvince?.trim() || null,
      addressCountry: input.addressCountry?.trim() || (isStaff ? "España" : null), hiredAt: isStaff ? new Date() : null,
      deactivatedAt: null, passwordHash: await hash(input.password, 12)
    };
    const created = await this.userRepository.create(user);
    if (actorId && isStaff) await this.userRepository.recordAuditLog(actorId, created.id, "employee.created");
    return created;
  }

  async update(id: string, input: Partial<ManageEmployeeInput> & { storeId?: string | null; active?: boolean; password?: string }, actorId?: string): Promise<User | undefined> {
    const current = await this.userRepository.findById(id);
    if (!current) return undefined;
    const previousRole = current.role;
    const previousActive = current.active;
    const previousDefaultStoreId = current.defaultStoreId ?? current.storeId ?? null;
    const previousStoreAccess = current.storeAccess !== undefined ? (current.storeAccess ? [...current.storeAccess] : null) : previousDefaultStoreId ? [previousDefaultStoreId] : current.role === "admin" ? null : [];
    const nextRole = input.role ?? current.role;
    const defaultStoreId = input.defaultStoreId !== undefined ? input.defaultStoreId : input.storeId !== undefined ? input.storeId : current.defaultStoreId ?? current.storeId ?? null;
    const storeAccess = input.storeAccess !== undefined ? input.storeAccess : current.storeAccess !== undefined ? current.storeAccess : (defaultStoreId ? [defaultStoreId] : nextRole === "admin" ? null : []);
    validateStoreAccess(nextRole, defaultStoreId, storeAccess);
    const email = input.email?.trim().toLowerCase();
    if (email && email !== current.email && await this.userRepository.findByEmail(email)) throw new Error("User email already exists");
    const update: UserUpdate = {
      ...(email === undefined ? {} : { email }),
      ...(input.displayName === undefined ? {} : { displayName: input.displayName.trim() }),
      ...(input.role === undefined ? {} : { role: input.role }),
      ...(input.defaultStoreId === undefined && input.storeId === undefined ? {} : { defaultStoreId, storeId: defaultStoreId }),
      ...(input.storeAccess === undefined && input.defaultStoreId === undefined && input.storeId === undefined ? {} : { storeAccess }),
      ...(input.phone === undefined ? {} : { phone: input.phone?.trim() || null }),
      ...(input.nationalId === undefined ? {} : { nationalId: input.nationalId?.trim() || null }),
      ...(input.addressStreet === undefined ? {} : { addressStreet: input.addressStreet?.trim() || null }),
      ...(input.addressPostalCode === undefined ? {} : { addressPostalCode: input.addressPostalCode?.trim() || null }),
      ...(input.addressCity === undefined ? {} : { addressCity: input.addressCity?.trim() || null }),
      ...(input.addressProvince === undefined ? {} : { addressProvince: input.addressProvince?.trim() || null }),
      ...(input.addressCountry === undefined ? {} : { addressCountry: input.addressCountry?.trim() || null }),
      ...(input.active === undefined ? {} : { active: input.active, deactivatedAt: input.active ? null : previousActive ? new Date() : current.deactivatedAt ?? new Date() })
    };
    if (input.password) {
      if (input.password.length < 12 || Buffer.byteLength(input.password, "utf8") > 72) throw new Error("La contrasena debe tener al menos 12 caracteres y como maximo 72 bytes.");
      update.passwordHash = await hash(input.password, 12);
    }
    const updated = await this.userRepository.update(id, update);
    if (updated && actorId) {
      const actions = new Set<string>();
      const sameAccess = previousStoreAccess === null ? storeAccess === null : storeAccess !== null && previousStoreAccess.length === storeAccess.length && previousStoreAccess.every((storeId) => storeAccess.includes(storeId));
      if (input.role !== undefined && input.role !== previousRole) actions.add("employee.role.changed");
      if (defaultStoreId !== previousDefaultStoreId || !sameAccess) actions.add("employee.stores.changed");
      if (previousActive && input.active === false) actions.add("employee.deactivated");
      if (!previousActive && input.active === true) actions.add("employee.reactivated");
      for (const action of actions) await this.userRepository.recordAuditLog(actorId, id, action);
    }
    return updated;
  }

}