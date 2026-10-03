export class OpenCashRegisterCommand { constructor(public readonly businessDate: string, public readonly storeId: string) {} }
export class GetCashRegisterQuery { constructor(public readonly businessDate: string, public readonly storeId: string) {} }
export class CloseCashRegisterCommand { constructor(public readonly businessDate: string, public readonly storeId: string) {} }
