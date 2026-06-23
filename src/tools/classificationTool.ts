import { analyzeEmailWithGemini, runLocalAnalysisSimulator } from "./geminiClient";

export interface ClassificationResult {
  status: "OFFER" | "INTERVIEW" | "ASSESSMENT" | "REJECTED" | "PENDING" | "GENERAL UPDATE";
  confidence: number;
}

/**
 * classificationTool - Connects classification workflow.
 * Forwards to Gemini client or uses the local rule-based fallback.
 */
export const classificationTool = async (
  body: string,
  subject: string,
  apiKey?: string,
  senderEmail: string = ""
): Promise<ClassificationResult> => {
  // In a modular agent architecture, tools execute specific domain tasks.
  // Here, the classification tool resolves the recruiter email status category.
  
  if (!apiKey) {
    const fallback = runLocalAnalysisSimulator(body, subject, senderEmail);
    return {
      status: fallback.status,
      confidence: fallback.confidence
    };
  }

  try {
    const analysis = await analyzeEmailWithGemini(body, subject, apiKey, senderEmail);
    return {
      status: analysis.status,
      confidence: analysis.confidence
    };
  } catch (error) {
    console.error("Error in classificationTool, falling back:", error);
    const fallback = runLocalAnalysisSimulator(body, subject, senderEmail);
    return {
      status: fallback.status,
      confidence: fallback.confidence
    };
  }
};
