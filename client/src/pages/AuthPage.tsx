import { useState } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AuthPage() {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const { signIn, signUp } = useSupabaseAuth();
    const [, navigate] = useLocation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (mode === "register") {
                const { error } = await signUp(email, password);
                if (error) {
                    setError(error.message === "User already registered" ? "Este email já está cadastrado." : error.message);
                } else {
                    setSuccess("Conta criada! Verifique seu email para confirmar, ou faça login.");
                    setMode("login");
                }
            } else {
                const { error } = await signIn(email, password);
                if (error) {
                    setError(error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message);
                } else {
                    navigate("/dashboard");
                }
            }
        } catch (err: any) {
            setError(err.message || "Erro inesperado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Back button */}
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-gray-600 hover:text-orange-600 mb-6 transition"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </button>

                <Card className="p-8 bg-white/90 backdrop-blur-sm shadow-xl border-0">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 mx-auto mb-3" />
                        <h1 className="text-2xl font-bold">Privacy</h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {mode === "login" ? "Entre na sua conta" : "Crie sua conta grátis"}
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                        <button
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "login" ? "bg-white shadow text-orange-600" : "text-gray-600"}`}
                            onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
                        >
                            Entrar
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "register" ? "bg-white shadow text-orange-600" : "text-gray-600"}`}
                            onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
                        >
                            Cadastrar
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Sua senha"}
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
                                {success}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-base font-semibold"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : mode === "login" ? (
                                "Entrar"
                            ) : (
                                "Criar Conta"
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        {mode === "login" ? (
                            <>Não tem conta? <button onClick={() => setMode("register")} className="text-orange-600 font-medium hover:underline">Cadastre-se</button></>
                        ) : (
                            <>Já tem conta? <button onClick={() => setMode("login")} className="text-orange-600 font-medium hover:underline">Faça login</button></>
                        )}
                    </p>
                </Card>
            </div>
        </div>
    );
}
