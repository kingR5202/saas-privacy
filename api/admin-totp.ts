/**
 * Admin TOTP (MFA) Endpoint
 *
 * POST /api/admin-totp
 *
 * Actions:
 *   { action: "status" }                → { totpRequired, totpEnabled }
 *   { action: "setup" }                 → { secret, otpauthUri }
 *   { action: "verify-setup", code }    → { success, adminSession }
 *   { action: "verify", code }          → { success, adminSession }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  setCors,
  setSecurityHeaders,
  getClientIp,
  isIpAllowed,
  isCountryBlocked,
  validateRouteToken,
  checkBruteForce,
  recordLoginAttempt,
  getSupabaseAdmin,
  getBearerToken,
  isAllowedAdminEmail,
  generateTotpSecret,
  buildOtpauthUri,
  verifyTotp,
  encryptSecret,
  decryptSecret,
  issueAdminSession,
} from "./_security";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCors(req, res, "POST, OPTIONS");
  setSecurityHeaders(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const ip = getClientIp(req);

  // ── Security gates ───────────────────────────────────────────
  // Layer 2: IP whitelist (desabilitado — use ADMIN_EMAILS + TOTP para controle de acesso)
  // if (!isIpAllowed(ip)) { ... }
  if (isCountryBlocked(req)) {
    console.log(`[AdminTOTP] Bloqueado por país: ${req.headers["x-vercel-ip-country"]} — IP: ${ip}`);
    return res.status(403).json({ error: "Acesso negado: conexões deste país estão bloqueadas.", layer: "geo_block" });
  }
  if (!validateRouteToken(req)) {
    console.log(`[AdminTOTP] Token de rota inválido de IP: ${ip}`);
    return res.status(403).json({ error: "Acesso negado: token de rota inválido.", layer: "route_token" });
  }

  const bf = await checkBruteForce(ip);
  if (bf.blocked) {
    console.log(`[AdminTOTP] IP bloqueado por força bruta: ${ip} (${bf.failedCount} falhas)`);
    return res
      .status(429)
      .json({ error: `Bloqueado por ${bf.failedCount} tentativas falhas. Acesso liberado em 24h. Limpe a tabela admin_login_attempts no Supabase para desbloquear.`, layer: "brute_force" });
  }

  // ── Auth ─────────────────────────────────────────────────────
  const sb = getSupabaseAdmin();
  if (!sb)
    return res.status(500).json({ error: "Server not configured" });

  const bearer = getBearerToken(req);
  if (!bearer) {
    await recordLoginAttempt(ip, "unknown", false);
    return res.status(401).json({ error: "Missing token" });
  }

  const { data: authData, error: authErr } = await sb.auth.getUser(bearer);
  if (authErr || !authData.user) {
    await recordLoginAttempt(ip, "invalid_token", false);
    return res.status(401).json({ error: "Invalid token" });
  }

  if (!isAllowedAdminEmail(authData.user.email)) {
    console.log(`[AdminTOTP] Email não autorizado: ${authData.user.email} de IP: ${ip}`);
    await recordLoginAttempt(ip, authData.user.email || "", false);
    return res.status(403).json({
      error: `Acesso negado: o email "${authData.user.email}" não está na lista de administradores (ADMIN_EMAILS). Configure esta variável de ambiente no Vercel.`,
      layer: "email_whitelist",
    });
  }

  // ── Route actions ────────────────────────────────────────────
  const { action, code } = req.body || {};

  switch (action) {
    /* ────── status ────── */
    case "status": {
      const { data: fullUser } = await sb.auth.admin.getUserById(
        authData.user.id,
      );
      const meta = fullUser?.user?.app_metadata || {};
      return res.status(200).json({
        totpRequired: !!process.env.TOTP_ENCRYPTION_KEY,
        totpEnabled: meta.totp_verified === true,
      });
    }

    /* ────── setup ────── */
    case "setup": {
      if (!process.env.TOTP_ENCRYPTION_KEY)
        return res
          .status(400)
          .json({ error: "TOTP not configured on server" });

      const secret = generateTotpSecret();
      const otpauthUri = buildOtpauthUri(
        secret.base32,
        authData.user.email || "admin",
      );
      const encrypted = encryptSecret(secret.base32);

      await sb.auth.admin.updateUserById(authData.user.id, {
        app_metadata: { totp_encrypted: encrypted, totp_verified: false },
      });

      return res.status(200).json({
        secret: secret.base32,
        otpauthUri,
      });
    }

    /* ────── verify-setup ────── */
    case "verify-setup": {
      if (!code || typeof code !== "string" || !/^\d{6}$/.test(code))
        return res
          .status(400)
          .json({ error: "Código TOTP inválido (6 dígitos)" });

      const { data: fullUser } = await sb.auth.admin.getUserById(
        authData.user.id,
      );
      const encrypted = fullUser?.user?.app_metadata?.totp_encrypted;
      if (!encrypted)
        return res
          .status(400)
          .json({ error: "TOTP ainda não configurado. Chame setup primeiro." });

      let base32: string;
      try {
        base32 = decryptSecret(encrypted);
      } catch {
        return res.status(500).json({ error: "Erro ao decriptar segredo TOTP" });
      }

      if (!verifyTotp(base32, code)) {
        await recordLoginAttempt(ip, authData.user.email || "", false);
        return res.status(401).json({ error: "Código TOTP incorreto" });
      }

      await sb.auth.admin.updateUserById(authData.user.id, {
        app_metadata: { totp_encrypted: encrypted, totp_verified: true },
      });
      await recordLoginAttempt(ip, authData.user.email || "", true);

      return res.status(200).json({
        success: true,
        adminSession: issueAdminSession(authData.user.id),
      });
    }

    /* ────── verify ────── */
    case "verify": {
      if (!code || typeof code !== "string" || !/^\d{6}$/.test(code))
        return res
          .status(400)
          .json({ error: "Código TOTP inválido (6 dígitos)" });

      const { data: fullUser } = await sb.auth.admin.getUserById(
        authData.user.id,
      );
      const encrypted = fullUser?.user?.app_metadata?.totp_encrypted;
      const verified = fullUser?.user?.app_metadata?.totp_verified;
      if (!encrypted || !verified)
        return res
          .status(400)
          .json({ error: "TOTP não configurado para esta conta" });

      let base32: string;
      try {
        base32 = decryptSecret(encrypted);
      } catch {
        return res.status(500).json({ error: "Erro ao decriptar segredo TOTP" });
      }

      if (!verifyTotp(base32, code)) {
        await recordLoginAttempt(ip, authData.user.email || "", false);
        return res.status(401).json({ error: "Código TOTP incorreto" });
      }

      await recordLoginAttempt(ip, authData.user.email || "", true);

      return res.status(200).json({
        success: true,
        adminSession: issueAdminSession(authData.user.id),
      });
    }

    default:
      return res.status(400).json({ error: "Ação inválida" });
  }
}
