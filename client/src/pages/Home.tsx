import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowRight, Users, DollarSign, Lock, Zap } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
            <span className="font-bold text-xl">Privacy</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Entrar
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate("/dashboard")}>
              Comece Agora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
          Monetize Seu Conteudo Exclusivo
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Crie multiplos perfis, venda conteudo exclusivo e ganhe dinheiro com suas fans. Tudo em uma plataforma simples e poderosa.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={() => navigate("/dashboard")}>
            Comece Gratuitamente <ArrowRight className="w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/demo")}>
            Ver Demonstracao
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Por que escolher Privacy?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="p-8 bg-white border-0 shadow-md hover:shadow-lg transition cursor-pointer">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Multi-Perfis</h3>
            <p className="text-gray-600">Crie quantos perfis quiser e gerencie tudo em um so lugar.</p>
          </Card>

          <Card className="p-8 bg-white border-0 shadow-md hover:shadow-lg transition cursor-pointer">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Monetizacao Flexivel</h3>
            <p className="text-gray-600">Configure planos de assinatura personalizados para cada perfil.</p>
          </Card>

          <Card className="p-8 bg-white border-0 shadow-md hover:shadow-lg transition cursor-pointer">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Conteudo Seguro</h3>
            <p className="text-gray-600">Controle total sobre qual conteudo e publico ou exclusivo.</p>
          </Card>

          <Card className="p-8 bg-white border-0 shadow-md hover:shadow-lg transition cursor-pointer">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Pagamentos Rapidos</h3>
            <p className="text-gray-600">Receba seus ganhos rapidamente com multiplos gateways.</p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Pronto para comecar?</h2>
          <p className="text-lg mb-8 opacity-90">Junte-se a milhares de criadores que ja estao ganhando com Privacy.</p>
          <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 gap-2" onClick={() => navigate("/dashboard")}>
            Criar Conta Gratuita <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="mb-4">&copy; 2026 Privacy. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="hover:text-orange-400 transition">Privacidade</a>
            <a href="#" className="hover:text-orange-400 transition">Termos</a>
            <a href="#" className="hover:text-orange-400 transition">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
