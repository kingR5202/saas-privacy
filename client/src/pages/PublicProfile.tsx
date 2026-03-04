import { useEffect, useState, useCallback } from "react";
import { useRoute } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

interface Profile {
  id: number; userId: string; username: string; displayName: string; bio: string | null;
  profilePicUrl: string | null; bannerUrl: string | null; theme: string;
  totalSubscribers: number; totalPosts: number; totalMedia: number; totalExclusive: number; totalLikes: number;
  instagram_url: string | null; twitter_url: string | null; tiktok_url: string | null;
  onlyfans_url: string | null; telegram_url: string | null;
}
interface Plan { id: number; name: string; description: string | null; priceInCents: number; billingCycle: string; }
interface Post { id: number; profileId: number; imageUrl: string | null; videoUrl: string | null; caption: string | null; isLocked: boolean; createdAt: string; }

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
  const [expandedBio, setExpandedBio] = useState(false);
  const [mimoActive, setMimoActive] = useState(false);
  const [chatActive, setChatActive] = useState(false);

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

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#000" }}><Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "#fff" }} /></div>;
  if (notFound || !profile) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#000", color: "#fff" }}>
      <div style={{ textAlign: "center" }}><h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Perfil não encontrado</h1><p style={{ color: "#888" }}>O perfil @{username} não existe.</p></div>
    </div>
  );

  const dark = profile.theme !== "light";
  const bg = dark ? "#0a0a0a" : "#F8F9FA";
  const cardBg = dark ? "#1a1a1a" : "#FFFFFF";
  const textColor = dark ? "#ffffff" : "#1a1a1a";
  const subText = dark ? "#888" : "#6c6c6c";
  const borderColor = dark ? "#2a2a2a" : "#E8E8E8";
  const lockedBg = dark ? "#1e1e1e" : "#F5F1ED";
  const logoSrc = dark ? "/privacy-logo-white.svg" : "/privacy-logo.svg";

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  const bioMaxLen = 120;
  const bioText = profile.bio || "";
  const bioTruncated = bioText.length > bioMaxLen && !expandedBio;

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Lato', 'Segoe UI', sans-serif", color: textColor }}>
      <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

      {/* ===== TOP LOGO BAR ===== */}
      <header style={{ width: "100%", background: bg, padding: "16px 24px", display: "flex", alignItems: "center" }}>
        <img src={logoSrc} alt="privacy" style={{ height: 18 }} />
      </header>

      {/* ===== USERNAME BAR ===== */}
      <div style={{ textAlign: "center", padding: "12px 16px", borderBottom: `1px solid ${borderColor}`, background: cardBg, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{profile.username}</span>
        <i className="fas fa-ellipsis-v" style={{ position: "absolute", right: 20, color: subText, cursor: "pointer" }} />
      </div>

      {/* ===== MAIN CONTAINER ===== */}
      <div style={{ maxWidth: 600, margin: "0 auto", background: cardBg, minHeight: "calc(100vh - 100px)" }}>

        {/* Cover Photo */}
        <div style={{
          height: 200, backgroundSize: "cover", backgroundPosition: "center", position: "relative",
          background: profile.bannerUrl ? `url(${profile.bannerUrl}) center/cover` : "linear-gradient(135deg, #e67a3d, #f4a574)",
        }}>
          {/* Profile pic overlapping cover */}
          <div style={{ position: "absolute", bottom: -40, left: 16 }}>
            {profile.profilePicUrl ? (
              <img src={profile.profilePicUrl} alt="" style={{ width: 85, height: 85, borderRadius: "50%", border: `4px solid ${cardBg}`, objectFit: "cover", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
            ) : (
              <div style={{ width: 85, height: 85, borderRadius: "50%", border: `4px solid ${cardBg}`, background: "linear-gradient(135deg, #e67a3d, #f4a574)" }} />
            )}
          </div>

          {/* Stats overlay on the right side of cover */}
          <div style={{ position: "absolute", bottom: 12, right: 16, display: "flex", gap: 14, fontSize: "0.82em", color: "#fff" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="fas fa-images" style={{ fontSize: "0.9em" }} /> {formatNum(profile.totalPosts)}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="fas fa-film" style={{ fontSize: "0.9em" }} /> {formatNum(profile.totalMedia)}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="fas fa-lock" style={{ fontSize: "0.9em" }} /> {profile.totalExclusive}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><i className="fas fa-heart" style={{ fontSize: "0.9em" }} /> {formatNum(profile.totalLikes)}</span>
          </div>
        </div>

        {/* ===== NAME + BIO ===== */}
        <div style={{ padding: "50px 20px 0" }}>
          <h1 style={{ fontSize: "1.05em", fontWeight: 900, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
            {profile.displayName}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#e67a3d" /><path d="M10 16l-4-4 1.4-1.4L10 13.2 16.6 6.6 18 8l-8 8z" fill="#fff" /></svg>
          </h1>
          <p style={{ color: subText, fontSize: "0.9em", margin: "2px 0 10px" }}>@{profile.username}</p>
          {bioText && (
            <p style={{ fontSize: "0.92em", lineHeight: 1.6, margin: "0 0 4px", whiteSpace: "pre-wrap" }}>
              {bioTruncated ? bioText.slice(0, bioMaxLen) + "..." : bioText}
              {bioTruncated && <span onClick={() => setExpandedBio(true)} style={{ color: "#e67a3d", cursor: "pointer", marginLeft: 4, fontWeight: 600 }}>Ler mais</span>}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 10, marginBottom: 8 }}>
            {profile.instagram_url && (
              <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", textDecoration: "none", transition: "transform 0.2s" }} onMouseOver={e => (e.currentTarget.style.transform = "scale(1.15)")} onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}>
                <i className="fab fa-instagram" style={{ fontSize: "0.95em", color: subText }} />
              </a>
            )}
            {profile.twitter_url && (
              <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", textDecoration: "none", transition: "transform 0.2s" }} onMouseOver={e => (e.currentTarget.style.transform = "scale(1.15)")} onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}>
                <i className="fab fa-twitter" style={{ fontSize: "0.95em", color: subText }} />
              </a>
            )}
            {profile.tiktok_url && (
              <a href={profile.tiktok_url} target="_blank" rel="noopener noreferrer" style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", textDecoration: "none", transition: "transform 0.2s" }} onMouseOver={e => (e.currentTarget.style.transform = "scale(1.15)")} onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}>
                <i className="fab fa-tiktok" style={{ fontSize: "0.95em", color: subText }} />
              </a>
            )}
            {profile.telegram_url && (
              <a href={profile.telegram_url} target="_blank" rel="noopener noreferrer" style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", textDecoration: "none", transition: "transform 0.2s" }} onMouseOver={e => (e.currentTarget.style.transform = "scale(1.15)")} onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}>
                <i className="fab fa-telegram-plane" style={{ fontSize: "0.95em", color: subText }} />
              </a>
            )}
            {!profile.instagram_url && !profile.twitter_url && !profile.tiktok_url && !profile.telegram_url && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="fab fa-instagram" style={{ fontSize: "0.95em", color: subText }} />
              </div>
            )}
          </div>
        </div>

        {/* ===== MIMO / CHAT BUTTONS ===== */}
        <div style={{ padding: "8px 20px 18px", display: "flex", gap: 10, position: "relative" }}>
          <button onClick={() => { setMimoActive(true); setTimeout(() => setMimoActive(false), 2000); }} style={{ flex: 1, padding: "13px", borderRadius: 10, border: `1.5px solid ${mimoActive ? '#e67a3d' : borderColor}`, background: mimoActive ? 'rgba(230,122,61,0.1)' : 'transparent', color: mimoActive ? '#e67a3d' : textColor, fontWeight: 700, fontSize: "0.95em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: 'all 0.3s' }}>
            <i className="fas fa-dollar-sign" style={{ fontSize: "0.85em" }} /> {mimoActive ? 'Enviado! ❤️' : 'Mimo'}
          </button>
          <button onClick={() => { setChatActive(true); setTimeout(() => setChatActive(false), 2000); }} style={{ flex: 1, padding: "13px", borderRadius: 10, border: `1.5px solid ${chatActive ? '#e67a3d' : borderColor}`, background: chatActive ? 'rgba(230,122,61,0.1)' : 'transparent', color: chatActive ? '#e67a3d' : textColor, fontWeight: 700, fontSize: "0.95em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: 'all 0.3s' }}>
            <i className="fas fa-comment-dots" style={{ fontSize: "0.85em" }} /> {chatActive ? 'Em breve! 💬' : 'Chat'}
          </button>
        </div>

        {/* ===== SUBSCRIPTION PLANS ===== */}
        {plans.length > 0 && (
          <div style={{ padding: "0 20px 20px" }}>
            <h2 style={{ fontSize: "0.95em", fontWeight: 700, color: subText, marginBottom: 10 }}>Assinaturas</h2>
            {plans.map((plan, idx) => (
              <button key={plan.id} onClick={() => handlePlanClick(plan)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                padding: "16px 20px", marginBottom: 10, borderRadius: 12, border: "none",
                fontSize: "0.95em", fontWeight: 700, color: "#4F2E1B", cursor: "pointer",
                background: "linear-gradient(90deg, #F69449, #FAC59E 50%, #F7A899)",
                position: "relative", overflow: "hidden",
              }}>
                <span>{plan.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {idx === 0 && <span style={{ background: "#e63946", color: "#fff", fontSize: "0.7em", padding: "2px 8px", borderRadius: 20, fontWeight: 800 }}>🔥 Mais Popular</span>}
                  R$ {(plan.priceInCents / 100).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ===== CONTENT TABS ===== */}
        <div style={{ borderTop: `1px solid ${borderColor}` }}>
          <div style={{ display: "flex" }}>
            <button onClick={() => setActiveTab("posts")} style={{
              flex: 1, padding: "16px 0", background: "transparent", border: "none", cursor: "pointer",
              fontSize: "0.9em", fontWeight: 700, color: activeTab === "posts" ? "#e67a3d" : subText,
              borderBottom: activeTab === "posts" ? "2px solid #e67a3d" : `2px solid transparent`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <i className="fas fa-file-alt" style={{ fontSize: "0.85em" }} /> {profile.totalPosts} Postagens
            </button>
            <button onClick={() => setActiveTab("media")} style={{
              flex: 1, padding: "16px 0", background: "transparent", border: "none", cursor: "pointer",
              fontSize: "0.9em", fontWeight: 700, color: activeTab === "media" ? "#e67a3d" : subText,
              borderBottom: activeTab === "media" ? "2px solid #e67a3d" : `2px solid transparent`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <i className="fas fa-photo-video" style={{ fontSize: "0.85em" }} /> {profile.totalMedia} Mídias
            </button>
          </div>

          {/* ===== POSTS TAB ===== */}
          {activeTab === "posts" && (
            <div style={{ padding: "16px 0" }}>
              {posts.length > 0 ? posts.map(post => (
                <div key={post.id} style={{ borderBottom: `1px solid ${borderColor}`, paddingBottom: 0, marginBottom: 0 }}>
                  {/* Post header */}
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 10 }}>
                    {profile.profilePicUrl ? (
                      <img src={profile.profilePicUrl} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e67a3d" }} />
                    )}
                    <div style={{ flex: 1, lineHeight: 1.3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.92em" }}>{profile.displayName}</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#e67a3d" /><path d="M10 16l-4-4 1.4-1.4L10 13.2 16.6 6.6 18 8l-8 8z" fill="#fff" /></svg>
                      </div>
                      <span style={{ color: subText, fontSize: "0.82em" }}>@{profile.username}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ color: subText, fontSize: "0.78em" }}>{new Date(post.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      <i className="fas fa-ellipsis-h" style={{ color: subText, marginLeft: 10, fontSize: "0.85em" }} />
                    </div>
                  </div>

                  {/* Post caption (above image, like real Privacy) */}
                  {post.caption && (
                    <div style={{ padding: "0 16px 10px", fontSize: "0.92em", lineHeight: 1.55 }}>
                      <span style={{ fontWeight: 700 }}>{post.caption}</span>
                    </div>
                  )}

                  {/* Post image/video */}
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
                    <div style={{ background: lockedBg, padding: 50, textAlign: "center" }}>
                      <i className="fas fa-lock" style={{ fontSize: "2.5em", color: subText }} />
                    </div>
                  )}

                  {/* Post action bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="far fa-heart" style={{ fontSize: "1.2em", color: subText, cursor: "pointer" }} />
                      </div>
                      <i className="far fa-comment" style={{ fontSize: "1.15em", color: subText, cursor: "pointer" }} />
                      <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${subText}`, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <i className="fas fa-dollar-sign" style={{ fontSize: "0.6em", color: subText }} />
                      </div>
                    </div>
                    <i className="far fa-bookmark" style={{ fontSize: "1.15em", color: subText, cursor: "pointer" }} />
                  </div>
                </div>
              )) : (
                /* Placeholder locked post when no posts exist */
                <div style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 10 }}>
                    {profile.profilePicUrl ? (
                      <img src={profile.profilePicUrl} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e67a3d" }} />
                    )}
                    <div style={{ lineHeight: 1.3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.92em" }}>{profile.displayName}</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#e67a3d" /><path d="M10 16l-4-4 1.4-1.4L10 13.2 16.6 6.6 18 8l-8 8z" fill="#fff" /></svg>
                      </div>
                      <span style={{ color: subText, fontSize: "0.82em" }}>@{profile.username}</span>
                    </div>
                  </div>
                  <div style={{ background: lockedBg, padding: 60, textAlign: "center" }}>
                    <i className="fas fa-lock" style={{ fontSize: "2.5em", color: subText }} />
                    <p style={{ color: subText, marginTop: 12, fontWeight: 700 }}>Conteúdo Exclusivo</p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", color: subText }}>
                    <div style={{ display: "flex", gap: 18 }}><i className="far fa-heart" style={{ fontSize: "1.2em" }} /><i className="far fa-comment" style={{ fontSize: "1.15em" }} /></div>
                    <i className="far fa-bookmark" style={{ fontSize: "1.15em" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== MEDIA TAB ===== */}
          {activeTab === "media" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, padding: 16, paddingBottom: 40 }}>
              {(posts.filter(p => p.imageUrl).length > 0 ? posts.filter(p => p.imageUrl) : Array(6).fill(null)).map((post, i) => (
                <div key={post?.id || i} style={{
                  aspectRatio: "1/1", background: lockedBg, borderRadius: 6, display: "flex",
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

      {/* ===== PIX MODAL ===== */}
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
