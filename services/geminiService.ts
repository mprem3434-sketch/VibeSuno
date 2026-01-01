
import { GoogleGenAI, Type } from "@google/genai";
import { Song } from "../types";

// Always create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
export const generateAIPartialSongs = async (mood: string): Promise<Partial<Song>[]> => {
  if (!process.env.API_KEY) return [];

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a JSON list of 5 fictional songs that would perfectly match the mood: "${mood}". Include interesting titles, artists, and conceptual album names. Return exactly a JSON array.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
            album: { type: Type.STRING },
            genre: { type: Type.STRING }
          },
          required: ["title", "artist", "album"]
        }
      }
    }
  });

  try {
    const text = response.text;
    if (!text) return [];
    
    const data = JSON.parse(text.trim());
    return data.map((s: any, idx: number) => ({
      ...s,
      id: `ai-${Date.now()}-${idx}`,
      coverUrl: `https://picsum.photos/seed/ai-${idx}-${Date.now()}/400/400`,
      audioUrl: 'https://actions.google.com/sounds/v1/alarms/digital_alarm_clock.ogg',
      duration: 180 + Math.floor(Math.random() * 120)
    }));
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
};

export const generateSongVibeAnalysis = async (song: Song): Promise<string> => {
  if (!process.env.API_KEY) return "No API Key found.";
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the vibe of this song: "${song.title}" by "${song.artist}". Give me a one-sentence artistic poetic description of the sonic atmosphere.`,
    config: {
      temperature: 0.9
    }
  });

  return response.text?.trim() || "Vibe analysis unavailable.";
};

export const generateLyrics = async (song: Song): Promise<string> => {
  if (!process.env.API_KEY) return "";
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Write soulful, evocative lyrics in HINDI language for a song called "${song.title}" by "${song.artist}". 
               The album is "${song.album}". 
               Write 3 short stanzas (verse, chorus, verse) in Devanagari script. 
               Use line breaks. Do not include labels like [Verse] or [Chorus].`,
    config: {
      temperature: 0.8,
    }
  });

  return response.text?.trim() || "बोल तैयार हो रहे हैं...";
};

export const generateVibeArt = async (mood: string): Promise<string> => {
  if (!process.env.API_KEY) return '';
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: `Abstract high-quality cinematic digital art representing the mood: ${mood}. Vibrant colors, synthwave or ethereal aesthetic.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  return '';
};
