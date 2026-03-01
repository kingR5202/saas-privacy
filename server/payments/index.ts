/**
 * Payment module bootstrap.
 * Registers all available gateways based on environment variables.
 */
import { registerGateway } from "./gateway";
import { PushinPayGateway } from "./pushinpay";
import { BlackoutGateway } from "./blackout";
import { NovaplexGateway } from "./novaplex";

export function initPaymentGateways() {
    // PushinPay
    const pushinToken = process.env.PUSHINPAY_API_TOKEN;
    if (pushinToken) {
        registerGateway("pushinpay", new PushinPayGateway(pushinToken));
        console.log("[Payments] PushinPay gateway registered");
    }

    // Blackout
    const blackoutPub = process.env.BLACKOUT_PUBLIC_KEY;
    const blackoutSec = process.env.BLACKOUT_SECRET_KEY;
    if (blackoutPub && blackoutSec) {
        registerGateway("blackout", new BlackoutGateway(blackoutPub, blackoutSec));
        console.log("[Payments] Blackout gateway registered");
    }

    // NovaPlex
    const novaplexKey = process.env.NOVAPLEX_API_KEY;
    const novaplexSec = process.env.NOVAPLEX_API_SECRET;
    if (novaplexKey && novaplexSec) {
        registerGateway("novaplex", new NovaplexGateway(novaplexKey, novaplexSec));
        console.log("[Payments] NovaPlex gateway registered");
    }
}

export { getGateway, getAvailableGateways } from "./gateway";
export type { PixChargeResult, TransactionStatus, GatewayName } from "./gateway";
