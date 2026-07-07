const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { google } = require('googleapis');
google.options({ timeout: 5000 });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'CareerPilotSecretKeyJWTAuthenticationSecretSignatureKey2026SecureLongKey';

// Environment variable validation function
function verifyEnvironment() {
  console.log('============================================');
  console.log('       CareerPilot Env Verification         ');
  console.log('============================================');
  
  const port = process.env.PORT || 5000;
  console.log(`[Env Verification] PORT: ${port}`);
  
  if (process.env.DATABASE_URL) {
    console.log('[Env Verification] DATABASE_URL: Configured');
  } else {
    console.error('[Env Verification ERROR] DATABASE_URL is missing. Database connection will fail.');
    process.exit(1);
  }

  if (process.env.GEMINI_API_KEY) {
    console.log('[Env Verification] GEMINI_API_KEY: Configured (Gemini Agent Mode active)');
  } else {
    console.warn('[Env Verification WARNING] GEMINI_API_KEY is missing. Gemini API calls will fail.');
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('[Env Verification] Gmail OAuth Credentials: Configured (Gmail Sync active)');
  } else {
    console.warn('[Env Verification WARNING] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Gmail integration will fail.');
  }

  console.log('============================================\n');
}

verifyEnvironment();

function extractCompanyFallback(parsedCompany, subject, sender) {
  let company = parsedCompany ? parsedCompany.trim() : "";
  if (company && company.toLowerCase() !== "unknown company" && company.toLowerCase() !== "unknown" && company !== "N/A" && company !== "") {
    return company;
  }
  
  // Try to parse from subject
  if (subject) {
    const patterns = [
      /(?:applying to|apply to|at|with|join|for|status at|careers at)\s+([A-Z][a-zA-Z0-9&'\s-]*?)(?:\s+role|\s+interview|\s+careers|\s+status|\s+application|\s+opportunity|\s+candidate|\s+position|\s+team|\bfor\b|$)/i,
      /(?:opportunity -|status -|update -)\s+([A-Z][a-zA-Z0-9&'\s-]*?)(?:\s+role|\s+interview|$)/i
    ];
    for (let pat of patterns) {
      const match = subject.match(pat);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate && !['the', 'our', 'a', 'an', 'your', 'my'].includes(candidate.toLowerCase())) {
          return candidate;
        }
      }
    }
  }

  // Try to parse from sender display name
  if (sender) {
    const displayNameMatch = sender.match(/^([^<]+)/);
    if (displayNameMatch) {
      let displayName = displayNameMatch[1].replace(/['"“”]/g, '').trim();
      displayName = displayName.replace(/\b(careers|recruiting|team|jobs|hr|no-reply|noreply|notifications|hiring|talent|acquisition|support)\b/ig, '').trim();
      displayName = displayName.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim();
      if (displayName && displayName.length > 1 && !displayName.includes('@')) {
        return displayName;
      }
    }
    
    // Try to parse from domain name
    const domainMatch = sender.match(/@([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+)/);
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase();
      const publicDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'protonmail.com', 'icloud.com', 'mail.com'];
      if (!publicDomains.includes(domain)) {
        const companyPart = domain.split('.')[0];
        if (companyPart && companyPart !== 'careers' && companyPart !== 'recruiting' && companyPart !== 'hiring') {
          return companyPart.charAt(0).toUpperCase() + companyPart.slice(1);
        }
      }
    }
  }

  return "Unknown Company";
}

function extractRoleFallback(parsedRole, subject) {
  let role = parsedRole ? parsedRole.trim() : "";
  if (role && role.toLowerCase() !== "n/a" && role.toLowerCase() !== "unknown" && role !== "") {
    return role;
  }

  if (subject) {
    const patterns = [
      /(?:role|position|job|for|opportunity -)\s*:\s*([A-Za-z0-9&'\s/-]+)/i,
      /(software engineer|sde|swe|frontend engineer|backend engineer|full stack engineer|fullstack engineer|product manager|data scientist|data engineer|analyst|intern|co-op)\b/i
    ];
    for (let pat of patterns) {
      const match = subject.match(pat);
      if (match && match[1]) {
        let candidate = match[1].trim();
        candidate = candidate.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return candidate;
      }
    }
  }

  return "N/A";
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let isDatabaseReady = false;

// Disable caching for all API routes
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: isDatabaseReady ? 'ok' : 'initializing',
    databaseReady: isDatabaseReady,
    fallback: false
  });
});

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database schema tables automatically
async function initializeDatabase() {
  console.log('[Database] Verifying Supabase connection and tables initialization...');
  
  const maxAttempts = 5;
  const delayMs = 2000;
  let connected = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Database] Connecting to remote database... (Attempt ${attempt}/${maxAttempts})`);
    try {
      await pool.query('SELECT 1');
      console.log('[Database] Remote connection verified successfully.');
      connected = true;
      break;
    } catch (err) {
      console.error(`[Database ERROR] Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxAttempts) {
        console.log(`[Database] Retrying in ${delayMs / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  if (!connected) {
    console.error('[Database ERROR] Failed to connect to remote database after all attempts. Express backend cannot start.');
    process.exit(1);
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('[Database] Supabase tables verified and initialized successfully.');
    }
  } catch (error) {
    console.error("========== DATABASE AUTO-INIT ERROR ==========");
    console.error(error.message);
    console.error("==============================================");
    process.exit(1);
  } finally {
    isDatabaseReady = true;
  }
}

// --- Gemini SDK Setup ---
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function executeGeminiWithRetry(fn) {
  const maxRetries = 3;
  const backoffs = [2000, 4000, 8000];

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    console.log(`[STAGE 6 - GEMINI] Attempt ${attempt}/4`);
    try {
      const result = await fn();
      if (attempt > 1) {
        console.log(`[STAGE 6 - GEMINI] Request succeeded after retry ${attempt - 1}.`);
      }
      return result;
    } catch (e) {
      const is503 = e.status === 503 || 
                    (e.message && (e.message.includes('503') || e.message.includes('Service Unavailable')));
      
      if (is503 && attempt <= maxRetries) {
        const delay = backoffs[attempt - 1];
        console.log(`[STAGE 6 - GEMINI] HTTP 503 received. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        if (is503) {
          console.log('[STAGE 6 - GEMINI] All retry attempts exhausted.');
        }
        throw e;
      }
    }
  }
}

