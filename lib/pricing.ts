/** Service fee rate charged by TheList on top of host price */
export const SERVICE_FEE_RATE = 0.10;

/** Apply the 10% service fee to a host price */
export function applyServiceFee(hostPrice: number): number {
  return Math.round(hostPrice * (1 + SERVICE_FEE_RATE));
}

/** Calculate just the service fee amount */
export function calcServiceFee(hostPrice: number): number {
  return Math.round(hostPrice * SERVICE_FEE_RATE);
}

/** Format a CLP integer to display string, e.g. "$45.000" */
export function formatCLP(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}
