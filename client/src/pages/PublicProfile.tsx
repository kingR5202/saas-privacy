import { useEffect, useState, useCallback } from "react";
import { useRoute } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

interface Profile {
  id: number; userId: string; username: string; displayName: string; bio: string | null;
  profilePicUrl: string | null; bannerUrl: string | null; theme: string;
  totalSubscribers: number; totalPosts: number; totalMedia: number; totalExclusive: number; totalLikes: number;
}
interface Plan { id: number; name: string; description: string | null; priceInCents: number; billingCycle: string; }
interface Post { id: number; profileId: number; imageUrl: string | null; videoUrl: string | null; caption: string | null; isLocked: boolean; createdAt: string; }
interface GatewayConfig { gateway: string; redirect_url?: string; }

export default function PublicProfile() {
  const [, params] = useRoute("/:username");
  const username = params?.username;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "media">("posts");
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [pixQrBase64, setPixQrBase64] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [showQr, setShowQr] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").eq("username", username).limit(1).single();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setProfile(data as Profile);
    const { data: plansData } = await supabase.from("subscription_plans").select("*").eq("profileId", data.id).eq("isActive", true);
    setPlans((plansData || []) as Plan[]);
    const { data: postsData } = await supabase.from("posts").select("*").eq("profileId", data.id).order("createdAt", { ascending: false });
    setPosts((postsData || []) as Post[]);
    setLoading(false);
  }, [username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handlePlanClick = async (plan: Plan) => {
    if (!profile) return;
    setSelectedPlan(plan); setShowPixModal(true); setPixLoading(true); setPixError(""); setPixCode(""); setPixQrBase64(""); setPaymentStatus("Gerando cobrança PIX...");
    try {
      const resp = await fetch("/api/payment.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, userId: profile.userId, amount: plan.priceInCents }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Erro ao gerar PIX");
      setPixCode(result.qr_code || result.pixCopyPaste || result.brcode || "");
      setPixQrBase64(result.qr_code_base64 || "");
      setPaymentStatus("Aguardando pagamento...");
      if (result.id) {
        const interval = setInterval(async () => {
          try {
            const sr = await fetch(`/api/payment.php?id=${result.id}&userId=${profile.userId}`);
            const sd = await sr.json();
            if (["paid", "completed", "succeeded"].includes(sd.status)) {
              clearInterval(interval); setPaymentStatus("Pagamento confirmado! ✅");
              if (result.redirect_url) setTimeout(() => { window.location.href = result.redirect_url; }, 2000);
            }
          } catch { } // eslint-disable-line
        }, 5000);
        setTimeout(() => clearInterval(interval), 600000);
      }
    } catch (err: any) { setPixError(err.message); setPaymentStatus(""); } finally { setPixLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-black"><Loader2 className="animate-spin w-8 h-8 text-white" /></div>;
  if (notFound || !profile) return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="text-center"><h1 className="text-3xl font-bold mb-2">Perfil não encontrado</h1><p className="text-gray-400">O perfil @{username} não existe.</p></div>
    </div>
  );

  const dark = profile.theme !== "light";
  const bg = dark ? "#0a0a0a" : "#F8F9FA";
  const cardBg = dark ? "#1a1a1a" : "#FFFFFF";
  const textColor = dark ? "#ffffff" : "#1a1a1a";
  const subText = dark ? "#888" : "#6c6c6c";
  const borderColor = dark ? "#2a2a2a" : "#F0F0F0";
  const lockedBg = dark ? "#1e1e1e" : "#F5F1ED";

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Lato', 'Segoe UI', sans-serif", color: textColor }}>
      <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

      {/* Top Header */}
      <header style={{ width: "100%", background: cardBg, borderBottom: `1px solid ${borderColor}`, padding: "15px 0", textAlign: "center" }}>
        <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "1px", textTransform: "lowercase" }}>privacy</span>
      </header>

      {/* Profile name bar */}
      <div style={{ textAlign: "center", padding: "12px", borderBottom: `1px solid ${borderColor}`, background: cardBg }}>
        <span style={{ fontWeight: 700, fontSize: "14px" }}>{profile.username}</span>
      </div>

      {/* Main container */}
      <div style={{ maxWidth: 600, margin: "0 auto", background: cardBg, minHeight: "calc(100vh - 100px)" }}>
        {/* Cover photo */}
        <div style={{
          height: 180, backgroundSize: "cover", backgroundPosition: "center",
          background: profile.bannerUrl ? `url(${profile.bannerUrl}) center/cover` : "linear-gradient(135deg, #e67a3d, #f4a574)",
        }} />

        {/* Profile info bar */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 20px", marginTop: -45 }}>
          {profile.profilePicUrl ? (
            <img src={profile.profilePicUrl} alt="" style={{ width: 90, height: 90, borderRadius: "50%", border: `4px solid ${cardBg}`, objectFit: "cover", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
          ) : (
            <div style={{ width: 90, height: 90, borderRadius: "50%", border: `4px solid ${cardBg}`, background: "linear-gradient(135deg, #e67a3d, #f4a574)" }} />
          )}
          <div style={{ display: "flex", gap: 15, fontSize: "0.85em", color: subText, paddingBottom: 8 }}>
            <span><i className="fas fa-image" style={{ marginRight: 4 }} />{formatNum(profile.totalPosts)}</span>
            <span><i className="fas fa-play-circle" style={{ marginRight: 4 }} />{formatNum(profile.totalMedia)}</span>
            <span><i className="fas fa-lock" style={{ marginRight: 4 }} />{profile.totalExclusive}</span>
            <span><i className="fas fa-heart" style={{ marginRight: 4 }} />{formatNum(profile.totalLikes)}</span>
          </div>
        </div>

        {/* Profile details */}
        <div style={{ padding: "15px 20px" }}>
          <h1 style={{ fontSize: "1.1em", fontWeight: 900, display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
            {profile.displayName}
            <i className="fas fa-check-circle" style={{ color: "#e67a3d", fontSize: "0.7em" }} />
          </h1>
          <p style={{ color: subText, fontSize: "1em", marginBottom: 12 }}>@{profile.username}</p>
          {profile.bio && <p style={{ fontSize: "0.95em", lineHeight: 1.6, marginBottom: 15 }}>{profile.bio}</p>}
          <div style={{ display: "flex", gap: 15, fontSize: "1.3em", color: subText, marginBottom: 10 }}>
            <i className="fab fa-instagram" />
          </div>
        </div>

        {/* Subscription buttons - Mimo & Chat style */}
        <div style={{ padding: "0 20px 15px", display: "flex", gap: 10 }}>
          <button style={{ flex: 1, padding: "12px", borderRadius: 25, border: `1px solid ${borderColor}`, background: "transparent", color: textColor, fontWeight: 700, fontSize: "0.95em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <i className="fas fa-dollar-sign" /> Mimo
          </button>
          <button style={{ flex: 1, padding: "12px", borderRadius: 25, border: `1px solid ${borderColor}`, background: "transparent", color: textColor, fontWeight: 700, fontSize: "0.95em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <i className="fas fa-comment-dots" /> Chat
          </button>
        </div>

        {/* Subscription Plans */}
        {plans.length > 0 && (
          <div style={{ padding: "0 20px 20px" }}>
            <h2 style={{ fontSize: "1em", fontWeight: 700, color: subText, marginBottom: 10 }}>Assinaturas</h2>
            {plans.map(plan => (
              <button key={plan.id} onClick={() => handlePlanClick(plan)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                padding: "16px 20px", marginBottom: 10, borderRadius: 15, border: "none",
                fontSize: "1em", fontWeight: 700, color: "#4F2E1B", cursor: "pointer",
                background: "linear-gradient(90deg, #F69449, #FAC59E 50%, #F7A899)",
              }}>
                <span>{plan.name}</span>
                <span>R$ {(plan.priceInCents / 100).toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Tabs */}
        <div style={{ borderTop: `1px solid ${borderColor}`, marginTop: 10, paddingTop: 15, padding: "0 20px" }}>
          <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: `1px solid ${borderColor}` }}>
            <button onClick={() => setActiveTab("posts")} style={{
              flex: 1, padding: 15, background: "transparent", border: "none", cursor: "pointer",
              fontSize: "0.95em", fontWeight: 700, color: activeTab === "posts" ? "#e67a3d" : subText,
              borderBottom: activeTab === "posts" ? "3px solid #e67a3d" : "3px solid transparent",
            }}>
              <i className="fas fa-mobile-alt" style={{ marginRight: 6 }} />{profile.totalPosts} Postagens
            </button>
            <button onClick={() => setActiveTab("media")} style={{
              flex: 1, padding: 15, background: "transparent", border: "none", cursor: "pointer",
              fontSize: "0.95em", fontWeight: 700, color: activeTab === "media" ? "#e67a3d" : subText,
              borderBottom: activeTab === "media" ? "3px solid #e67a3d" : "3px solid transparent",
            }}>
              <i className="fas fa-photo-video" style={{ marginRight: 6 }} />{profile.totalMedia} Mídias
            </button>
          </div>

          {/* Posts tab */}
          {activeTab === "posts" && (
            <div style={{ marginTop: 20, paddingBottom: 40 }}>
              {posts.length > 0 ? posts.map(post => (
                <div key={post.id} style={{ border: `1px solid ${borderColor}`, borderRadius: 15, overflow: "hidden", marginBottom: 15 }}>
                  {/* Post header */}
                  <div style={{ display: "flex", alignItems: "center", padding: 12, gap: 10 }}>
                    {profile.profilePicUrl ? (
                      <img src={profile.profilePicUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e67a3d" }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95em" }}>{profile.displayName} <i className="fas fa-check-circle" style={{ color: "#e67a3d", fontSize: "0.65em" }} /></span>
                      <br /><span style={{ color: subText, fontSize: "0.85em" }}>@{profile.username}</span>
                    </div>
                    <span style={{ color: subText, fontSize: "0.8em" }}>{new Date(post.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <i className="fas fa-ellipsis-h" style={{ color: subText, marginLeft: 8 }} />
                  </div>
                  {/* Post content */}
                  {post.imageUrl && (
                    <div style={{ position: "relative" }}>
                      <img src={post.imageUrl} alt="" style={{ width: "100%", display: "block" }} />
                      {post.isLocked && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(20px)" }}>
                          <i className="fas fa-lock" style={{ fontSize: "2em", color: "#fff" }} />
                        </div>
                      )}
                    </div>
                  )}
                  {post.videoUrl && (
                    <video src={post.videoUrl} autoPlay muted loop playsInline style={{ width: "100%", display: "block" }} />
                  )}
                  {!post.imageUrl && !post.videoUrl && (
                    <div style={{ background: lockedBg, padding: 40, textAlign: "center" }}>
                      <i className="fas fa-lock" style={{ fontSize: "2.5em", color: subText }} />
                    </div>
                  )}
                  {/* Post actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 15px", fontSize: "1.3em", color: subText }}>
                    <div style={{ display: "flex", gap: 18 }}>
                      <i className="far fa-heart" />
                      <i className="far fa-comment" />
                      <i className="fas fa-dollar-sign" style={{ border: `2px solid ${subText}`, borderRadius: "50%", fontSize: "0.7em", padding: 4, width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center" }} />
                    </div>
                    <i className="far fa-bookmark" />
                  </div>
                </div>
              )) : (
                <div style={{ border: `1px solid ${borderColor}`, borderRadius: 15, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", padding: 12, gap: 10 }}>
                    {profile.profilePicUrl ? (
                      <img src={profile.profilePicUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e67a3d" }} />
                    )}
                    <div><span style={{ fontWeight: 700 }}>{profile.displayName} <i className="fas fa-check-circle" style={{ color: "#e67a3d", fontSize: "0.65em" }} /></span><br /><span style={{ color: subText, fontSize: "0.85em" }}>@{profile.username}</span></div>
                  </div>
                  <div style={{ background: lockedBg, padding: 60, textAlign: "center" }}>
                    <i className="fas fa-lock" style={{ fontSize: "2.5em", color: subText }} />
                    <p style={{ color: subText, marginTop: 12, fontWeight: 700 }}>Conteúdo Exclusivo</p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 15px", fontSize: "1.3em", color: subText }}>
                    <div style={{ display: "flex", gap: 18 }}><i className="far fa-heart" /><i className="far fa-comment" /></div>
                    <i className="far fa-bookmark" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media tab */}
          {activeTab === "media" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 20, paddingBottom: 40 }}>
              {(posts.filter(p => p.imageUrl).length > 0 ? posts.filter(p => p.imageUrl) : Array(6).fill(null)).map((post, i) => (
                <div key={post?.id || i} style={{
                  aspectRatio: "1/1", background: lockedBg, borderRadius: 10, display: "flex",
                  alignItems: "center", justifyContent: "center", overflow: "hidden",
                  backgroundImage: post?.imageUrl ? `url(${post.imageUrl})` : undefined,
                  backgroundSize: "cover", backgroundPosition: "center", position: "relative",
                }}>
                  {post?.isLocked !== false && (
                    <div style={{ position: "absolute", inset: 0, background: post?.imageUrl ? "rgba(0,0,0,0.4)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: post?.imageUrl ? "blur(10px)" : "none" }}>
                      <i className="fas fa-lock" style={{ fontSize: "1.5em", color: subText }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PIX Modal */}
      {showPixModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 15 }} onClick={() => setShowPixModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 400, width: "100%", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{
              height: 120, backgroundSize: "cover", backgroundPosition: "center",
              background: profile.bannerUrl ? `url(${profile.bannerUrl}) center/cover` : "linear-gradient(135deg, #e67a3d, #f4a574)",
              position: "relative"
            }}>
              <button onClick={() => setShowPixModal(false)} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
            {profile.profilePicUrl ? (
              <img src={profile.profilePicUrl} alt="" style={{ width: 90, height: 90, borderRadius: "50%", border: "4px solid #fff", margin: "-45px auto 0", display: "block", position: "relative", zIndex: 5, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: "50%", border: "4px solid #fff", margin: "-45px auto 0", position: "relative", zIndex: 5, background: "linear-gradient(135deg, #e67a3d, #f4a574)" }} />
            )}
            <div style={{ padding: 24, textAlign: "center", color: "#111" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{profile.displayName}</h2>
              <p style={{ color: "#667", fontSize: 15 }}>@{profile.username}</p>

              {pixLoading ? (
                <div style={{ padding: "32px 0" }}><Loader2 className="animate-spin" style={{ width: 32, height: 32, margin: "0 auto", color: "#e67a3d" }} /><p style={{ fontSize: 14, marginTop: 12, color: "#666" }}>{paymentStatus}</p></div>
              ) : pixError ? (
                <div style={{ padding: 24, color: "#e53e3e" }}><p style={{ fontWeight: 700 }}>Erro</p><p style={{ fontSize: 14 }}>{pixError}</p></div>
              ) : (
                <>
                  <h3 style={{ fontWeight: 700, textAlign: "left", marginTop: 24, marginBottom: 12, color: "#333", fontSize: 18 }}>Benefícios exclusivos</h3>
                  <ul style={{ listStyle: "none", padding: 0, textAlign: "left", marginBottom: 24 }}>
                    <li style={{ padding: "6px 0", fontSize: 14 }}>✅ Acesso a todo conteúdo exclusivo</li>
                    <li style={{ padding: "6px 0", fontSize: 14 }}>✅ Chat direto com o criador</li>
                    <li style={{ padding: "6px 0", fontSize: 14 }}>✅ Cancele a qualquer momento</li>
                  </ul>
                  <div style={{ display: "flex", justifyContent: "space-between", background: "#f9f9f9", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <span style={{ color: "#666" }}>Valor</span>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>R$ {selectedPlan ? (selectedPlan.priceInCents / 100).toFixed(2) : "0.00"}</span>
                  </div>
                  {pixCode && (
                    <>
                      <input readOnly value={pixCode} style={{ width: "100%", padding: "10px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 8, fontSize: 11, fontFamily: "monospace", textAlign: "center", marginBottom: 12 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setShowQr(!showQr)} style={{ flex: 1, padding: 12, background: "#eee", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{showQr ? "Ocultar QR" : "Ver QR Code"}</button>
                        <button onClick={() => navigator.clipboard.writeText(pixCode)} style={{ flex: 1, padding: 12, background: "linear-gradient(90deg, #F69449, #F7A899)", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14, color: "#4F2E1B", cursor: "pointer" }}>Copiar Chave</button>
                      </div>
                      {showQr && pixQrBase64 && <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}><img src={pixQrBase64} alt="QR" style={{ width: 192, height: 192, borderRadius: 8 }} /></div>}
                    </>
                  )}
                  {paymentStatus && <p style={{ fontSize: 14, marginTop: 16, fontWeight: 700, color: "#e67a3d" }}>{paymentStatus}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
