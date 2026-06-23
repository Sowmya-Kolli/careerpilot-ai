import { summaryTool } from "../tools/summaryTool";

export interface SummaryOutput {
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
  logs: string[];
}

export class SummaryAgent {
  private agentName = "Summary Agent";
  private loadedSkills = ["email_summarizer", "deadline_extractor", "security_guard"];

  public async run(
    body: string,
    subject: string,
    apiKey?: string,
    senderEmail: string = ""
  ): Promise<SummaryOutput> {
    const logs: string[] = [];
    logs.push(`[${this.agentName}] Initialized.`);
    logs.push(`[${this.agentName}] Loaded skills: ${this.loadedSkills.join(", ")}`);
    logs.push(`[${this.agentName}] Querying summaryTool for metadata extraction.`);

    try {
      const result = await summaryTool(body, subject, apiKey, senderEmail);
      logs.push(`[${this.agentName}] Extracted metadata successfully.`);
      logs.push(`[${this.agentName}] Company: "${result.company}"`);
      logs.push(`[${this.agentName}] Role: "${result.role}"`);
      logs.push(`[${this.agentName}] Date Type: "${result.date.type}", Value: "${result.date.value}"`);
      logs.push(`[${this.agentName}] Summary length: ${result.summary.length} chars`);

      return {
        company: result.company,
        role: result.role,
        summary: result.summary,
        date: result.date,
        joiningDate: result.joiningDate,
        interviewDate: result.interviewDate,
        assessmentDeadline: result.assessmentDeadline,
        deadline: result.deadline,
        logs
      };
    } catch (err) {
      logs.push(`[${this.agentName}] Summary Tool failed. Defaulting to general details.`);
      return {
        company: "Not available",
        role: "Not available",
        summary: "Could not generate summary details.",
        date: {
          type: "Not available",
          value: "Not available"
        },
        joiningDate: "Not available",
        interviewDate: "Not available",
        assessmentDeadline: "Not available",
        deadline: "Not available",
        logs
      };
    }
  }
}
