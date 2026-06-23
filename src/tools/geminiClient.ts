import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AgentResponse {
  company: string;
  role: string;
  status: "OFFER" | "INTERVIEW" | "ASSESSMENT" | "REJECTED" | "PENDING" | "GENERAL UPDATE";
  joiningDate?: string;
  interviewDate?: string;
  assessmentDeadline?: string;
  deadline?: string;
  date: {
    type: string;
    value: string;
  };
  summary: string;
  nextAction: string;
  confidence: number;
}

/**
 * Helper to clean company names by removing generic keywords and suffixes.
 */
export const cleanCompanyCandidate = (candidate: string): string => {
  const genericWords = [
    "university", "recruiting", "recruitment", "careers", "talent", 
    "acquisition", "student programs", "student", "programs", "hr team", "hr", "team"
  ];
  
  let cleaned = candidate.trim();
  
  // Split into words and filter out generic words case-insensitively
  const words = cleaned.split(/\s+/);
  const filteredWords = words.filter(word => {
    const lowerWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    return !genericWords.includes(lowerWord) && lowerWord.length > 0;
  });
  
  return filteredWords.join(" ").trim();
};

export const extractDateForStatus = (text: string, status: string): string => {
  if (!text) return "Not available";
  const normalizedText = text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  
  const findDateWithKeywords = (normText: string, keywords: string[]): string | null => {
    const datePattern = `(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2}(?:\\s*,\\s*|\\s+)\\d{4}`;
    const dateNoYearPattern = `(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2}`;
    const isoPattern = `\\d{4}-\\d{2}-\\d{2}`;

    const patterns = [datePattern, isoPattern, dateNoYearPattern];

    for (const dp of patterns) {
      for (const kw of keywords) {
        const regex1 = new RegExp(`${kw}[^.]{0,100}\\b(${dp})\\b`, "i");
        const match1 = normText.match(regex1);
        if (match1 && match1[1]) return match1[1].trim();

        const regex2 = new RegExp(`\\b(${dp})\\b[^.]{0,100}${kw}`, "i");
        const match2 = normText.match(regex2);
        if (match2 && match2[1]) return match2[1].trim();
      }
    }
    return null;
  };

  const findDateInString = (str: string): string | null => {
    const datePattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:\s*,\s*|\s+)\d{4}\b/i;
    const dateNoYearPattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?)\s+\d{1,2}\b/i;
    const isoPattern = /\b\d{4}-\d{2}-\d{2}\b/;

    const match1 = str.match(datePattern);
    if (match1) return match1[0];
    const match2 = str.match(isoPattern);
    if (match2) return match2[0];
    const match3 = str.match(dateNoYearPattern);
    if (match3) return match3[0];
    return null;
  };

  if (status === "INTERVIEW") {
    const interviewKeywords = ["schedule", "interview\\s+date", "date\\s*:", "time\\s*:", "mode\\s*:", "discussion", "meeting", "interview"];
    const found = findDateWithKeywords(normalizedText, interviewKeywords);
    if (found) return found;
    return "Not available";
  } else if (status === "ASSESSMENT") {
    const assessmentKeywords = ["deadline", "before", "complete\\s+by", "complete\\s+before", "due", "assessment", "coding\\s+test", "challenge"];
    const found = findDateWithKeywords(normalizedText, assessmentKeywords);
    if (found) return found;
    return "Not available";
  } else if (status === "OFFER") {
    const offerKeywords = ["joining\\s+date", "joining", "start\\s+date", "onboarding\\s+date", "onboarding", "offer"];
    const found = findDateWithKeywords(normalizedText, offerKeywords);
    if (found) return found;
    return "Not available";
  } else if (status === "OFFER_DEADLINE") {
    const offerDeadlineKeywords = ["accept\\s+before", "reply\\s+by", "respond\\s+by", "before", "deadline"];
    const found = findDateWithKeywords(normalizedText, offerDeadlineKeywords);
    if (found) return found;
    return "Not available";
  }

  const genericKeywords = ["deadline", "before", "complete\\s+by", "due", "schedule", "interview\\s+date", "date\\s*:", "joining\\s+date", "joining", "interview", "assessment"];
  const genericFound = findDateWithKeywords(normalizedText, genericKeywords);
  if (genericFound) return genericFound;

  const finalMatch = findDateInString(normalizedText);
  if (finalMatch) return finalMatch;

  return "Not available";
};

