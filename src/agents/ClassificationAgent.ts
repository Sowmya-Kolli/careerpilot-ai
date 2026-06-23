import { classificationTool } from "../tools/classificationTool";

export interface ClassificationOutput {
  status: "OFFER" | "INTERVIEW" | "ASSESSMENT" | "REJECTED" | "PENDING" | "GENERAL UPDATE";
  confidence: number;
  logs: string[];
}

export class ClassificationAgent {
  private agentName = "Classification Agent";
  private loadedSkills = ["email_classifier", "security_guard"];

  public async run(
    body: string,
    subject: string,
    apiKey?: string,
    senderEmail: string = ""
  ): Promise<ClassificationOutput> {
    const logs: string[] = [];
    logs.push(`[${this.agentName}] Initialized.`);
    logs.push(`[${this.agentName}] Loaded skills: ${this.loadedSkills.join(", ")}`);
    logs.push(`[${this.agentName}] Running classification Tool.`);

    try {
      const result = await classificationTool(body, subject, apiKey, senderEmail);
      logs.push(`[${this.agentName}] Classification complete: Status = ${result.status}, Confidence = ${result.confidence.toFixed(2)}`);
      
      return {
        status: result.status,
        confidence: result.confidence,
        logs
      };
    } catch (err) {
      logs.push(`[${this.agentName}] Classification Tool failed. Resolving to default general updates fallback.`);
      return {
        status: "GENERAL UPDATE",
        confidence: 0.5,
        logs
      };
    }
  }
}
