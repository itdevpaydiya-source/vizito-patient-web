/** Patient-facing labels only; request payloads retain the backend enums. */
export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return 'Not recorded';
  return ({CASH:'Cash',UPI:'UPI',CARD:'Card',NET_BANKING:'Net banking',WALLET:'Wallet'} as Record<string,string>)[method.toUpperCase()] || method;
}
export const shortOrderId = (id: string): string => `#${id.slice(0,8).toUpperCase()}`;
