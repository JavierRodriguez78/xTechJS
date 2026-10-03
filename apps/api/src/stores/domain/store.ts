export const STORE_WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type StoreWeekDay = typeof STORE_WEEK_DAYS[number];
export type StoreDayOpeningHours = { day: StoreWeekDay } & (
  { open: true; opensAt: string; closesAt: string } |
  { open: false; opensAt: null; closesAt: null }
);

export interface Store {
  id: string;
  name: string;
  legalName: string | null;
  // Kept as a formatted compatibility field while consumers move to structured address data.
  address: string;
  addressStreet: string;
  addressPostalCode: string;
  addressCity: string;
  addressProvince: string;
  addressCountry: string;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  openingHours: string | null;
  weeklyOpeningHours: StoreDayOpeningHours[] | null;
  invoiceSeriesPrefix: string;
  logoUrl: string | null;
  veriFactuSystemId: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveStoreInput {
  name: string;
  legalName?: string;
  addressStreet: string;
  addressPostalCode: string;
  addressCity: string;
  addressProvince: string;
  addressCountry?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  openingHours?: string;
  weeklyOpeningHours?: StoreDayOpeningHours[];
  invoiceSeriesPrefix: string;
  logoUrl?: string;
  veriFactuSystemId?: string;
  active?: boolean;
}