import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairOrderListOptions, RepairOrderPage, RepairOrderRepository } from "./repair-order-repository.js";

@Traceable("ListRepairOrders")
@Service()
export class ListRepairOrders {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository) {}

  execute(options: RepairOrderListOptions): Promise<RepairOrderPage> {
    return this.repairOrderRepository.findPage(options);
  }
}