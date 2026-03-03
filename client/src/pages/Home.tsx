import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/contexts/AuthContext";
import { ArrowRight, Users, DollarSign, Lock, Zap, Loader2 } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const { user, loading } = useSupabaseAuth();

  const handleCTA = () => {
    if (user) navigate("/dashboard");
    else navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="Privacy" className="w-10 h-10 rounded-full" />
            <span className="font-bold text-xl">Privacy</span>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : user ? (
              <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate("/dashboard")}>Meu Painel</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>Entrar</Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate("/auth")}>Comece Agora</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
          Monetize Seu Conteudo Exclusivo
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Crie seus perfis, configure seu gateway de pagamento, e comece a receber via PIX. Simples e poderoso.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={handleCTA}>
            {user ? "Ir para Dashboard" : "Comece Gratuitamente"} <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Por que escolher Privacy?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="p-8 bg-white border-0 shadow-md hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Multi-Perfis</h3>
            <p className="text-gray-600">Crie quantos perfis quiser e gerencie tudo em um só lugar.</p>
          </Card>
          <Card className="p-8 bg-white border-0 shadow-md hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">3 Gateways PIX</h3>
            <p className="text-gray-600">PushinPay, Blackout e NovaPlex. Cole seu token e pronto.</p>
          </Card>
          <Card className="p-8 bg-white border-0 shadow-md hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Conteúdo Seguro</h3>
            <p className="text-gray-600">Controle total sobre qual conteúdo é público ou exclusivo.</p>
          </Card>
          <Card className="p-8 bg-white border-0 shadow-md hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Pagamentos Rápidos</h3>
            <p className="text-gray-600">Receba via PIX instantaneamente com checkout automático.</p>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-lg mb-8 opacity-90">Crie sua conta grátis e tenha seu link de vendas em minutos.</p>
          <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 gap-2" onClick={handleCTA}>
            {user ? "Acessar Dashboard" : "Criar Conta Gratuita"} <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="mb-4">&copy; 2026 Privacy. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
