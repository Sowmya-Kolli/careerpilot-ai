# HireTrack AI Security Rules

These security rules define structural limits that the multi-agent system must strictly obey during processing and execution.

## Core Directives

### 1. Read-Only Scope
* The system must never call APIs or tools that support editing, archiving, or deleting messages from any connected email account.

### 2. No Automated Recruiter Outbox
* The system is strictly forbidden from composing, drafting, or sending emails on behalf of the user automatically.
* Any response templates suggested by agents are displayed only as text copies for the user.

### 3. Human Approval Requirement
* Any external integration (e.g., adding an event to Google Calendar for an interview) must require explicit manual confirmation via a UI dialog box before any tool is triggered.

### 4. Data Redaction & Confidentiality
* Sensitive data fields like phone numbers, mailing addresses, credentials, or government IDs must not be extracted, logged, or sent to model parameters unless strictly required for job location tracking.

### 5. Grounded Reasoning (No Hallucination)
* Do not infer deadlines or company details if they are missing.
* Fallback to `"Not available"` if values are not present.