export const cleanSummaryText = (summary: string, company: string, rawCompany: string): string => {
  if (!summary || typeof summary !== "string") return "No summary available";
  
  let cleaned = summary.trim();

  if (rawCompany && company && company !== "Unknown Company" && rawCompany !== company) {
    const escapedRaw = rawCompany.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escapedRaw, 'gi'), company);
  }

  const junkPatterns = [
    /Dear\s+[a-zA-Z0-9\s]+/gi,
    /has been selected/gi,
    /has been shortlisted/gi,
    /congratulations/gi,
    /recruiting team/gi,
    /careers team/gi,
    /student programs team/gi,
    /talent acquisition team/gi,
    /HR team/gi,
    /team/gi,
    /careers/gi
  ];
  for (const pattern of junkPatterns) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  cleaned = cleaned.replace(/\s+/g, " ");
  cleaned = cleaned.replace(/^[\s,.:!?-]+|[\s,.:!?-]+$/g, "").trim();

  return cleaned;
};

/**
 * Advanced extraction for Company names based on domain headers, subjects, 
 * and explicit patterns, ignoring generic university/recruiting suffixes.
 */
export const extractCompany = (body: string, subject: string, senderEmail: string = ""): string => {
  const illegalKeywords = ["is", "has", "scheduled", "invited", "received", "completed", "for", "position", "role"];
  const illegalRegex = new RegExp(`\\b(${illegalKeywords.join("|")})\\b.*`, "i");

  // Priority 1: Sender domain if available
  if (senderEmail && senderEmail.includes("@")) {
    const parts = senderEmail.split("@");
    if (parts.length > 1) {
      const domain = parts[1].toLowerCase();
      const commonProviders = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com"];
      if (!commonProviders.includes(domain)) {
        const domainParts = domain.split(".");
        const ignoreSubdomains = ["careers", "jobs", "recruiting", "recruitment", "no-reply", "noreply", "offers", "team", "hr", "talent", "student", "programs", "university"];
        const baseParts = domainParts.filter(part => 
          part !== "com" && part !== "org" && part !== "net" && part !== "edu" && part !== "gov" && part !== "co" && part !== "io" && !ignoreSubdomains.includes(part)
        );
        if (baseParts.length > 0) {
          const rawCompany = baseParts[0];
          const capitalized = rawCompany.charAt(0).toUpperCase() + rawCompany.slice(1);
          let cleaned = cleanCompanyCandidate(capitalized);
          cleaned = cleaned.replace(illegalRegex, "").trim();
          if (cleaned && cleaned.length >= 2) return cleaned;
        }
      }
    }
  }

  // Priority 2: Subject company name check (checking known list)
  const knownCompanies = ["google", "amazon", "microsoft", "stripe", "meta", "netflix", "duolingo", "apple", "airbnb", "atlassian", "adobe", "technova"];
  for (const c of knownCompanies) {
    if (subject.toLowerCase().includes(c)) {
      return c.charAt(0).toUpperCase() + c.slice(1);
    }
  }

  // Priority 3: Explicit phrases in subject or body
  const combinedText = subject + "\n" + body;
  const explicitPatterns = [
    /(?:at|from)\s+([A-Z][a-zA-Z0-9\s-]{1,30})/i,
    /([A-Z][a-zA-Z0-9\s-]{1,30})\s+(?:Careers|Recruiting Team|Recruitment Team|Recruiting|Recruitment|Talent Acquisition|Student Programs|HR Team|Team)/i
  ];
  
  for (const pattern of explicitPatterns) {
    const match = combinedText.match(pattern);
    if (match && match[1]) {
      const cleaned = cleanCompanyCandidate(match[1]);
      let cleanCandidate = cleaned.replace(illegalRegex, "").trim();
      if (cleanCandidate && cleanCandidate.toLowerCase() !== "dear" && cleanCandidate.toLowerCase() !== "the" && cleanCandidate.length >= 2) {
        return cleanCandidate;
      }
    }
  }

  // Priority 4: Subject proper nouns fallback
  const commonSubjectWords = [
    "interview", "schedule", "action", "required", "online", "assessment", 
    "invitation", "offer", "job", "application", "received", "your", 
    "software", "engineer", "developer", "intern", "sde", "frontend", 
    "backend", "position", "opportunity", "update", "status", "with", "for", "to", "from", "at", "onboarding",
    "interviews", "schedules", "offers", "jobs", "applications", "updates", "assessments", "invitations",
    "front", "end", "back", ...illegalKeywords
  ];
  
  const subjectWords = subject.split(/[\s,.:!?-]+/);
  for (const word of subjectWords) {
    if (word && /^[A-Z]/.test(word)) {
      const lower = word.toLowerCase();
      if (!commonSubjectWords.includes(lower)) {
        let cleaned = cleanCompanyCandidate(word);
        cleaned = cleaned.replace(illegalRegex, "").trim();
        if (cleaned && cleaned.length >= 2) return cleaned;
      }
    }
  }

  // Fallback body known companies match
  for (const c of knownCompanies) {
    if (body.toLowerCase().includes(c)) {
      return c.charAt(0).toUpperCase() + c.slice(1);
    }
  }

  return "Not available";
};

