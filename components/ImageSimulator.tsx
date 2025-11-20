import React, { useState, useRef } from 'react';
import { Camera, Wand2, Loader2, ArrowRight, RefreshCw, Download, Palette, Image as ImageIcon } from 'lucide-react';
import { generateEditedImage } from '../services/geminiService';

interface ImageSimulatorProps {
  onClose?: () => void;
}

const PAINT_PRESETS = [
  { name: 'Branco Neve', prompt: 'Paint the walls clean bright white' },
  { name: 'Cinza Cimento', prompt: 'Apply a cement texture to the walls, industrial style' },
  { name: 'Azul Profundo', prompt: 'Paint the walls a deep navy blue color' },
  { name: 'Verde Oliva', prompt: 'Paint the walls an olive green color' },
  { name: 'Terracota', prompt: 'Paint the walls a warm terracotta clay color' },
  { name: 'Amarelo Ouro', prompt: 'Paint the walls a bright sunny yellow' },
];

export const ImageSimulator: React.FC<ImageSimulatorProps> = ({ onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!image || !activePrompt) return;

    setIsLoading(true);
    setPrompt(activePrompt); // Ensure UI reflects clicked preset

    try {
      // Extract base64 data and mime type
      const match = image.match(/^data:(.+);base64,(.+)$/);
      if (!match) throw new Error("Invalid image format");

      const mimeType = match[1];
      const base64Data = match[2];

      const resultBase64 = await generateEditedImage(base64Data, mimeType, activePrompt);
      
      if (resultBase64) {
        setResultImage(`data:image/png;base64,${resultBase64}`);
      } else {
        alert("Não foi possível gerar a imagem. Tente novamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar a imagem. Verifique se a chave de API está correta.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Wand2 size={20} className="text-indigo-500" />
            Simulador de Cores
          </h3>
          <p className="text-xs text-slate-500">Veja como a obra vai ficar antes de pintar</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Fechar</button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Image Upload Area */}
        {!image ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div 
              onClick={() => cameraInputRef.current?.click()}
              className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center cursor-pointer hover:bg-indigo-100 transition-colors flex flex-col items-center justify-center h-48"
            >
              <div className="bg-indigo-200 p-4 rounded-full mb-4">
                <Camera size={40} className="text-indigo-700" />
              </div>
              <p className="font-bold text-indigo-900">Tirar Foto</p>
              <p className="text-sm text-indigo-600">Usar a câmera</p>
              <input 
                ref={cameraInputRef}
                type="file" 
                accept="image/*" 
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-100 transition-colors flex flex-col items-center justify-center h-48"
            >
              <div className="bg-slate-200 p-4 rounded-full mb-4">
                <ImageIcon size={40} className="text-slate-600" />
              </div>
              <p className="font-bold text-slate-800">Galeria</p>
              <p className="text-sm text-slate-500">Escolher foto</p>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10">Original</span>
                <img src={image} alt="Original" className="w-full h-56 object-cover rounded-lg border border-slate-200 bg-slate-100" />
                <button 
                  onClick={() => { setImage(null); setResultImage(null); }}
                  className="absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-sm hover:bg-white z-10"
                  title="Nova Foto"
                >
                  <RefreshCw size={18} className="text-slate-600" />
                </button>
              </div>

              <div className="relative">
                {resultImage ? (
                 <div className="relative animate-in fade-in zoom-in duration-300">
                  <span className="absolute top-2 left-2 bg-indigo-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10">Resultado</span>
                  <img src={resultImage} alt="Editada" className="w-full h-56 object-cover rounded-lg border border-indigo-200 shadow-md bg-slate-100" />
                  <a 
                    href={resultImage} 
                    download="simulacao-bill-pinturas.png"
                    className="absolute bottom-2 right-2 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 z-10"
                    title="Baixar Imagem"
                  >
                    <Download size={18} />
                  </a>
                </div>
                ) : (
                  <div className="flex items-center justify-center h-56 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-400">
                    {isLoading ? (
                      <div className="text-center">
                        <Loader2 size={32} className="animate-spin mx-auto mb-3 text-indigo-500" />
                        <span className="text-sm font-medium text-slate-600 block">Preparando a tinta...</span>
                        <span className="text-xs text-slate-400">Isso leva alguns segundos</span>
                      </div>
                    ) : (
                      <div className="text-center px-4">
                        <Palette size={32} className="mx-auto mb-2 opacity-50" />
                        <span className="text-sm">Escolha uma cor abaixo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-50 p-4 rounded-xl">
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Palette size={16} />
                Opções de Pintura
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {PAINT_PRESETS.map((preset) => (
                  <button 
                    key={preset.name}
                    onClick={() => handleGenerate(preset.prompt)}
                    disabled={isLoading}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-all border text-left
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}
                      bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border border-slate-200 shadow-sm`} 
                           style={{ 
                             backgroundColor: preset.name.includes('Branco') ? '#ffffff' : 
                                            preset.name.includes('Cinza') ? '#9ca3af' :
                                            preset.name.includes('Azul') ? '#1e3a8a' :
                                            preset.name.includes('Verde') ? '#3f6212' :
                                            preset.name.includes('Terracota') ? '#9a3412' :
                                            '#fbbf24' 
                           }} 
                      />
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-3 mt-3">
                <label className="text-xs text-slate-500 font-medium mb-2 block">Ou descreva o que você quer:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Parede rústica laranja..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  />
                  <button
                    onClick={() => handleGenerate()}
                    disabled={isLoading || !prompt}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};