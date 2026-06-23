export interface ActionRecommendationOutput {
  nextAction: string;
  logs: string[];
}

export class ActionRecommendationAgent {
  private agentName = "Action Recommendation Agent";
  private loadedSkills = ["email_summarizer", "security_guard"];

  public async run(
    status: string,
    _company: string,
    _role: string,
    _summary: string,
    _date: { type: string; value: string },
    _body: string,
    _apiKey?: string
  ): Promise<ActionRecommendationOutput> {
    const logs: string[] = [];
    logs.push(`[${this.agentName}] Initialized.`);
    logs.push(`[${this.agentName}] Loaded skills: ${this.loadedSkills.join(", ")}`);
    logs.push(`[${this.agentName}] Synthesizing next step recommendations based on status: "${status}"`);

    let nextAction = "";
    
    switch (status.toUpperCase()) {
      case "INTERVIEW":
        nextAction = "Prepare DSA, projects, and interview concepts.";
        break;
      case "ASSESSMENT":
        nextAction = "Complete assessment before deadline and practice coding problems.";
        break;
      case "OFFER":
        nextAction = "Review offer details and complete onboarding steps.";
        break;
      case "REJECTED":
        nextAction = "Update status and continue applying.";
        break;
      case "PENDING":
        nextAction = "Monitor inbox regularly; follow up in 2 weeks if no update is received.";
        break;
      default:
        nextAction = "Review email contents and respond if required.";
        break;
    }

    logs.push(`[${this.agentName}] Action recommendation resolved: "${nextAction}"`);
    return {
      nextAction,
      logs
    };
  }
}