/**
 * Advanced extraction for exact Job Roles.
 */
export const extractRole = (body: string, subject: string): string => {
  const combinedText = (subject + "\n" + body);
  const lowerText = combinedText.toLowerCase();

  const exactRoles = [
    "software engineering intern",
    "software developer intern",
    "software development engineer intern",
    "backend engineering intern",
    "frontend engineering intern",
    "fullstack engineering intern",
    "full stack engineering intern",
    "machine learning engineering intern",
    "data science intern",
    "systems engineering intern",
    "frontend developer intern",
    "backend developer intern",
    "sde intern",
    "swe intern",
    "frontend engineer",
    "backend engineer",
    "fullstack engineer",
    "full-stack engineer",
    "software engineer",
    "software developer",
    "frontend developer",
    "backend developer",
    "systems engineer",
    "site reliability engineer",
    "sre",
    "sde",
    "swe",
    "associate engineer",
    "trainee engineer",
    "senior engineer",
    "junior engineer",
    "junior developer",
    "senior developer"
  ];
  
  for (const role of exactRoles) {
    const idx = lowerText.indexOf(role);
    if (idx !== -1) {
      const originalRole = combinedText.substring(idx, idx + role.length);
      return originalRole.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }
  
  // Fallback: Try regex patterns preserving modifiers
  const rolePatterns = [
    /(?:position of|role of|position as|role as|for the)\s+([A-Z][a-zA-Z0-9\s-]{1,40}\s+(?:Intern(?:ship)?|Engineer|Developer|SDE|Analyst|Trainee|Associate|Junior|Senior))/i,
    /([A-Z][a-zA-Z0-9\s-]{1,40}\s+(?:Intern(?:ship)?|Engineer|Developer|SDE|Analyst|Trainee|Associate|Junior|Senior))\s+(?:position|role|opportunity)/i,
    /([A-Z][a-zA-Z0-9\s-]{1,40}\s+(?:Intern(?:ship)?|Engineer|Developer|SDE|Analyst|Trainee|Associate|Junior|Senior))/i
  ];
  
  for (const pattern of rolePatterns) {
    const match = combinedText.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const lowerCandidate = candidate.toLowerCase();
      if (
        !lowerCandidate.includes("google") && 
        !lowerCandidate.includes("amazon") && 
        !lowerCandidate.includes("microsoft") && 
        !lowerCandidate.includes("recruiting") &&
        !lowerCandidate.startsWith("hello") &&
        !lowerCandidate.startsWith("dear") &&
        !lowerCandidate.startsWith("hi ")
      ) {
        return candidate;
      }
    }
  }
  
  // Clean subject fallback
  const cleanedSubject = subject
    .replace(/^(interview schedule|action required|job offer|application received|your application|update on your application)\s*[:|-]\s*/i, "")
    .replace(/(position|role|opportunity) at .*$/i, "")
    .trim();
    
  if (cleanedSubject && (
    cleanedSubject.toLowerCase().includes("engineer") || 
    cleanedSubject.toLowerCase().includes("intern") || 
    cleanedSubject.toLowerCase().includes("developer") || 
    cleanedSubject.toLowerCase().includes("sde") ||
    cleanedSubject.toLowerCase().includes("trainee") ||
    cleanedSubject.toLowerCase().includes("associate")
  )) {
    if (!/^(hello|hi|dear)\b/i.test(cleanedSubject)) {
      return cleanedSubject;
    }
  }

  return "Unknown / Recruitment Update";
};

/**
 * Standard local rule-based analysis simulator.
 */
