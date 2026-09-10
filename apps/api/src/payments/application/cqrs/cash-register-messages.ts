export class OpenCashRegisterCommand { constructor(public readonly businessDate: string) {} }
export class GetCashRegisterQuery { constructor(public readonly businessDate: string) {} }
export class CloseCashRegisterCommand { constructor(public readonly businessDate: string) {} }
