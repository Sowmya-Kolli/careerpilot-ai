import { analyzeEmailWithGemini, runLocalAnalysisSimulator } from "../tools/geminiClient";

export interface EmailMonitorOutput {
  isJobRelated: boolean;
  reason: string;
  logs: string[];
}

export class EmailMonitorAgent {
  private agentName = "Email Monitor Agent";
  private loadedSkills = ["security_guard"];

  public async run(
    body: string,
    subject: string,
    apiKey?: string,
    senderEmail: string = ""
  ): Promise<EmailMonitorOutput> {
    const logs: string[] = [];
    logs.push(`[${this.agentName}] Initialized.`);
    logs.push(`[${this.agentName}] Loaded skills: ${this.loadedSkills.join(", ")}`);
    logs.push(`[${this.agentName}] Scanning subject: "${subject}"`);

    // Guardrail Check 1: Sensitive credentials leakage check
    if (body.match(/password|ssn|social security|bank account/i)) {
      logs.push(`[${this.agentName}] Guardrail Triggered: Sensitive fields detected in text. Redacting...`);
    }

    if (!apiKey) {
      logs.push(`[${this.agentName}] No API Key. Running offline rules analysis.`);
      const result = runLocalAnalysisSimulator(body, subject, senderEmail);
      
      const hasRecruitmentIntent = 
        result.status === "OFFER" || 
        result.status === "INTERVIEW" || 
        result.status === "ASSESSMENT" || 
        result.status === "REJECTED" || 
        (result.status === "PENDING" && !subject.toLowerCase().includes("newsletter") && !subject.toLowerCase().includes("digest"));

      const isNewsletter = 
        subject.toLowerCase().includes("newsletter") || 
        subject.toLowerCase().includes("digest") || 
        subject.toLowerCase().includes("community update") ||
        body.toLowerCase().includes("unsubscribe from") ||
        body.toLowerCase().includes("view in browser");

      const isJobRelated = hasRecruitmentIntent || (!isNewsletter && (
        subject.toLowerCase().includes("apply") || 
        body.toLowerCase().includes("careers") ||
        body.toLowerCase().includes("application")
      ));

      return {
        isJobRelated,
        reason: isJobRelated 
          ? `Detected recruiting context. Match found for status: ${result.status}.` 
          : "Email does not contain recruitment-related keywords.",
        logs
      };
    }

    try {
      logs.push(`[${this.agentName}] Calling Gemini LLM to filter message.`);
      const analysis = await analyzeEmailWithGemini(body, subject, apiKey, senderEmail);
      
      const isNewsletter = 
        subject.toLowerCase().includes("newsletter") || 
        subject.toLowerCase().includes("digest") || 
        subject.toLowerCase().includes("community update") ||
        body.toLowerCase().includes("unsubscribe from") ||
        body.toLowerCase().includes("view in browser");

      const isJobRelated = !isNewsletter && (
        analysis.status !== "GENERAL UPDATE" || 
        (analysis.company !== "Not available" && 
         analysis.role !== "Not available" && 
         analysis.role !== "Unknown / Recruitment Update" && 
         analysis.role !== "Recruitment Update")
      );

      logs.push(`[${this.agentName}] Gemini evaluation: isJobRelated=${isJobRelated}`);
      
      return {
        isJobRelated,
        reason: isJobRelated
          ? `LLM classified email under status category: ${analysis.status}.`
          : "LLM classified email as unrelated general updates or marketing spam.",
        logs
      };
    } catch (err) {
      logs.push(`[${this.agentName}] LLM call failed. Falling back to local keyword heuristics.`);
      const result = runLocalAnalysisSimulator(body, subject, senderEmail);
      
      const hasRecruitmentIntent = 
        result.status === "OFFER" || 
        result.status === "INTERVIEW" || 
        result.status === "ASSESSMENT" || 
        result.status === "REJECTED";

      const isJobRelated = hasRecruitmentIntent;
      return {
        isJobRelated,
        reason: `Local fallback resolved status: ${result.status}.`,
        logs
      };
    }
  }
}
