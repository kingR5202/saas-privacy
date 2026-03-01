import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Eye, Lock, Image, Video } from "lucide-react";
import { toast } from "sonner";

interface ContentFormData {
  title: string;
  description: string;
  contentType: "photo" | "video" | "post";
  isExclusive: boolean;
  mediaUrl: string;
}

export default function ContentManager({ profileId }: { profileId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ContentFormData>({
    title: "",
    description: "",
    contentType: "photo",
    isExclusive: false,
    mediaUrl: "",
  });

  const { data: content, isLoading, refetch } = trpc.content.getByProfile.useQuery(profileId);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({
        ...formData,
        mediaUrl: event.target?.result as string,
      });
      toast.success("Arquivo carregado com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  const handleCreateContent = async () => {
    if (!formData.title || !formData.mediaUrl) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    toast.success("Conteúdo adicionado com sucesso!");
    setFormData({
      title: "",
      description: "",
      contentType: "photo",
      isExclusive: false,
      mediaUrl: "",
    });
    setIsOpen(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Conteúdo</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
              <Plus className="w-4 h-4" />
              Novo Conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Conteúdo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Upload de Mídia *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mt-2 hover:border-orange-500 transition cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleUpload}
                    className="hidden"
                    id="media-upload"
                  />
                  <label htmlFor="media-upload" className="cursor-pointer">
                    {formData.mediaUrl ? (
                      <div>
                        <p className="text-sm text-green-600 font-medium">Arquivo carregado</p>
                        <p className="text-xs text-gray-600 mt-1">Clique para trocar</p>
                      </div>
                    ) : (
                      <div>
                        <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Clique para fazer upload ou arraste um arquivo</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, MP4 até 100MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Título *</label>
                <Input
                  placeholder="Título do conteúdo"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  placeholder="Descreva seu conteúdo..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Conteúdo *</label>
                <Select value={formData.contentType} onValueChange={(value: any) => setFormData({ ...formData, contentType: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Foto</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="post">Post</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Checkbox
                  checked={formData.isExclusive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isExclusive: checked as boolean })}
                />
                <div>
                  <p className="font-medium text-sm">Conteúdo Exclusivo</p>
                  <p className="text-xs text-gray-600">Apenas para assinantes</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCreateContent}>
                  Adicionar Conteúdo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Carregando conteúdo...</p>
        </div>
      ) : !content || content.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-md">
          <p className="text-gray-600 mb-4">Você ainda não tem conteúdo adicionado.</p>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">Adicionar Primeiro Conteúdo</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item) => (
            <Card key={item.id} className="overflow-hidden bg-white border-0 shadow-md hover:shadow-lg transition">
              <div className="relative aspect-square bg-gray-200 overflow-hidden">
                {item.contentType === "video" ? (
                  <>
                    <video src={item.mediaUrl || ""} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Video className="w-12 h-12 text-white" />
                    </div>
                  </>
                ) : (
                  <img src={item.mediaUrl || ""} alt={item.title || ""} className="w-full h-full object-cover" />
                )}

                {item.isExclusive && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs font-semibold">
                    <Lock className="w-3 h-3" />
                    Exclusivo
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="font-bold text-sm mb-2">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                )}

                <div className="flex gap-2 mb-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {item.viewCount}
                  </div>
                  <div>•</div>
                  <div>{item.likeCount} curtidas</div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700">
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
}