export const runLocalAnalysisSimulator = (body: string, subject: string = "", senderEmail: string = ""): AgentResponse => {
  const company = extractCompany(body, subject, senderEmail);
  const role = extractRole(body, subject);
  
  const text = (subject + "\n" + body).toLowerCase();
  let status: AgentResponse["status"] = "GENERAL UPDATE";
  let confidence = 0.85;

  // Analyze keywords strictly in priority order: REJECTION > OFFER > INTERVIEW > ASSESSMENT > APPLIED
  const isRejection = [
    "reject", "not selected", "unable to proceed", "unfortunately", 
    "regret to inform", "unsuccessful", "not moving forward"
  ].some(kw => text.includes(kw));

  const isOffer = [
    "offer letter", "joining date", "compensation", "salary", 
    "selected for position", "welcome aboard", "we are pleased to offer", 
    "offer you the position", "welcome to the team", "internship/job offer",
    "start date", "onboarding date"
  ].some(kw => text.includes(kw));

  const isInterview = [
    "interview", "technical round", "hr round", "discussion scheduled",
    "interview scheduled", "interview invitation", "technical discussion",
    "meeting link", "zoom link", "google meet", "schedule a time"
  ].some(kw => text.includes(kw));

  const isAssessment = [
    "assessment", "coding test", "online test", "challenge", 
    "exam", "hackerrank", "coding round", "coding test", 
    "online assessment", "assignment"
  ].some(kw => text.includes(kw));

  const isApplied = [
    "application received", "thank you for applying", "application submitted",
    "under review", "reviewing applications"
  ].some(kw => text.includes(kw));

  if (isRejection) {
    status = "REJECTED";
    confidence = 0.98;
  } else if (isOffer) {
    status = "OFFER";
    confidence = 0.98;
  } else if (isInterview) {
    status = "INTERVIEW";
    confidence = 0.95;
  } else if (isAssessment) {
    status = "ASSESSMENT";
    confidence = 0.94;
  } else if (isApplied) {
    status = "PENDING";
    confidence = 0.85;
  } else {
    status = "GENERAL UPDATE";
    confidence = 0.85;
  }

  // 4. Resolve Date strictly contextually without guessing
  let joiningDate = "Not available";
  let interviewDate = "Not available";
  let assessmentDeadline = "Not available";
  let deadline = "Not available";

  if (status === "OFFER") {
    joiningDate = extractDateForStatus(body, "OFFER");
    deadline = extractDateForStatus(body, "OFFER_DEADLINE");
  } else if (status === "INTERVIEW") {
    interviewDate = extractDateForStatus(body, "INTERVIEW");
  } else if (status === "ASSESSMENT") {
    assessmentDeadline = extractDateForStatus(body, "ASSESSMENT");
  }

  let dateType = "Not available";
  let dateValue = "Not available";

  if (status === "OFFER") {
    dateType = "Joining Date";
    dateValue = joiningDate !== "Not available" ? joiningDate : "Not available";
  } else if (status === "ASSESSMENT") {
    dateType = "Assessment Deadline";
    dateValue = assessmentDeadline !== "Not available" ? assessmentDeadline : "Not available";
  } else if (status === "INTERVIEW") {
    dateType = "Interview Date";
    dateValue = interviewDate !== "Not available" ? interviewDate : "Not available";
  }

  // 5. Recommended Actions
  let nextAction = "";
  switch (status) {
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

  // 6. Generate Summary
  let rawSummary = "";
  if (status === "OFFER") {
    rawSummary = `Received a formal job offer from ${company} for the ${role} role.`;
  } else if (status === "INTERVIEW") {
    rawSummary = `Invited to schedule a technical interview with ${company}.`;
  } else if (status === "ASSESSMENT") {
    rawSummary = `Received online coding assessment request from ${company} for the ${role} role.`;
  } else if (status === "REJECTED") {
    rawSummary = `Application status update from ${company}: Not moving forward.`;
  } else if (status === "PENDING") {
    rawSummary = `Application confirmation received from ${company} for the ${role} position.`;
  } else {
    rawSummary = `Received recruiting update from ${company}.`;
  }
  const summary = cleanSummaryText(rawSummary, company, company);

  return {
    company,
    role,
    status,
    joiningDate,
    interviewDate,
    assessmentDeadline,
    deadline,
    date: {
      type: dateType,
      value: dateValue
    },
    summary,
    nextAction,
    confidence
  };
};

/**
 * Strict cleanup helper for Company names to strip greetings, sentences, and recruiter tags.
 */
export const cleanupCompanyName = (
  company: string,
  body: string = "",
  subject: string = "",
  senderEmail: string = ""
): string => {
  if (!company || typeof company !== "string") return "Unknown Company";
  
  let cleaned = company.replace(/\r?\n|\r/g, " ").trim();
  
  // Remove starting recruiter keywords / congrats / greetings
  const prefixRegex = /^(?:dear\s+[a-zA-Z0-9\s]+|congratulations|congrats|hello|hi|regards|sincerely|best regards|best|thank you for applying to|thank you for your interest in|updates from|offer from|update from|opportunity at)\b/i;
  cleaned = cleaned.replace(prefixRegex, "").trim();

  // Remove trailing/leading punctuation
  cleaned = cleaned.replace(/^[\s,.:!?-]+|[\s,.:!?-]+$/g, "").trim();

  // Common recruiter suffixes to remove entirely
  const recruiterPhrases = [
    /dear\s+[a-zA-Z0-9\s]+/gi,
    /has been selected/gi,
    /has been shortlisted/gi,
    /congratulations/gi,
    /recruiting team/gi,
    /careers team/gi,
    /student programs team/gi,
    /talent acquisition team/gi,
    /HR team/gi,
    /team/gi,
    /careers/gi
  ];

  for (const pattern of recruiterPhrases) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  // Strip trailing/leading punctuation again
  cleaned = cleaned.replace(/^[\s,.:!?-]+|[\s,.:!?-]+$/g, "").trim();

  // Split into words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  // Filter out any word in the ignore list
  const ignoreList = [
    "university", "recruiting", "recruitment", "careers", "talent", 
    "acquisition", "student", "programs", "hr", "team", "dear", "congratulations",
    "shortlisted", "selected", "received", "sincerely", "regards", "congrats", "applied", "application",
    "received", "successful", "successfully", "shortlist", "interview", "scheduled",
    "invite", "invitation", "opportunity"
  ];
  
  const filteredWords = words.filter(word => {
    const lowerWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    return !ignoreList.includes(lowerWord);
  });
  
  let finalCompany = filteredWords.join(" ").trim();

  // Enforce known companies direct mapping
  const knownCompanies = ["google", "amazon", "microsoft", "stripe", "meta", "netflix", "duolingo", "apple", "airbnb", "atlassian", "adobe"];
  const lowerCompany = finalCompany.toLowerCase();
  for (const known of knownCompanies) {
    if (lowerCompany.includes(known)) {
      return known.charAt(0).toUpperCase() + known.slice(1);
    }
  }

  // Check if it's a full sentence or sentence fragment
  const sentenceWords = [
    "is", "has", "have", "been", "we", "you", "are", "was", "were", "successfully", 
    "received", "application", "your", "for", "with", "the", "that", "this", "our", "us", "to"
  ];
  const hasSentenceWord = sentenceWords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, "i");
    return regex.test(lowerCompany);
  });

  const wordCount = finalCompany.split(/\s+/).filter(w => w.length > 0).length;
  
  // If clean value is sentence-like or too long or empty, do the fallback check
  if (finalCompany.length < 2 || hasSentenceWord || wordCount > 3 || wordCount === 0 || finalCompany.toLowerCase() === "unknown company" || finalCompany.toLowerCase() === "not available") {
    // Run rule-based extraction
    const fallback = extractCompany(body, subject, senderEmail);
    if (fallback && fallback !== "Not available" && fallback !== "Unknown Company") {
      return fallback;
    }
    return "Unknown Company";
  }

  return finalCompany;
};

