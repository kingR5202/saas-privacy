import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, DollarSign, Activity, LogOut } from "lucide-react";
import { Loader2 } from "lucide-react";

const mockTransactions = [
  { id: 1, creator: "Theo Neko", subscriber: "User123", amount: "R$ 29,90", status: "Completed", date: "2026-03-01" },
  { id: 2, creator: "Ana Silva", subscriber: "User456", amount: "R$ 49,90", status: "Completed", date: "2026-03-01" },
  { id: 3, creator: "Theo Neko", subscriber: "User789", amount: "R$ 29,90", status: "Pending", date: "2026-02-28" },
  { id: 4, creator: "Carlos Santos", subscriber: "User012", amount: "R$ 19,90", status: "Failed", date: "2026-02-28" },
  { id: 5, creator: "Maria Costa", subscriber: "User345", amount: "R$ 99,90", status: "Completed", date: "2026-02-27" },
];

const mockRevenueData = [
  { month: "Jan", revenue: 15000, platformFee: 3000 },
  { month: "Fev", revenue: 18000, platformFee: 3600 },
  { month: "Mar", revenue: 22000, platformFee: 4400 },
  { month: "Abr", revenue: 25000, platformFee: 5000 },
  { month: "Mai", revenue: 28000, platformFee: 5600 },
  { month: "Jun", revenue: 32000, platformFee: 6400 },
];

export default function AdminPanel() {
  const { user, logout } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-gray-600">Você não tem permissão para acessar o painel administrativo.</p>
        </div>
      </div>
    );
  }

  const totalRevenue = 140000;
  const platformFee = 28000;
  const creatorEarnings = 112000;
  const activeCreators = 1250;
  const activeSubscriptions = 8500;
  const totalTransactions = 12340;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
            <div>
              <h1 className="font-bold text-lg text-white">Privacy Admin</h1>
              <p className="text-xs text-gray-400">Painel de Administração</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-semibold text-sm text-white">{user.name}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-white hover:bg-slate-700">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-slate-800 border-slate-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Transacionado</p>
                <p className="text-3xl font-bold text-white mt-2">R$ {(totalRevenue / 100).toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-800 border-slate-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Lucro da Plataforma (20%)</p>
                <p className="text-3xl font-bold text-white mt-2">R$ {(platformFee / 100).toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-800 border-slate-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Criadores Ativos</p>
                <p className="text-3xl font-bold text-white mt-2">{activeCreators.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-800 border-slate-700 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Assinaturas Ativas</p>
                <p className="text-3xl font-bold text-white mt-2">{activeSubscriptions.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="text-white">Visão Geral</TabsTrigger>
            <TabsTrigger value="transactions" className="text-white">Transações</TabsTrigger>
            <TabsTrigger value="creators" className="text-white">Criadores</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card className="p-6 bg-slate-800 border-slate-700 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Receita Mensal</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#F97316" />
                    <Bar dataKey="platformFee" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Trend Chart */}
              <Card className="p-6 bg-slate-800 border-slate-700 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">Tendência de Lucro</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                    <Legend />
                    <Line type="monotone" dataKey="platformFee" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-slate-800 border-slate-700 shadow-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Últimas Transações</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Criador</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Assinante</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Valor</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                          <td className="py-3 px-4 text-white">{tx.creator}</td>
                          <td className="py-3 px-4 text-gray-300">{tx.subscriber}</td>
                          <td className="py-3 px-4 text-white font-semibold">{tx.amount}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              tx.status === "Completed" ? "bg-green-500/20 text-green-400" :
                              tx.status === "Pending" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400">{tx.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Creators Tab */}
          <TabsContent value="creators">
            <Card className="p-6 bg-slate-800 border-slate-700 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Criadores Ativos</h3>
              <p className="text-gray-400">Lista de criadores ativos na plataforma com suas métricas.</p>
              <div className="mt-6 text-center py-12">
                <p className="text-gray-400">Funcionalidade em desenvolvimento</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
