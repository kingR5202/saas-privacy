import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Loader2, Users, DollarSign, Activity, Eye, EyeOff, BarChart3 } from "lucide-react";

const ADMIN_PASSWORD = "admin2026";

interface UserProfile {
  userId: string;
  email: string;
  profiles: { id: number; username: string; displayName: string }[];
  totalPix: number;
  totalAmount: number;
}

interface Transaction {
  id: number;
  user_id: string;
  profile_id: number;
  gateway: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "transactions">("users");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError("");
      loadData();
    } else {
      setPasswordError("Senha incorreta");
    }
  };

  const loadData = async () => {
    setLoading(true);

    // Load all profiles
    const { data: profilesData } = await supabase.from("profiles").select("id, userId, username, displayName");
    const profiles = profilesData || [];

    // Load all transactions
    const { data: txData } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
    setTransactions((txData || []) as Transaction[]);

    // Load auth users via profiles (group by userId)
    const userMap = new Map<string, UserProfile>();
    for (const p of profiles) {
      if (!userMap.has(p.userId)) {
        userMap.set(p.userId, {
          userId: p.userId,
          email: "",
          profiles: [],
          totalPix: 0,
          totalAmount: 0,
        });
      }
      userMap.get(p.userId)!.profiles.push({ id: p.id, username: p.username, displayName: p.displayName });
    }

    // Aggregate transactions per user
    for (const tx of (txData || []) as Transaction[]) {
      const u = userMap.get(tx.user_id);
      if (u) {
        u.totalPix++;
        u.totalAmount += tx.amount;
      } else {
        userMap.set(tx.user_id, {
          userId: tx.user_id,
          email: "",
          profiles: [],
          totalPix: 1,
          totalAmount: tx.amount,
        });
      }
    }

    setUsers(Array.from(userMap.values()));
    setLoading(false);
  };

  const totalUsers = users.length;
  const totalProfiles = users.reduce((s, u) => s + u.profiles.length, 0);
  const totalPix = transactions.length;
  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a, #1e293b)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 40, maxWidth: 400, width: "100%", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #f97316, #ea580c)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BarChart3 style={{ width: 32, height: 32, color: "#fff" }} />
          </div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Privacy Admin</h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24 }}>Painel Administrativo</p>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input
              type={showPassword ? "text" : "password"} value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Senha do admin"
              style={{ width: "100%", padding: "14px 48px 14px 16px", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
              {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
            </button>
          </div>
          {passwordError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{passwordError}</p>}
          <button onClick={handleLogin} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg, #f97316, #ea580c)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" style={{ width: 40, height: 40, color: "#f97316" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "'Inter', sans-serif", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BarChart3 style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 900, color: "#fff", margin: 0 }}>Privacy Admin</h1>
            <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Painel Administrativo</p>
          </div>
        </div>
        <button onClick={() => setAuthenticated(false)} style={{ padding: "8px 16px", background: "#334155", border: "none", borderRadius: 8, color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Sair
        </button>
      </header>

      {/* Stats Cards */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          <Card style={{ padding: 20, background: "#1e293b", border: "1px solid #334155" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 13, fontWeight: 600, margin: 0 }}>Usuários</p>
                <p style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 4 }}>{totalUsers}</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users style={{ width: 22, height: 22, color: "#3b82f6" }} />
              </div>
            </div>
          </Card>

          <Card style={{ padding: 20, background: "#1e293b", border: "1px solid #334155" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 13, fontWeight: 600, margin: 0 }}>Perfis Criados</p>
                <p style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 4 }}>{totalProfiles}</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity style={{ width: 22, height: 22, color: "#a855f7" }} />
              </div>
            </div>
          </Card>

          <Card style={{ padding: 20, background: "#1e293b", border: "1px solid #334155" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 13, fontWeight: 600, margin: 0 }}>PIX Gerados</p>
                <p style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 4 }}>{totalPix}</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(249, 115, 22, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3 style={{ width: 22, height: 22, color: "#f97316" }} />
              </div>
            </div>
          </Card>

          <Card style={{ padding: 20, background: "#1e293b", border: "1px solid #334155" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 13, fontWeight: 600, margin: 0 }}>Total Vendas</p>
                <p style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 4 }}>R$ {(totalAmount / 100).toFixed(2)}</p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DollarSign style={{ width: 22, height: 22, color: "#10b981" }} />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #334155" }}>
          {[
            { id: "users" as const, label: "Usuários & Perfis" },
            { id: "transactions" as const, label: "Transações" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "12px 20px", background: "none", border: "none", cursor: "pointer",
              color: activeTab === tab.id ? "#f97316" : "#64748b", fontWeight: 700, fontSize: 14,
              borderBottom: activeTab === tab.id ? "2px solid #f97316" : "2px solid transparent",
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    <th style={{ padding: "14px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Usuário</th>
                    <th style={{ padding: "14px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Perfis</th>
                    <th style={{ padding: "14px 16px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>PIX Gerados</th>
                    <th style={{ padding: "14px 16px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Total Vendas</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.userId} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}>{u.userId.slice(0, 8)}...</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {u.profiles.length > 0 ? u.profiles.map(p => (
                          <span key={p.id} style={{ display: "inline-block", padding: "4px 10px", background: "#334155", borderRadius: 6, marginRight: 6, marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                            {p.displayName} <span style={{ color: "#64748b" }}>@{p.username}</span>
                          </span>
                        )) : <span style={{ color: "#64748b" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <span style={{ color: u.totalPix > 0 ? "#f97316" : "#64748b", fontWeight: 700 }}>{u.totalPix}</span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <span style={{ color: u.totalAmount > 0 ? "#10b981" : "#64748b", fontWeight: 700 }}>
                          R$ {(u.totalAmount / 100).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Nenhum usuário encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    <th style={{ padding: "14px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>ID</th>
                    <th style={{ padding: "14px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Gateway</th>
                    <th style={{ padding: "14px 16px", textAlign: "right", color: "#64748b", fontWeight: 600 }}>Valor</th>
                    <th style={{ padding: "14px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "14px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>#{tx.id}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "4px 10px", background: tx.gateway === "pushinpay" ? "rgba(249,115,22,0.15)" : tx.gateway === "blackout" ? "rgba(100,116,139,0.2)" : "rgba(59,130,246,0.15)", borderRadius: 6, fontSize: 12, fontWeight: 600, color: tx.gateway === "pushinpay" ? "#f97316" : tx.gateway === "blackout" ? "#94a3b8" : "#3b82f6" }}>
                          {tx.gateway}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700, color: "#10b981" }}>
                        R$ {(tx.amount / 100).toFixed(2)}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: tx.status === "paid" ? "rgba(16,185,129,0.15)" : "rgba(234,179,8,0.15)", color: tx.status === "paid" ? "#10b981" : "#eab308" }}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#64748b", fontSize: 12 }}>
                        {new Date(tx.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Nenhuma transação registrada ainda</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
