import { useEffect, useMemo, useState } from "react";
import { useSupabaseAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Users, DollarSign, Activity, BarChart3 } from "lucide-react";

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

export default function AdminPanel() {
  const { user, session, loading: authLoading, signOut } = useSupabaseAuth();
  const [, navigate] = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTx[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    async function load() {
      if (!session?.access_token) return;
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/admin", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Acesso negado ao painel admin.");
          setLoading(false);
          return;
        }

        setStats(data.stats as AdminStats);
        setUsers((data.users || []) as AdminUser[]);
        setTransactions((data.transactions || []) as AdminTx[]);
      } catch {
        setError("Falha ao carregar dados administrativos.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session?.access_token]);

  const conversion = useMemo(() => {
    if (!stats || stats.totalPixGenerated === 0) return 0;
    return Math.round((stats.totalPixPaid / stats.totalPixGenerated) * 100);
  }, [stats]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-6 bg-slate-900 border-slate-800">
          <div className="flex items-start gap-3 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <h1 className="text-lg font-bold text-white">Acesso administrativo bloqueado</h1>
              <p className="text-sm text-slate-400 mt-1">Sua conta nao esta na lista de administradores autorizados.</p>
            </div>
          </div>
          <p className="text-sm text-red-400 mb-4">{error || "Forbidden"}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
            <Button className="bg-slate-700 hover:bg-slate-600" onClick={async () => { await signOut(); navigate("/auth"); }}>
              Trocar conta
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Seguro</h1>
            <p className="text-slate-400 text-sm">Autenticado como {user.email}</p>
          </div>
          <Button variant="outline" onClick={async () => { await signOut(); navigate("/auth"); }}>Sair</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-slate-900 border-slate-800"><p className="text-xs text-slate-400">Usuarios</p><p className="text-2xl font-black mt-1">{stats.totalUsers}</p><Users className="w-4 h-4 text-blue-400 mt-2" /></Card>
          <Card className="p-4 bg-slate-900 border-slate-800"><p className="text-xs text-slate-400">Perfis</p><p className="text-2xl font-black mt-1">{stats.totalProfiles}</p><Activity className="w-4 h-4 text-violet-400 mt-2" /></Card>
          <Card className="p-4 bg-slate-900 border-slate-800"><p className="text-xs text-slate-400">PIX</p><p className="text-2xl font-black mt-1">{stats.totalPixGenerated}</p><p className="text-xs text-emerald-400 mt-1">{conversion}% conversao</p></Card>
          <Card className="p-4 bg-slate-900 border-slate-800"><p className="text-xs text-slate-400">Vendas</p><p className="text-2xl font-black mt-1">R$ {(stats.totalAmount / 100).toFixed(2)}</p><DollarSign className="w-4 h-4 text-emerald-400 mt-2" /></Card>
        </div>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Usuarios (resumo)</h2>
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
                  <tr key={u.userId} className="border-b border-slate-800/60">
                    <td className="py-2 font-mono text-xs">{u.userId}</td>
                    <td className="py-2 text-right">{u.profiles}</td>
                    <td className="py-2 text-right">{u.totalPixGenerated}</td>
                    <td className="py-2 text-right">{u.totalPixPaid}</td>
                    <td className="py-2 text-right">R$ {(u.totalAmount / 100).toFixed(2)}</td>
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
                  <tr key={t.id} className="border-b border-slate-800/60">
                    <td className="py-2">#{t.id}</td>
                    <td className="py-2">{t.paymentGateway || "-"}</td>
                    <td className="py-2 text-right">R$ {((t.amountInCents || 0) / 100).toFixed(2)}</td>
                    <td className="py-2">{t.status}</td>
                    <td className="py-2">{new Date(t.createdAt).toLocaleString("pt-BR")}</td>
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