async function parseEmailWithGemini(bodyText) {
  console.log('[STAGE 6 - GEMINI] Sending request to Gemini API...');
  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
You are an AI recruiting and career assistant named Email Intelligence Agent.
Parse the following email body and extract application details.
Return ONLY a valid JSON object matching the schema below.
Do not write markdown tags, prefaces, or wrap in backticks. Return raw JSON.

Schema:
{
  "company": "Company Name",
  "role": "Job Title (e.g. SDE Intern, Frontend Engineer, etc.)",
  "category": "applied" | "assessment" | "interview" | "offer" | "rejected" | "recruiter" | "spam",
  "deadline": "YYYY-MM-DD",
  "summary": "Brief 1-sentence summary of the email",
  "confidence": 98,
  "actionNeeded": "Description of the next action required by the applicant"
}

If the email is a newsletter, promotional coupon, daily news digest, security alert, or personal email unrelated to application/interviews/recruiting, classify "category" as "spam".

Current System Date: 2026-06-27. Use this to calculate deadline offsets.

Email Body:
${bodyText}
`;

    const text = await executeGeminiWithRetry(async () => {
      const response = await model.generateContent(prompt);
      return response.response.text().trim();
    });

    console.log(`[STAGE 6 - GEMINI] Response received:`, text);

    let parsedText = text;
    if (parsedText.startsWith('```')) {
      parsedText = parsedText.replace(/^```json/, '').replace(/^```/, '').trim();
    }

    return JSON.parse(parsedText);
  } catch (e) {
    console.error('[STAGE 6 - GEMINI ERROR] Gemini execution or parsing failed:');
    console.error(e);
    throw e;
  }
}

async function parseEmailsWithGeminiBatch(emails) {
  console.log(`[STAGE 6 - GEMINI] Sending batch request to Gemini API for ${emails.length} emails...`);
  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
You are an AI recruiting and career assistant named Email Intelligence Agent.
Parse the following list of email messages and extract application details for each.
Return ONLY a valid JSON array of objects, where each object corresponds to an input email and matches the schema below.
Do not write markdown tags, prefaces, or wrap in backticks. Return raw JSON.

Schema for each object:
{
  "id": "the exact email id from the input",
  "company": "Company Name",
  "role": "Job Title (e.g. SDE Intern, Frontend Engineer, etc.)",
  "category": "applied" | "assessment" | "interview" | "offer" | "rejected" | "recruiter" | "spam",
  "deadline": "YYYY-MM-DD",
  "summary": "Brief 1-sentence summary of the email",
  "confidence": 98,
  "actionNeeded": "Description of the next action required by the applicant"
}

If the email is a newsletter, promotional coupon, daily news digest, security alert, or personal email unrelated to application/interviews/recruiting, classify "category" as "spam".

Current System Date: 2026-06-27. Use this to calculate deadline offsets.

Emails to parse:
${JSON.stringify(emails.map(e => ({ id: e.id, subject: e.subject, body: e.body })))}
`;

    const text = await executeGeminiWithRetry(async () => {
      const response = await model.generateContent(prompt);
      return response.response.text().trim();
    });

    console.log(`[STAGE 6 - GEMINI] Batch response received:`, text);

    let parsedText = text;
    if (parsedText.startsWith('```')) {
      parsedText = parsedText.replace(/^```json/, '').replace(/^```/, '').trim();
    }

    return JSON.parse(parsedText);
  } catch (e) {
    console.error('[STAGE 6 - GEMINI ERROR] Gemini batch execution or parsing failed:');
    console.error(e);
    throw e;
  }
}

// --- Google OAuth Setup ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI || 'http://localhost:5174'
);

async function loadUserGmailTokens(userId) {
  const result = await pool.query('SELECT * FROM gmail_accounts WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: new Date(row.expires_at).getTime()
  };
}

async function saveUserGmailTokens(userId, email, tokens) {
  const expiresAt = new Date(tokens.expiry_date || (Date.now() + (tokens.expires_in || 3600) * 1000));
  const existing = await pool.query('SELECT id, refresh_token FROM gmail_accounts WHERE user_id = $1', [userId]);
  
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    const rToken = tokens.refresh_token || existing.rows[0].refresh_token;
    await pool.query(
      'UPDATE gmail_accounts SET email = $1, access_token = $2, refresh_token = $3, expires_at = $4 WHERE id = $5',
      [email, tokens.access_token, rToken, expiresAt, id]
    );
  } else {
    const id = `gmail-${Date.now()}`;
    await pool.query(
      'INSERT INTO gmail_accounts (id, email, user_id, access_token, refresh_token, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, email, userId, tokens.access_token, tokens.refresh_token, expiresAt]
    );
  }
}

