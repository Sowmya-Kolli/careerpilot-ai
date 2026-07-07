# CareerPilot AI: An Autonomous AI Recruitment Intelligence Agent

### Harnessing Generative Orchestrator Pipelines to Automate the Job Search Lifecyle

---

## Project Overview

**CareerPilot AI** is an autonomous recruitment intelligence orchestrator designed to solve the friction of tracking and preparing for job opportunities. By integrating securely with a candidate's Gmail inbox and applying Gemini 2.5 Flash, the system acts as a background agent. It scans, classifies, extracts, schedules, and creates preparation checklists for job seekers, transforming unstructured recruiter communications into a structured relational workspace.

---

## Problem Statement

The job search process is highly fragmented. Candidates typically manage multiple active applications across different platforms:
- **Inbox Inundation**: Job applications, coding challenges, interview invites, and rejection notices are mixed with daily newsletters and promotional spam.
- **Milestone Slippage**: Coding tests on HackerRank or take-home assignments sit in the inbox, leading to missed deadlines.
- **Coordination Friction**: Interview requests require digging through email threads to find Zoom links or scheduling invites.
- **Tracking Overhead**: Keeping spreadsheets updated manually is tedious, leading to stale tracking logs.

---

## Why AI Agents?

Traditional job trackers are passive data repositories. They rely on the candidate to enter status changes and dates.
An **AI Agent approach** shifts this boundary:
- **Proactive Execution**: Agents poll email inboxes, evaluate incoming headers, and filter recruiter communications autonomously.
- **Cooperative Problem Solving**: Instead of a monolithic script, the system uses specialized agents (e.g. Gmail Monitor, Classification, Information Extraction, Calendar mapping, Task checklist generator) to work together.
- **Context-Aware Action**: The agent reads the parsed content, identifies the candidate's current recruitment phase, and generates specific tasks and milestone events.

---

## Solution Overview

CareerPilot AI bridges the gap between unstructured email communications and active application tracking:
1. **Gmail Authentication**: Securely connects via Google OAuth 2.0. The access and refresh tokens are stored safely on the server and are never exposed to the frontend.
2. **Batch Classification**: The fetched email headers and snippets are parsed in batch by Gemini 2.5 Flash to filter out spam and classify legitimate emails into `applied`, `assessment`, `interview`, `offer`, or `rejected`.
3. **Regex-Assisted Fallbacks**: If the AI model fails to extract a company name or role, regular expression pattern parsers run on the email subjects, sender names, and domain URLs to prevent "Unknown Company" entries.
4. **Relational Synchronization**: In a single database transaction, the backend updates the application tracker, saves the email snippet to the timeline, schedules calendar milestones, and generates prep tasks.
5. **Interactive Interface**: The frontend displays these updates using custom spotlight cards and smooth scroll animations.

---

## System Architecture

The platform uses a decoupled client-server architecture designed for security, performance, and scalability.

- **React Single-Page Application**: A Vite-based frontend built with TypeScript and styled with Tailwind CSS. It manages local session state and renders dashboards, calendars, and logs.
- **Express.js API Server**: A Node.js backend that handles routing, password hashing, JWT signing, database operations, and external API requests.
- **Supabase Database**: A PostgreSQL database that maintains data integrity using foreign key constraints and `ON DELETE CASCADE` rules.
- **External Services**: Integrates with the Gmail API and Google Gemini Generative AI.

![System Architecture](diagrams/architecture.svg)

---

## AI Agent Workflow

The logical agent system is managed by a central **Orchestrator Agent**:
- **Gmail Monitor Agent**: Handles API sessions, retrieves email headers, and queries emails using career-related keyword filters.
- **Classification Agent**: Evaluates email details using Gemini 2.5 Flash, filters out spam, and classifies valid updates into tracking stages.
- **Information Extraction Agent**: Pulls details like company names, roles, and deadlines from unstructured text.
- **Application Tracking Agent**: Inserts or updates application tracking cards.
- **Calendar Agent**: Schedules events like coding tests and interview rounds.
- **Task Generation Agent**: Creates contextual prep lists (e.g., practice Leetcode arrays for online assessments, prepare behavior stories for interview rounds).
- **Activity Logging Agent**: Logs execution steps and metrics for auditing.

![Agent Workflow](diagrams/agent-workflow.svg)

---

## Gmail Intelligence Pipeline

The data pipeline runs when a user triggers an inbox sync:
1. **Request**: React posts to `/api/agent/scan` with a JWT authorization header.
2. **Access token refresh**: Express loads credentials from `gmail_accounts`. If expired, it requests a new access token from Google using the refresh token.
3. **Gmail Query**: The server requests headers matching:
   `subject:(interview OR assessment OR application OR careers OR offer OR "coding test" OR hackerrank)`
4. **AI Parsing**: The headers and snippets are parsed in batch by Gemini 2.5 Flash.
5. **Fallbacks**: Regex parsers check for missing fields to avoid "Unknown Company" entries.
6. **Database Write**: The database writes updates to `applications`, `emails`, `tasks`, `events`, and `logs` in a single transaction.
7. **Telemetry Log**: Saves a scan log with execution metrics, steps, and latency details.

![Gmail Scan Pipeline](diagrams/gmail-pipeline.svg)

---

## Technology Stack

