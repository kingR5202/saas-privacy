/**
 * NovaPlex payment gateway adapter.
 */
import type { PaymentGateway, PixChargeResult, TransactionStatus } from "./gateway";

const NOVAPLEX_API_URL = "https://api.novaplex.com.br/api/v1";

export class NovaplexGateway implements PaymentGateway {
    name = "novaplex";
    private apiKey: string;
    private apiSecret: string;

    constructor(apiKey: string, apiSecret: string) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    async createPixCharge(amountCents: number, metadata?: Record<string, unknown>): Promise<PixChargeResult> {
        // Authenticate
        const authRes = await fetch(`${NOVAPLEX_API_URL}/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: this.apiKey,
                api_secret: this.apiSecret,
            }),
        });

        if (!authRes.ok) {
            throw new Error(`NovaPlex auth failed (${authRes.status})`);
        }

        const authData = await authRes.json();
        const token = authData.token || authData.access_token;

        // Create PIX charge
        const payload: Record<string, unknown> = {
            amount: amountCents,
            currency: "BRL",
            method: "pix",
            ...metadata,
        };

        const response = await fetch(`${NOVAPLEX_API_URL}/transactions/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`NovaPlex createPix failed (${response.status}): ${text}`);
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
        const authRes = await fetch(`${NOVAPLEX_API_URL}/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: this.apiKey,
                api_secret: this.apiSecret,
            }),
        });

        const authData = await authRes.json();
        const token = authData.token || authData.access_token;

        const response = await fetch(`${NOVAPLEX_API_URL}/transactions/${transactionId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`NovaPlex checkStatus failed (${response.status})`);
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
