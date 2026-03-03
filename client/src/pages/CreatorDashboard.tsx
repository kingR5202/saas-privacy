import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Plus, Settings, LogOut, TrendingUp, Users, DollarSign, Eye, Home } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const COLORS = ["#F97316", "#FB923C", "#FDBA74", "#FED7AA"];

// Demo data for the dashboard
const demoUser = { name: "Criador Demo", email: "demo@privacy.com" };
const demoProfiles = [
  { id: 1, username: "modelademo", displayName: "Modelo Demo", profilePicUrl: null, bannerUrl: null, totalSubscribers: 247, totalPosts: 42, totalMedia: 38, totalExclusive: 15, totalLikes: 1250, isActive: true },
  { id: 2, username: "fotodemo", displayName: "Fotografia Demo", profilePicUrl: null, bannerUrl: null, totalSubscribers: 128, totalPosts: 25, totalMedia: 24, totalExclusive: 10, totalLikes: 890, isActive: true },
];

export default function CreatorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [, navigate] = useLocation();

  const user = demoUser;
  const profiles = demoProfiles;

  const salesData = [
    { month: "Jan", sales: 4000, revenue: 2400 },
    { month: "Fev", sales: 3000, revenue: 1398 },
    { month: "Mar", sales: 2000, revenue: 9800 },
    { month: "Abr", sales: 2780, revenue: 3908 },
    { month: "Mai", sales: 1890, revenue: 4800 },
    { month: "Jun", sales: 2390, revenue: 3800 },
  ];

  const conversionData = [
    { name: "Convertidos", value: 65 },
    { name: "Não Convertidos", value: 35 },
  ];

  const totalSubscribers = profiles.reduce((acc, p) => acc + p.totalSubscribers, 0);
  const totalBalance = 15890;
  const conversionRate = 65;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
            <div>
              <h1 className="font-bold text-lg">Privacy Creator</h1>
              <p className="text-xs text-gray-600">Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="font-semibold text-sm">{user.name}</p>
              <p className="text-xs text-gray-600">{user.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Home className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white border-0 shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Saldo Disponível</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">R$ {(totalBalance / 100).toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Assinantes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalSubscribers.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{conversionRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Visualizações</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">12.5K</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="profiles">Meus Perfis</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Chart */}
              <Card className="lg:col-span-2 p-6 bg-white border-0 shadow-md">
                <h3 className="text-lg font-bold mb-4">Vendas Mensais</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sales" fill="#F97316" />
                    <Bar dataKey="revenue" fill="#FB923C" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Conversion Rate */}
              <Card className="p-6 bg-white border-0 shadow-md">
                <h3 className="text-lg font-bold mb-4">Taxa de Conversão</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={conversionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {conversionData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Revenue Trend */}
            <Card className="p-6 bg-white border-0 shadow-md">
              <h3 className="text-lg font-bold mb-4">Tendência de Receita</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2} dot={{ fill: "#F97316" }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Meus Perfis</h2>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                <Plus className="w-4 h-4" />
                Novo Perfil
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => (
                <Card key={profile.id} className="overflow-hidden bg-white border-0 shadow-md hover:shadow-lg transition">
                  <div
                    className="h-32 bg-gradient-to-r from-orange-300 to-orange-500"
                  />
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
                      <div>
                        <p className="font-bold">{profile.displayName}</p>
                        <p className="text-sm text-gray-600">@{profile.username}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <div className="bg-orange-50 p-2 rounded">
                        <p className="text-gray-600">Assinantes</p>
                        <p className="font-bold text-orange-600">{profile.totalSubscribers}</p>
                      </div>
                      <div className="bg-orange-50 p-2 rounded">
                        <p className="text-gray-600">Conteúdo</p>
                        <p className="font-bold text-orange-600">{profile.totalPosts}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => navigate(`/${profile.username}`)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Ver Perfil
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <Card className="p-12 text-center bg-white border-0 shadow-md">
              <p className="text-gray-600 mb-4">Selecione um perfil para gerenciar seu conteúdo.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
