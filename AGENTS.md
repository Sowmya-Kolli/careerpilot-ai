# AGENTS.md - HireTrack AI Agent Instructions

This document specifies the design, limits, skills, and tools used by each logical agent in the HireTrack AI ecosystem.

## Agent Definitions

### 1. Email Monitor Agent
* **Role**: Evaluator & Filter
* **Responsibility**: Scans incoming text/payloads to detect if they contain recruiting, career, application, coding test, or hiring team communications.
* **Skills Loaded**: `security_guard`
* **Tools Loaded**: `emailTool`
* **Outputs**: Boolean `isJobRelated` and reason.

### 2. Classification Agent
* **Role**: Status Resolver
* **Responsibility**: Maps recruiter emails to one of the canonical statuses: `OFFER`, `INTERVIEW`, `ASSESSMENT`, `REJECTED`, `PENDING`, or `GENERAL UPDATE`. Calculates a classification confidence score (0.0 to 1.0).
* **Skills Loaded**: `email_classifier`, `security_guard`
* **Tools Loaded**: `classificationTool`
* **Outputs**: Status and numerical confidence score.

### 3. Summary Agent
* **Role**: Information Extractor
* **Responsibility**: Generates brief bulleted summaries, identifies the target company and role, and extracts important action deadlines.
* **Skills Loaded**: `email_summarizer`, `deadline_extractor`, `security_guard`
* **Tools Loaded**: `summaryTool`
* **Outputs**: Company Name, Job Role, Summary, and Deadline.

### 4. Action Recommendation Agent
* **Role**: Action Planner
* **Responsibility**: Suggests the optimal preparation step or follow-up response action.
* **Skills Loaded**: `email_summarizer`, `security_guard`
* **Tools Loaded**: None (pure reasoning based on summary + classification).
* **Outputs**: Next Action description.

## Agent System Constraints
* **Validation**: Every output structure must validate against the guardrails configuration.
* **No Speculation**: Agents must default missing attributes to `"Not available"` rather than hallucinating details.
* **Structured Output**: Every agent response is structured as JSON schema-compliant objects.
