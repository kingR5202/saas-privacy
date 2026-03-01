import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Edit2, Trash2, Settings, Upload } from "lucide-react";
import { toast } from "sonner";

export default function ProfileManager() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    bio: "",
  });

  const { data: profiles, isLoading, refetch } = trpc.profiles.list.useQuery();
  const createProfileMutation = trpc.profiles.create.useMutation({
    onSuccess: () => {
      toast.success("Perfil criado com sucesso!");
      setFormData({ displayName: "", username: "", bio: "" });
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar perfil");
    },
  });

  const handleCreateProfile = async () => {
    if (!formData.displayName || !formData.username) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createProfileMutation.mutate({
      displayName: formData.displayName,
      username: formData.username,
      bio: formData.bio,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Perfis</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
              <Plus className="w-4 h-4" />
              Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome de Exibição *</label>
                <Input
                  placeholder="Ex: Theo Neko"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Username (slug) *</label>
                <Input
                  placeholder="Ex: theoneko"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-600 mt-1">Será usado na URL: dominio.com/{formData.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  placeholder="Descreva seu perfil..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleCreateProfile}
                  disabled={createProfileMutation.isPending}
                >
                  {createProfileMutation.isPending ? "Criando..." : "Criar Perfil"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Carregando perfis...</p>
        </div>
      ) : !profiles || profiles.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-md">
          <p className="text-gray-600 mb-4">Você ainda não tem nenhum perfil criado.</p>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">Criar Primeiro Perfil</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <Card key={profile.id} className="overflow-hidden bg-white border-0 shadow-md hover:shadow-lg transition">
              {/* Banner Preview */}
              <div
                className="h-32 bg-gradient-to-r from-orange-300 to-orange-500"
                style={{
                  backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : undefined,
                  backgroundSize: "cover",
                }}
              />

              {/* Profile Content */}
              <div className="p-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={profile.profilePicUrl || "https://via.placeholder.com/64"}
                    alt={profile.displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                  />
                  <div>
                    <p className="font-bold text-lg">{profile.displayName}</p>
                    <p className="text-sm text-gray-600">@{profile.username}</p>
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">{profile.bio}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-gray-600 text-xs">Assinantes</p>
                    <p className="font-bold text-orange-600">{profile.totalSubscribers}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-gray-600 text-xs">Conteúdo</p>
                    <p className="font-bold text-orange-600">{profile.totalPosts}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-gray-600 text-xs">Mídias</p>
                    <p className="font-bold text-orange-600">{profile.totalMedia}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-gray-600 text-xs">Exclusivas</p>
                    <p className="font-bold text-orange-600">{profile.totalExclusive}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Settings className="w-4 h-4" />
                    Config
                  </Button>
                </div>

                {/* View Profile Link */}
                <Button variant="ghost" className="w-full mt-3 text-orange-600 hover:text-orange-700">
                  Ver Perfil Público
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
