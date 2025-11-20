import { GoogleGenAI, Modality } from "@google/genai";

// Helper to get the client safely
export const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing. AI features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const askAssistant = async (
  prompt: string,
  contextData: string
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Erro: Chave de API não configurada.";

  try {
    const systemInstruction = `
      Você é o assistente virtual do Bill, um pintor profissional. 
      O Bill usa este aplicativo para gerenciar suas obras.
      Responda de forma curta, direta e amigável (em Português do Brasil).
      O Bill não gosta de termos técnicos de computador, fale a língua dele (construção civil, pintura).
      
      Contexto atual dos dados do Bill:
      ${contextData}
      
      Se ele perguntar sobre orçamento, ajude-o a calcular baseando-se em áreas quadradas padrão (tinta rende aprox 10m²/litro).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "Desculpe, não consegui entender.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Ocorreu um erro ao tentar falar com a inteligência artificial. Tente novamente.";
  }
};

export const generateEditedImage = async (
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string | null> => {
  const ai = getClient();
  if (!ai) throw new Error("API Key missing");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType, 
            },
          },
          {
            text: `Apply the following modification to the room/wall in the image: ${prompt}. Maintain photorealism. Keep the furniture and structure intact, only change the wall surface/color.`, 
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData?.data) {
      return part.inlineData.data;
    }
    return null;
  } catch (error) {
    console.error("Error generating edited image:", error);
    throw error;
  }
};