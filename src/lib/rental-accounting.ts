export type RentalSettlementInput = {
  grossRent: number;
  commissionPercent: number;
  maintenanceItems?: Array<{ description: string; quantity: number; unitPrice: number }>;
  otherOwnerDeductions?: number;
};

export function calculateRentalSettlement(input: RentalSettlementInput) {
  const grossRent = Math.max(0, Number(input.grossRent) || 0);
  const commissionPercent = Math.min(100, Math.max(0, Number(input.commissionPercent) || 0));
  const commission = grossRent * (commissionPercent / 100);
  const maintenanceTotal = (input.maintenanceItems || []).reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0),
    0,
  );
  const otherDeductions = Math.max(0, Number(input.otherOwnerDeductions) || 0);
  const ownerNet = grossRent - commission - maintenanceTotal - otherDeductions;
  return { grossRent, commissionPercent, commission, maintenanceTotal, otherDeductions, ownerNet };
}