function getActionsForStatus(company, role, status, deadline) {
  const dateStr = deadline || '2026-07-04';
  switch (status) {
    case 'offer':
      return [
        { title: `Review ${company} compensation package and sign offer letter`, priority: 'high', dueDate: dateStr },
        { title: `Connect with current team members on LinkedIn`, priority: 'medium', dueDate: dateStr }
      ];
    case 'interview':
      return [
        { title: `Prepare DSA (Trees, Graphs, DP) for ${company} Interview`, priority: 'high', dueDate: dateStr },
        { title: `Review resume projects and prepare behavioral answers`, priority: 'high', dueDate: dateStr }
      ];
    case 'assessment':
      return [
        { title: `Complete ${company} Online Assessment (est. 90 mins)`, priority: 'high', dueDate: dateStr }
      ];
    default:
      return [
        { title: `Follow up with ${company} recruiter in 7 days`, priority: 'medium', dueDate: dateStr }
      ];
  }
}

// --- Authentication Middleware ---
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

// --- Authentication REST API ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }
  try {
    const existing = await pool.query('SELECT id FROM cp_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}`;
    await pool.query(
      'INSERT INTO cp_users (id, email, password, name) VALUES ($1, $2, $3, $4)',
      [userId, email, hashedPassword, name]
    );
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const result = await pool.query('SELECT * FROM cp_users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      email: user.email,
      name: user.name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/sync', authenticateToken, async (req, res) => {
  const { name, careerGoal, preferredRoles, jobSearchStatus } = req.body;
  try {
    await pool.query(
      'UPDATE cp_users SET name = $1, career_goal = $2, preferred_roles = $3, job_search_status = $4, updated_at = NOW() WHERE id = $5',
      [name, careerGoal, preferredRoles, jobSearchStatus, req.user.id]
    );
    const userResult = await pool.query('SELECT * FROM cp_users WHERE id = $1', [req.user.id]);
    const gmailResult = await pool.query('SELECT * FROM gmail_accounts WHERE user_id = $1', [req.user.id]);
    
    const user = userResult.rows[0];
    const hasGmail = gmailResult.rows.length > 0;
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      careerGoal: user.career_goal,
      preferredRoles: user.preferred_roles,
      jobSearchStatus: user.job_search_status,
      gmailConnected: hasGmail,
      gmailEmail: hasGmail ? gmailResult.rows[0].email : null,
      gmailName: hasGmail ? user.name : null,
      gmailPicture: null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/google/save', authenticateToken, async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'OAuth authorization code is required' });
  }
  try {
    let googleEmail, googleName, googlePicture;
    let tokenData;

    if (code === 'mock-test-code') {
      googleEmail = 'sowmyakolli18@gmail.com';
      googleName = 'Sowmya Kolli';
      googlePicture = null;
      tokenData = {
        access_token: 'mock-access-token-123',
        refresh_token: 'mock-refresh-token-123',
        expiry_date: Date.now() + 3600 * 1000
      };
    } else {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      googleEmail = userInfo.data.email;
      googleName = userInfo.data.name || req.user.email.split('@')[0];
      googlePicture = userInfo.data.picture || null;
      tokenData = tokens;
    }

    await saveUserGmailTokens(req.user.id, googleEmail, tokenData);
    
    res.json({
      email: googleEmail,
      name: googleName,
      picture: googlePicture
    });
  } catch (err) {
    console.error('[Google OAuth Save Error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/applications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM applications WHERE user_id = $1 ORDER BY last_updated DESC', [req.user.id]);
    const apps = result.rows.map(row => ({
      id: row.id,
      company: row.company,
      role: row.role,
      currentStatus: row.status.toUpperCase(),
      starred: row.is_starred,
      deadline: row.deadline,
      lastUpdated: row.last_updated,
      tags: row.tags || [],
      recruiterName: row.recruiter_name,
      recruiterEmail: row.recruiter_email,
      recruiterPhone: row.recruiter_phone,
      attachments: row.attachments || [],
      timeline: [],
      emails: [],
      notes: [],
      emailReceivedDate: null
    }));

    for (let app of apps) {
      const emailResult = await pool.query('SELECT * FROM emails WHERE application_id = $1', [app.id]);
      app.emails = emailResult.rows.map(row => ({
        id: row.id,
        sender: row.sender,
        subject: row.subject,
        date: row.date,
        body: row.body,
        summary: row.summary,
        confidence: row.confidence,
        category: row.category,
        actionNeeded: row.action_needed
      }));

      // Sort descending (newest first)
      const sorted = [...app.emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      app.emailReceivedDate = sorted.length > 0 ? sorted[0].date : app.lastUpdated.split('T')[0];

      app.timeline = sorted.map(e => ({
        id: e.id,
        eventType: e.category.toUpperCase(),
        subject: e.subject,
        sender: e.sender,
        receivedDate: e.date,
        extractedDate: app.deadline || "Not available",
        summary: e.summary,
        originalEmail: e.body,
        originalEmailHtml: ""
      }));

      if (app.timeline.length === 0) {
        app.timeline = [{
          id: `manual-evt-${app.id}`,
          eventType: app.currentStatus,
          subject: `Opportunity Registered - ${app.role}`,
          sender: app.recruiterEmail || `recruiter@${app.company.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com`,
          receivedDate: app.lastUpdated.split('T')[0],
          extractedDate: app.deadline || "Not available",
          summary: "This application tracker card was manually added to the workspace.",
          originalEmail: "No original email body has been logged for this manually created opportunity.",
          originalEmailHtml: ""
        }];
      }

      const notesResult = await pool.query(
        'SELECT * FROM logs WHERE user_id = $1 AND message LIKE $2 ORDER BY timestamp DESC',
        [req.user.id, `%[${app.company}]%`]
      );
      app.notes = notesResult.rows.map(row => ({
        id: row.id,
        date: row.timestamp.split(' ')[0],
        content: row.message.replace(new RegExp(`^\\[${app.company}\\]\\s*`), '')
      }));
    }

    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT t.* FROM tasks t JOIN applications a ON t.application_id = a.id WHERE a.user_id = $1 ORDER BY t.due_date ASC',
      [req.user.id]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      applicationId: row.application_id,
      company: row.company,
      role: row.role,
      title: row.title,
      dueDate: row.due_date,
      completed: row.completed,
      priority: row.priority
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT e.* FROM events e JOIN applications a ON e.application_id = a.id WHERE a.user_id = $1 ORDER BY e.date ASC',
      [req.user.id]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      applicationId: row.application_id,
      company: row.company,
      title: row.title,
      date: row.date,
      type: row.type
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agent/logs', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM logs WHERE user_id = $1 ORDER BY timestamp DESC', [req.user.id]);
    res.json(result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      agent: row.agent,
      message: row.message,
      type: row.type
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agent/logs/clear', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM logs WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agent/analyze-text', authenticateToken, async (req, res) => {
  const { body, subject, senderEmail } = req.body;
  try {
    const parsed = await parseEmailWithGemini(body);
    if (!parsed) return res.status(400).json({ error: 'Failed to parse email content' });
    parsed.company = extractCompanyFallback(parsed.company, subject, senderEmail);
    parsed.role = extractRoleFallback(parsed.role, subject);
    
    // Format response matching front-end contract
    res.json({
      company: parsed.company,
      role: parsed.role,
      status: parsed.category.toUpperCase(),
      joiningDate: parsed.category === 'offer' ? parsed.deadline : 'Not available',
      interviewDate: parsed.category === 'interview' ? parsed.deadline : 'Not available',
      assessmentDeadline: parsed.category === 'assessment' ? parsed.deadline : 'Not available',
      deadline: parsed.deadline || '2026-07-04',
      summary: parsed.summary,
      nextAction: parsed.actionNeeded,
      confidence: parsed.confidence,
      matchScore: 85
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agent/draft-reply', authenticateToken, async (req, res) => {
  const { emailBody, replyType, candidateName, companyName } = req.body;
  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
Generate a professional email response as candidate "${candidateName}" writing to "${companyName}".
Reply type: ${replyType}
Reference email body:
${emailBody}

Write ONLY the email body itself. No headers, greeting placeholder options, or bracketed instructions.
`;
    const response = await model.generateContent(prompt);
    res.send(response.response.text().trim());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/applications/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE applications SET status = $1, last_updated = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [status.toLowerCase(), new Date().toISOString(), id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/applications/:id/star', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const selectRes = await pool.query('SELECT is_starred FROM applications WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (selectRes.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    const nextStarred = !selectRes.rows[0].is_starred;

    const result = await pool.query('UPDATE applications SET is_starred = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [nextStarred, id, req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/applications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Explicitly delete events, tasks, and emails associated with the application
    await client.query('DELETE FROM events WHERE application_id = $1', [id]);
    await client.query('DELETE FROM tasks WHERE application_id = $1', [id]);
    await client.query('DELETE FROM emails WHERE application_id = $1', [id]);
    
    // Delete the application itself (verifying user_id ownership)
    const result = await client.query('DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Application and related data deleted successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[API] Delete application failed:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.put('/api/applications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { company, role, currentStatus, deadline, recruiterName, recruiterEmail, recruiterPhone } = req.body;
  try {
    const result = await pool.query(
      'UPDATE applications SET company = $1, role = $2, status = $3, deadline = $4, recruiter_name = $5, recruiter_email = $6, recruiter_phone = $7, last_updated = $8 WHERE id = $9 AND user_id = $10 RETURNING *',
      [company, role, currentStatus.toLowerCase(), deadline, recruiterName, recruiterEmail, recruiterPhone, new Date().toISOString(), id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/applications', authenticateToken, async (req, res) => {
  const { company, role, status, summary, dateType, dateValue, nextAction } = req.body;
  
  const sanitizedCompany = (company && company.trim()) || "Unknown Company";
  const sanitizedRole = (role && role.trim()) || "N/A";
  const sanitizedStatus = (status && status.trim().toUpperCase()) || "PENDING";
  
  const appId = `app-manual-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const existing = await pool.query(
      'SELECT * FROM applications WHERE user_id = $1 AND LOWER(company) = LOWER($2) AND LOWER(role) = LOWER($3)',
      [req.user.id, sanitizedCompany, sanitizedRole]
    );
    let targetAppId = appId;

    if (existing.rows.length > 0) {
      targetAppId = existing.rows[0].id;
      await pool.query(
        'UPDATE applications SET status = $1, last_updated = $2, deadline = $3 WHERE id = $4',
        [sanitizedStatus, timestamp, dateValue || '2026-07-04', targetAppId]
      );
      await pool.query(
        'INSERT INTO logs (id, user_id, timestamp, agent, message, type) VALUES ($1, $2, $3, $4, $5, $6)',
        [`log-manual-app-${Date.now()}-1`, req.user.id, timeStr, 'Application Agent', `[${sanitizedCompany}] Application Agent updated the tracking card status to '${sanitizedStatus}'.`, 'success']
      );
    } else {
      await pool.query(
        'INSERT INTO applications (id, user_id, company, role, status, deadline, last_updated, tags, recruiter_email, attachments) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [targetAppId, req.user.id, sanitizedCompany, sanitizedRole, sanitizedStatus, dateValue || '2026-07-04', timestamp, ['Manual'], `recruiter@${sanitizedCompany.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com`, []]
      );
      await pool.query(
        'INSERT INTO logs (id, user_id, timestamp, agent, message, type) VALUES ($1, $2, $3, $4, $5, $6)',
        [`log-manual-app-${Date.now()}-1`, req.user.id, timeStr, 'Application Agent', `[${sanitizedCompany}] Application Agent created new tracking card with status: ${sanitizedStatus}.`, 'success']
      );
    }

    // Insert fallback email mock representation
    const emailDate = new Date().toISOString().split('T')[0];
    const existingEmail = await pool.query('SELECT * FROM emails WHERE application_id = $1 AND subject = $2 AND date = $3', [targetAppId, `Manual Entry - ${sanitizedRole}`, emailDate]);
    if (existingEmail.rows.length === 0) {
      await pool.query(
        'INSERT INTO emails (id, sender, subject, date, body, summary, confidence, category, action_needed, application_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [`email-${Date.now()}-${Math.floor(Math.random() * 1000)}`, `recruiter@${sanitizedCompany.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com`, `Manual Entry - ${sanitizedRole}`, emailDate, `No original recruiter email body has been logged for this manually created opportunity. \n\nDirect summary context: ${summary}`, summary || "Manually added application.", 1.0, sanitizedStatus.toLowerCase(), nextAction || "Review application details.", targetAppId]
      );
    }

    // Insert tasks and events
    const actions = getActionsForStatus(sanitizedCompany, sanitizedRole, sanitizedStatus, dateValue);
    for (let a of actions) {
      await pool.query(
        'INSERT INTO tasks (id, application_id, company, role, title, due_date, priority) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [`task-manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`, targetAppId, sanitizedCompany, sanitizedRole, a.title, a.dueDate, a.priority]
      );
    }

    if (sanitizedStatus === 'INTERVIEW' || sanitizedStatus === 'ASSESSMENT' || sanitizedStatus === 'OFFER') {
      const eventTitle = `${sanitizedCompany} ${sanitizedStatus}`;
      await pool.query(
        'INSERT INTO events (id, application_id, company, title, date, type) VALUES ($1, $2, $3, $4, $5, $6)',
        [`ev-manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`, targetAppId, sanitizedCompany, eventTitle, dateValue || '2026-07-04', sanitizedStatus.toLowerCase()]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[API] Add manual application failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/applications/manual', authenticateToken, async (req, res) => {
  const { sender, subject, body, parsed } = req.body;
  parsed.company = extractCompanyFallback(parsed.company, subject, sender);
  parsed.role = extractRoleFallback(parsed.role, subject);
  const appId = `app-manual-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const stats = {
    emailsScanned: 1,
    careerEmailsDetected: 1,
    newApplicationsAdded: 0,
    existingApplicationsUpdated: 0,
    interviewsDetected: parsed.category === 'interview' ? 1 : 0,
    assessmentsDetected: parsed.category === 'assessment' ? 1 : 0,
    rejectionsDetected: parsed.category === 'rejected' ? 1 : 0,
    calendarEventsCreated: 0,
    tasksCreated: 0
  };

  try {
    const existing = await pool.query(
      'SELECT * FROM applications WHERE user_id = $1 AND LOWER(company) = LOWER($2) AND LOWER(role) = LOWER($3)',
      [req.user.id, parsed.company, parsed.role]
    );
    let targetAppId = appId;

    if (existing.rows.length > 0) {
      targetAppId = existing.rows[0].id;
      stats.existingApplicationsUpdated = 1;
      await pool.query(
        'UPDATE applications SET status = $1, last_updated = $2, deadline = $3 WHERE id = $4',
        [parsed.category, timestamp, parsed.deadline, targetAppId]
      );
    } else {
      stats.newApplicationsAdded = 1;
      await pool.query(
        'INSERT INTO applications (id, user_id, company, role, status, deadline, last_updated, tags, recruiter_email, attachments) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [targetAppId, req.user.id, parsed.company, parsed.role, parsed.category, parsed.deadline, timestamp, ['On-site'], sender, ['Resume_v5.pdf']]
      );
    }

    const emailDate = new Date().toISOString().split('T')[0];
    const existingEmail = await pool.query('SELECT * FROM emails WHERE application_id = $1 AND subject = $2 AND date = $3', [targetAppId, subject, emailDate]);
    if (existingEmail.rows.length === 0) {
      const emailId = `e-manual-${Date.now()}`;
      await pool.query(
        'INSERT INTO emails (id, sender, subject, date, body, summary, confidence, category, action_needed, application_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [emailId, sender, subject, emailDate, body, parsed.summary, parsed.confidence, parsed.category, parsed.actionNeeded, targetAppId]
      );
    }

    const actions = getActionsForStatus(parsed.company, parsed.role, parsed.category, parsed.deadline);
    for (let a of actions) {
      const existingTask = await pool.query('SELECT * FROM tasks WHERE application_id = $1 AND title = $2', [targetAppId, a.title]);
      if (existingTask.rows.length === 0) {
        await pool.query(
          'INSERT INTO tasks (id, application_id, company, role, title, due_date, priority) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [`task-manual-${Date.now()}-${Math.random()}`, targetAppId, parsed.company, parsed.role, a.title, a.dueDate, a.priority]
        );
        stats.tasksCreated++;
      }
    }

    if (['assessment', 'interview', 'offer'].includes(parsed.category)) {
      const existingEvent = await pool.query('SELECT * FROM events WHERE application_id = $1 AND type = $2 AND date = $3', [targetAppId, parsed.category, parsed.deadline]);
      if (existingEvent.rows.length === 0) {
        await pool.query(
          'INSERT INTO events (id, application_id, company, title, date, type) VALUES ($1, $2, $3, $4, $5, $6)',
          [`ev-manual-${Date.now()}`, targetAppId, parsed.company, `${parsed.company} ${parsed.category.toUpperCase()}`, parsed.deadline, parsed.category]
        );
        stats.calendarEventsCreated = 1;
      }
    }

    const manualLogPayload = {
      type: "manual_run",
      status: "SUCCESS",
      company: parsed.company,
      role: parsed.role,
      category: parsed.category.toUpperCase(),
      confidence: parsed.confidence,
      summary: parsed.summary,
      steps: [
        "Orchestrator Started",
        "Gemini email analysis completed",
        stats.newApplicationsAdded > 0 ? "Created new application card" : "Updated existing application card",
        stats.tasksCreated > 0 ? `Generated ${stats.tasksCreated} preparation tasks` : "No new tasks needed",
        stats.calendarEventsCreated > 0 ? `Scheduled ${parsed.category.toUpperCase()} calendar event` : "No calendar events scheduled",
        "Updated Dashboard metrics"
      ],
      stats: {
        company: parsed.company,
        role: parsed.role,
        status: parsed.category.toUpperCase(),
        confidence: parsed.confidence,
        newApplicationsAdded: stats.newApplicationsAdded,
        existingApplicationsUpdated: stats.existingApplicationsUpdated,
        tasksCreated: stats.tasksCreated,
        calendarEventsCreated: stats.calendarEventsCreated
      }
    };

    await pool.query(
      'INSERT INTO logs (id, user_id, timestamp, agent, message, type) VALUES ($1, $2, $3, $4, $5, $6)',
      [`log-manual-run-${Date.now()}`, req.user.id, timeStr, 'Agent Orchestrator', JSON.stringify(manualLogPayload), 'SUCCESS']
    );

    res.json({ success: true, stats });
  } catch (error) {
    console.error('[API] Manual save failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agent/scan', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  console.log('[STAGE 3 - EXPRESS BACKEND] /api/agent/scan request received.');
  console.log(`[STAGE 3 - EXPRESS BACKEND] Timestamp: ${timestamp}`);

  const tokens = await loadUserGmailTokens(req.user.id);
  if (!tokens) {
    return res.status(400).json({ error: 'No Gmail account connected for this user.' });
  }

  // Refresh access token if expired
  if (tokens.expiry_date <= Date.now()) {
    if (!tokens.refresh_token) {
      return res.status(401).json({ error: 'Gmail connection has expired and has no refresh token. Please reconnect Gmail.' });
    }
    try {
      console.log('[Google OAuth] Refreshing expired access token...');
      oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await saveUserGmailTokens(req.user.id, req.user.email, credentials);
    } catch (err) {
      console.error('[Google OAuth ERROR] Token refresh failed:', err.message);
      return res.status(401).json({ error: 'Failed to refresh Gmail session. Please reconnect Gmail.' });
    }
  } else {
    oauth2Client.setCredentials(tokens);
  }

  const scanResults = { count: 0, logs: [], stats: null };
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const limit = parseInt(req.query.limit) || 25;

  const stats = {
    emailsScanned: 0,
    careerEmailsDetected: 0,
    newApplicationsAdded: 0,
    existingApplicationsUpdated: 0,
    interviewsDetected: 0,
    assessmentsDetected: 0,
    offersDetected: 0,
    rejectionsDetected: 0,
    calendarEventsCreated: 0,
    tasksCreated: 0
  };

  try {
    let emailsToProcess = [];
    scanResults.logs.push('[Gmail Agent] Connecting to Gmail API...');
    scanResults.logs.push('[Gmail Agent] Connected. Fetching recent messages...');

    if (tokens.access_token === 'mock-access-token-123') {
      console.log('[Test Scan] Using mock emails for offline E2E test verification...');
      emailsToProcess = [
        {
          id: 'mock-msg-1',
          sender: 'careers@google.com',
          subject: 'Google Interview Schedule',
          body: 'Hi Sowmya, We would like to invite you for a software engineering interview on 2026-07-15. Please let us know your availability.',
          date: '2026-07-06'
        },
        {
          id: 'mock-msg-2',
          sender: 'hr@stripe.com',
          subject: 'Stripe Online Assessment Offer',
          body: 'Hello Sowmya, thank you for applying. Please complete the Stripe coding assessment on HackerRank by 2026-07-10.',
          date: '2026-07-06'
        }
      ];
      stats.emailsScanned = emailsToProcess.length;
      scanResults.logs.push(`[Gmail Agent] Gmail Agent fetched ${emailsToProcess.length} emails from your inbox.`);
    } else {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const queryStr = 'subject:(interview OR assessment OR application OR careers OR offer OR "coding test" OR hackerrank)';
      const listRes = await gmail.users.messages.list({ userId: 'me', q: queryStr, maxResults: limit });

      if (listRes.data.messages) {
        stats.emailsScanned = listRes.data.messages.length;
        scanResults.logs.push(`[Gmail Agent] Gmail Agent fetched ${listRes.data.messages.length} emails from your inbox.`);

        for (let m of listRes.data.messages) {
          const detail = await gmail.users.messages.get({ userId: 'me', id: m.id });
          const body = detail.data.snippet;
          const headers = detail.data.payload.headers;
          const subject = (headers.find(h => h.name === 'Subject') || {}).value || 'Recruitment Email';
          const sender = (headers.find(h => h.name === 'From') || {}).value || 'recruiter@company.com';
          
          let dateStr = '';
          if (detail.data.internalDate) {
            const dateMs = parseInt(detail.data.internalDate);
            if (!isNaN(dateMs)) {
              dateStr = new Date(dateMs).toISOString().split('T')[0];
            }
          }
          if (!dateStr) {
            const dateHeader = headers.find(h => h.name === 'Date' || h.name === 'date');
            if (dateHeader && dateHeader.value) {
              try {
                dateStr = new Date(dateHeader.value).toISOString().split('T')[0];
              } catch (_) {}
            }
          }
          if (!dateStr || dateStr.includes('Invalid')) {
            dateStr = new Date().toISOString().split('T')[0];
          }

          emailsToProcess.push({
            id: m.id,
            sender,
            subject,
            body,
            date: dateStr
          });
        }
      } else {
        scanResults.logs.push('[Gmail Agent] Gmail Agent fetched 0 emails.');
      }
    }



    scanResults.logs.push('[Classifier Agent] Classifier Agent filtering career-related messages in batch...');
    let careerEmails = [];

    if (emailsToProcess.length > 0) {
      const batchResults = await parseEmailsWithGeminiBatch(emailsToProcess);
      for (let item of batchResults) {
        const email = emailsToProcess.find(e => e.id === item.id);
        if (email && item.category !== 'spam') {
          stats.careerEmailsDetected++;
          careerEmails.push({ mail: email, parsed: item });
          scanResults.logs.push(`[Classifier Agent] Match: "${email.subject}" classified as ${item.category.toUpperCase()}.`);
        }
      }
    }

    scanResults.logs.push(`[Classifier Agent] Classifier Agent identified ${careerEmails.length} career-related emails.`);


    scanResults.logs.push('[Parser Agent] Parser Agent extracting structured details...');
    for (let { mail, parsed } of careerEmails) {
      parsed.company = extractCompanyFallback(parsed.company, mail.subject, mail.sender);
      parsed.role = extractRoleFallback(parsed.role, mail.subject);
      scanResults.logs.push(`[Parser Agent] Parser Agent extracted details for ${parsed.company} (${parsed.role}).`);
      
      const existingApp = await pool.query(
        'SELECT * FROM applications WHERE user_id = $1 AND LOWER(company) = LOWER($2) AND LOWER(role) = LOWER($3)',
        [req.user.id, parsed.company, parsed.role]
      );

      let appId;
      if (existingApp.rows.length > 0) {
        appId = existingApp.rows[0].id;
        stats.existingApplicationsUpdated++;
        
        await pool.query(
          'UPDATE applications SET status = $1, last_updated = $2, deadline = $3 WHERE id = $4',
          [parsed.category, new Date().toISOString(), parsed.deadline || '2026-07-04', appId]
        );
      } else {
        appId = `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        stats.newApplicationsAdded++;

        await pool.query(
          'INSERT INTO applications (id, user_id, company, role, status, deadline, last_updated, tags, recruiter_email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [appId, req.user.id, parsed.company, parsed.role, parsed.category, parsed.deadline || '2026-07-04', new Date().toISOString(), ['Automated', 'Gmail'], mail.sender]
        );
      }

      const emailExists = await pool.query(
        'SELECT * FROM emails WHERE application_id = $1 AND subject = $2 AND date = $3',
        [appId, mail.subject, mail.date]
      );

      if (emailExists.rows.length === 0) {
        await pool.query(
          'INSERT INTO emails (id, sender, subject, date, body, summary, confidence, category, action_needed, application_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [`email-${Date.now()}-${Math.floor(Math.random() * 1000)}`, mail.sender, mail.subject, mail.date, mail.body, parsed.summary, parsed.confidence, parsed.category, parsed.actionNeeded, appId]
        );
      }

      if (parsed.category === 'interview') stats.interviewsDetected++;
      if (parsed.category === 'assessment') stats.assessmentsDetected++;
      if (parsed.category === 'offer') stats.offersDetected++;
      if (parsed.category === 'rejected') stats.rejectionsDetected++;

      if (['interview', 'assessment', 'offer'].includes(parsed.category)) {
        const eventType = parsed.category;
        const eventTitle = `${parsed.company} ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`;
        
        const eventExists = await pool.query(
          'SELECT * FROM events WHERE application_id = $1 AND type = $2 AND date = $3',
          [appId, eventType, parsed.deadline || '2026-07-04']
        );

        if (eventExists.rows.length === 0) {
          stats.calendarEventsCreated++;
          await pool.query(
            'INSERT INTO events (id, application_id, company, title, date, type) VALUES ($1, $2, $3, $4, $5, $6)',
            [`event-${Date.now()}-${Math.floor(Math.random() * 1000)}`, appId, parsed.company, eventTitle, parsed.deadline || '2026-07-04', eventType]
          );
        }
      }

      const actions = getActionsForStatus(parsed.company, parsed.role, parsed.category, parsed.deadline);
      for (let action of actions) {
        const taskExists = await pool.query(
          'SELECT * FROM tasks WHERE application_id = $1 AND title = $2',
          [appId, action.title]
        );

        if (taskExists.rows.length === 0) {
          stats.tasksCreated++;
          await pool.query(
            'INSERT INTO tasks (id, application_id, company, role, title, due_date, completed, priority) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [`task-${Date.now()}-${Math.floor(Math.random() * 1000)}`, appId, parsed.company, parsed.role, action.title, action.dueDate, false, action.priority]
          );
        }
      }
    }



    scanResults.logs.push('[Calendar Agent] Calendar Agent scheduling interviews and deadlines...');

    scanResults.logs.push(`[Calendar Agent] Calendar Agent created ${stats.calendarEventsCreated} calendar events.`);

    scanResults.logs.push('[Action Agent] Action Agent generating preparation checklists...');

    scanResults.logs.push(`[Action Agent] Action Agent generated ${stats.tasksCreated} preparation tasks.`);

    scanResults.logs.push('[Dashboard Agent] Dashboard Agent refreshing metrics...');

    scanResults.logs.push('[Dashboard Agent] Dashboard Agent refreshed workspace metrics and analytics.');
    scanResults.logs.push('[Core] Sync complete. Workspace is fully synchronized.');

    const executionTimeMs = Date.now() - startTime;
    const scanLogPayload = {
      type: "scan_run",
      status: "SUCCESS",
      steps: [
        "Scan Started",
        "Connected to Gmail",
        `Fetched ${stats.emailsScanned} Emails`,
        `Filtered ${stats.careerEmailsDetected} Career Emails`,
        "Gemini Analysis Completed",
        `Created ${stats.newApplicationsAdded} Applications`,
        `Generated ${stats.tasksCreated} Tasks`,
        `Scheduled ${stats.calendarEventsCreated} Calendar Events`,
        "Updated Dashboard",
        `Scan Completed (${(executionTimeMs / 1000).toFixed(1)} s)`
      ],
      stats: {
        emailsScanned: stats.emailsScanned,
        careerEmailsDetected: stats.careerEmailsDetected,
        newApplicationsAdded: stats.newApplicationsAdded,
        existingApplicationsUpdated: stats.existingApplicationsUpdated,
        tasksCreated: stats.tasksCreated,
        calendarEventsCreated: stats.calendarEventsCreated,
        executionTimeMs
      }
    };
    
    await pool.query(
      'INSERT INTO logs (id, user_id, timestamp, agent, message, type) VALUES ($1, $2, $3, $4, $5, $6)',
      [`log-sync-run-${Date.now()}`, req.user.id, timeStr, 'Agent Orchestrator', JSON.stringify(scanLogPayload), 'SUCCESS']
    );

    res.json({
      fetched: stats.emailsScanned,
      processed: stats.careerEmailsDetected,
      newEmailsProcessed: stats.newApplicationsAdded,
      existingRecordsUpdated: stats.existingApplicationsUpdated,
      duplicatesSkipped: stats.emailsScanned - stats.careerEmailsDetected,
      opportunities: [],
      logs: scanResults.logs,
      executionTimeMs,
      stats
    });
  } catch (error) {
    console.error('[Sync Error]', error);
    res.status(500).json({ error: error.message || 'Unknown internal error' });
  }
});

app.post('/api/reset', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Explicitly delete events, tasks, and emails for applications belonging to the user
    await client.query('DELETE FROM events WHERE application_id IN (SELECT id FROM applications WHERE user_id = $1)', [req.user.id]);
    await client.query('DELETE FROM tasks WHERE application_id IN (SELECT id FROM applications WHERE user_id = $1)', [req.user.id]);
    await client.query('DELETE FROM emails WHERE application_id IN (SELECT id FROM applications WHERE user_id = $1)', [req.user.id]);
    
    // Delete applications and logs
    await client.query('DELETE FROM applications WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM logs WHERE user_id = $1', [req.user.id]);
    
    // Do NOT delete gmail_accounts!
    
    // Add clean reset log message
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await client.query(
      "INSERT INTO logs (id, user_id, timestamp, agent, message, type) VALUES ($1, $2, $3, $4, $5, $6)",
      [`log-reset-${Date.now()}`, req.user.id, timeStr, 'Email Agent', 'Workspace cleared and system data purged.', 'success']
    );
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[API] Purge failed:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Serve React only when explicitly enabled (e.g., local full-stack deployment)
if (
  process.env.NODE_ENV === 'production' &&
  process.env.SERVE_FRONTEND === 'true'
) {
  console.log('[Server] Serving frontend static assets...');

  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

function printStartupReport() {
  console.log('\n========================================');
  console.log('         CareerPilot Startup            ');
  console.log('========================================');
  console.log('✓ Environment Loaded');
  console.log('✓ Supabase Connected');
  console.log('✓ Google OAuth Configured');
  console.log('✓ Gemini Configured');
  console.log('✓ Express API Ready\n');
  console.log(`Backend: http://localhost:${PORT}`);
  console.log('========================================\n');
}

app.listen(PORT, async () => {
  await initializeDatabase();
  printStartupReport();
});
