import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

/**
 * Public Profile page — matches the Privacy template (TELA PRIVACY PUSHINPAY)
 * Layout: Header → Banner → Profile Info → Bio → Subscription Plans → Content Tabs
 * Includes PIX checkout modal with QR code and payment polling.
 */

interface PublicProfileParams {
  username: string;
}

export default function PublicProfile() {
  const params = useParams<PublicProfileParams>();
  const username = params?.username || "";

  const { data: profile, isLoading: profileLoading } = trpc.profiles.getByUsername.useQuery(username, {
    enabled: !!username,
  });

  const { data: content } = trpc.content.getByProfile.useQuery(profile?.id || 0, {
    enabled: !!profile?.id,
  });

  const { data: plans } = trpc.subscriptionPlans.getByProfile.useQuery(profile?.id || 0, {
    enabled: !!profile?.id,
  });

  const [activeTab, setActiveTab] = useState<"posts" | "media">("posts");
  const [cookieAccepted, setCookieAccepted] = useState(() =>
    typeof localStorage !== "undefined" ? !!localStorage.getItem("cookiesAccepted") : false
  );
  const [showReadMore, setShowReadMore] = useState(false);

  // PIX modal state
  const [pixModal, setPixModal] = useState<{
    show: boolean;
    loading: boolean;
    pixCode?: string;
    qrCodeBase64?: string;
    transactionId?: string;
    gateway?: string;
    priceLabel?: string;
    error?: string;
  }>({ show: false, loading: false });
  const [showQr, setShowQr] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createChargeMutation = trpc.payments.createCharge.useMutation();

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
        <Loader2 className="animate-spin w-8 h-8 text-[#E87A54]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Perfil não encontrado</h1>
          <p className="text-gray-600">O criador que você está procurando não existe.</p>
        </div>
      </div>
    );
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  };

  const handleSubscribe = async (planPriceCents: number, planName: string, planId?: number) => {
    setPixModal({ show: true, loading: true });
    setPaymentStatus("");
    setShowQr(false);

    try {
      const charge = await createChargeMutation.mutateAsync({
        gateway: "pushinpay" as const,
        amountCents: planPriceCents,
        profileId: profile.id,
        planId,
      });

      setPixModal({
        show: true,
        loading: false,
        pixCode: charge.qr_code,
        qrCodeBase64: charge.qr_code_base64,
        transactionId: charge.id,
        gateway: "pushinpay",
        priceLabel: formatPrice(planPriceCents),
      });

      // Start polling
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 120) {
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }
        // We'll use a simple fetch to check status since useQuery isn't ideal for polling
        try {
          const res = await fetch(`/api/trpc/payments.checkStatus?input=${encodeURIComponent(JSON.stringify({ gateway: "pushinpay", transactionId: charge.id }))}`);
          const json = await res.json();
          const result = json?.result?.data;
          if (result?.status === "paid") {
            setPaymentStatus("paid");
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (result?.status === "expired") {
            setPaymentStatus("expired");
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch { }
      }, 5000);
    } catch (err: any) {
      setPixModal({
        show: true,
        loading: false,
        error: err?.message || "Erro ao gerar PIX",
      });
    }
  };

  const closePixModal = () => {
    setPixModal({ show: false, loading: false });
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const copyPixCode = () => {
    if (pixModal.pixCode) {
      navigator.clipboard.writeText(pixModal.pixCode);
    }
  };

  const acceptCookies = () => {
    setCookieAccepted(true);
    localStorage.setItem("cookiesAccepted", "true");
  };

  // Default plans if none configured
  const displayPlans = plans && plans.length > 0 ? plans : [
    { id: 0, name: "1 mês", priceInCents: 1990, billingCycle: "monthly" as const },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F8F9FA", fontFamily: "'Lato', sans-serif" }}>
      {/* Privacy Header */}
      <header
        className="w-full bg-white border-b border-gray-100"
        style={{ padding: "15px 0" }}
      >
        <div className="mx-auto flex justify-center items-center" style={{ maxWidth: 900, minHeight: 35 }}>
          <svg className="h-[18px] w-auto" viewBox="0 0 120 24" fill="none">
            <text x="0" y="18" fontFamily="Lato, Arial, sans-serif" fontWeight="900" fontSize="20" fill="#1a1a1a">
              Privacy
            </text>
          </svg>
        </div>
      </header>

      {/* Main Container */}
      <div
        className="mx-auto bg-white overflow-hidden relative"
        style={{
          maxWidth: 1110,
          borderRadius: 25,
          border: "1px solid #dbdbdb",
          boxShadow: "0 5px 25px rgba(0,0,0,0.07)",
          marginTop: -0,
          marginBottom: 20,
        }}
      >
        {/* Cover Photo */}
        <div
          className="w-full bg-gradient-to-r from-orange-200 to-orange-400"
          style={{
            height: 90,
            backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderBottom: "1px solid #F0F0F0",
          }}
        />

        {/* Profile Info Bar */}
        <div
          className="flex items-end justify-between relative"
          style={{ padding: "0 25px", marginTop: -50 }}
        >
          <img
            src={profile.profilePicUrl || "https://via.placeholder.com/100"}
            alt={profile.displayName}
            className="rounded-full border-4 border-white object-cover"
            style={{ width: 100, height: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          />
          <div className="flex gap-4 text-sm font-medium pb-2" style={{ paddingTop: 50 }}>
            <span className="flex items-center gap-1">
              <i className="text-gray-400">📷</i> {profile.totalPosts}
            </span>
            <span className="flex items-center gap-1">
              <i className="text-gray-400">▶</i> {profile.totalMedia}
            </span>
            <span className="flex items-center gap-1">
              <i className="text-gray-400">🔒</i> {profile.totalExclusive}
            </span>
            <span className="flex items-center gap-1">
              <i className="text-gray-400">❤</i> {profile.totalLikes > 1000 ? `${(profile.totalLikes / 1000).toFixed(0)}K` : profile.totalLikes}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 25 }}>
          {/* Profile Details */}
          <h1 className="text-lg font-black flex items-center gap-2" style={{ marginTop: -15 }}>
            {profile.displayName}
            <span
              className="inline-flex items-center justify-center rounded-full text-xs"
              style={{
                color: "#E87A54",
                border: "1.5px solid #E87A54",
                width: 16,
                height: 16,
                fontSize: 10,
              }}
            >
              ✓
            </span>
          </h1>
          <p className="text-gray-500 text-lg mb-4">@{profile.username}</p>

          {/* Bio */}
          {profile.bio && (
            <div className="text-base leading-relaxed mb-5">
              <p>
                {showReadMore ? profile.bio : profile.bio.slice(0, 150)}
                {profile.bio.length > 150 && !showReadMore && "..."}
              </p>
              {profile.bio.length > 150 && (
                <button
                  className="font-bold text-[#E87A54] cursor-pointer border-none bg-transparent"
                  onClick={() => setShowReadMore(!showReadMore)}
                >
                  {showReadMore ? "Ler menos" : "Ler mais"}
                </button>
              )}
            </div>
          )}

          {/* Social Links */}
          <div className="flex gap-5 text-xl text-gray-800 mb-6">
            <span className="cursor-pointer hover:text-[#E87A54] transition">𝕏</span>
            <span className="cursor-pointer hover:text-[#E87A54] transition">TikTok</span>
          </div>

          {/* Subscription Plans */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-500 mb-3">Assinaturas</h2>
            {displayPlans.map((plan) => (
              <button
                key={plan.id}
                className="w-full flex justify-between items-center mb-2 rounded-2xl border-none text-base font-bold cursor-pointer"
                style={{
                  padding: "16px 20px",
                  color: "#4F2E1B",
                  background: "linear-gradient(90deg, rgba(246,148,73,1) 0%, rgba(250,197,158,1) 50%, rgba(247,168,153,1) 100%)",
                }}
                onClick={() => handleSubscribe(plan.priceInCents, plan.name, plan.id)}
              >
                <span>{plan.name}</span>
                <span>{formatPrice(plan.priceInCents)}</span>
              </button>
            ))}
          </div>

          {/* Content Tabs */}
          <div className="border-t border-gray-100 mt-6 pt-5">
            <div className="flex border border-gray-100 rounded-xl overflow-hidden mb-5">
              <button
                className={`flex-1 py-4 text-center font-bold text-sm border-none cursor-pointer transition-all ${activeTab === "posts" ? "text-[#E87A54] border-b-[3px] border-b-[#E87A54] bg-white" : "text-gray-500 bg-white"}`}
                onClick={() => setActiveTab("posts")}
              >
                📱 {profile.totalPosts} Postagens
              </button>
              <button
                className={`flex-1 py-4 text-center font-bold text-sm border-none cursor-pointer transition-all ${activeTab === "media" ? "text-[#E87A54] border-b-[3px] border-b-[#E87A54] bg-white" : "text-gray-500 bg-white"}`}
                onClick={() => setActiveTab("media")}
              >
                📸 {profile.totalMedia} Mídias
              </button>
            </div>

            {/* Posts tab */}
            {activeTab === "posts" && (
              <div>
                {content && content.filter(c => !c.isExclusive).length > 0 ? (
                  content.filter(c => !c.isExclusive).map(item => (
                    <div key={item.id} className="border border-gray-100 rounded-2xl overflow-hidden mb-4">
                      <div className="flex items-center p-3">
                        <img
                          src={profile.profilePicUrl || "https://via.placeholder.com/45"}
                          alt=""
                          className="w-11 h-11 rounded-full mr-3 object-cover"
                        />
                        <div className="flex-1">
                          <span className="font-bold">{profile.displayName} <span className="text-[#E87A54] text-xs">✓</span></span>
                          <br />
                          <span className="text-gray-500 text-sm">@{profile.username}</span>
                        </div>
                      </div>
                      <div
                        className="border-t border-b border-gray-100 flex items-center justify-center"
                        style={{
                          backgroundColor: "#F5F1ED",
                          backgroundImage: "radial-gradient(circle, rgba(232,122,84,0.1), transparent 70%)",
                        }}
                      >
                        {item.contentType === "video" ? (
                          <video
                            src={item.mediaUrl}
                            className="w-full h-auto block"
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        ) : (
                          <img src={item.mediaUrl} alt={item.title || ""} className="w-full h-auto block" />
                        )}
                      </div>
                      <div className="flex justify-between p-4 text-2xl text-gray-600">
                        <div className="flex gap-5">
                          <span>♡</span>
                          <span>💬</span>
                          <span className="border-2 border-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">$</span>
                        </div>
                        <span>🔖</span>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Locked content placeholder */
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="flex items-center p-3">
                      <img
                        src={profile.profilePicUrl || "https://via.placeholder.com/45"}
                        alt=""
                        className="w-11 h-11 rounded-full mr-3 object-cover"
                      />
                      <div className="flex-1">
                        <span className="font-bold">{profile.displayName} <span className="text-[#E87A54] text-xs">✓</span></span>
                        <br />
                        <span className="text-gray-500 text-sm">@{profile.username}</span>
                      </div>
                    </div>
                    <div
                      className="py-16 flex flex-col items-center justify-center border-t border-b border-gray-100"
                      style={{
                        backgroundColor: "#F5F1ED",
                        backgroundImage: "radial-gradient(circle, rgba(232,122,84,0.1), transparent 70%)",
                      }}
                    >
                      <span className="text-5xl text-gray-400 mb-4">🔒</span>
                      <p className="text-gray-600 font-bold">Conteúdo exclusivo para assinantes</p>
                    </div>
                    <div className="flex justify-between p-4 text-2xl text-gray-600">
                      <div className="flex gap-5">
                        <span>♡</span>
                        <span>💬</span>
                        <span className="border-2 border-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm">$</span>
                      </div>
                      <span>🔖</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Media tab */}
            {activeTab === "media" && (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-3xl text-gray-300 rounded-xl"
                    style={{
                      aspectRatio: "1/1",
                      backgroundColor: "#F5F1ED",
                      backgroundImage: "radial-gradient(circle, rgba(200,200,200,0.1), transparent 70%)",
                    }}
                  >
                    🔒
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cookie Popup */}
      {!cookieAccepted && (
        <div
          className="fixed bottom-0 left-0 w-full z-[1000] bg-[#F1F1F1] border-t border-gray-100 p-5"
          style={{
            animation: "slideUp 0.5s ease-in-out forwards",
          }}
        >
          <div className="mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ maxWidth: 1110 }}>
            <p className="text-base font-medium text-gray-600">
              Privacy utiliza cookies para melhorar nossos serviços. Se você aceitar, usaremos
              esses dados para personalização. Para mais informações, leia nossa{" "}
              <a href="#" className="text-[#E87A54] font-bold underline">
                Política de Privacidade
              </a>
              .
            </p>
            <button
              className="w-full md:max-w-[250px] rounded-full py-2 px-5 font-bold text-sm text-white border-none cursor-pointer"
              style={{ background: "linear-gradient(45deg, #F58170, #F9AF77)" }}
              onClick={acceptCookies}
            >
              Aceitar
            </button>
          </div>
        </div>
      )}

      {/* PIX Checkout Modal */}
      {pixModal.show && (
        <div
          className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closePixModal()}
        >
          <div className="bg-white rounded-2xl max-w-[400px] w-full overflow-hidden relative">
            {/* Close button */}
            <button
              className="absolute top-3 right-3 bg-black/50 text-white border-none rounded-full w-8 h-8 text-lg flex items-center justify-center cursor-pointer z-10"
              onClick={closePixModal}
            >
              ×
            </button>

            {pixModal.loading ? (
              <div className="p-12 text-center">
                <Loader2 className="animate-spin w-8 h-8 mx-auto mb-3 text-[#E87A54]" />
                <p className="text-gray-600">Gerando cobrança Pix...</p>
              </div>
            ) : pixModal.error ? (
              <div className="p-12 text-center">
                <p className="text-red-600 font-bold mb-2">Erro</p>
                <p className="text-gray-600">{pixModal.error}</p>
              </div>
            ) : (
              <>
                {/* Modal header image */}
                <div
                  className="w-full h-[120px] bg-gradient-to-r from-orange-200 to-orange-400 object-cover"
                  style={{
                    backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <img
                  src={profile.profilePicUrl || "https://via.placeholder.com/90"}
                  alt=""
                  className="w-[90px] h-[90px] rounded-full border-4 border-white mx-auto block relative z-5 object-cover"
                  style={{ marginTop: -45 }}
                />

                <div className="p-6 text-center">
                  <h2 className="text-xl font-bold text-gray-900 mt-2">{profile.displayName}</h2>
                  <p className="text-gray-500 text-sm">@{profile.username}</p>

                  <h3 className="text-lg font-bold text-gray-800 text-left mt-6 mb-3">Benefícios exclusivos</h3>
                  <ul className="text-left mb-6 space-y-2 text-gray-600">
                    <li className="flex items-center gap-2"><span className="text-[#F9A826]">✓</span> Acesso ao conteúdo</li>
                    <li className="flex items-center gap-2"><span className="text-[#F9A826]">✓</span> Chat exclusivo com o criador</li>
                    <li className="flex items-center gap-2"><span className="text-[#F9A826]">✓</span> Cancele a qualquer hora</li>
                  </ul>

                  <h3 className="text-lg font-bold text-gray-800 text-left mb-3">Formas de pagamento</h3>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-500">Valor</span>
                    <span className="text-lg font-bold text-gray-900">{pixModal.priceLabel}</span>
                  </div>

                  {/* PIX code input */}
                  <input
                    className="w-full p-3 mb-3 rounded-lg border border-gray-200 text-center text-sm bg-gray-50"
                    readOnly
                    value={pixModal.pixCode || ""}
                  />

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      className="flex-1 py-3 rounded-lg font-semibold text-sm cursor-pointer border-none bg-gray-200 text-gray-700"
                      onClick={() => setShowQr(!showQr)}
                    >
                      {showQr ? "Ocultar QR Code" : "Ver QR Code"}
                    </button>
                    <button
                      className="flex-1 py-3 rounded-lg font-semibold text-sm cursor-pointer border-none bg-[#F9A826] text-white"
                      onClick={copyPixCode}
                    >
                      Copiar chave
                    </button>
                  </div>

                  {/* QR Code */}
                  {showQr && pixModal.qrCodeBase64 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-center">
                      <img src={pixModal.qrCodeBase64} alt="QR Code Pix" className="w-48 h-48 rounded-lg" />
                    </div>
                  )}

                  {/* Payment status */}
                  {paymentStatus === "paid" && (
                    <div className="mt-4 text-center font-bold text-green-600">
                      ✓ Pagamento aprovado! Acesso liberado.
                    </div>
                  )}
                  {paymentStatus === "expired" && (
                    <div className="mt-4 text-center font-bold text-red-600">
                      QR Code expirado. Tente gerar novamente.
                    </div>
                  )}
                  {!paymentStatus && !pixModal.loading && (
                    <div className="mt-4 text-center text-sm text-gray-500">
                      Aguardando pagamento...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CSS Animation for cookie popup */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
