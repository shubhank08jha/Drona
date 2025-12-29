
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "../types";

export const analyzeHomework = async (base64Image: string): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this student's homework submission.
    1. Check for accuracy and completeness of the answers.
    2. Provide specific, constructive suggestions on how the student can improve their work.
    3. If the work is excellent, provide positive reinforcement.
    4. If there are errors, explain the underlying concept briefly.
    
    Return your analysis strictly as JSON. 
    The 'status' should be 'Approved' only if the work is mostly correct and complete. 
    Otherwise, use 'Rejected' to encourage a re-submission after following your suggestions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              description: "Either 'Approved' or 'Rejected'.",
            },
            score: {
              type: Type.NUMBER,
              description: "A quality score from 1 to 10.",
            },
            feedback: {
              type: Type.STRING,
              description: "Detailed feedback and specific suggestions for improvement.",
            },
          },
          required: ["status", "score", "feedback"],
        },
      },
    });

    return JSON.parse(response.text.trim()) as GeminiResponse;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      status: 'Rejected',
      score: 0,
      feedback: "The AI was unable to scan the image clearly. Please ensure your photo is well-lit and all text is legible before trying again."
    };
  }
};

export const editHomeworkImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: 'image/jpeg',
            },
          },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image editing failed:", error);
    return null;
  }
};
