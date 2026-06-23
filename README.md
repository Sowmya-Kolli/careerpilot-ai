# HireTrack AI - Autonomous Career Email Coordinator

HireTrack AI is an autonomous job application tracking pipeline designed to monitor recruiting communications, classify recruitment milestones, extract key event dates, and recommend next-step preparation tracks. 

This project is built for the **Kaggle 5-Day AI Agents Intensive Course Capstone**.

---

## Architecture Operational Modes

HireTrack AI operates in two distinct modes:

### 1. Gemini Agent Mode
* **Requirements**: A valid Gemini API Key configured in `.env` or pasted in the UI settings panel.
* **Mechanism**: Utilizes the live `gemini-1.5-flash` model. Incoming recruiter emails are sent through the multi-agent pipeline using structured schema prompt bounds.
* **Telemetry**: Displays detailed execution timelines, loaded skills, called tools, confidence metric percentages, and audit logs.

### 2. Demo Mode (Offline Simulation)
* **Requirements**: Activated automatically if no API key is detected.
* **Mechanism**: Utilizes a local high-fidelity rules engine inside the client runtime to parse key recruiting indicators.
* **Telemetry**: Allows out-of-the-box sandbox testing without making external network calls.

---

## Local Development & Setup

To run HireTrack AI locally, execute the following steps:

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy the `.env.example` file to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key:
   ```text
   VITE_GEMINI_API_KEY=AIzaSy...
   ```
   *Note: `.env` is automatically ignored in git to prevent credential leakage.*

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Verify Production Build**:
   ```bash
   npm run build
   ```

---

## Scope Limits (Version 1 Rules)
In accordance with Version 1 specification guidelines:
* **No Authentication**: No logins or accounts are required.
* **No Database**: Applications state and settings persist locally inside the browser's `localStorage`.
* **No Gmail OAuth**: Real Google API consent screens are mock-simulated using sandbox email templates to demonstrate logic flows. Transition pathways are documented inside `docs/GMAIL_INTEGRATION_PLAN.md`.