/**
 * Main wrapper calling Gemini Generative AI for structured analysis.
 */
export const analyzeEmailWithGemini = async (
  body: string,
  subject: string,
  apiKey?: string,
  senderEmail: string = ""
): Promise<AgentResponse> => {
  if (!apiKey) {
    return runLocalAnalysisSimulator(body, subject, senderEmail);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `You are CareerPilot AI, an expert career coordinator agent. Your job is to analyze the recruiter email provided and return a structured JSON response.
You must output a strict JSON object with this exact structure and no other text, comments, markdown, or code block markers:
{
  "company": "Company name (e.g., Google, Amazon, Stripe, Atlassian). Must contain ONLY the organization name, maximum 1-3 words. Remove prefix/suffix/qualifiers like: Dear name, Congratulations, has been selected, has been shortlisted, recruiting team, careers team, student programs team, talent acquisition team, HR team. Inspect domain names or signature lines contextually. If the company cannot be confidently detected, output 'Unknown Company'. Never output a full sentence.",
  "role": "Specific exact job role title (e.g. 'Software Engineering Intern', 'Software Engineer Intern', 'SDE Intern', 'Software Development Engineer Intern', 'Software Engineer'). Do not generalize or map to standard 'Software Engineer' if a more specific name is present in the subject or body. Preserve modifiers like Intern, Internship, Trainee, Associate, Junior, Senior. If the email is generic or has no real job role title, output 'Unknown / Recruitment Update'.",
  "status": "Must be classified strictly: OFFER | INTERVIEW | ASSESSMENT | REJECTED | PENDING | GENERAL UPDATE",
  "summary": "Concise 1-sentence summary of the email. You MUST use ONLY the cleaned company name. Never include raw suffix phrases like 'Dear name' or 'has been shortlisted' or 'Recruiting Team' in the summary.",
  "joiningDate": "For OFFER status, detect the joining date or start date (e.g., July 15, 2026). Format as a clean date string, or 'Not available' if missing.",
  "deadline": "For OFFER status, detect the offer acceptance deadline (e.g., July 20, 2026). Format as a clean date string, or 'Not available' if missing.",
  "assessmentDeadline": "For ASSESSMENT status, detect the deadline date (e.g., June 22, 2026) to complete the coding test or assessment. Format as a clean date string, or 'Not available' if missing.",
  "interviewDate": "For INTERVIEW status, detect the interview date or schedule date (e.g., June 25, 2026). Format as a clean date string, or 'Not available' if missing.",
  "recommendedAction": "Must match this exact wording based on status:
                         If status is INTERVIEW: 'Prepare DSA, projects, and interview concepts.'
                         If status is ASSESSMENT: 'Complete assessment before deadline and practice coding problems.'
                         If status is OFFER: 'Review offer details and complete onboarding steps.'
                         If status is REJECTED: 'Update status and continue applying.'
                         If status is PENDING: 'Monitor inbox regularly; follow up in 2 weeks if no update is received.'
                         Otherwise, write custom follow-up guidance.",
  "confidence": A confidence score float between 0.0 and 1.0 (e.g., 0.95) based on your classification accuracy
}

STRICT CLASSIFICATION PRIORITY RULES:
Analyze keywords in order of priority:
1. REJECTION: if email indicates rejection (keywords: reject, not selected, unable to proceed, unfortunately, regret to inform, unsuccessful, not moving forward).
2. OFFER: if email indicates job offer (keywords: offer letter, joining date, compensation, salary, selected for position, welcome aboard, we are pleased to offer, offer you the position, welcome to the team, internship/job offer). NEVER classify based on "Congratulations" alone. If it mentions an assessment or interview schedule, it is NOT an OFFER.
3. INTERVIEW: if email is an invitation to schedule/attend an interview (keywords: interview, technical round, HR round, discussion scheduled, interview scheduled, interview invitation, technical discussion, meeting link).
4. ASSESSMENT: if email invites or requests a test/assessment (keywords: assessment, coding test, online test, challenge, exam, hackerrank, coding round, coding test, online assessment, assignment).
5. PENDING (APPLIED): if email confirms application submission (keywords: application received, thank you for applying, application submitted, under review, reviewing applications).
6. GENERAL UPDATE: default category.

COMPANY EXTRACTION RULES:
- Company name should NEVER contain: is, has, scheduled, invited, received, completed, for, position, role.
- Company name must be ONLY the organization name (maximum 1-3 words).
- Extraction priority: 1. Sender organization/domain, 2. Email signature, 3. Explicit company mention, 4. Subject.

ROLE EXTRACTION RULES:
- Do not remove role modifiers like: Intern, Internship, Trainee, Associate, Junior, Senior. (e.g. 'Software Engineer Intern' must remain 'Software Engineer Intern').
- Reject fake roles from normal text (e.g., 'Hello Developer' should result in role 'Unknown / Recruitment Update').

NON-JOB EMAIL HANDLING:
- If email is a newsletter, community update, or has no hiring intent, classify as GENERAL UPDATE, set company to the sender organization/domain, and set role to 'Recruitment Update' if no other role can be extracted, or ignore/filter out.
`;

    const userPrompt = `Subject: ${subject}\n\nBody:\n${body}`;

    const result = await model.generateContent([systemPrompt, userPrompt]);
    const responseText = result.response.text().trim();

    const parsed = parseAndValidateResponse(responseText, body, subject, senderEmail);

    console.log("RAW GEMINI RESPONSE:", responseText);
    console.log("EXTRACTED DATES:", {
      joiningDate: parsed.joiningDate,
      interviewDate: parsed.interviewDate,
      assessmentDeadline: parsed.assessmentDeadline,
      deadline: parsed.deadline
    });

    return parsed;
  } catch (error) {
    console.error("Gemini API execution error, falling back to local analysis:", error);
    return runLocalAnalysisSimulator(body, subject, senderEmail);
  }
};