```
Frontend:       React 18.3, Vite, TypeScript, Framer Motion, Lucide Icons
Styling:        Tailwind CSS, Vanilla CSS custom backdrop styling
Backend:        Node.js, Express.js, pg (node-postgres), googleapis
Database:       PostgreSQL hosted on Supabase (Pool connected)
AI Framework:   Google Generative AI SDK (@google/generative-ai)
Models Used:    gemini-2.5-flash (Inboxes Batch Scan), gemini-1.5-flash (Draft Replies)
Authentication: jsonwebtoken (HS256), bcryptjs, Google OAuth 2.0 Auth Code flow
```

---

## Implemented Features

- **Google OAuth Login**: Connects user Gmail accounts and retrieves access and refresh tokens.
- **User Authentication**: Secure register and login flows using hashed passwords.
- **Gmail Ingestion**: Fetches recent emails using recruitment keywords.
- **Gemini AI Classification**: Classifies recruiter updates with confidence scores.
- **Automatic Application Tracking**: Adds new job trackers or updates active application phases automatically.
- **De-duplication Protection**: Checks database records before insertions to avoid duplicate card entries.
- **Interactive Timelines**: Traces consecutive updates inside application detail drawers.
- **Milestones Calendar**: Synchronizes interview rounds and test deadlines to a unified layout.
- **Preparation Checklists**: Generates next-step preparation checklists dynamically.
- **AI Scan Report**: Measures and displays execution times and database update statistics.
- **Activity Telemetry Logs**: Captures audit logs for all agent steps.
- **Demo Workspace**: Visitors can explore the core dashboard and features instantly without authentication.
- **De-coupling Data Purging**: Explicitly deletes user data while keeping account and Gmail configurations intact.
- **Glassmorphic Theme**: Support for light and dark modes with a custom cursor-trail canvas background.

---

## How the System Works

When a user initiates an inbox scan:
- **Scan Latency**: The system measures end-to-end execution time and displays it in the AI Scan Report.
- **Checklist reveals**: An ingestion loader card reveals active progress indicators (`Fetching Emails`, `Filtering Spams`, `Gemini Analysis`, `Creating Checklists`, etc.).
- **Workspace synchronization**: In seconds, the application board updates with new cards, timelines, calendar events, and task lists.
- **Drafting responses**: Users can generate email draft replies directly inside the application drawer.

---

## Challenges During Development

1. **AI Parse Failures & "Unknown Company" Entries**:
   - *Problem*: Recruiter emails often contain generic names (e.g. "Google Careers" or "hiring team") or the Gemini model fails to extract them from short snippets.
   - *Solution*: Developed regex fallbacks that parse the email subject, sender name, and domain URL (excluding public domains like Gmail or Outlook) to extract the company name.
2. **Duplicate Application Entries**:
   - *Problem*: Receiving multiple emails from the same company could create duplicate cards.
   - *Solution*: Programmed lookups that check existing records for the same company and role before inserting new applications.
3. **Database Cascade Limits**:
   - *Problem*: The server database did not have cascade delete triggers configured, causing deletion errors due to foreign key constraints on events and tasks.
   - *Solution*: Structured API handlers inside database transactions to delete records in the correct dependency order (logs, tasks, events, emails, applications).
4. **Performance overhead of multiple cursor listeners**:
   - *Problem*: Multiple spotlight cards on the landing page registered individual cursor listeners, reducing scroll performance.
   - *Solution*: Refactored to a single global listener that writes coordinates directly to `--x` and `--y` variables at the document root level, which cards inherit via CSS.

---

## What I Learned From Kaggle's 5-Day AI Agents Course

The Kaggle course provided key frameworks that helped shape the project:
1. **Agent Orchestration**: Designing specialized logical agents instead of a single script made the codebase more modular and easier to test.
2. **Gemini AI Integration**: Batching email data in a single API call reduced latency and API usage costs.
3. **Antigravity**: Utilizing Antigravity tools helped search the codebase, edit files, and build the application efficiently.
4. **Security Boundaries**: Storing OAuth access tokens strictly on the backend protected user accounts from client-side vulnerability risks.
5. **Deployability**: Automatically validating schemas on startup made the application easy to deploy locally or on cloud servers.
6. **Tool Integration**: Connecting Gmail APIs with generative AI models showed how traditional APIs can work with language models to create intelligent workflows.

---

## Future Roadmap

![Future Vision](screenshots/careerpilot-2-roadmap.png)

### CareerPilot 2.0 Vision
- **Opportunity Discovery**: Auto-scrapes target job boards and matches postings to profile objectives.
- **Resume Intelligence**: Re-writes resumes automatically to match specific job descriptions.
- **Interview Intelligence**: Simulates mock coding interviews and analyzes responses.
- **Career Intelligence**: Predicts compensation metrics and tracks regional salary offers.
- **Autonomous AI Agent**: Follows up with recruiters and schedules interviews automatically.

---

## Impact

CareerPilot AI automates the administrative overhead of the job search, helping candidates focus on interview preparation instead of spreadsheet tracking.

---

## Conclusion

CareerPilot AI demonstrates how autonomous agent workflows can organize fragmented communication channels. By connecting the Gmail API, Express backends, and Google Gemini AI, the platform turns unstructured recruiter emails into an intelligent recruitment command center.
