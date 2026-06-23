# Gmail API Integration Plan

This plan details how to transition HireTrack AI from manual email ingestion (Version 1) to a secure, automated Gmail inbox monitor.

## OAuth 2.0 Integration Flow
1. **Developer Registration**: Register a project in the Google Cloud Console and enable the Gmail API.
2. **Configure OAuth Consent Screen**: Configure scopes and add test users.
3. **Frontend Authentication**:
   - Use Google Identity Services SDK (`@react-oauth/google`).
   - Implement authorization code flow to obtain an authorization code, sending it to a backend, or retrieve an access token directly for frontend-only client-side access.
   - For backend-based offline access (recommended for background jobs), request offline access (`access_type: 'offline'`, `prompt: 'consent'`) to receive a `refresh_token`.

## Required Scopes
We must adhere to the principle of least privilege.
- **`https://www.googleapis.com/auth/gmail.readonly`**: Access, view, and read email messages and metadata.
- **Do NOT request write/delete access** (`gmail.modify` or `gmail.send`) to align with security guardrail constraints.

## Background Monitoring Workflow
To monitor emails in the background:
1. **Gmail Pub/Sub Webhooks**:
   - Register a Pub/Sub topic in Google Cloud.
   - Configure Gmail watch requests (`gmail.users.watch`) targeting the topic.
   - Every incoming email triggers a webhook notification sent to the HireTrack AI server.
2. **Polling Fallback (Cron)**:
   - Schedule a background server task/cron (e.g., hourly) to fetch messages with a query filter: `newer_than:1d category:primary` using the `historyId` or `timestamp`.
3. **Filtering & Ingestion**:
   - Retrieve email headers and body.
   - Send the message body to the **Email Monitor Agent** to filter out spam, newsletters, and personal emails, keeping only career-relevant job items.
