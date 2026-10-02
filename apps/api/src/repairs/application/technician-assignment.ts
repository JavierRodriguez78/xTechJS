import type { UserRepository } from "../../users/application/user-repository.js";

export async function assertActiveTechnician(userRepository: UserRepository, technicianId: string): Promise<void> {
  const technician = await userRepository.findById(technicianId);
  if (!technician?.active || technician.role !== "technician") throw new Error("Assigned user must be an active technician");
}