import { useSupabaseAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Settings, LogOut, Home, Loader2, Save, Trash2, ExternalLink, Copy, Upload, ImagePlus, Pencil, Eye, EyeOff, Heart, Flame, X, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

interface Profile {
  id: number; userId: string; username: string; displayName: string; bio: string | null;
  profilePicUrl: string | null; bannerUrl: string | null; isActive: boolean; theme: string;
  totalSubscribers: number; totalPosts: number; totalMedia: number; totalExclusive: number; totalLikes: number;
  redirect_url: string | null;
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
  buckpay_user_agent?: string;
  redirect_url?: string;
}

interface SubscriptionPlan {
  id: number; profileId: number; name: string; description: string | null;
  priceInCents: number; billingCycle: string; isActive: boolean;
}

export default function CreatorDashboard() {
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("profiles");

  // Posts state
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostImage, setNewPostImage] = useState("");
  const [uploadingPostImg, setUploadingPostImg] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Sales state
  interface ProfileSales { profileId: number; profileName: string; username: string; pixCount: number; totalAmount: number; }
  const [salesData, setSalesData] = useState<ProfileSales[]>([]);
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

  // Image upload helper — converts to WebP on server
  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const resp = await fetch('/api/upload.php', { method: 'POST', body: formData });
      const data = await resp.json();
      if (!resp.ok) { alert('Erro ao enviar: ' + (data.error || 'Desconhecido')); return null; }
      return data.url;
    } catch (err) { alert('Erro de conexão ao enviar imagem'); return null; }
  };

  // Gateway state
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>({ gateway: "pushinpay" });
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
    setProfiles((data || []) as Profile[]);
    setLoadingProfiles(false);
  }, [user]);

  // Load gateway config
  const loadGatewayConfig = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("gateway_configs").select("*").eq("userId", user.id).limit(1).single();
    if (data) setGatewayConfig(data as GatewayConfig);
  }, [user]);

  // Load plans for a profile
  const loadPlans = useCallback(async (profileId: number) => {
    const { data } = await supabase.from("subscription_plans").select("*").eq("profileId", profileId);
    setPlans((data || []) as SubscriptionPlan[]);
  }, []);

  useEffect(() => {
    if (user) { loadProfiles(); loadGatewayConfig(); }
  }, [user, loadProfiles, loadGatewayConfig]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (!user) return null;

  // Create profile
  const handleCreateProfile = async () => {
    if (!newProfile.username || !newProfile.displayName) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").insert({
      userId: user.id,
      username: newProfile.username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      displayName: newProfile.displayName,
      bio: newProfile.bio || null,
      profilePicUrl: newProfile.profilePicUrl || null,
      bannerUrl: newProfile.bannerUrl || null,
    });
    if (error) alert("Erro: " + error.message);
    else { setShowCreateProfile(false); setNewProfile({ username: "", displayName: "", bio: "", profilePicUrl: "", bannerUrl: "" }); loadProfiles(); }
    setSaving(false);
  };

  // Delete profile
  const handleDeleteProfile = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este perfil?")) return;
    await supabase.from("profiles").delete().eq("id", id);
    loadProfiles();
  };

  // Update profile
  const handleUpdateProfile = async () => {
    if (!editingProfile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      displayName: editingProfile.displayName,
      bio: editingProfile.bio,
      profilePicUrl: editingProfile.profilePicUrl,
      bannerUrl: editingProfile.bannerUrl,
      theme: editingProfile.theme || 'dark',
      totalPosts: editingProfile.totalPosts || 0,
      totalMedia: editingProfile.totalMedia || 0,
      totalExclusive: editingProfile.totalExclusive || 0,
      totalLikes: editingProfile.totalLikes || 0,
      redirect_url: editingProfile.redirect_url || null,
      instagram_url: editingProfile.instagram_url || null,
      twitter_url: editingProfile.twitter_url || null,
      tiktok_url: editingProfile.tiktok_url || null,
      onlyfans_url: editingProfile.onlyfans_url || null,
      telegram_url: editingProfile.telegram_url || null,
    }).eq("id", editingProfile.id);
    if (error) alert("Erro: " + error.message);
    else { setEditingProfile(null); loadProfiles(); }
    setSaving(false);
  };

  // Load posts for a profile
  const loadProfilePosts = async (profileId: number) => {
    const { data } = await supabase.from("posts").select("*").eq("profileId", profileId).order("createdAt", { ascending: false });
    setProfilePosts((data || []) as Post[]);
  };

  // Create post
  const handleCreatePost = async () => {
    if (!selectedProfileId) return;
    setSaving(true);
    await supabase.from("posts").insert({
      profileId: selectedProfileId,
      imageUrl: newPostImage || null,
      caption: newPostCaption || null,
      isLocked: true,
    });
    setShowCreatePost(false);
    setNewPostCaption("");
    setNewPostImage("");
    loadProfilePosts(selectedProfileId);
    setSaving(false);
  };

  // Delete post
  const handleDeletePost = async (postId: number) => {
    if (!selectedProfileId) return;
    await supabase.from("posts").delete().eq("id", postId);
    loadProfilePosts(selectedProfileId);
  };

  // Update post
  const handleUpdatePost = async () => {
    if (!editingPost || !selectedProfileId) return;
    setSaving(true);
    await supabase.from("posts").update({
      caption: editingPost.caption,
      isLocked: editingPost.isLocked,
      likes: editingPost.likes,
    }).eq("id", editingPost.id);
    setEditingPost(null);
    loadProfilePosts(selectedProfileId);
    setSaving(false);
  };

  // Load sales data
  const loadSalesData = async () => {
    if (!user) return;
    setLoadingSales(true);
    const { data: txData } = await supabase.from("transactions").select("*").eq("user_id", user.id);
    const txs = txData || [];
    const salesMap = new Map<number, ProfileSales>();
    for (const p of profiles) {
      salesMap.set(p.id, { profileId: p.id, profileName: p.displayName, username: p.username, pixCount: 0, totalAmount: 0 });
    }
    for (const tx of txs) {
      const s = salesMap.get(tx.profile_id);
      if (s) { s.pixCount++; s.totalAmount += tx.amount; }
    }
    setSalesData(Array.from(salesMap.values()));
    setLoadingSales(false);
  };
  const handleSaveGateway = async () => {
    setSavingGateway(true);
    setGatewayMsg("");
    const { error } = await supabase.from("gateway_configs").upsert({ userId: user.id, ...gatewayConfig }, { onConflict: "userId" });
    if (error) setGatewayMsg("Erro: " + error.message);
    else setGatewayMsg("Configurações salvas!");
    setSavingGateway(false);
    setTimeout(() => setGatewayMsg(""), 3000);
  };

  // Create plan
  const handleCreatePlan = async () => {
    if (!selectedProfileId || !newPlan.name) return;
    setSaving(true);
    await supabase.from("subscription_plans").insert({
      profileId: selectedProfileId,
      name: newPlan.name,
      description: newPlan.description || null,
      priceInCents: newPlan.priceInCents,
      billingCycle: newPlan.billingCycle,
    });
    setShowCreatePlan(false);
    setNewPlan({ name: "", description: "", priceInCents: 1990, billingCycle: "monthly" });
    loadPlans(selectedProfileId);
    setSaving(false);
  };

  // Delete plan
  const handleDeletePlan = async (planId: number) => {
    if (!selectedProfileId) return;
    await supabase.from("subscription_plans").delete().eq("id", planId);
    loadPlans(selectedProfileId);
  };

  const siteUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="Privacy" className="w-10 h-10 rounded-full" />
            <div><h1 className="font-bold text-lg">Privacy Creator</h1><p className="text-xs text-gray-500">Dashboard</p></div>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://bot-x.org/hottok?r=6846046252" target="_blank" rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg text-sm font-bold hover:from-pink-600 hover:to-red-600 transition shadow-md">
              <Flame className="w-4 h-4" /> IA Hot 🔥
            </a>
            <span className="text-sm text-gray-600 hidden md:block">{user.email}</span>
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}><Home className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate("/"); }}><LogOut className="w-5 h-5" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="profiles">Meus Perfis</TabsTrigger>
            <TabsTrigger value="vendas" onClick={() => loadSalesData()}>Vendas</TabsTrigger>
            <TabsTrigger value="gateway">Gateway</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="posts">Postagens</TabsTrigger>
          </TabsList>

          {/* ============ PROFILES TAB ============ */}
          <TabsContent value="profiles" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Meus Perfis</h2>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={() => setShowCreateProfile(true)}>
                <Plus className="w-4 h-4" /> Novo Perfil
              </Button>
            </div>

            {/* Create Profile Form */}
            {showCreateProfile && (
              <Card className="p-6 bg-white border-0 shadow-lg">
                <h3 className="font-bold text-lg mb-4">Criar Novo Perfil</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Username *</label>
                    <input className="w-full px-3 py-2 border rounded-lg" placeholder="seunome" value={newProfile.username}
                      onChange={e => setNewProfile({ ...newProfile, username: e.target.value })} />
                    <p className="text-xs text-gray-500 mt-1">Seu link: {siteUrl}/{newProfile.username || "seunome"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome de Exibição *</label>
                    <input className="w-full px-3 py-2 border rounded-lg" placeholder="Seu Nome" value={newProfile.displayName}
                      onChange={e => setNewProfile({ ...newProfile, displayName: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
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
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border"><ImagePlus className="w-6 h-6 text-gray-400" /></div>
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
                          {uploadingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploadingPic ? 'Enviando...' : 'Escolher Foto'}
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Convertida para WebP automaticamente</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Banner / Capa</label>
                    <div className="flex items-center gap-3">
                      {newProfile.bannerUrl ? (
                        <img src={newProfile.bannerUrl} alt="" className="w-32 h-16 rounded-lg object-cover border" />
                      ) : (
                        <div className="w-32 h-16 rounded-lg bg-gray-100 flex items-center justify-center border"><ImagePlus className="w-6 h-6 text-gray-400" /></div>
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
                          {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploadingBanner ? 'Enviando...' : 'Escolher Banner'}
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Convertida para WebP automaticamente</p>
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

            {/* Profiles List */}
            {loadingProfiles ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8" /></div>
            ) : profiles.length === 0 ? (
              <Card className="p-12 text-center bg-white border-0 shadow-md">
                <p className="text-gray-600 mb-4">Você ainda não tem nenhum perfil. Crie o primeiro!</p>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowCreateProfile(true)}>Criar Primeiro Perfil</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map(profile => (
                  <Card key={profile.id} className="overflow-hidden bg-white border-0 shadow-md hover:shadow-lg transition">
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
                          <p className="text-sm text-gray-500">@{profile.username}</p>
                        </div>
                      </div>
                      {profile.bio && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{profile.bio}</p>}
                      <div className="flex items-center gap-2 mb-3 bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-xs text-gray-500 truncate flex-1">{siteUrl}/{profile.username}</span>
                        <button onClick={() => { navigator.clipboard.writeText(`${siteUrl}/${profile.username}`); }}
                          className="text-gray-400 hover:text-orange-500"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => window.open(`/${profile.username}`, "_blank")}
                          className="text-gray-400 hover:text-orange-500"><ExternalLink className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 text-sm" onClick={() => window.open(`/${profile.username}`, "_blank")}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver Página
                        </Button>
                        <Button variant="ghost" size="icon" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                          onClick={() => setEditingProfile({ ...profile })}>
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

            {/* Edit Profile Modal */}
            {editingProfile && (
              <Card className="p-6 bg-white border-0 shadow-lg mt-6">
                <h3 className="font-bold text-lg mb-4">Editar Perfil: @{editingProfile.username}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome de Exibição *</label>
                    <input className="w-full px-3 py-2 border rounded-lg" value={editingProfile.displayName}
                      onChange={e => setEditingProfile({ ...editingProfile, displayName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <input className="w-full px-3 py-2 border rounded-lg bg-gray-50" value={editingProfile.username} disabled />
                    <p className="text-xs text-gray-400 mt-1">Username não pode ser alterado</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Bio</label>
                    <textarea className="w-full px-3 py-2 border rounded-lg" rows={3}
                      value={editingProfile.bio || ''} onChange={e => setEditingProfile({ ...editingProfile, bio: e.target.value })} />
                  </div>

                  {/* Theme Toggle */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Tema da Página</label>
                    <div className="flex gap-3">
                      <button className={`flex-1 p-3 rounded-xl border-2 text-center font-medium transition ${editingProfile.theme === 'dark' ? 'border-orange-500 bg-gray-900 text-white' : 'border-gray-200'}`}
                        onClick={() => setEditingProfile({ ...editingProfile, theme: 'dark' })}>⬛ Escuro</button>
                      <button className={`flex-1 p-3 rounded-xl border-2 text-center font-medium transition ${editingProfile.theme === 'light' ? 'border-orange-500 bg-white text-gray-900' : 'border-gray-200'}`}
                        onClick={() => setEditingProfile({ ...editingProfile, theme: 'light' })}>⬜ Claro</button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Estatísticas do Perfil</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">📷 Postagens</label>
                        <input type="number" className="w-full px-3 py-2 border rounded-lg" value={editingProfile.totalPosts || 0}
                          onChange={e => setEditingProfile({ ...editingProfile, totalPosts: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">🎥 Mídias</label>
                        <input type="number" className="w-full px-3 py-2 border rounded-lg" value={editingProfile.totalMedia || 0}
                          onChange={e => setEditingProfile({ ...editingProfile, totalMedia: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">🔒 Privado</label>
                        <input type="number" className="w-full px-3 py-2 border rounded-lg" value={editingProfile.totalExclusive || 0}
                          onChange={e => setEditingProfile({ ...editingProfile, totalExclusive: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">❤️ Curtidas</label>
                        <input type="number" className="w-full px-3 py-2 border rounded-lg" value={editingProfile.totalLikes || 0}
                          onChange={e => setEditingProfile({ ...editingProfile, totalLikes: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </div>

                  {/* Redirect URL */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">🔗 URL de Redirecionamento (após pagamento)</label>
                    <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="https://t.me/seu_grupo ou link do conteúdo..."
                      value={editingProfile.redirect_url || ""} onChange={e => setEditingProfile({ ...editingProfile, redirect_url: e.target.value })} />
                    <p className="text-xs text-gray-500 mt-1">O cliente será redirecionado para este link após confirmar o pagamento PIX deste perfil.</p>
                  </div>

                  {/* Social Media Links */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">🌐 Redes Sociais</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📷</span>
                        <input className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="Link do Instagram..."
                          value={editingProfile.instagram_url || ""} onChange={e => setEditingProfile({ ...editingProfile, instagram_url: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🐦</span>
                        <input className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="Link do Twitter/X..."
                          value={editingProfile.twitter_url || ""} onChange={e => setEditingProfile({ ...editingProfile, twitter_url: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎵</span>
                        <input className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="Link do TikTok..."
                          value={editingProfile.tiktok_url || ""} onChange={e => setEditingProfile({ ...editingProfile, tiktok_url: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✈️</span>
                        <input className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="Link do Telegram..."
                          value={editingProfile.telegram_url || ""} onChange={e => setEditingProfile({ ...editingProfile, telegram_url: e.target.value })} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Ícones clicáveis aparecerão na página pública do perfil.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Foto de Perfil</label>
                    <div className="flex items-center gap-3">
                      {editingProfile.profilePicUrl ? (
                        <img src={editingProfile.profilePicUrl} alt="" className="w-16 h-16 rounded-full object-cover border" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border"><ImagePlus className="w-6 h-6 text-gray-400" /></div>
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
                    <label className="block text-sm font-medium mb-1">Banner / Capa</label>
                    <div className="flex items-center gap-3">
                      {editingProfile.bannerUrl ? (
                        <img src={editingProfile.bannerUrl} alt="" className="w-32 h-16 rounded-lg object-cover border" />
                      ) : (
                        <div className="w-32 h-16 rounded-lg bg-gray-100 flex items-center justify-center border"><ImagePlus className="w-6 h-6 text-gray-400" /></div>
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
                <div className="flex gap-3 mt-4">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={handleUpdateProfile} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Alterações
                  </Button>
                  <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancelar</Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ============ VENDAS TAB ============ */}
          <TabsContent value="vendas" className="space-y-6">
            <h2 className="text-2xl font-bold">Dashboard de Vendas</h2>
            <p className="text-gray-600">Acompanhe o desempenho de vendas de cada modelo/perfil.</p>

            {loadingSales ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Total Vendas</p>
                        <p className="text-2xl font-black mt-1">
                          R$ {(salesData.reduce((s, d) => s + d.totalAmount, 0) / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Em {salesData.reduce((s, d) => s + d.pixCount, 0)} vendas</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-400" />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">PIX Gerados</p>
                        <p className="text-2xl font-black mt-1">{salesData.reduce((s, d) => s + d.pixCount, 0)}</p>
                        <p className="text-xs text-slate-500 mt-1">Total de cobranças</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-orange-400" />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Ticket Médio</p>
                        <p className="text-2xl font-black mt-1">
                          R$ {salesData.reduce((s, d) => s + d.pixCount, 0) > 0
                            ? (salesData.reduce((s, d) => s + d.totalAmount, 0) / salesData.reduce((s, d) => s + d.pixCount, 0) / 100).toFixed(2)
                            : "0.00"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Valor médio por venda</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-cyan-400" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Per-Profile Sales */}
                <Card className="bg-white border-0 shadow-lg overflow-hidden">
                  <div className="p-5 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-orange-500" /> Vendas por Modelo</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-5 font-semibold text-gray-600">Modelo / Perfil</th>
                          <th className="text-right py-3 px-5 font-semibold text-gray-600">PIX Gerados</th>
                          <th className="text-right py-3 px-5 font-semibold text-gray-600">Total Vendas</th>
                          <th className="text-right py-3 px-5 font-semibold text-gray-600">Ticket Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.map(s => (
                          <tr key={s.profileId} className="border-b hover:bg-orange-50/50 transition">
                            <td className="py-3 px-5">
                              <span className="font-bold">{s.profileName}</span>
                              <span className="text-gray-400 ml-2">@{s.username}</span>
                            </td>
                            <td className="py-3 px-5 text-right">
                              <span className="inline-flex items-center gap-1 font-bold text-orange-600">{s.pixCount}</span>
                            </td>
                            <td className="py-3 px-5 text-right">
                              <span className="font-bold text-green-600">R$ {(s.totalAmount / 100).toFixed(2)}</span>
                            </td>
                            <td className="py-3 px-5 text-right text-gray-600">
                              R$ {s.pixCount > 0 ? (s.totalAmount / s.pixCount / 100).toFixed(2) : "0.00"}
                            </td>
                          </tr>
                        ))}
                        {salesData.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhuma venda registrada ainda. As vendas aparecerão aqui quando um PIX for gerado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Métodos de Pagamento */}
                <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white shadow-lg">
                  <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Métodos de Pagamento
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm"><span className="text-lg">📱</span> Pix</span>
                      <span className="text-green-400 font-bold">100%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ============ GATEWAY TAB ============ */}
          <TabsContent value="gateway" className="space-y-6">
            <h2 className="text-2xl font-bold">Configurar Gateway de Pagamento</h2>
            <p className="text-gray-600">Escolha seu gateway e cole seus tokens de API. Os pagamentos PIX serão processados automaticamente.</p>

            <Card className="p-6 bg-white border-0 shadow-lg">
              {/* Gateway Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Gateway Ativo</label>
                <select className="w-full px-4 py-3 border-2 rounded-xl text-sm font-medium focus:border-orange-500 outline-none transition"
                  value={gatewayConfig.gateway} onChange={e => setGatewayConfig({ ...gatewayConfig, gateway: e.target.value })}>
                  <option value="pushinpay">PushinPay</option>
                  <option value="blackout">Blackout (BlackPayments)</option>
                  <option value="novaplex">NovaPlex</option>
                  <option value="vizzionpay">VizzionPay</option>
                  <option value="alphacash">AlphaCash</option>
                  <option value="buckpay">BuckPay</option>
                </select>
              </div>

              {/* PushinPay Fields */}
              {gatewayConfig.gateway === "pushinpay" && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-bold text-orange-600">PushinPay</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Token</label>
                    <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole seu token PushinPay aqui..."
                      value={gatewayConfig.pushinpay_token || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, pushinpay_token: e.target.value })} />
                    <p className="text-xs text-gray-500 mt-1">Encontre em: pushinpay.com.br → Configurações → API</p>
                  </div>
                </div>
              )}

              {/* Blackout Fields */}
              {gatewayConfig.gateway === "blackout" && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-bold text-gray-700">Blackout (BlackPayments)</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Public Key</label>
                    <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole sua Public Key..."
                      value={gatewayConfig.blackout_public_key || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, blackout_public_key: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Secret Key</label>
                    <input type="password" className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole sua Secret Key..."
                      value={gatewayConfig.blackout_secret_key || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, blackout_secret_key: e.target.value })} />
                  </div>
                </div>
              )}

              {/* NovaPlex Fields */}
              {gatewayConfig.gateway === "novaplex" && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-bold text-blue-600">NovaPlex</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Client ID</label>
                    <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole seu Client ID..."
                      value={gatewayConfig.novaplex_client_id || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, novaplex_client_id: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Client Secret</label>
                    <input type="password" className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole seu Client Secret..."
                      value={gatewayConfig.novaplex_client_secret || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, novaplex_client_secret: e.target.value })} />
                  </div>
                </div>
              )}

              {/* VizzionPay Fields */}
              {gatewayConfig.gateway === "vizzionpay" && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-bold text-emerald-600">VizzionPay</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Public Key</label>
                    <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole sua Public Key..."
                      value={gatewayConfig.vizzionpay_public_key || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, vizzionpay_public_key: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Secret Key</label>
                    <input type="password" className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole sua Secret Key..."
                      value={gatewayConfig.vizzionpay_secret_key || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, vizzionpay_secret_key: e.target.value })} />
                  </div>
                </div>
              )}

              {/* AlphaCash Fields */}
              {gatewayConfig.gateway === "alphacash" && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-bold text-red-600">AlphaCash</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Public Key (Chave Pública)</label>
                    <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole sua Public Key..."
                      value={gatewayConfig.alphacash_public_key || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, alphacash_public_key: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Secret Key (Chave Secreta)</label>
                    <input type="password" className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole sua Secret Key..."
                      value={gatewayConfig.alphacash_secret_key || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, alphacash_secret_key: e.target.value })} />
                  </div>
                </div>
              )}

              {/* BuckPay Fields */}
              {gatewayConfig.gateway === "buckpay" && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-bold text-yellow-600">BuckPay</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Token</label>
                    <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Cole seu token BuckPay (40 caracteres)..."
                      value={gatewayConfig.buckpay_token || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, buckpay_token: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">User-Agent</label>
                    <input className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="Valor fornecido pelo gerente de contas..."
                      value={gatewayConfig.buckpay_user_agent || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, buckpay_user_agent: e.target.value })} />
                    <p className="text-xs text-gray-500 mt-1">Solicite ao seu gerente de contas BuckPay</p>
                  </div>
                </div>
              )}


              {/* Redirect URL */}
              <div className="mt-4 border-t pt-4">
                <label className="block text-sm font-medium mb-1">URL de Redirecionamento (após pagamento)</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://t.me/seugrupo"
                  value={gatewayConfig.redirect_url || ""} onChange={e => setGatewayConfig({ ...gatewayConfig, redirect_url: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">Link do Telegram, grupo ou página que o cliente será enviado após pagar.</p>
              </div>

              <div className="flex items-center gap-4 mt-6">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={handleSaveGateway} disabled={savingGateway}>
                  {savingGateway ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Configurações
                </Button>
                {gatewayMsg && <span className={`text-sm ${gatewayMsg.includes("Erro") ? "text-red-500" : "text-green-500"}`}>{gatewayMsg}</span>}
              </div>
            </Card>
          </TabsContent>

          {/* ============ PLANS TAB ============ */}
          <TabsContent value="plans" className="space-y-6">
            <h2 className="text-2xl font-bold">Planos de Assinatura</h2>

            {profiles.length === 0 ? (
              <Card className="p-12 text-center bg-white border-0 shadow-md">
                <p className="text-gray-600">Crie um perfil primeiro para adicionar planos.</p>
              </Card>
            ) : (
              <>
                {/* Profile selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Selecione o Perfil</label>
                  <select className="px-3 py-2 border rounded-lg bg-white" value={selectedProfileId || ""}
                    onChange={e => { const id = Number(e.target.value); setSelectedProfileId(id); if (id) loadPlans(id); }}>
                    <option value="">Escolha um perfil...</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.displayName} (@{p.username})</option>)}
                  </select>
                </div>

                {selectedProfileId && (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold">Planos do perfil</h3>
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={() => setShowCreatePlan(true)}>
                        <Plus className="w-4 h-4" /> Novo Plano
                      </Button>
                    </div>

                    {showCreatePlan && (
                      <Card className="p-6 bg-white border-0 shadow-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Nome do Plano *</label>
                            <input className="w-full px-3 py-2 border rounded-lg" placeholder="1 mês" value={newPlan.name}
                              onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Preço (em centavos) *</label>
                            <input type="number" className="w-full px-3 py-2 border rounded-lg" value={newPlan.priceInCents}
                              onChange={e => setNewPlan({ ...newPlan, priceInCents: Number(e.target.value) })} />
                            <p className="text-xs text-gray-500 mt-1">Ex: 1990 = R$ 19,90</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Descrição</label>
                            <input className="w-full px-3 py-2 border rounded-lg" placeholder="Acesso total por 1 mês"
                              value={newPlan.description} onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} />
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

                    {/* Plans list */}
                    <div className="space-y-3">
                      {plans.length === 0 ? (
                        <p className="text-gray-500 text-center py-6">Nenhum plano criado ainda.</p>
                      ) : plans.map(plan => (
                        <Card key={plan.id} className="p-4 bg-white border-0 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="font-bold">{plan.name}</p>
                            <p className="text-sm text-gray-500">{plan.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-orange-600">R$ {(plan.priceInCents / 100).toFixed(2)}</span>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeletePlan(plan.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* ============ POSTS TAB ============ */}
          <TabsContent value="posts" className="space-y-6">
            <h2 className="text-2xl font-bold">Gerenciar Postagens</h2>
            <p className="text-gray-600">Selecione um perfil e adicione postagens que aparecerão na página pública.</p>

            {/* Profile selector */}
            <div className="flex gap-3 flex-wrap">
              {profiles.map(p => (
                <button key={p.id} onClick={() => { setSelectedProfileId(p.id); loadProfilePosts(p.id); }}
                  className={`px-4 py-2 rounded-xl border font-medium transition ${selectedProfileId === p.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-200 hover:border-orange-300'}`}>
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
                  <Card className="p-6 bg-white border-0 shadow-lg">
                    <h3 className="font-bold text-lg mb-4">Nova Postagem</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Legenda</label>
                        <textarea className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Descrição da postagem..."
                          value={newPostCaption} onChange={e => setNewPostCaption(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Imagem da Postagem</label>
                        <div className="flex items-center gap-3">
                          {newPostImage ? (
                            <img src={newPostImage} alt="" className="w-24 h-24 rounded-lg object-cover border" />
                          ) : (
                            <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center border"><ImagePlus className="w-8 h-8 text-gray-400" /></div>
                          )}
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              setUploadingPostImg(true);
                              const url = await uploadImage(file);
                              if (url) setNewPostImage(url);
                              setUploadingPostImg(false);
                            }} />
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition">
                              {uploadingPostImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              {uploadingPostImg ? 'Enviando...' : 'Escolher Imagem'}
                            </span>
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Convertida para WebP automaticamente</p>
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

                {/* IA Hot Button - Mobile */}
                <a href="https://bot-x.org/hottok?r=6846046252" target="_blank" rel="noopener noreferrer"
                  className="md:hidden flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl text-sm font-bold shadow-md">
                  <Flame className="w-4 h-4" /> Gere suas fotos ficante com essa IA 🔥
                </a>

                {/* Edit Post Modal */}
                {editingPost && (
                  <Card className="p-6 bg-white border-0 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">Editar Postagem</h3>
                      <Button variant="ghost" size="icon" onClick={() => setEditingPost(null)}><X className="w-4 h-4" /></Button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Legenda</label>
                        <textarea className="w-full px-3 py-2 border rounded-lg" rows={3}
                          value={editingPost.caption || ""} onChange={e => setEditingPost({ ...editingPost, caption: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Curtidas</label>
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-500" />
                            <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg"
                              value={editingPost.likes} onChange={e => setEditingPost({ ...editingPost, likes: parseInt(e.target.value) || 0 })} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Visibilidade</label>
                          <button onClick={() => setEditingPost({ ...editingPost, isLocked: !editingPost.isLocked })}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${editingPost.isLocked ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
                              }`}>
                            {editingPost.isLocked ? <><EyeOff className="w-4 h-4" /> Conteúdo Oculto</> : <><Eye className="w-4 h-4" /> Conteúdo Visível</>}
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

                {/* Posts list */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profilePosts.length === 0 ? (
                    <p className="text-gray-500 text-center py-6 col-span-full">Nenhuma postagem criada ainda.</p>
                  ) : profilePosts.map(post => (
                    <Card key={post.id} className="overflow-hidden bg-white border-0 shadow-md">
                      <div className="relative">
                        {post.imageUrl ? (
                          <img src={post.imageUrl} alt="" className="w-full h-40 object-cover" />
                        ) : (
                          <div className="w-full h-40 bg-gray-100 flex items-center justify-center"><ImagePlus className="w-8 h-8 text-gray-300" /></div>
                        )}
                        {post.isLocked && (
                          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Oculto
                          </span>
                        )}
                        {!post.isLocked && (
                          <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Visível
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm line-clamp-2 mb-1">{post.caption || 'Sem legenda'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                          <Heart className="w-3 h-3 text-red-400" /> {post.likes || 0} curtidas
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString('pt-BR')}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 h-8 w-8" onClick={() => setEditingPost({ ...post })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8" onClick={() => handleDeletePost(post.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
