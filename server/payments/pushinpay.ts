/**
 * PushinPay payment gateway adapter.
 * Based on the working integration from TELA PRIVACY PUSHINPAY.
 */
import type { PaymentGateway, PixChargeResult, TransactionStatus } from "./gateway";

const PUSHINPAY_API_URL = "https://api.pushinpay.com.br/api";

export class PushinPayGateway implements PaymentGateway {
    name = "pushinpay";
    private apiToken: string;

    constructor(apiToken: string) {
        this.apiToken = apiToken;
    }

    async createPixCharge(amountCents: number, metadata?: Record<string, unknown>): Promise<PixChargeResult> {
        const payload: Record<string, unknown> = {
            value: amountCents,
            ...metadata,
        };

        const response = await fetch(`${PUSHINPAY_API_URL}/pix/cashIn`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${this.apiToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`PushinPay createPix failed (${response.status}): ${text}`);
        }

        const data = await response.json();
        return {
            id: data.id,
            qr_code: data.qr_code,
            qr_code_base64: data.qr_code_base64,
            status: data.status || "pending",
            amount: amountCents,
            raw: data,
        };
    }

    async checkTransactionStatus(transactionId: string): Promise<TransactionStatus> {
        const response = await fetch(`${PUSHINPAY_API_URL}/transactions/${encodeURIComponent(transactionId)}`, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${this.apiToken}`,
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`PushinPay checkStatus failed (${response.status}): ${text}`);
        }

        const data = await response.json();
        const statusMap: Record<string, TransactionStatus["status"]> = {
            paid: "paid",
            expired: "expired",
            pending: "pending",
            cancelled: "failed",
            refunded: "refunded",
        };

        return {
            id: data.id,
            status: statusMap[data.status] || "pending",
            raw: data,
        };
    }
}
