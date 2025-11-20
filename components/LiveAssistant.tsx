import React, { useState, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Loader2 } from 'lucide-react';
import { LiveServerMessage, Modality } from '@google/genai';
import { getClient } from '../services/geminiService';

// --- AUDIO HELPERS ---
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

// --- COMPONENT ---
export const LiveAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [volume, setVolume] = useState(0);

  // Refs for audio management
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Refs for playback
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // Gemini Session
  const sessionRef = useRef<any>(null);

  const stopAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    scheduledSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    scheduledSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    
    if (sessionRef.current) {
       sessionRef.current = null;
    }
    setIsActive(false);
    setStatus('');
  };

  const startSession = async () => {
    setIsActive(true);
    setStatus('Conectando...');

    try {
      const ai = getClient();
      if (!ai) throw new Error("No API Key");

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext({ sampleRate: 24000 }); 
      audioContextRef.current = ctx;
      nextStartTimeRef.current = ctx.currentTime;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      inputSourceRef.current = source;
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: "Você é o Bill, um pintor experiente e amigável. Fale português do Brasil. Responda de forma curta e útil sobre pinturas, obras e materiais."
        },
        callbacks: {
          onopen: () => {
            setStatus('Ouvindo...');
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmInt16 = float32ToInt16(inputData);
              const pcmBase64 = arrayBufferToBase64(pcmInt16.buffer);

              let sum = 0;
              for(let x of inputData) sum += x * x;
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1));

              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: pcmBase64
                  }
                });
              });
            };
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setStatus('Falando...');
              const audioBytes = base64ToUint8Array(audioData);
              const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
              
              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(ctx.destination);
              
              const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
              sourceNode.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;
              
              scheduledSourcesRef.current.push(sourceNode);
              
              sourceNode.onended = () => {
                const idx = scheduledSourcesRef.current.indexOf(sourceNode);
                if (idx > -1) scheduledSourcesRef.current.splice(idx, 1);
                if (scheduledSourcesRef.current.length === 0) {
                   setStatus('Ouvindo...');
                }
              };
            }

            if (msg.serverContent?.interrupted) {
              scheduledSourcesRef.current.forEach(s => s.stop());
              scheduledSourcesRef.current = [];
              nextStartTimeRef.current = ctx.currentTime;
              setStatus('Ouvindo...');
            }
          },
          onclose: () => {
            setStatus('Desconectado');
            stopAudio();
          },
          onerror: (e) => {
            console.error(e);
            setStatus('Erro');
            stopAudio();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start session", error);
      setStatus('Erro ao iniciar');
      setIsActive(false);
    }
  };

  const toggleSession = () => {
    if (isActive) {
      stopAudio();
    } else {
      setIsOpen(true);
      startSession();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleSession}
        className="fixed bottom-20 right-4 z-50 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-transform active:scale-95 flex items-center justify-center"
        title="Falar com Bill"
      >
        <Mic size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom-10 fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-4 w-72 border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 flex items-center">
            <Volume2 size={18} className="mr-2 text-purple-600" />
            Voz do Bill
          </h3>
          <button onClick={() => { stopAudio(); setIsOpen(false); }} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center py-6">
          <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            status === 'Falando...' ? 'bg-purple-100' : 'bg-slate-100'
          }`}>
            {isActive && (
              <div 
                className="absolute inset-0 rounded-full border-4 border-purple-500 opacity-20 animate-ping" 
                style={{ animationDuration: '2s' }}
              />
            )}
            {status === 'Ouvindo...' && (
              <div 
                className="absolute inset-0 bg-purple-200 rounded-full transition-transform duration-75"
                style={{ transform: `scale(${1 + volume})`, opacity: 0.5 }}
              />
            )}
            
            <div className="z-10 bg-white p-4 rounded-full shadow-sm">
              {status === 'Conectando...' ? (
                <Loader2 size={32} className="text-purple-600 animate-spin" />
              ) : isActive ? (
                <Mic size={32} className="text-purple-600" />
              ) : (
                <MicOff size={32} className="text-slate-400" />
              )}
            </div>
          </div>

          <p className="mt-4 text-sm font-medium text-slate-600">{status || 'Pronto'}</p>
          
          <button 
            onClick={isActive ? stopAudio : startSession}
            className={`mt-6 w-full py-2 rounded-lg font-medium transition-colors ${
              isActive 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isActive ? 'Encerrar Conversa' : 'Começar a Falar'}
          </button>
        </div>
      </div>
    </div>
  );
};