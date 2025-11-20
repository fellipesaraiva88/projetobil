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
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      {/* Only show header if closed (modal mode) or if we want a consistent header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Wand2 size={20} className="text-indigo-500" />
            Visualizar Resultado
          </h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Fechar</button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Image Upload Area */}
        {!image ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div 
              onClick={() => cameraInputRef.current?.click()}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-dashed border-indigo-200 rounded-2xl p-10 text-center cursor-pointer hover:shadow-md transition-all active:scale-95 flex flex-col items-center justify-center min-h-[240px]"
            >
              <div className="bg-white p-5 rounded-full mb-5 shadow-sm">
                <Camera size={48} className="text-indigo-600" />
              </div>
              <p className="font-bold text-xl text-indigo-900 mb-1">Tirar Foto Agora</p>
              <p className="text-indigo-600">Use a câmera do celular</p>
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
              className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:bg-slate-100 transition-all active:scale-95 flex flex-col items-center justify-center min-h-[240px]"
            >
              <div className="bg-white p-5 rounded-full mb-5 shadow-sm">
                <ImageIcon size={48} className="text-slate-500" />
              </div>
              <p className="font-bold text-xl text-slate-800 mb-1">Galeria</p>
              <p className="text-slate-500">Escolher foto antiga</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative group">
                <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm z-10">Foto Original</span>
                <img src={image} alt="Original" className="w-full h-64 object-cover rounded-xl border border-slate-200 shadow-sm bg-slate-100" />
                <button 
                  onClick={() => { setImage(null); setResultImage(null); }}
                  className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-sm hover:bg-white z-10 text-slate-700 transition-colors"
                  title="Trocar Foto"
                >
                  <RefreshCw size={20} />
                </button>
              </div>

              <div className="relative">
                {resultImage ? (
                 <div className="relative animate-in fade-in zoom-in duration-500">
                  <span className="absolute top-3 left-3 bg-indigo-600/90 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm z-10 shadow-sm">Como vai ficar</span>
                  <img src={resultImage} alt="Editada" className="w-full h-64 object-cover rounded-xl border-2 border-indigo-500 shadow-lg bg-slate-100" />
                  <a 
                    href={resultImage} 
                    download="simulacao-bill-pinturas.png"
                    className="absolute bottom-3 right-3 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 z-10 transition-transform hover:scale-105"
                    title="Baixar Imagem"
                  >
                    <Download size={20} />
                  </a>
                </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
                    {isLoading ? (
                      <div className="text-center p-6">
                        <div className="relative mx-auto mb-4 w-16 h-16">
                           <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                           <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <span className="text-lg font-bold text-indigo-800 block mb-1">Pintando...</span>
                        <span className="text-sm text-slate-500">A inteligência artificial está trabalhando</span>
                      </div>
                    ) : (
                      <div className="text-center px-6">
                        <Palette size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-slate-500 font-medium">Selecione uma cor abaixo para ver a mágica acontecer</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Palette size={18} className="text-indigo-500" />
                Escolha a Tinta ou Acabamento
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {PAINT_PRESETS.map((preset) => (
                  <button 
                    key={preset.name}
                    onClick={() => handleGenerate(preset.prompt)}
                    disabled={isLoading}
                    className={`
                      p-3 rounded-xl text-sm font-medium transition-all border text-left relative overflow-hidden
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}
                      bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md
                    `}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`w-6 h-6 rounded-full border border-slate-200 shadow-sm`} 
                           style={{ 
                             backgroundColor: preset.name.includes('Branco') ? '#ffffff' : 
                                            preset.name.includes('Cinza') ? '#9ca3af' :
                                            preset.name.includes('Azul') ? '#1e3a8a' :
                                            preset.name.includes('Verde') ? '#3f6212' :
                                            preset.name.includes('Terracota') ? '#9a3412' :
                                            '#fbbf24' 
                           }} 
                      />
                      <span className="text-slate-700">{preset.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block">Outro Pedido</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Parede de tijolinho aparente..."
                    className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-shadow"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  />
                  <button
                    onClick={() => handleGenerate()}
                    disabled={isLoading || !prompt}
                    className="bg-slate-800 text-white px-5 py-2 rounded-xl font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-all"
                  >
                    <ArrowRight size={20} />
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