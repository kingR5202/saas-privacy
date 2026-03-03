import { useEffect, useState, useCallback } from "react";
import { useRoute } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

interface Profile {
  id: number; userId: number; username: string; displayName: string; bio: string | null;
  profilePicUrl: string | null; bannerUrl: string | null;
  totalSubscribers: number; totalPosts: number; totalMedia: number; totalExclusive: number; totalLikes: number;
}
interface Plan {
  id: number; name: string; description: string | null; priceInCents: number; billingCycle: string;
}
interface GatewayConfig {
  gateway: string; pushinpay_token?: string; blackout_public_key?: string; blackout_secret_key?: string;
  novaplex_client_id?: string; novaplex_client_secret?: string; redirect_url?: string;
}

export default function PublicProfile() {
  const [, params] = useRoute("/:username");
  const username = params?.username;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // PIX Modal state
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [pixQrBase64, setPixQrBase64] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [showQr, setShowQr] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"posts" | "media">("posts");

  const loadProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").eq("username", username).limit(1).single();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setProfile(data as Profile);

    // Load plans
    const { data: plansData } = await supabase.from("subscription_plans").select("*").eq("profileId", data.id).eq("isActive", true);
    setPlans((plansData || []) as Plan[]);

    // Load gateway config for this user
    const { data: gwData } = await supabase.from("gateway_configs").select("*").eq("userId", data.userId).limit(1).single();
    if (gwData) setGatewayConfig(gwData as GatewayConfig);

    setLoading(false);
  }, [username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Handle plan click → generate PIX
  const handlePlanClick = async (plan: Plan) => {
    if (!gatewayConfig || !profile) {
      alert("Gateway de pagamento não configurado.");
      return;
    }
    setSelectedPlan(plan);
    setShowPixModal(true);
    setPixLoading(true);
    setPixError("");
    setPixCode("");
    setPixQrBase64("");
    setPaymentStatus("Gerando cobrança PIX...");

    try {
      const resp = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          userId: profile.userId,
          amount: plan.priceInCents,
          gateway: gatewayConfig.gateway,
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Erro ao gerar PIX");

      setPixCode(result.qr_code || result.pixCopyPaste || result.brcode || "");
      setPixQrBase64(result.qr_code_base64 || "");
      setPaymentStatus("Aguardando pagamento...");

      // Start polling
      if (result.id) {
        const interval = setInterval(async () => {
          try {
            const statusResp = await fetch(`/api/payment?id=${result.id}&profileId=${profile.id}`);
            const statusData = await statusResp.json();
            if (["paid", "completed", "succeeded"].includes(statusData.status)) {
              clearInterval(interval);
              setPaymentStatus("Pagamento confirmado! ✅");
              if (gatewayConfig.redirect_url) {
                setTimeout(() => { window.location.href = gatewayConfig.redirect_url!; }, 2000);
              }
            }
          } catch { } // eslint-disable-line
        }, 5000);
        // Auto-clear after 10 min
        setTimeout(() => clearInterval(interval), 600000);
      }
    } catch (err: any) {
      setPixError(err.message);
      setPaymentStatus("");
    } finally {
      setPixLoading(false);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-white"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (notFound || !profile) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center"><h1 className="text-3xl font-bold mb-2">Perfil não encontrado</h1>
        <p className="text-gray-600">O perfil @{username} não existe.</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f8f8]" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <img src="/images/privacy-logo.svg" alt="Privacy" className="h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span className="font-bold text-lg text-gray-800">Privacy</span>
      </header>

      <div className="max-w-lg mx-auto bg-white min-h-screen shadow-sm">
        {/* Cover Photo */}
        <div className="relative h-44 bg-gradient-to-r from-orange-300 to-orange-500"
          style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
        </div>

        {/* Profile Info */}
        <div className="relative px-4 pb-4">
          <div className="flex items-end gap-3 -mt-10">
            {profile.profilePicUrl ? (
              <img src={profile.profilePicUrl} alt="" className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white bg-gradient-to-br from-orange-400 to-orange-600 shadow-md" />
            )}
            <div className="flex gap-4 text-sm text-gray-600 mb-1">
              <span>📷 {profile.totalPosts}</span>
              <span>🎥 {profile.totalMedia}</span>
              <span>🔒 {profile.totalExclusive}</span>
              <span>❤️ {profile.totalLikes > 1000 ? `${(profile.totalLikes / 1000).toFixed(0)}K` : profile.totalLikes}</span>
            </div>
          </div>

          <h1 className="text-xl font-bold mt-3">{profile.displayName} <span className="text-blue-500">✓</span></h1>
          <p className="text-gray-500 text-sm">@{profile.username}</p>
          {profile.bio && <p className="text-gray-700 text-sm mt-2 leading-relaxed">{profile.bio}</p>}
        </div>

        {/* Subscription Plans */}
        {plans.length > 0 && (
          <div className="px-4 py-4 border-t">
            <h2 className="font-bold text-lg mb-3">Assinaturas</h2>
            {plans.map(plan => (
              <button key={plan.id} onClick={() => handlePlanClick(plan)}
                className="w-full flex items-center justify-between px-4 py-3 mb-2 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 hover:border-orange-400 transition">
                <span className="font-medium text-gray-800">{plan.name}</span>
                <span className="font-bold text-orange-600">R$ {(plan.priceInCents / 100).toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Tabs */}
        <div className="border-t">
          <div className="flex">
            <button className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition ${activeTab === "posts" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("posts")}>📱 Postagens</button>
            <button className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition ${activeTab === "media" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("media")}>📸 Mídias</button>
          </div>
          <div className="p-4">
            {activeTab === "posts" ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">🔒</div>
                <p className="font-medium text-gray-800">Conteúdo Exclusivo</p>
                <p className="text-sm text-gray-500">Assine para desbloquear todo o conteúdo</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-2xl">🔒</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PIX Modal */}
      {showPixModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPixModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="relative h-24 bg-gradient-to-r from-orange-300 to-orange-500"
              style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})`, backgroundSize: "cover" } : {}}>
              <button className="absolute top-2 right-2 w-8 h-8 bg-black/40 text-white rounded-full text-lg" onClick={() => setShowPixModal(false)}>×</button>
            </div>
            {profile.profilePicUrl ? (
              <img src={profile.profilePicUrl} alt="" className="w-20 h-20 rounded-full border-4 border-white mx-auto -mt-10 relative z-10 object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white mx-auto -mt-10 relative z-10 bg-gradient-to-br from-orange-400 to-orange-600" />
            )}

            <div className="p-6 text-center">
              <h2 className="font-bold text-xl">{profile.displayName}</h2>
              <p className="text-gray-500 text-sm">@{profile.username}</p>

              {pixLoading ? (
                <div className="py-8"><Loader2 className="animate-spin w-8 h-8 mx-auto text-orange-500" /><p className="text-sm mt-3 text-gray-600">{paymentStatus}</p></div>
              ) : pixError ? (
                <div className="py-6 text-red-500"><p className="font-medium">Erro</p><p className="text-sm">{pixError}</p></div>
              ) : (
                <>
                  <h3 className="font-bold text-left mt-4 mb-2">Benefícios exclusivos</h3>
                  <ul className="text-left text-sm text-gray-600 space-y-1 mb-4">
                    <li>✅ Acesso ao conteúdo</li>
                    <li>✅ Chat exclusivo com o criador</li>
                    <li>✅ Cancele a qualquer hora</li>
                  </ul>

                  <div className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3 mb-3">
                    <span className="text-gray-600">Valor</span>
                    <span className="font-bold text-lg">R$ {selectedPlan ? (selectedPlan.priceInCents / 100).toFixed(2) : "0.00"}</span>
                  </div>

                  {pixCode && (
                    <>
                      <input readOnly value={pixCode} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-xs font-mono text-center mb-3" />
                      <div className="flex gap-2">
                        <button className="flex-1 py-3 bg-gray-200 rounded-lg font-semibold text-sm"
                          onClick={() => setShowQr(!showQr)}>{showQr ? "Ocultar QR" : "Ver QR Code"}</button>
                        <button className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-semibold text-sm"
                          onClick={copyPixCode}>Copiar Chave</button>
                      </div>
                      {showQr && pixQrBase64 && (
                        <div className="mt-4 flex justify-center"><img src={pixQrBase64} alt="QR Code PIX" className="w-48 h-48 rounded-lg" /></div>
                      )}
                    </>
                  )}

                  {paymentStatus && <p className="text-sm mt-4 font-medium text-orange-600">{paymentStatus}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
