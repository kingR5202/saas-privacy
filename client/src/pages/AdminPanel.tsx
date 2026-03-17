import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Copy,
  CheckCircle2,
  Shield,
  AlertTriangle,
} from "lucide-react";

type AdminStats = {
  totalUsers: number;
  totalProfiles: number;
  totalPixGenerated: number;
  totalPixPaid: number;
  totalAmount: number;
  activeCreators: number;
};

type AdminUser = {
  userId: string;
  profiles: number;
  totalPixGenerated: number;
  totalPixPaid: number;
  totalAmount: number;
};

type AdminTx = {
  id: number;
  subscriberId: string;
  profileId: number;
  paymentGateway: string;
  amountInCents: number;
  status: string;
  createdAt: string;
};

type AccessLog = {
  id: number;
  ip_address: string;
  user_email: string | null;
  success: boolean;
  attempted_at: string;
};

type ViewState =
  | "loading"
  | "totp-setup"
  | "totp-verify"
  | "dashboard"
  | "error";

const ROUTE_TOKEN = import.meta.env.VITE_ADMIN_ROUTE_TOKEN || "";

function formatSecret(s: string): string {
  return s.replace(/(.{4})/g, "$1 ").trim();
}

export default function AdminPanel() {
  const { user, session, loading: authLoading, signOut } = useSupabaseAuth();
  const [, navigate] = useLocation();

  const [view, setView] = useState<ViewState>("loading");
  const [error, setError] = useState("");

  // Dashboard data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTx[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [currentIp, setCurrentIp] = useState("");

  // TOTP
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Admin session (post-TOTP)
  const [adminSession, setAdminSessionState] = useState(
    () => sessionStorage.getItem("_as") || "",
  );
  const setAdminSession = useCallback((token: string) => {
    setAdminSessionState(token);
    if (token) sessionStorage.setItem("_as", token);
    else sessionStorage.removeItem("_as");
  }, []);

  const headers = useCallback(
    (extra?: Record<string, string>) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
      "x-admin-token": ROUTE_TOKEN,
      "x-admin-session": sessionStorage.getItem("_as") || "",
      ...extra,
    }),
    [session?.access_token],
  );

  // ── Redirect if not authenticated ──────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // ── Init: check TOTP status or load data ───────────────────
  useEffect(() => {
    if (!session?.access_token) return;

    (async () => {
      // Try loading admin data with existing session
      const existing = sessionStorage.getItem("_as");
      if (existing) {
        const ok = await loadAdminData();
        if (ok) return;
        setAdminSession("");
      }

      // Check TOTP status
      try {
        const res = await fetch("/api/admin-totp", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ action: "status" }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d?.error || "Acesso negado");
          setView("error");
          return;
        }
        const d = await res.json();
        if (d.totpRequired) {
          setView(d.totpEnabled ? "totp-verify" : "totp-setup");
        } else {
          await loadAdminData();
        }
      } catch {
        setError("Falha ao verificar status MFA");
        setView("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  // ── Load admin dashboard data ──────────────────────────────
  async function loadAdminData(): Promise<boolean> {
    try {
      const res = await fetch("/api/admin", { headers: headers() });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.error === "TOTP_REQUIRED") {
          setView(d.totpSetupNeeded ? "totp-setup" : "totp-verify");
          return false;
        }
        setError(d?.error || "Acesso negado");
        setView("error");
        return false;
      }
      const d = await res.json();
      setStats(d.stats);
      setUsers(d.users || []);
      setTransactions(d.transactions || []);
      setAccessLogs(d.accessLogs || []);
      setCurrentIp(d.currentIp || "");
      setView("dashboard");
      return true;
    } catch {
      setError("Falha ao carregar dados");
      setView("error");
      return false;
    }
  }

  // ── TOTP setup: generate secret ────────────────────────────
  async function handleSetup() {
    setTotpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin-totp", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "setup" }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d?.error || "Erro ao gerar segredo");
        return;
      }
      setTotpSecret(d.secret);
    } catch {
      setError("Falha de conexão");
    } finally {
      setTotpLoading(false);
    }
  }

  // ── TOTP verify (setup confirmation or login) ──────────────
  async function handleVerify(isSetup: boolean) {
    if (totpCode.length !== 6) return;
    setTotpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin-totp", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          action: isSetup ? "verify-setup" : "verify",
          code: totpCode,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d?.error || "Código inválido");
        setTotpCode("");
        return;
      }
      setAdminSession(d.adminSession);
      setTotpCode("");
      await loadAdminData();
    } catch {
      setError("Falha de verificação");
    } finally {
      setTotpLoading(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────
  const conversion = useMemo(() => {
    if (!stats || stats.totalPixGenerated === 0) return 0;
    return Math.round((stats.totalPixPaid / stats.totalPixGenerated) * 100);
  }, [stats]);

  async function copySecret() {
    await navigator.clipboard.writeText(totpSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ══════════════════════════════════════════════════════════
  // Renders
  // ══════════════════════════════════════════════════════════

  if (authLoading || view === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // ── Error / Access Denied ──────────────────────────────────
  if (view === "error") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-6 bg-slate-900 border-slate-800">
          <div className="flex items-start gap-3 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <h1 className="text-lg font-bold text-white">
                Acesso administrativo bloqueado
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Sua conta não está autorizada ou o acesso foi bloqueado.
              </p>
            </div>
          </div>
          <p className="text-sm text-red-400 mb-4">{error || "Forbidden"}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar
            </Button>
            <Button
              className="bg-slate-700 hover:bg-slate-600"
              onClick={async () => {
                await signOut();
                navigate("/auth");
              }}
            >
              Trocar conta
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── TOTP Setup ─────────────────────────────────────────────
  if (view === "totp-setup") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6 bg-slate-900 border-slate-800 space-y-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-lg font-bold">
              Configurar Autenticação MFA
            </h1>
          </div>

          <p className="text-sm text-slate-400">
            Para proteger o painel admin, configure o Google Authenticator (ou
            app TOTP compatível).
          </p>

          {!totpSecret ? (
            <Button
              onClick={handleSetup}
              disabled={totpLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {totpLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="w-4 h-4 mr-2" />
              )}
              Gerar Chave Secreta
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  1. Copie esta chave e adicione ao Google Authenticator
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-800 text-emerald-300 px-3 py-2 rounded text-sm font-mono tracking-wider select-all">
                    {formatSecret(totpSecret)}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copySecret}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  2. Digite o código de 6 dígitos do app
                </p>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="text-center text-2xl tracking-[0.5em] font-mono bg-slate-800 border-slate-700"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <Button
                onClick={() => handleVerify(true)}
                disabled={totpCode.length !== 6 || totpLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {totpLoading && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Verificar e Ativar MFA
              </Button>
            </>
          )}

          {error && !totpSecret && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </Card>
      </div>
    );
  }

  // ── TOTP Verify ────────────────────────────────────────────
  if (view === "totp-verify") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-sm w-full p-6 bg-slate-900 border-slate-800 space-y-5">
          <div className="flex items-center gap-3">
            <KeyRound className="w-6 h-6 text-orange-400" />
            <h1 className="text-lg font-bold">Verificação MFA</h1>
          </div>

          <p className="text-sm text-slate-400">
            Digite o código de 6 dígitos do Google Authenticator.
          </p>

          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={totpCode}
            autoFocus
            onChange={(e) =>
              setTotpCode(e.target.value.replace(/\D/g, ""))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && totpCode.length === 6)
                handleVerify(false);
            }}
            className="text-center text-2xl tracking-[0.5em] font-mono bg-slate-800 border-slate-700"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            onClick={() => handleVerify(false)}
            disabled={totpCode.length !== 6 || totpLoading}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {totpLoading && (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            )}
            Verificar
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Sessão expira em 30 minutos
          </p>
        </Card>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────
  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Seguro</h1>
            <p className="text-slate-400 text-sm">
              Autenticado como {user.email}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              setAdminSession("");
              await signOut();
              navigate("/auth");
            }}
          >
            Sair
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-slate-900 border-slate-800">
            <p className="text-xs text-slate-400">Usuarios</p>
            <p className="text-2xl font-black mt-1">{stats.totalUsers}</p>
            <Users className="w-4 h-4 text-blue-400 mt-2" />
          </Card>
          <Card className="p-4 bg-slate-900 border-slate-800">
            <p className="text-xs text-slate-400">Perfis</p>
            <p className="text-2xl font-black mt-1">{stats.totalProfiles}</p>
            <Activity className="w-4 h-4 text-violet-400 mt-2" />
          </Card>
          <Card className="p-4 bg-slate-900 border-slate-800">
            <p className="text-xs text-slate-400">PIX</p>
            <p className="text-2xl font-black mt-1">
              {stats.totalPixGenerated}
            </p>
            <p className="text-xs text-emerald-400 mt-1">
              {conversion}% conversao
            </p>
          </Card>
          <Card className="p-4 bg-slate-900 border-slate-800">
            <p className="text-xs text-slate-400">Vendas</p>
            <p className="text-2xl font-black mt-1">
              R$ {(stats.totalAmount / 100).toFixed(2)}
            </p>
            <DollarSign className="w-4 h-4 text-emerald-400 mt-2" />
          </Card>
        </div>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Usuarios (resumo)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-2">User ID</th>
                  <th className="text-right py-2">Perfis</th>
                  <th className="text-right py-2">PIX</th>
                  <th className="text-right py-2">Pagos</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.userId}
                    className="border-b border-slate-800/60"
                  >
                    <td className="py-2 font-mono text-xs">{u.userId}</td>
                    <td className="py-2 text-right">{u.profiles}</td>
                    <td className="py-2 text-right">
                      {u.totalPixGenerated}
                    </td>
                    <td className="py-2 text-right">{u.totalPixPaid}</td>
                    <td className="py-2 text-right">
                      R$ {(u.totalAmount / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" /> Registro de Acessos ao Admin
            {currentIp && <span className="text-xs text-slate-500 font-normal ml-auto">Seu IP: {currentIp}</span>}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-2">Data/Hora</th>
                  <th className="text-left py-2">IP</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {accessLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">
                      Nenhum registro ainda
                    </td>
                  </tr>
                )}
                {accessLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800/60">
                    <td className="py-2 text-xs">
                      {new Date(log.attempted_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 font-mono text-xs">{log.ip_address}</td>
                    <td className="py-2 text-xs">{log.user_email || "-"}</td>
                    <td className="py-2">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Sucesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400">
                          <AlertTriangle className="w-3 h-3" /> Falhou
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <h2 className="font-semibold mb-3">Ultimas transacoes</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Gateway</th>
                  <th className="text-right py-2">Valor</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-800/60"
                  >
                    <td className="py-2">#{t.id}</td>
                    <td className="py-2">{t.paymentGateway || "-"}</td>
                    <td className="py-2 text-right">
                      R$ {((t.amountInCents || 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-2">{t.status}</td>
                    <td className="py-2">
                      {new Date(t.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
