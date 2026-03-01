/**
 * Payment Gateway abstraction layer.
 * Supports PushinPay, Blackout, and NovaPlex.
 */

export interface PixChargeResult {
    id: string;
    qr_code: string;
    qr_code_base64?: string;
    status: string;
    amount: number;
    raw: Record<string, unknown>;
}

export interface TransactionStatus {
    id: string;
    status: "pending" | "paid" | "expired" | "failed" | "refunded";
    raw: Record<string, unknown>;
}

export interface PaymentGateway {
    name: string;
    createPixCharge(amountCents: number, metadata?: Record<string, unknown>): Promise<PixChargeResult>;
    checkTransactionStatus(transactionId: string): Promise<TransactionStatus>;
}

export type GatewayName = "pushinpay" | "blackout" | "novaplex";

// Registry of gateway implementations
const gateways = new Map<GatewayName, PaymentGateway>();

export function registerGateway(name: GatewayName, gateway: PaymentGateway) {
    gateways.set(name, gateway);
}

export function getGateway(name: GatewayName): PaymentGateway {
    const gw = gateways.get(name);
    if (!gw) throw new Error(`Payment gateway "${name}" not registered or configured`);
    return gw;
}

export function getAvailableGateways(): GatewayName[] {
    return Array.from(gateways.keys());
}
