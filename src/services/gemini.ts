import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeIngredients(ingredients: string): Promise<AnalysisResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following food ingredients and provide a detailed health breakdown in JSON format. 
    Pay special attention to technical names, E-numbers, and INS codes. Decode them into simple names and explain their purpose and health impact.
    
    Ingredients: ${ingredients}
    
    The response must be a JSON object with this structure:
    {
      "score": "Healthy" | "Moderate" | "Risky",
      "summary": "A brief overall summary",
      "ingredients": [
        {
          "name": "ingredient name",
          "explanation": "what it is and its purpose",
          "category": "preservative" | "stabilizer" | "sweetener" | "natural" | "other",
          "risk": "Low" | "Medium" | "High"
        }
      ],
      "additives": [
        {
          "name": "Common name of the additive",
          "code": "INS/E code if applicable",
          "explanation": "Detailed explanation of what it is, why it's used, and potential health concerns",
          "risk": "Low" | "Medium" | "High"
        }
      ],
      "recommendation": "A simple health recommendation"
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.STRING, enum: ["Healthy", "Moderate", "Risky"] },
          summary: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                explanation: { type: Type.STRING },
                category: { type: Type.STRING },
                risk: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
              },
              required: ["name", "explanation", "category", "risk"]
            }
          },
          additives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                explanation: { type: Type.STRING },
                risk: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
              },
              required: ["name", "explanation", "risk"]
            }
          },
          recommendation: { type: Type.STRING }
        },
        required: ["score", "summary", "ingredients", "additives", "recommendation"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}
