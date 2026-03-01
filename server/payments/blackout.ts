/**
 * Blackout (BlackPayments) gateway adapter.
 */
import type { PaymentGateway, PixChargeResult, TransactionStatus } from "./gateway";

const BLACKOUT_API_URL = "https://api.blackpayments.com.br/api/v1";

export class BlackoutGateway implements PaymentGateway {
    name = "blackout";
    private publicKey: string;
    private secretKey: string;

    constructor(publicKey: string, secretKey: string) {
        this.publicKey = publicKey;
        this.secretKey = secretKey;
    }

    async createPixCharge(amountCents: number, metadata?: Record<string, unknown>): Promise<PixChargeResult> {
        // Authenticate first
        const authRes = await fetch(`${BLACKOUT_API_URL}/auth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                public_key: this.publicKey,
                secret_key: this.secretKey,
            }),
        });

        if (!authRes.ok) {
            throw new Error(`Blackout auth failed (${authRes.status})`);
        }

        const authData = await authRes.json();
        const token = authData.token || authData.access_token;

        // Create deposit/charge
        const payload: Record<string, unknown> = {
            amount: amountCents,
            currency: "BRL",
            payment_method: "pix",
            ...metadata,
        };

        const response = await fetch(`${BLACKOUT_API_URL}/deposits`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Blackout createPix failed (${response.status}): ${text}`);
        }

        const data = await response.json();
        return {
            id: data.id || data.transaction_id,
            qr_code: data.qr_code || data.pix_code || data.emv,
            qr_code_base64: data.qr_code_base64 || data.qr_code_image,
            status: "pending",
            amount: amountCents,
            raw: data,
        };
    }

    async checkTransactionStatus(transactionId: string): Promise<TransactionStatus> {
        // Re-authenticate
        const authRes = await fetch(`${BLACKOUT_API_URL}/auth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                public_key: this.publicKey,
                secret_key: this.secretKey,
            }),
        });

        const authData = await authRes.json();
        const token = authData.token || authData.access_token;

        const response = await fetch(`${BLACKOUT_API_URL}/deposits/${transactionId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Blackout checkStatus failed (${response.status})`);
        }

        const data = await response.json();
        const status = (data.status || "").toLowerCase();
        const statusMap: Record<string, TransactionStatus["status"]> = {
            completed: "paid",
            paid: "paid",
            approved: "paid",
            expired: "expired",
            pending: "pending",
            failed: "failed",
            refunded: "refunded",
        };

        return {
            id: transactionId,
            status: statusMap[status] || "pending",
            raw: data,
        };
    }
}
