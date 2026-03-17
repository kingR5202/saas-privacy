import { useSupabaseAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Plus, Settings, LogOut, Home, Loader2, Save, Trash2, ExternalLink, Copy, Upload,
  ImagePlus, Pencil, Eye, EyeOff, Heart, Flame, X, DollarSign, TrendingUp, BarChart3,
  LayoutDashboard, Users, CreditCard, Zap, FileText, ShieldCheck, ArrowLeftRight,
  Smartphone, ChevronLeft, Globe, Link2
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Profile {
  id: number; userId: string; username: string; displayName: string; bio: string | null;
  profilePicUrl: string | null; bannerUrl: string | null; isActive: boolean; theme: string;
  totalSubscribers: number; totalPosts: number; totalMedia: number; totalExclusive: number; totalLikes: number;
  redirect_url: string | null; promo_text: string | null; slug: string | null;
  instagram_url: string | null; twitter_url: string | null; tiktok_url: string | null;
  onlyfans_url: string | null; telegram_url: string | null;
}

interface Post {
  id: number; profileId: number; imageUrl: string | null; videoUrl: string | null;
  caption: string | null; isLocked: boolean; likes: number; createdAt: string;
}

interface GatewayConfig {
  gateway: string;
  pushinpay_token?: string;
  blackout_public_key?: string;
  blackout_secret_key?: string;
  novaplex_client_id?: string;
  novaplex_client_secret?: string;
  vizzionpay_public_key?: string;
  vizzionpay_secret_key?: string;
  alphacash_public_key?: string;
  alphacash_secret_key?: string;
  buckpay_token?: string;
  aureapag_api_token?: string;
  aureapag_offer_hash?: string;
  aureapag_product_hash?: string;
  redirect_url?: string;
  utmify_api_token?: string;
  utmify_webhook_url?: string;
}

interface SubscriptionPlan {
  id: number; profileId: number; name: string; description: string | null;
  priceInCents: number; billingCycle: string; isActive: boolean;
}

interface ProfileSales {
  profileId: number; profileName: string; username: string;
  pixCount: number; salesCount: number; totalAmount: number;
}

// ─── Phone Preview Component ─────────────────────────────────────────────
function PhonePreview({ profile, plans }: { profile: Profile | null; plans: SubscriptionPlan[] }) {
  const p = profile;
  const theme = p?.theme || "dark";
  const isDark = theme === "dark";
  const bg = isDark ? "#0a0a0a" : "#F8F9FA";
  const cardBg = isDark ? "#1a1a1a" : "#FFFFFF";
  const textColor = isDark ? "#fff" : "#111";
  const subText = isDark ? "#aaa" : "#666";

  return (
    <div className="hidden lg:flex flex-col items-center gap-3 sticky top-24">
      <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
        <Smartphone className="w-3.5 h-3.5" /> Prévia em Tempo Real (Mobile)
      </p>
      <div className="w-[280px] h-[560px] rounded-[2rem] border-[3px] border-slate-600 overflow-hidden shadow-2xl" style={{ background: bg }}>
        {/* Status bar */}
        <div className="flex justify-between items-center px-4 py-1.5 text-[10px]" style={{ color: subText }}>
          <span>9:41</span>
          <div className="flex gap-1"><span>●●●</span></div>
        </div>

        {/* Header */}
        <div className="text-center py-2" style={{ background: isDark ? "#111" : "#fff" }}>
          <img src="/logo.png" alt="" className="w-6 h-6 mx-auto rounded-full opacity-80" />
          <p className="text-[9px] font-bold mt-0.5" style={{ color: textColor }}>privacy.</p>
        </div>

        {/* Promo Banner */}
        <div className="py-1.5 text-center" style={{ background: "#f97316" }}>
          <p className="text-[9px] font-bold text-white uppercase tracking-wide">
            {p?.promo_text || "PROMOÇÃO POR TEMPO LIMITADO"}
          </p>
        </div>

        {/* Banner + Profile */}
        <div className="relative">
          <div className="h-[70px]" style={{
            background: p?.bannerUrl ? `url(${p.bannerUrl}) center/cover` : "linear-gradient(135deg, #333, #222)"
          }} />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            {p?.profilePicUrl ? (
              <img src={p.profilePicUrl} alt="" className="w-12 h-12 rounded-full border-2 object-cover" style={{ borderColor: bg }} />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 bg-slate-700" style={{ borderColor: bg }} />
            )}
          </div>
          {/* Stats overlay */}
          <div className="absolute bottom-1 right-2 flex gap-2 text-[8px] text-white/80">
            <span>{p?.totalMedia || 0} Mídias</span>
            <span>{p?.totalLikes || 0} Likes</span>
          </div>
        </div>

        {/* Profile Info */}
        <div className="text-center mt-7 px-4">
          <p className="text-[13px] font-bold flex items-center justify-center gap-1" style={{ color: textColor }}>
            {p?.displayName || "Seu Nome"}
            <span className="text-[10px]" style={{ color: "#3b82f6" }}>●</span>
          </p>
          <p className="text-[10px]" style={{ color: subText }}>@{p?.username || "seuusuario"}</p>
          <p className="text-[9px] mt-1 line-clamp-2" style={{ color: subText }}>
            {p?.bio || "Sua biografia incrível aqui. Que ior em seu conteúdo exclusivo e allumas assinantes."}
          </p>

          {/* Social Icons */}
          {(p?.instagram_url || p?.twitter_url || p?.tiktok_url || p?.telegram_url) && (
            <div className="flex justify-center gap-2 mt-2">
              {p?.instagram_url && <div className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center text-[8px]" style={{ color: subText }}>IG</div>}
              {p?.twitter_url && <div className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center text-[8px]" style={{ color: subText }}>X</div>}
              {p?.tiktok_url && <div className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center text-[8px]" style={{ color: subText }}>TT</div>}
              {p?.telegram_url && <div className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center text-[8px]" style={{ color: subText }}>TG</div>}
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="px-3 mt-3">
          <p className="text-[10px] font-semibold mb-1.5" style={{ color: textColor }}>Assinaturas</p>
          <div className="space-y-1.5">
            {(plans.length > 0 ? plans.slice(0, 3) : [{ id: 0, name: "Plano Premium", priceInCents: 1990 }]).map((plan: any, i: number) => (
              <div key={plan.id || i} className="rounded-lg px-2.5 py-2 flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, #F69449, #FAC59E)" }}>
                <div>
                  {i === 0 && <span className="text-[7px] font-bold text-white bg-red-500 px-1 rounded">🔥 Mais Popular</span>}
                  <p className="text-[10px] font-bold text-white">{plan.name}</p>
                </div>
                <p className="text-[11px] font-black text-white">R$ {(plan.priceInCents / 100).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Nav Items ────────────────────────────────────────────────────
const sidebarItems = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "profiles", label: "Meus Funis", icon: Users },
  { id: "edit-profile", label: "Editar Perfil", icon: Pencil },
  { id: "plans", label: "Checkout", icon: CreditCard },
  { id: "gateway", label: "Gateway", icon: Zap },
  { id: "posts", label: "Postagens", icon: FileText },
  { id: "vendas", label: "Vendas", icon: BarChart3 },
  { id: "security", label: "Segurança", icon: ShieldCheck },
  { id: "redirect", label: "Back Redirect", icon: ArrowLeftRight },
];

// ─── Main Component ───────────────────────────────────────────────────────
export default function CreatorDashboard() {
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Privacy Header State
  const [showEmail, setShowEmail] = useState(false);

  // Posts state
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostImage, setNewPostImage] = useState("");
  const [uploadingPostImg, setUploadingPostImg] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Sales state
  const [salesData, setSalesData] = useState<ProfileSales[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Profile state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newProfile, setNewProfile] = useState({ username: "", displayName: "", bio: "", profilePicUrl: "", bannerUrl: "" });
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Image upload helper — uses Supabase Storage for stable, public URLs
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(filename, file, { contentType: file.type, upsert: false });
      if (error) { alert('Erro ao enviar imagem: ' + error.message); return null; }
      const { data } = supabase.storage.from('profile-images').getPublicUrl(filename);
      return data.publicUrl;
    } catch { alert('Erro de conexão ao enviar imagem'); return null; }
  };

  // Gateway state
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>({ gateway: "pushinpay" });
  const [showSecrets, setShowSecrets] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);
  const [gatewayMsg, setGatewayMsg] = useState("");

  // Plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: "", description: "", priceInCents: 1990, billingCycle: "monthly" });

  // Load profiles
  const loadProfiles = useCallback(async () => {
    if (!user) return;
    setLoadingProfiles(true);
    const { data } = await supabase.from("profiles").select("*").eq("userId", user.id);
    const p = (data || []) as Profile[];
    setProfiles(p);
    if (p.length > 0 && !editingProfile) setEditingProfile({ ...p[0] });
    if (p.length > 0 && !selectedProfileId) setSelectedProfileId(p[0].id);
    setLoadingProfiles(false);
  }, [user]);

  // Load gateway config
  const loadGatewayConfig = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("gateway_configs").select("*").eq("userId", user.id).limit(1).single();
    if (data) setGatewayConfig(data as GatewayConfig);
  }, [user]);

  // Load plans
  const loadPlans = useCallback(async (profileId: number) => {
    const { data } = await supabase.from("subscription_plans").select("*").eq("profileId", profileId);
    setPlans((data || []) as SubscriptionPlan[]);
  }, []);

  useEffect(() => {
    if (user) { loadProfiles(); loadGatewayConfig(); }
  }, [user, loadProfiles, loadGatewayConfig]);

  useEffect(() => {
    if (selectedProfileId) loadPlans(selectedProfileId);
  }, [selectedProfileId, loadPlans]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (!user) return null;

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleCreateProfile = async () => {
    if (!newProfile.username || !newProfile.displayName) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").insert({
      userId: user.id, username: newProfile.username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      displayName: newProfile.displayName, bio: newProfile.bio || null,
      profilePicUrl: newProfile.profilePicUrl || null, bannerUrl: newProfile.bannerUrl || null,
    });
    if (error) alert("Erro: " + error.message);
    else { setShowCreateProfile(false); setNewProfile({ username: "", displayName: "", bio: "", profilePicUrl: "", bannerUrl: "" }); loadProfiles(); }
    setSaving(false);
  };

  const handleDeleteProfile = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este perfil?")) return;
    await supabase.from("profiles").delete().eq("id", id);
    loadProfiles();
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      displayName: editingProfile.displayName, bio: editingProfile.bio,
      profilePicUrl: editingProfile.profilePicUrl, bannerUrl: editingProfile.bannerUrl,
      theme: editingProfile.theme || 'dark',
      totalPosts: editingProfile.totalPosts || 0, totalMedia: editingProfile.totalMedia || 0,
      totalExclusive: editingProfile.totalExclusive || 0, totalLikes: editingProfile.totalLikes || 0,
      redirect_url: editingProfile.redirect_url || null, promo_text: editingProfile.promo_text || null,
      slug: editingProfile.slug || null,
      instagram_url: editingProfile.instagram_url || null, twitter_url: editingProfile.twitter_url || null,
      tiktok_url: editingProfile.tiktok_url || null, onlyfans_url: editingProfile.onlyfans_url || null,
      telegram_url: editingProfile.telegram_url || null,
    }).eq("id", editingProfile.id);
    if (error) alert("Erro: " + error.message);
    else { loadProfiles(); }
    setSaving(false);
  };

  const loadProfilePosts = async (profileId: number) => {
    const { data } = await supabase.from("posts").select("*").eq("profileId", profileId).order("createdAt", { ascending: false });
    setProfilePosts((data || []) as Post[]);
  };

  const handleCreatePost = async () => {
    if (!selectedProfileId) return;
    setSaving(true);
    await supabase.from("posts").insert({ profileId: selectedProfileId, imageUrl: newPostImage || null, caption: newPostCaption || null, isLocked: true });
    setShowCreatePost(false); setNewPostCaption(""); setNewPostImage("");
    loadProfilePosts(selectedProfileId); setSaving(false);
  };

  const handleDeletePost = async (postId: number) => {
    if (!selectedProfileId) return;
    await supabase.from("posts").delete().eq("id", postId);
    loadProfilePosts(selectedProfileId);
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !selectedProfileId) return;
    setSaving(true);
    await supabase.from("posts").update({ caption: editingPost.caption, isLocked: editingPost.isLocked, likes: editingPost.likes }).eq("id", editingPost.id);
    setEditingPost(null); loadProfilePosts(selectedProfileId); setSaving(false);
  };

  const loadSalesData = async () => {
    if (!user) return;
    setLoadingSales(true);
    const profileIds = profiles.map(p => p.id);
    if (profileIds.length > 0) {
      const { data: txData } = await supabase.from("transactions").select("*").in("profileId", profileIds);
      const txs = txData || [];
      const salesMap = new Map<number, ProfileSales>();
      for (const p of profiles) salesMap.set(p.id, { profileId: p.id, profileName: p.displayName, username: p.username, pixCount: 0, salesCount: 0, totalAmount: 0 });
      const chartMap = new Map<string, any>();
      for (const tx of txs) {
        const s = salesMap.get(tx.profileId);
        if (s) { s.pixCount++; if (["completed", "paid", "succeeded"].includes(tx.status)) { s.salesCount++; s.totalAmount += (tx.amountInCents || 0); } }
        const dateStr = new Date(tx.createdAt).toISOString().split("T")[0];
        if (!chartMap.has(dateStr)) chartMap.set(dateStr, { date: dateStr, Pendente: 0, Concluído: 0, Cancelado: 0, "Em Análise": 0 });
        const dayData = chartMap.get(dateStr);
        if (["completed", "paid", "succeeded", "approved"].includes(tx.status)) dayData.Concluído++;
        else if (["canceled", "failed"].includes(tx.status)) dayData.Cancelado++;
        else if (["processing", "analysis"].includes(tx.status)) dayData["Em Análise"]++;
        else dayData.Pendente++;
      }
      setSalesData(Array.from(salesMap.values()));
      setChartData(Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date)));
    } else { setSalesData([]); setChartData([]); }
    setLoadingSales(false);
  };

  const handleSaveGateway = async () => {
    setSavingGateway(true); setGatewayMsg("");
    const { error } = await supabase.from("gateway_configs").upsert({ userId: user.id, ...gatewayConfig }, { onConflict: "userId" });
    if (error) setGatewayMsg("Erro: " + error.message);
    else setGatewayMsg("Configurações salvas!");
    setSavingGateway(false);
    setTimeout(() => setGatewayMsg(""), 3000);
  };

  const handleCreatePlan = async () => {
    if (!selectedProfileId || !newPlan.name) return;
    setSaving(true);
    await supabase.from("subscription_plans").insert({
      profileId: selectedProfileId, name: newPlan.name, description: newPlan.description || null,
      priceInCents: newPlan.priceInCents, billingCycle: newPlan.billingCycle,
    });
    setShowCreatePlan(false); setNewPlan({ name: "", description: "", priceInCents: 1990, billingCycle: "monthly" });
    loadPlans(selectedProfileId); setSaving(false);
  };

  const handleDeletePlan = async (planId: number) => {
    if (!selectedProfileId) return;
    await supabase.from("subscription_plans").delete().eq("id", planId);
    loadPlans(selectedProfileId);
  };

  const siteUrl = window.location.origin;
  const totalSales = salesData.reduce((s, d) => s + d.totalAmount, 0);
  const totalPix = salesData.reduce((s, d) => s + d.pixCount, 0);
  const totalPaid = salesData.reduce((s, d) => s + d.salesCount, 0);

  // ─── Render Sections ────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <ChevronLeft className="w-4 h-4" /> Meus Funis
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
            <p className="text-slate-500">{editingProfile?.displayName || "Seu Nome"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-500 cursor-pointer hover:underline" onClick={() => { signOut(); navigate("/"); }}>Sair</span>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-semibold">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sistema Online
            </div>
          </div>
        </div>

        {/* Plan Badge */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <span className="text-3xl">👑</span>
          <div>
            <p className="text-white font-black text-lg">Plano Atual: <span className="text-emerald-400">UNLIMITED</span></p>
            <p className="text-slate-400 text-sm">Status: <span className="text-emerald-400 font-bold">ACTIVE</span> &nbsp;&nbsp; Perfis Criados: <span className="text-white font-bold">{profiles.length} / ∞</span></p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-5 bg-white border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-semibold uppercase">Visualizações do Funil</p>
            <p className="text-3xl font-black text-orange-500 mt-1">{totalPix}</p>
            <p className="text-xs text-slate-400 mt-1">-- desde sempre</p>
          </Card>
          <Card className="p-5 bg-white border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-semibold uppercase">Conversões do Funil</p>
            <p className="text-3xl font-black text-orange-500 mt-1">{totalPaid}</p>
            <p className="text-xs text-slate-400 mt-1">{totalPix > 0 ? ((totalPaid / totalPix) * 100).toFixed(1) : "0.0"}% Taxa de Conversão</p>
          </Card>
          <Card className="p-5 bg-white border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-semibold uppercase">Receita do Funil</p>
            <p className="text-3xl font-black text-slate-800 mt-1">R$ {(totalSales / 100).toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">-- Total Acumulado</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: CreditCard, label: "Minha Assinatura", section: "plans" },
              { icon: Pencil, label: "Editar Perfil", section: "edit-profile" },
              { icon: CreditCard, label: "Configurar Checkout", section: "plans" },
              { icon: Zap, label: "Gateway", section: "gateway" },
            ].map((action) => (
              <button key={action.label} onClick={() => { setActiveSection(action.section); if (action.section === "vendas") loadSalesData(); }}
                className="flex flex-col items-center gap-3 p-6 bg-white border border-slate-200 rounded-2xl hover:border-orange-300 hover:shadow-md transition group">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition">
                  <action.icon className="w-6 h-6 text-orange-500" />
                </div>
                <span className="text-sm font-semibold text-slate-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Phone Preview */}
      <PhonePreview profile={editingProfile} plans={plans} />
    </div>
  );

  const renderEditProfile = () => {
    if (!editingProfile) return (
      <Card className="p-12 text-center"><p className="text-slate-500">Selecione um perfil para editar ou crie um novo.</p></Card>
    );
    return (
      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1 cursor-pointer" onClick={() => setActiveSection("profiles")}>
            <ChevronLeft className="w-4 h-4" /> Meus Funis
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Profile</h2>

          {/* Profile Selector */}
          {profiles.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {profiles.map(p => (
                <button key={p.id} onClick={() => setEditingProfile({ ...p })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${editingProfile.id === p.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  @{p.username}
                </button>
              ))}
            </div>
          )}

          {/* Basic Info */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800">Informações Básicas do Perfil</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nome de Exibição</label>
                <input className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:border-orange-500 outline-none"
                  value={editingProfile.displayName} onChange={e => setEditingProfile({ ...editingProfile, displayName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Usuário (@)</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">@</span>
                  <input className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50" value={editingProfile.username} disabled />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Link do Perfil (Slug)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">...privacy.online/</span>
                <input className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg" placeholder="meu-link-exclusivo"
                  value={editingProfile.slug || ""} onChange={e => setEditingProfile({ ...editingProfile, slug: e.target.value })} />
              </div>
              <p className="text-xs text-orange-500 mt-1">Este será o link final total.acesso-do-privacy.online/...</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Bio (Suporta HTML)</label>
              <textarea className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:border-orange-500 outline-none" rows={3}
                placeholder="Sua biografia incrível aqui. Descreva seu conteúdo exclusivo e atraia assinantes."
                value={editingProfile.bio || ""} onChange={e => setEditingProfile({ ...editingProfile, bio: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Texto da Faixa Promocional (Topo Laranja)</label>
              <input className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:border-orange-500 outline-none"
                placeholder="PROMOÇÃO POR TEMPO LIMITADO"
                value={editingProfile.promo_text || ""} onChange={e => setEditingProfile({ ...editingProfile, promo_text: e.target.value })} />
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Números Sociais (Contadores)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-500">Contador de Mídias (Ex: 412)</label>
                <input type="number" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" value={editingProfile.totalMedia || 0}
                  onChange={e => setEditingProfile({ ...editingProfile, totalMedia: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Contador de Postagens (Ex: 93)</label>
                <input type="number" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" value={editingProfile.totalPosts || 0}
                  onChange={e => setEditingProfile({ ...editingProfile, totalPosts: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Contador de Likes (Ex: 229K)</label>
                <input type="number" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" value={editingProfile.totalLikes || 0}
                  onChange={e => setEditingProfile({ ...editingProfile, totalLikes: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </Card>

          {/* Images */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Imagens</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Foto de Perfil</label>
                <div className="flex items-center gap-3">
                  {editingProfile.profilePicUrl ? (
                    <img src={editingProfile.profilePicUrl} alt="" className="w-16 h-16 rounded-full object-cover border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border"><ImagePlus className="w-6 h-6 text-slate-400" /></div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setUploadingPic(true);
                      const url = await uploadImage(file);
                      if (url) setEditingProfile(p => p ? { ...p, profilePicUrl: url } : p);
                      setUploadingPic(false);
                    }} />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition">
                      {uploadingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingPic ? 'Enviando...' : 'Trocar Foto'}
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Banner / Capa</label>
                <div className="flex items-center gap-3">
                  {editingProfile.bannerUrl ? (
                    <img src={editingProfile.bannerUrl} alt="" className="w-32 h-16 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-32 h-16 rounded-lg bg-slate-100 flex items-center justify-center border"><ImagePlus className="w-6 h-6 text-slate-400" /></div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setUploadingBanner(true);
                      const url = await uploadImage(file);
                      if (url) setEditingProfile(p => p ? { ...p, bannerUrl: url } : p);
                      setUploadingBanner(false);
                    }} />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition">
                      {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingBanner ? 'Enviando...' : 'Trocar Banner'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          {/* Theme */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Tema da Página</h3>
            <div className="flex gap-3">
              <button className={`flex-1 p-3 rounded-xl border-2 text-center font-medium transition ${editingProfile.theme === 'dark' ? 'border-orange-500 bg-slate-900 text-white' : 'border-slate-200'}`}
                onClick={() => setEditingProfile({ ...editingProfile, theme: 'dark' })}>⬛ Escuro</button>
              <button className={`flex-1 p-3 rounded-xl border-2 text-center font-medium transition ${editingProfile.theme === 'light' ? 'border-orange-500 bg-white text-slate-900' : 'border-slate-200'}`}
                onClick={() => setEditingProfile({ ...editingProfile, theme: 'light' })}>⬜ Claro</button>
            </div>
          </Card>

          {/* Social */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Redes Sociais</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📷</span>
                <input className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Link do Instagram..."
                  value={editingProfile.instagram_url || ""} onChange={e => setEditingProfile({ ...editingProfile, instagram_url: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🐦</span>
                <input className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Link do Twitter/X..."
                  value={editingProfile.twitter_url || ""} onChange={e => setEditingProfile({ ...editingProfile, twitter_url: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🎵</span>
                <input className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Link do TikTok..."
                  value={editingProfile.tiktok_url || ""} onChange={e => setEditingProfile({ ...editingProfile, tiktok_url: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">✈️</span>
                <input className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Link do Telegram..."
                  value={editingProfile.telegram_url || ""} onChange={e => setEditingProfile({ ...editingProfile, telegram_url: e.target.value })} />
              </div>
            </div>
          </Card>

          {/* Redirect */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800">URL de Redirecionamento (após pagamento)</h3>
            <input className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono text-sm" placeholder="https://t.me/seu_grupo ou link do conteúdo..."
              value={editingProfile.redirect_url || ""} onChange={e => setEditingProfile({ ...editingProfile, redirect_url: e.target.value })} />
            <p className="text-xs text-slate-500">O cliente será redirecionado para este link após confirmar o pagamento PIX deste perfil.</p>
          </Card>
        </div>

        {/* Phone Preview */}
        <PhonePreview profile={editingProfile} plans={plans} />
      </div>
    );
  };

  const renderProfiles = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Meus Funis</h2>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={() => setShowCreateProfile(true)}>
          <Plus className="w-4 h-4" /> Novo Perfil
        </Button>
      </div>

      {showCreateProfile && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Criar Novo Perfil</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username *</label>
              <input className="w-full px-3 py-2 border rounded-lg" placeholder="seunome" value={newProfile.username}
                onChange={e => setNewProfile({ ...newProfile, username: e.target.value })} />
              <p className="text-xs text-slate-500 mt-1">Seu link: {siteUrl}/{newProfile.username || "seunome"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nome de Exibição *</label>
              <input className="w-full px-3 py-2 border rounded-lg" placeholder="Seu Nome" value={newProfile.displayName}
                onChange={e => setNewProfile({ ...newProfile, displayName: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="Sua descrição..."
                value={newProfile.bio} onChange={e => setNewProfile({ ...newProfile, bio: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Foto de Perfil</label>
              <div className="flex items-center gap-3">
                {newProfile.profilePicUrl ? (
                  <img src={newProfile.profilePicUrl} alt="" className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border"><ImagePlus className="w-6 h-6 text-slate-400" /></div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setUploadingPic(true);
                    const url = await uploadImage(file);
                    if (url) setNewProfile(p => ({ ...p, profilePicUrl: url }));
                    setUploadingPic(false);
                  }} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition">
                    {uploadingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {uploadingPic ? 'Enviando...' : 'Escolher Foto'}
                  </span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Banner / Capa</label>
              <div className="flex items-center gap-3">
                {newProfile.bannerUrl ? (
                  <img src={newProfile.bannerUrl} alt="" className="w-32 h-16 rounded-lg object-cover border" />
                ) : (
                  <div className="w-32 h-16 rounded-lg bg-slate-100 flex items-center justify-center border"><ImagePlus className="w-6 h-6 text-slate-400" /></div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setUploadingBanner(true);
                    const url = await uploadImage(file);
                    if (url) setNewProfile(p => ({ ...p, bannerUrl: url }));
                    setUploadingBanner(false);
                  }} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition">
                    {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {uploadingBanner ? 'Enviando...' : 'Escolher Banner'}
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={handleCreateProfile} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Criar Perfil
            </Button>
            <Button variant="outline" onClick={() => setShowCreateProfile(false)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {loadingProfiles ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8" /></div>
      ) : profiles.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-md">
          <p className="text-slate-600 mb-4">Você ainda não tem nenhum perfil. Crie o primeiro!</p>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowCreateProfile(true)}>Criar Primeiro Perfil</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profiles.map(profile => (
            <Card key={profile.id} className="overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="h-28 bg-gradient-to-r from-orange-300 to-orange-500"
                style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {profile.profilePicUrl ? (
                    <img src={profile.profilePicUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
                  )}
                  <div>
                    <p className="font-bold">{profile.displayName}</p>
                    <p className="text-sm text-slate-500">@{profile.username}</p>
                  </div>
                </div>
                {profile.bio && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{profile.bio}</p>}
                <div className="flex items-center gap-2 mb-3 bg-slate-50 px-3 py-2 rounded-lg">
                  <span className="text-xs text-slate-500 truncate flex-1">{siteUrl}/{profile.username}</span>
                  <button onClick={() => navigator.clipboard.writeText(`${siteUrl}/${profile.username}`)}
                    className="text-slate-400 hover:text-orange-500"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => window.open(`/${profile.username}`, "_blank")}
                    className="text-slate-400 hover:text-orange-500"><ExternalLink className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => window.open(`/${profile.username}`, "_blank")}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver Página
                  </Button>
                  <Button variant="ghost" size="icon" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                    onClick={() => { setEditingProfile({ ...profile }); setActiveSection("edit-profile"); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteProfile(profile.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderGateway = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Configurar Gateway de Pagamento</h2>
      <p className="text-slate-600">Escolha seu gateway e cole seus tokens de API.</p>

      <Card className="p-5 border border-orange-200 bg-orange-50 shadow-sm">
        <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-orange-500" /> Seu URL de Webhook Pessoal
        </h3>
        <p className="text-sm text-orange-700 mb-3">Copie e cole este link nas configurações de Webhook/Callback da plataforma:</p>
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border border-orange-200">
          <code className="text-sm font-bold text-slate-800 flex-1 break-all">https://privacybrasil.blog/api/webhooks.php?u={user.id}</code>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => { navigator.clipboard.writeText(`https://privacybrasil.blog/api/webhooks.php?u=${user.id}`); alert("URL copiada!"); }}>
            <Copy className="w-4 h-4 mr-2" /> Copiar
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Gateway Ativo</label>
            <button onClick={() => setShowSecrets(!showSecrets)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-500">
              {showSecrets ? <><EyeOff className="w-3.5 h-3.5" /> Esconder</> : <><Eye className="w-3.5 h-3.5" /> Mostrar</>}
            </button>
          </div>
          <select className="w-full px-4 py-3 border-2 rounded-xl text-sm font-medium focus:border-orange-500 outline-none"
            value={gatewayConfig.gateway} onChange={e => setGatewayConfig({ ...gatewayConfig, gateway: e.target.value })}>
            <option value="pushinpay">PushinPay</option>
            <option value="blackout">Blackout (BlackPayments)</option>
            <option value="novaplex">NovaPlex</option>
            <option value="vizzionpay">VizzionPay</option>
            <option value="alphacash">AlphaCash</option>
            <option value="buckpay">BuckPay</option>
            <option value="aureapag">AureaPag</option>
          </select>
        </div>

        {/* Gateway-specific fields */}
        {gatewayConfig.gateway === "pushinpay" && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-bold text-orange-600">PushinPay</h3>
            <div>
              <label className="block text-sm font-medium mb-1">API Token</label>
              <input type={showSecrets ? "text" : "password"} className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                placeholder="Cole seu token PushinPay..." value={gatewayConfig.pushinpay_token || ""}
                onChange={e => setGatewayConfig({ ...gatewayConfig, pushinpay_token: e.target.value })} />
            </div>
          </div>
        )}
        {gatewayConfig.gateway === "blackout" && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-bold text-slate-700">Blackout (BlackPayments)</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Public Key</label>
              <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" value={gatewayConfig.blackout_public_key || ""}
                onChange={e => setGatewayConfig({ ...gatewayConfig, blackout_public_key: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secret Key</label>
              <input type={showSecrets ? "text" : "password"} className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                value={gatewayConfig.blackout_secret_key || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, blackout_secret_key: e.target.value })} />
            </div>
          </div>
        )}
        {gatewayConfig.gateway === "novaplex" && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-bold text-blue-600">NovaPlex</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Client ID</label>
              <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" value={gatewayConfig.novaplex_client_id || ""}
                onChange={e => setGatewayConfig({ ...gatewayConfig, novaplex_client_id: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Client Secret</label>
              <input type={showSecrets ? "text" : "password"} className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                value={gatewayConfig.novaplex_client_secret || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, novaplex_client_secret: e.target.value })} />
            </div>
          </div>
        )}
        {gatewayConfig.gateway === "vizzionpay" && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-bold text-emerald-600">VizzionPay</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Public Key</label>
              <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" value={gatewayConfig.vizzionpay_public_key || ""}
                onChange={e => setGatewayConfig({ ...gatewayConfig, vizzionpay_public_key: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secret Key</label>
              <input type={showSecrets ? "text" : "password"} className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                value={gatewayConfig.vizzionpay_secret_key || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, vizzionpay_secret_key: e.target.value })} />
            </div>
          </div>
        )}
        {gatewayConfig.gateway === "alphacash" && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-bold text-red-600">AlphaCash</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Public Key</label>
              <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" value={gatewayConfig.alphacash_public_key || ""}
                onChange={e => setGatewayConfig({ ...gatewayConfig, alphacash_public_key: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secret Key</label>
              <input type={showSecrets ? "text" : "password"} className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                value={gatewayConfig.alphacash_secret_key || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, alphacash_secret_key: e.target.value })} />
            </div>
          </div>
        )}
        {gatewayConfig.gateway === "buckpay" && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-bold text-yellow-600">BuckPay</h3>
            <div>
              <label className="block text-sm font-medium mb-1">API Token</label>
              <input type={showSecrets ? "text" : "password"} className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                value={gatewayConfig.buckpay_token || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, buckpay_token: e.target.value })} />
            </div>
          </div>
        )}
        {gatewayConfig.gateway === "aureapag" && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-bold text-blue-500">AureaPag</h3>
            <div>
              <label className="block text-sm font-medium mb-1">API Token</label>
              <input type={showSecrets ? "text" : "password"} className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                value={gatewayConfig.aureapag_api_token || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, aureapag_api_token: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hash da Oferta</label>
                <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  value={gatewayConfig.aureapag_offer_hash || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, aureapag_offer_hash: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hash do Produto</label>
                <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  value={gatewayConfig.aureapag_product_hash || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, aureapag_product_hash: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* Redirect URL */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-1">URL de Redirecionamento (após pagamento)</label>
          <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://t.me/seugrupo"
            value={gatewayConfig.redirect_url || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, redirect_url: e.target.value })} />
        </div>

        <div className="flex items-center gap-4">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={handleSaveGateway} disabled={savingGateway}>
            {savingGateway ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Configurações
          </Button>
          {gatewayMsg && <span className={`text-sm ${gatewayMsg.includes("Erro") ? "text-red-500" : "text-green-500"}`}>{gatewayMsg}</span>}
        </div>
      </Card>

      {/* UTMify Integration */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Globe className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Integração UTMify (Opcional)</h3>
            <p className="text-xs text-slate-500">Rastreie suas conversões com UTMify</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">API Token</label>
          <input type={showSecrets ? "text" : "password"} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono text-sm"
            placeholder="Cole seu API Token da UTMify..."
            value={gatewayConfig.utmify_api_token || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, utmify_api_token: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Webhook URL</label>
          <input className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono text-sm"
            value={gatewayConfig.utmify_webhook_url || "https://api.utmify.com.br/api-credentials/orders"}
            onChange={e => setGatewayConfig({ ...gatewayConfig, utmify_webhook_url: e.target.value })} />
          <p className="text-xs text-slate-500 mt-1">URL padrão da UTMify. Altere somente se necessário.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={handleSaveGateway} disabled={savingGateway}>
          {savingGateway ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar UTMify
        </Button>
      </Card>
    </div>
  );

  const renderVendas = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard de Vendas</h2>
      {loadingSales ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase">Total Vendas</p>
                  <p className="text-2xl font-black mt-1">R$ {(totalSales / 100).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-1">Em {totalPaid} vendas</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center"><DollarSign className="w-6 h-6 text-green-400" /></div>
              </div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase">PIX Gerados</p>
                  <p className="text-2xl font-black mt-1">{totalPix}</p>
                  <p className="text-xs text-slate-500 mt-1">Total de cobranças</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center"><BarChart3 className="w-6 h-6 text-orange-400" /></div>
              </div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase">Ticket Médio</p>
                  <p className="text-2xl font-black mt-1">R$ {totalPaid > 0 ? (totalSales / totalPaid / 100).toFixed(2) : "0.00"}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center"><TrendingUp className="w-6 h-6 text-cyan-400" /></div>
              </div>
            </Card>
          </div>

          <Card className="p-6 bg-slate-50 border-0 shadow-md">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800"><BarChart3 className="w-5 h-5 text-orange-500" /> Gráfico de Depósitos</h3>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(val) => { const d = new Date(val); return `${d.getUTCDate().toString().padStart(2, '0')} ${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][d.getUTCMonth()]}`; }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="Pendente" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorO)" />
                    <Area type="monotone" dataKey="Concluído" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorC)" />
                    <Area type="monotone" dataKey="Cancelado" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCa)" />
                    <Area type="monotone" dataKey="Em Análise" stroke="#cbd5e1" strokeWidth={3} fillOpacity={0} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <BarChart3 className="w-12 h-12 mb-3 opacity-20" /><p>Nenhum dado disponível.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-white border-0 shadow-lg overflow-hidden">
            <div className="p-5 border-b"><h3 className="font-bold text-lg">Vendas por Modelo</h3></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50">
                <th className="text-left py-3 px-5 font-semibold text-slate-600">Modelo / Perfil</th>
                <th className="text-right py-3 px-5 font-semibold text-slate-600">PIX Gerados</th>
                <th className="text-right py-3 px-5 font-semibold text-slate-600">Vendas (Pagas)</th>
                <th className="text-right py-3 px-5 font-semibold text-slate-600">Total (R$)</th>
                <th className="text-right py-3 px-5 font-semibold text-slate-600">Ticket Médio</th>
              </tr></thead>
              <tbody>
                {salesData.map(s => (
                  <tr key={s.profileId} className="border-b hover:bg-orange-50/50">
                    <td className="py-3 px-5"><span className="font-bold">{s.profileName}</span> <span className="text-slate-400 ml-2">@{s.username}</span></td>
                    <td className="py-3 px-5 text-right font-bold text-orange-600">{s.pixCount}</td>
                    <td className="py-3 px-5 text-right">{s.salesCount}</td>
                    <td className="py-3 px-5 text-right font-bold text-green-600">R$ {(s.totalAmount / 100).toFixed(2)}</td>
                    <td className="py-3 px-5 text-right text-slate-600">R$ {s.salesCount > 0 ? (s.totalAmount / s.salesCount / 100).toFixed(2) : "0.00"}</td>
                  </tr>
                ))}
                {salesData.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhuma venda registrada.</td></tr>}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );

  const renderPlans = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Planos de Assinatura (Checkout)</h2>
      {profiles.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-slate-600">Crie um perfil primeiro.</p></Card>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Selecione o Perfil</label>
            <select className="px-3 py-2 border rounded-lg bg-white" value={selectedProfileId || ""}
              onChange={e => { const id = Number(e.target.value); setSelectedProfileId(id); if (id) loadPlans(id); }}>
              <option value="">Escolha...</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.displayName} (@{p.username})</option>)}
            </select>
          </div>
          {selectedProfileId && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Planos do perfil</h3>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={() => setShowCreatePlan(true)}><Plus className="w-4 h-4" /> Novo Plano</Button>
              </div>
              {showCreatePlan && (
                <Card className="p-6 bg-white border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nome do Plano *</label>
                      <input className="w-full px-3 py-2 border rounded-lg" placeholder="1 mês" value={newPlan.name}
                        onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Preço (centavos) *</label>
                      <input type="number" className="w-full px-3 py-2 border rounded-lg" value={newPlan.priceInCents}
                        onChange={e => setNewPlan({ ...newPlan, priceInCents: Number(e.target.value) })} />
                      <p className="text-xs text-slate-500 mt-1">Ex: 1990 = R$ 19,90</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Descrição</label>
                      <input className="w-full px-3 py-2 border rounded-lg" placeholder="Acesso total" value={newPlan.description}
                        onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ciclo</label>
                      <select className="w-full px-3 py-2 border rounded-lg bg-white" value={newPlan.billingCycle}
                        onChange={e => setNewPlan({ ...newPlan, billingCycle: e.target.value })}>
                        <option value="monthly">Mensal</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="yearly">Anual</option>
                        <option value="lifetime">Vitalício</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCreatePlan} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Plano"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreatePlan(false)}>Cancelar</Button>
                  </div>
                </Card>
              )}
              <div className="space-y-3">
                {plans.length === 0 ? <p className="text-slate-500 text-center py-6">Nenhum plano criado.</p> : plans.map(plan => (
                  <Card key={plan.id} className="p-4 bg-white border border-slate-200 flex items-center justify-between">
                    <div><p className="font-bold">{plan.name}</p><p className="text-sm text-slate-500">{plan.description}</p></div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-orange-600">R$ {(plan.priceInCents / 100).toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeletePlan(plan.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  const renderPosts = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Gerenciar Postagens</h2>
      <div className="flex gap-3 flex-wrap">
        {profiles.map(p => (
          <button key={p.id} onClick={() => { setSelectedProfileId(p.id); loadProfilePosts(p.id); }}
            className={`px-4 py-2 rounded-xl border font-medium transition ${selectedProfileId === p.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-slate-200 hover:border-orange-300'}`}>
            @{p.username}
          </button>
        ))}
      </div>
      {selectedProfileId && (
        <>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={() => setShowCreatePost(true)}>
            <Plus className="w-4 h-4" /> Nova Postagem
          </Button>
          {showCreatePost && (
            <Card className="p-6 bg-white border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4">Nova Postagem</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Legenda</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg" rows={2} value={newPostCaption} onChange={e => setNewPostCaption(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Imagem</label>
                  <div className="flex items-center gap-3">
                    {newPostImage ? <img src={newPostImage} alt="" className="w-24 h-24 rounded-lg object-cover border" /> :
                      <div className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center border"><ImagePlus className="w-8 h-8 text-slate-400" /></div>}
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        setUploadingPostImg(true);
                        const url = await uploadImage(file);
                        if (url) setNewPostImage(url);
                        setUploadingPostImg(false);
                      }} />
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition">
                        {uploadingPostImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {uploadingPostImg ? 'Enviando...' : 'Imagem'}
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={handleCreatePost} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Publicar
                  </Button>
                  <Button variant="outline" onClick={() => { setShowCreatePost(false); setNewPostCaption(""); setNewPostImage(""); }}>Cancelar</Button>
                </div>
              </div>
            </Card>
          )}

          {editingPost && (
            <Card className="p-6 bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Editar Postagem</h3>
                <Button variant="ghost" size="icon" onClick={() => setEditingPost(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-4">
                <textarea className="w-full px-3 py-2 border rounded-lg" rows={3}
                  value={editingPost.caption || ""} onChange={e => setEditingPost({ ...editingPost, caption: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Curtidas</label>
                    <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg"
                      value={editingPost.likes} onChange={e => setEditingPost({ ...editingPost, likes: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Visibilidade</label>
                    <button onClick={() => setEditingPost({ ...editingPost, isLocked: !editingPost.isLocked })}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${editingPost.isLocked ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                      {editingPost.isLocked ? <><EyeOff className="w-4 h-4" /> Oculto</> : <><Eye className="w-4 h-4" /> Visível</>}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={handleUpdatePost} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
                  </Button>
                  <Button variant="outline" onClick={() => setEditingPost(null)}>Cancelar</Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profilePosts.length === 0 ? <p className="text-slate-500 text-center py-6 col-span-full">Nenhuma postagem.</p> : profilePosts.map(post => (
              <Card key={post.id} className="overflow-hidden bg-white border border-slate-200 shadow-sm">
                <div className="relative">
                  {post.imageUrl ? <img src={post.imageUrl} alt="" className="w-full h-40 object-cover" /> :
                    <div className="w-full h-40 bg-slate-100 flex items-center justify-center"><ImagePlus className="w-8 h-8 text-slate-300" /></div>}
                  <span className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${post.isLocked ? 'bg-red-500' : 'bg-green-500'}`}>
                    {post.isLocked ? <><EyeOff className="w-3 h-3" /> Oculto</> : <><Eye className="w-3 h-3" /> Visível</>}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm line-clamp-2 mb-1">{post.caption || 'Sem legenda'}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2"><Heart className="w-3 h-3 text-red-400" /> {post.likes || 0}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString('pt-BR')}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="text-orange-500 hover:bg-orange-50 h-8 w-8" onClick={() => setEditingPost({ ...post })}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 h-8 w-8" onClick={() => handleDeletePost(post.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "overview": return renderOverview();
      case "profiles": return renderProfiles();
      case "edit-profile": return renderEditProfile();
      case "gateway": return renderGateway();
      case "vendas": return renderVendas();
      case "plans": return renderPlans();
      case "posts": return renderPosts();
      case "security": return <div className="space-y-4"><h2 className="text-2xl font-bold text-slate-800">Segurança</h2><Card className="p-8 text-center bg-white border border-slate-200"><p className="text-slate-500">Configurações de segurança em breve.</p></Card></div>;
      case "redirect": return <div className="space-y-4"><h2 className="text-2xl font-bold text-slate-800">Back Redirect</h2><Card className="p-8 text-center bg-white border border-slate-200"><p className="text-slate-500">Configuração de redirecionamento em breve.</p></Card></div>;
      default: return renderOverview();
    }
  };

  // ─── Main Layout ─────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-56'} bg-gradient-to-b from-[#1a1625] to-[#0f0d17] text-white flex flex-col transition-all duration-300 sticky top-0 h-screen`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-xs font-bold">P</div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="font-bold text-sm text-orange-400">Privacy Admin</h1>
              <p className="text-[10px] text-slate-400">Management Panel v2.1</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button key={item.id}
                onClick={() => { setActiveSection(item.id); if (item.id === "vendas") loadSalesData(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          {/* IA Hot Link */}
          <a href="https://bot-x.org/hottok?r=6846046252" target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 transition">
            <Flame className="w-4.5 h-4.5 flex-shrink-0" />
            {!sidebarCollapsed && <span>IA Hot 🔥</span>}
          </a>
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 space-y-2 border-t border-white/10">
          {!sidebarCollapsed && (
            <>
              <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm gap-2 justify-start" onClick={handleUpdateProfile} disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Rascunho"}
              </Button>
              <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm gap-2 justify-start"
                onClick={() => { handleUpdateProfile(); if (editingProfile) window.open(`/${editingProfile.username}`, "_blank"); }}>
                <ExternalLink className="w-4 h-4" /> Publicar Perfil
              </Button>
            </>
          )}
          <button onClick={() => { signOut(); navigate("/"); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-400 text-sm transition">
            <LogOut className="w-4 h-4" /> {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}