/**
 * Robust JSON extraction and validation parser
 */
function parseAndValidateResponse(
  text: string,
  originalBody: string,
  originalSubject: string,
  senderEmail: string = ""
): AgentResponse {
  try {
    let cleaned = text;
    if (cleaned.includes("```")) {
      const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
      if (match && match[1]) {
        cleaned = match[1].trim();
      }
    }
    
    const data = JSON.parse(cleaned);

    const validStatuses = ["OFFER", "INTERVIEW", "ASSESSMENT", "REJECTED", "PENDING", "GENERAL UPDATE"];
    let status: AgentResponse["status"] = "PENDING";
    if (typeof data.status === "string") {
      const upperStatus = data.status.toUpperCase();
      if (validStatuses.includes(upperStatus)) {
        status = upperStatus as AgentResponse["status"];
      }
    }

    const rawCompany = typeof data.company === "string" ? data.company : "Unknown Company";
    const company = cleanupCompanyName(rawCompany, originalBody, originalSubject, senderEmail);
    const role = typeof data.role === "string" && data.role ? data.role : "Software Engineer";
    
    const summary = cleanSummaryText(typeof data.summary === "string" ? data.summary : "No summary available", company, rawCompany);

    // Resolve dateType and dateValue contextually without guessing
    const cleanDateVal = (val: any) => typeof val === "string" && val.trim() !== "" && val.trim().toLowerCase() !== "not available" && val.trim().toLowerCase() !== "null" ? val.trim() : "";

    let deadDate = "Not available";
    let intDate = "Not available";
    let joinDate = "Not available";
    let deadline = "Not available";

    if (status === "OFFER") {
      joinDate = cleanDateVal(data.joiningDate) || extractDateForStatus(originalBody, "OFFER");
      deadline = cleanDateVal(data.deadline) || cleanDateVal(data.deadlineDate) || extractDateForStatus(originalBody, "OFFER_DEADLINE");
    } else if (status === "INTERVIEW") {
      intDate = cleanDateVal(data.interviewDate) || extractDateForStatus(originalBody, "INTERVIEW");
    } else if (status === "ASSESSMENT") {
      deadDate = cleanDateVal(data.deadlineDate) || cleanDateVal(data.assessmentDeadline) || extractDateForStatus(originalBody, "ASSESSMENT");
    } else {
      deadDate = cleanDateVal(data.deadlineDate) || cleanDateVal(data.assessmentDeadline) || extractDateForStatus(originalBody, "ASSESSMENT");
      intDate = cleanDateVal(data.interviewDate) || extractDateForStatus(originalBody, "INTERVIEW");
      joinDate = cleanDateVal(data.joiningDate) || extractDateForStatus(originalBody, "OFFER");
    }

    let dateType = "Not available";
    let dateValue = "Not available";

    if (status === "INTERVIEW") {
      dateType = "Interview Date";
      dateValue = intDate !== "Not available" ? intDate : "Not available";
    } else if (status === "ASSESSMENT") {
      dateType = "Assessment Deadline";
      dateValue = deadDate !== "Not available" ? deadDate : "Not available";
    } else if (status === "OFFER") {
      dateType = "Joining Date";
      dateValue = joinDate !== "Not available" ? joinDate : "Not available";
    } else {
      dateType = deadDate !== "Not available" ? "Deadline" : (intDate !== "Not available" ? "Interview Date" : (joinDate !== "Not available" ? "Joining Date" : "Not available"));
      dateValue = deadDate !== "Not available" ? deadDate : (intDate !== "Not available" ? intDate : (joinDate !== "Not available" ? joinDate : "Not available"));
    }

    const recommendedAction = typeof data.recommendedAction === "string" ? data.recommendedAction : "Review email contents.";
    const confidence = typeof data.confidence === "number" ? data.confidence : (typeof data.confidence === "string" ? parseFloat(data.confidence) || 0.85 : 0.85);

    return {
      company,
      role,
      status,
      joiningDate: joinDate || "Not available",
      interviewDate: intDate || "Not available",
      assessmentDeadline: deadDate || "Not available",
      deadline: deadline || "Not available",
      date: {
        type: dateType,
        value: dateValue
      },
      summary,
      nextAction: recommendedAction,
      confidence
    };
  } catch (err) {
    console.warn("Failed to parse JSON, falling back...", err);
    try {
      const jsonBlock = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
      if (jsonBlock) {
        const data = JSON.parse(jsonBlock);
        
        const validStatuses = ["OFFER", "INTERVIEW", "ASSESSMENT", "REJECTED", "PENDING", "GENERAL UPDATE"];
        let status: AgentResponse["status"] = "PENDING";
        if (data.status) {
          const upperStatus = String(data.status).toUpperCase();
          if (validStatuses.includes(upperStatus)) {
            status = upperStatus as AgentResponse["status"];
          }
        }

        const rawCompany = data.company || "Unknown Company";
        const company = cleanupCompanyName(rawCompany, originalBody, originalSubject, senderEmail);
        const role = data.role || "Software Engineer";
        
        const summary = cleanSummaryText(data.summary || "Summary extracted.", company, rawCompany);

        let dateType = "Not available";
        let dateValue = "Not available";

        const cleanDateVal = (val: any) => typeof val === "string" && val.trim() !== "" && val.trim().toLowerCase() !== "not available" && val.trim().toLowerCase() !== "null" ? val.trim() : "";

        let deadDate = "Not available";
        let intDate = "Not available";
        let joinDate = "Not available";
        let deadline = "Not available";

        if (status === "OFFER") {
          joinDate = cleanDateVal(data.joiningDate) || extractDateForStatus(originalBody, "OFFER");
          deadline = cleanDateVal(data.deadline) || cleanDateVal(data.deadlineDate) || extractDateForStatus(originalBody, "OFFER_DEADLINE");
        } else if (status === "INTERVIEW") {
          intDate = cleanDateVal(data.interviewDate) || extractDateForStatus(originalBody, "INTERVIEW");
        } else if (status === "ASSESSMENT") {
          deadDate = cleanDateVal(data.deadlineDate) || cleanDateVal(data.assessmentDeadline) || extractDateForStatus(originalBody, "ASSESSMENT");
        } else {
          deadDate = cleanDateVal(data.deadlineDate) || cleanDateVal(data.assessmentDeadline) || extractDateForStatus(originalBody, "ASSESSMENT");
          intDate = cleanDateVal(data.interviewDate) || extractDateForStatus(originalBody, "INTERVIEW");
          joinDate = cleanDateVal(data.joiningDate) || extractDateForStatus(originalBody, "OFFER");
        }

        if (status === "INTERVIEW") {
          dateType = "Interview Date";
          dateValue = intDate || "Not available";
        } else if (status === "ASSESSMENT") {
          dateType = "Assessment Deadline";
          dateValue = deadDate || "Not available";
        } else if (status === "OFFER") {
          dateType = "Joining Date";
          dateValue = joinDate || "Not available";
        } else {
          dateType = deadDate ? "Deadline" : (intDate ? "Interview Date" : (joinDate ? "Joining Date" : "Not available"));
          dateValue = deadDate || intDate || joinDate || "Not available";
        }

        const recommendedAction = data.recommendedAction || "Process email.";
        const confidence = typeof data.confidence === "number" ? data.confidence : 0.8;

        return {
          company,
          role,
          status,
          joiningDate: joinDate || "Not available",
          interviewDate: intDate || "Not available",
          assessmentDeadline: deadDate || "Not available",
          deadline: deadline || "Not available",
          date: {
            type: dateType,
            value: dateValue
          },
          summary,
          nextAction: recommendedAction,
          confidence
        };
      }
    } catch (_) {
      // Ignored
    }

    return runLocalAnalysisSimulator(originalBody, originalSubject, senderEmail);
  }
}
