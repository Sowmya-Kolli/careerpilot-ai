import { analyzeEmailWithGemini, runLocalAnalysisSimulator } from "./geminiClient";

export interface SummaryResult {
  company: string;
  role: string;
  summary: string;
  date: {
    type: string;
    value: string;
  };
  joiningDate?: string;
  interviewDate?: string;
  assessmentDeadline?: string;
  deadline?: string;
}

/**
 * summaryTool - Generates email summaries and extracts dates.
 * Forwards to Gemini client or uses the local rule-based fallback.
 */
export const summaryTool = async (
  body: string,
  subject: string,
  apiKey?: string,
  senderEmail: string = ""
): Promise<SummaryResult> => {
  if (!apiKey) {
    const fallback = runLocalAnalysisSimulator(body, subject, senderEmail);
    return {
      company: fallback.company,
      role: fallback.role,
      summary: fallback.summary,
      date: fallback.date,
      joiningDate: fallback.joiningDate,
      interviewDate: fallback.interviewDate,
      assessmentDeadline: fallback.assessmentDeadline
    };
  }

  try {
    const analysis = await analyzeEmailWithGemini(body, subject, apiKey, senderEmail);
    return {
      company: analysis.company,
      role: analysis.role,
      summary: analysis.summary,
      date: analysis.date,
      joiningDate: analysis.joiningDate,
      interviewDate: analysis.interviewDate,
      assessmentDeadline: analysis.assessmentDeadline
    };
  } catch (error) {
    console.error("Error in summaryTool, falling back:", error);
    const fallback = runLocalAnalysisSimulator(body, subject, senderEmail);
    return {
      company: fallback.company,
      role: fallback.role,
      summary: fallback.summary,
      date: fallback.date,
      joiningDate: fallback.joiningDate,
      interviewDate: fallback.interviewDate,
      assessmentDeadline: fallback.assessmentDeadline
    };
  }
};
