import React, { createContext, useContext, useState, useEffect } from "react";
import type { AgentResponse } from "../tools/geminiClient";
import { cleanupCompanyName, cleanSummaryText } from "../tools/geminiClient";
import { AgentSystem } from "../agents/AgentSystem";
import type { AgentSystemTelemetry } from "../agents/AgentSystem";
import { fetchEmails, SAMPLE_EMAILS } from "../tools/emailTool";
import type { EmailMessage } from "../tools/emailTool";
import { connectGmail, fetchGmailEmails } from "../tools/gmailService";

export interface TimelineEvent {
  id: string;
  gmailMessageId: string;
  threadId: string;
  emailFingerprint: string;
  eventType: string; // e.g., "OFFER", "INTERVIEW", "ASSESSMENT", "PENDING", "REJECTED", "GENERAL UPDATE"
  subject: string;
  sender: string;
  receivedDate: string;
  extractedDate: string;
  summary: string;
  originalEmail: string; // Recruiter email body
  source: string; // "Gmail/Gemini", "Manual Entry", etc.
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  currentStatus: AgentResponse["status"];
  latestUpdate: string;
  lastActivityDate: string;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
  emailReceivedDate: string;

  identifiers: {
    threadIds: string[];
    gmailMessageIds: string[];
    emailFingerprints: string[];
  };

  timeline: TimelineEvent[];

  // Backwards compatibility fields
  status: AgentResponse["status"];
  summary: string;
  joiningDate?: string;
  interviewDate?: string;
  assessmentDeadline?: string;
  deadline?: string;
  date: {
    type: string;
    value: string;
  };
  nextAction: string;
  dateAdded: string;
  confidence: number;
  emailFingerprint?: string;
  gmailMessageId?: string;
  originalEmail?: {
    from: string;
    subject: string;
    body: string;
    receivedDate: string;
  };
  mode?: string;
  location?: string;
  source?: string;
}

export interface EvaluationReport {
  id: string;
  name: string;
  expectedStatus: string;
  actualStatus: string;
  expectedCompany: string;
  actualCompany: string;
  statusMatch: boolean;
  companyMatch: boolean;
  passed: boolean;
  latencyMs: number;
}

interface AppContextType {
  applications: JobApplication[];
  activityLogs: AgentSystemTelemetry[];
  emails: EmailMessage[];
  apiKey: string;
  isProcessing: boolean;
  evaluations: EvaluationReport[];
  isEvaluating: boolean;
  setApiKey: (key: string) => void;
  processEmailText: (body: string, subject: string, senderEmail?: string, gmailMessageId?: string, customSource?: string) => Promise<AgentSystemTelemetry>;
  demoMode: boolean;
  enableDemoMode: () => Promise<void>;
  disableDemoMode: () => void;
  addManualApplication: (app: Omit<JobApplication, "id" | "dateAdded" | "confidence" | "currentStatus" | "latestUpdate" | "lastActivityDate" | "isStarred" | "identifiers" | "timeline" | "createdAt" | "updatedAt" | "emailReceivedDate">) => void;
  deleteApplication: (id: string) => void;
  updateApplicationStatus: (id: string, status: JobApplication["status"]) => void;
  toggleStarApplication: (id: string) => void;
  cleanupOldApplications: (months: number, keepStarred: boolean) => void;
  runSystemEvaluations: () => Promise<void>;
  clearLogs: () => void;
  currentView: string;
  setView: (view: string) => void;
  selectedAppId: string | null;
  setSelectedAppId: (id: string | null) => void;
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  profileManuallySaved: boolean;
  setProfileManuallySaved: (saved: boolean) => void;
  gmailProfileEmail: string;
  setGmailProfileEmail: (email: string) => void;
  displayName: string;
  displayEmail: string;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  gmailConnected: boolean;
  setGmailConnected: (connected: boolean) => void;
  careerGoal: string;
  setCareerGoal: (goal: string) => void;
  preferredRoles: string;
  setPreferredRoles: (roles: string) => void;
  jobSearchStatus: string;
  setJobSearchStatus: (status: string) => void;
  gmailAccessToken: string;
  gmailProfileName: string;
  gmailProfileImage: string;
  gmailLastSync: string;
  connectGmailAccount: () => Promise<any>;
  disconnectGmailAccount: () => void;
  scanGmailWithGemini: (limit?: number) => Promise<{ fetched: number; processed: number; newEmailsProcessed: number; existingRecordsUpdated: number; duplicatesSkipped: number; opportunities: JobApplication[] }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PRE_POPULATED_APPS: JobApplication[] = [];

const DEMO_EMAILS = [
  {
    id: "demo_google",
    senderEmail: "recruiting@google.com",
    subject: "Your application to Google: Software Engineer",
    body: "Hi Candidate, thank you for your application for the Software Engineer role at Google. We have received your application and our team is currently reviewing it. We will be in touch if your background matches our needs. Best, Google Recruiting Team.",
  },
  {
    id: "demo_amazon",
    senderEmail: "no-reply@amazon.com",
    subject: "Amazon Coding Assessment Invitation - Software Engineering Intern",
    body: "Thank you for applying to Amazon. We would like to invite you to complete our Online Coding Assessment. The test contains coding problems and a work simulation. Please complete it by June 28, 2026. Good luck!",
  },
  {
    id: "demo_nvidia",
    senderEmail: "careers@nvidia.com",
    subject: "Interview Invitation: NVIDIA ASIC Engineer Role",
    body: "Dear candidate, we would like to schedule a technical interview with you for the ASIC Engineer position at NVIDIA. The 45-minute discussion will be held on July 10, 2026 over Zoom. Please click here to confirm your details.",
  },
  {
    id: "demo_microsoft",
    senderEmail: "offers@microsoft.com",
    subject: "Job Offer from Microsoft!",
    body: "Dear candidate, we are absolutely thrilled to offer you the position of Frontend Engineer at Microsoft. The start date will be August 1, 2026. Please find details of your salary, benefits, and equity in the attached offer letter.",
  },
  {
    id: "demo_meta",
    senderEmail: "recruiting@meta.com",
    subject: "Your application to Meta",
    body: "Thank you for your interest in the Product Manager position at Meta. We appreciated the opportunity to speak with you. Unfortunately, we are not moving forward with your application at this time. We wish you the best in your search.",
  }
];

const getStringHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

export const generateEmailFingerprint = (subject: string, sender: string, date: string, body: string): string => {
  const clean = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
  return `${clean(subject)}|||${clean(sender)}|||${clean(date)}|||${getStringHash(clean(body))}`;
};

export const canUpdateStatus = (currentStatus: string, newStatus: string): boolean => {
  const priority: Record<string, number> = {
    "OFFER": 5,
    "INTERVIEW": 4,
    "ASSESSMENT": 3,
    "APPLIED": 2,
    "PENDING": 2,
    "GENERAL UPDATE": 2,
    "REJECTED": 1
  };
  
  if (currentStatus === newStatus) return false;
  
  const currentRank = priority[currentStatus] || 0;
  const newRank = priority[newStatus] || 0;

  if (newStatus === "REJECTED") {
    return currentStatus !== "OFFER";
  }
  
  if (currentStatus === "REJECTED") {
    return newStatus === "OFFER" || newStatus === "INTERVIEW" || newStatus === "ASSESSMENT";
  }

  return newRank >= currentRank;
};

export const parseDate = (dStr: string | undefined): number => {
  if (!dStr || dStr === "Not available" || dStr.trim() === "") return 0;
  const time = new Date(dStr).getTime();
  return isNaN(time) ? 0 : time;
};

export const sortApplications = (apps: JobApplication[]): JobApplication[] => {
  return [...apps].sort((a, b) => {
    const dateA = parseDate(a.emailReceivedDate);
    const dateB = parseDate(b.emailReceivedDate);
    
    if (dateA !== dateB) {
      return dateB - dateA; // Newest first
    }
    
    const updateA = parseDate(a.updatedAt);
    const updateB = parseDate(b.updatedAt);
    return updateB - updateA; // Newest first
  });
};

export const normalizeCompanyForMatching = (c: string): string => {
  let cleaned = (c || "").toLowerCase().trim();
  cleaned = cleaned.replace(/\b(is scheduled|has been scheduled|recruiting team|hiring team)\b/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleanupCompanyName(cleaned).toLowerCase().trim();
};

export const isCompanyMatch = (c1: string, c2: string): boolean => {
  const norm1 = normalizeCompanyForMatching(c1);
  const norm2 = normalizeCompanyForMatching(c2);
  return norm1 === norm2;
};

export const isRoleMatch = (r1: string, r2: string): boolean => {
  const clean = (s: string) => {
    let val = (s || "").toLowerCase().trim();
    if (val === "swe" || val === "sde") return "software engineer";
    if (val === "swe intern" || val === "sde intern") return "software engineer intern";
    return val.replace(/[^a-z0-9]/g, "");
  };
  return clean(r1) === clean(r2);
};

export const migrateApplications = (apps: any[]): JobApplication[] => {
  if (!Array.isArray(apps)) return [];
  return apps.map((app) => {
    const createdAt = app.createdAt || app.dateAdded || new Date().toISOString();
    const updatedAt = app.updatedAt || new Date().toISOString();

    let emailReceivedDate = app.emailReceivedDate || app.lastActivityDate;
    if (!emailReceivedDate && app.timeline && app.timeline.length > 0) {
      const sortedEvents = [...app.timeline].sort((evtA, evtB) => {
        return parseDate(evtB.receivedDate) - parseDate(evtA.receivedDate);
      });
      if (sortedEvents[0]) {
        emailReceivedDate = sortedEvents[0].receivedDate;
      }
    }
    if (!emailReceivedDate && app.originalEmail?.receivedDate) {
      emailReceivedDate = app.originalEmail.receivedDate;
    }
    if (!emailReceivedDate) {
      emailReceivedDate = new Date().toISOString();
    }

    if (app && app.timeline && app.identifiers) {
      return {
        ...app,
        currentStatus: app.currentStatus || app.status || "PENDING",
        status: app.currentStatus || app.status || "PENDING",
        isStarred: !!app.isStarred,
        createdAt,
        updatedAt,
        emailReceivedDate
      };
    }
    
    const dateValue = app.date?.value || "Not available";
    const receivedDate = emailReceivedDate;
    const emailBody = app.originalEmail?.body || app.summary || "No body content.";
    const subject = app.originalEmail?.subject || `Application Status - ${app.role}`;
    const sender = app.originalEmail?.from || `${app.company} Careers`;

    const fingerprint = app.emailFingerprint || generateEmailFingerprint(
      subject,
      sender,
      receivedDate,
      emailBody
    );

    const firstEvent: TimelineEvent = {
      id: "evt_" + Math.random().toString(36).substr(2, 9),
      gmailMessageId: app.gmailMessageId || "",
      threadId: "",
      emailFingerprint: fingerprint,
      eventType: app.status || "PENDING",
      subject: subject,
      sender: sender,
      receivedDate: receivedDate,
      extractedDate: dateValue,
      summary: app.summary || "",
      originalEmail: emailBody,
      source: app.source || "Manual Entry"
    };

    return {
      ...app,
      currentStatus: app.status || "PENDING",
      status: app.status || "PENDING",
      latestUpdate: subject,
      lastActivityDate: receivedDate,
      isStarred: !!app.isStarred,
      createdAt,
      updatedAt,
      emailReceivedDate,
      identifiers: {
        threadIds: [],
        gmailMessageIds: app.gmailMessageId ? [app.gmailMessageId] : [],
        emailFingerprints: [fingerprint]
      },
      timeline: [firstEvent]
    };
  });
};


const inferEmailMetaData = (body: string, subject: string, senderEmail: string, company: string) => {
  const text = (subject + " " + body).toLowerCase();
  
  let mode = "Online";
  if (text.includes("in-person") || text.includes("on-site") || text.includes("office") || text.includes("onsite")) {
    mode = "In-Person";
  } else if (text.includes("hybrid")) {
    mode = "Hybrid";
  }
  
  let location = "Remote";
  if (mode === "In-Person") {
    if (text.includes("san francisco") || text.includes("sf")) {
      location = "San Francisco, CA";
    } else if (text.includes("new york") || text.includes("nyc")) {
      location = "New York, NY";
    } else if (text.includes("seattle")) {
      location = "Seattle, WA";
    } else if (text.includes("london")) {
      location = "London, UK";
    } else {
      location = "On-site";
    }
  } else if (text.includes("remote")) {
    location = "Remote";
  }
  
  const matchedSample = SAMPLE_EMAILS.find(e => e.senderEmail === senderEmail || (senderEmail && e.senderEmail.toLowerCase().includes(senderEmail.toLowerCase())));
  const from = matchedSample 
    ? `${matchedSample.sender} <${matchedSample.senderEmail}>` 
    : (senderEmail ? `${company} Careers <${senderEmail}>` : `${company} Careers <recruiter@${company.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com>`);
    
  const receivedDate = matchedSample 
    ? new Date(matchedSample.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) 
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    
  return {
    mode,
    location,
    source: "CareerPilot/Gmail",
    originalEmail: {
      from,
      subject: subject || `Career Opportunity Update from ${company}`,
      body,
      receivedDate
    }
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [applications, setApplications] = useState<JobApplication[]>(() => {
    const saved = localStorage.getItem("hiretrack_apps");
    const parsed = saved ? JSON.parse(saved) : PRE_POPULATED_APPS;
    return migrateApplications(parsed);
  });

  const [activityLogs, setActivityLogs] = useState<AgentSystemTelemetry[]>(() => {
    const saved = localStorage.getItem("hiretrack_logs");
    return saved ? JSON.parse(saved) : [];
  });

  const [apiKey, setApiKeyInternal] = useState<string>(() => {
    const saved = localStorage.getItem("hiretrack_api_key");
    if (saved) return saved;
    return import.meta.env.VITE_GEMINI_API_KEY || "";
  });

  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [evaluations, setEvaluations] = useState<EvaluationReport[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [currentView, setView] = useState<string>("landing");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const [userName, setUserName] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_username");
    return saved || "";
  });

  const [userEmail, setUserEmail] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_useremail");
    return saved || "";
  });

  const [profileManuallySaved, setProfileManuallySaved] = useState<boolean>(() => {
    return localStorage.getItem("careerpilot_profile_manually_saved") === "true";
  });

  const [gmailProfileEmail, setGmailProfileEmail] = useState<string>(() => {
    return localStorage.getItem("careerpilot_gmail_profile_email") || "";
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_selectedmodel");
    return saved || "gemini-1.5-flash";
  });

  const [gmailConnected, setGmailConnected] = useState<boolean>(() => {
    const saved = localStorage.getItem("careerpilot_gmailconnected");
    return saved ? JSON.parse(saved) : false;
  });

  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("careerpilot_demomode");
    return saved === "true";
  });

  const [careerGoal, setCareerGoal] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_careergoal");
    return saved || "Software Engineer";
  });

  const [preferredRoles, setPreferredRoles] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_preferredroles");
    return saved || "Backend, Full Stack, AI Engineer";
  });

  const [jobSearchStatus, setJobSearchStatus] = useState<string>(() => {
    const saved = localStorage.getItem("careerpilot_jobsearchstatus");
    return saved || "Actively Applying";
  });

  const [gmailAccessToken, setGmailAccessToken] = useState<string>(() => {
    return localStorage.getItem("careerpilot_gmail_token") || "";
  });

  const [gmailProfileName, setGmailProfileName] = useState<string>(() => {
    return localStorage.getItem("careerpilot_gmail_profile_name") || "";
  });

  const [gmailProfileImage, setGmailProfileImage] = useState<string>(() => {
    return localStorage.getItem("careerpilot_gmail_profile_image") || "";
  });

  const [gmailLastSync, setGmailLastSync] = useState<string>(() => {
    return localStorage.getItem("careerpilot_gmail_last_sync") || "";
  });

  const agentSystem = new AgentSystem();

  // Computed dynamic profile values based on priority rules
  const displayName = (() => {
    if (profileManuallySaved && userName) {
      return userName;
    }
    if (gmailConnected && gmailProfileName) {
      return gmailProfileName;
    }
    if (demoMode) {
      return "Demo User";
    }
    return "";
  })();

  const displayEmail = (() => {
    if (profileManuallySaved && userEmail) {
      return userEmail;
    }
    if (gmailConnected && gmailProfileEmail) {
      return gmailProfileEmail;
    }
    if (demoMode) {
      return "demo@careerpilot.ai";
    }
    return "";
  })();

  useEffect(() => {
    localStorage.setItem("hiretrack_apps", JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem("hiretrack_logs", JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem("hiretrack_api_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("careerpilot_username", userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("careerpilot_useremail", userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem("careerpilot_profile_manually_saved", String(profileManuallySaved));
  }, [profileManuallySaved]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmail_profile_email", gmailProfileEmail);
  }, [gmailProfileEmail]);

  useEffect(() => {
    localStorage.setItem("careerpilot_selectedmodel", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmailconnected", JSON.stringify(gmailConnected));
  }, [gmailConnected]);

  useEffect(() => {
    localStorage.setItem("careerpilot_careergoal", careerGoal);
  }, [careerGoal]);

  useEffect(() => {
    localStorage.setItem("careerpilot_preferredroles", preferredRoles);
  }, [preferredRoles]);

  useEffect(() => {
    localStorage.setItem("careerpilot_jobsearchstatus", jobSearchStatus);
  }, [jobSearchStatus]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmail_token", gmailAccessToken);
  }, [gmailAccessToken]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmail_profile_name", gmailProfileName);
  }, [gmailProfileName]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmail_profile_image", gmailProfileImage);
  }, [gmailProfileImage]);

  useEffect(() => {
    localStorage.setItem("careerpilot_gmail_last_sync", gmailLastSync);
  }, [gmailLastSync]);

  useEffect(() => {
    localStorage.setItem("careerpilot_demomode", String(demoMode));
  }, [demoMode]);

  useEffect(() => {
    const getEmails = async () => {
      const data = await fetchEmails();
      setEmails(data);
    };
    getEmails();
  }, []);

  const setApiKey = (key: string) => {
    setApiKeyInternal(key);
  };

  const processEmailText = async (body: string, subject: string, senderEmail: string = "", gmailMessageId?: string, customSource?: string): Promise<AgentSystemTelemetry> => {
    setIsProcessing(true);
    try {
      const telemetry = await agentSystem.processEmail(body, subject, apiKey, senderEmail);
      
      const receivedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const fingerprint = generateEmailFingerprint(subject, senderEmail, receivedDate, body);
      
      let isDuplicate = false;
      if (gmailMessageId) {
        isDuplicate = applications.some((app) => app.identifiers.gmailMessageIds.includes(gmailMessageId));
      }
      if (!isDuplicate) {
        isDuplicate = applications.some((app) => app.identifiers.emailFingerprints.includes(fingerprint));
      }
      telemetry.isDuplicateUpdate = isDuplicate;

      telemetry.checks = {
        messageIdChecked: true,
        duplicateScanCompleted: true,
        existingAppDetected: false,
        timelineUpdated: false
      };

      if (isDuplicate) {
        telemetry.logs.push(`[Agent Orchestrator] Duplicate email ignored. Message ID: ${gmailMessageId || "N/A"}`);
        return telemetry;
      }

      if (telemetry.isJobRelated && telemetry.result) {
        const res = telemetry.result;
        res.company = cleanupCompanyName(res.company, body, subject, senderEmail);
        res.summary = cleanSummaryText(res.summary, res.company, res.company);
        
        const meta = inferEmailMetaData(body, subject, senderEmail, res.company);

        const extractedDate = res.status === "OFFER" ? (res.joiningDate || "Not available")
          : res.status === "INTERVIEW" ? (res.interviewDate || "Not available")
          : res.status === "ASSESSMENT" ? (res.assessmentDeadline || "Not available")
          : "Not available";

        const newEvent: TimelineEvent = {
          id: "evt_" + Math.random().toString(36).substr(2, 9),
          gmailMessageId: gmailMessageId || "",
          threadId: "",
          emailFingerprint: fingerprint,
          eventType: res.status,
          subject: subject || `Application Status Update`,
          sender: meta.originalEmail.from,
          receivedDate: meta.originalEmail.receivedDate,
          extractedDate: extractedDate,
          summary: res.summary,
          originalEmail: body,
          source: customSource || "Manual paste"
        };
        
        setApplications((prev) => {
          let existingIndex = prev.findIndex((app) => {
            const isCompMatch = isCompanyMatch(app.company, res.company);
            const isRoleM = isRoleMatch(app.role, res.role);
            return isCompMatch && isRoleM;
          });

          if (existingIndex >= 0) {
            const existingApp = prev[existingIndex];
            telemetry.checks!.existingAppDetected = true;
            telemetry.checks!.timelineUpdated = true;

            const oldStatus = existingApp.currentStatus;
            const newStatus = res.status;
            let statusProgressionText = "";
            let updatedStatus = oldStatus;

            if (canUpdateStatus(oldStatus, newStatus)) {
              updatedStatus = newStatus;
              statusProgressionText = `${oldStatus} → ${newStatus}`;
              telemetry.checks!.statusProgressed = statusProgressionText;
            }

            const getMergedDate = (newVal: string | undefined, oldVal: string | undefined): string => {
              if (!newVal || newVal === "Not available" || newVal.trim() === "") {
                return oldVal || "Not available";
              }
              return newVal;
            };

            const mergedJoiningDate = getMergedDate(res.joiningDate, existingApp.joiningDate);
            const mergedInterviewDate = getMergedDate(res.interviewDate, existingApp.interviewDate);
            const mergedAssessmentDeadline = getMergedDate(res.assessmentDeadline, existingApp.assessmentDeadline);
            const mergedDeadline = getMergedDate(res.deadline, existingApp.deadline);

            let finalDateType = existingApp.date.type;
            let finalDateValue = existingApp.date.value;

            if (updatedStatus === "OFFER") {
              finalDateType = "Joining Date";
              finalDateValue = mergedJoiningDate;
            } else if (updatedStatus === "INTERVIEW") {
              finalDateType = "Interview Date";
              finalDateValue = mergedInterviewDate;
            } else if (updatedStatus === "ASSESSMENT") {
              finalDateType = "Assessment Deadline";
              finalDateValue = mergedAssessmentDeadline;
            }

            const updatedApp: JobApplication = {
              ...existingApp,
              currentStatus: updatedStatus,
              status: updatedStatus,
              summary: res.summary,
              joiningDate: mergedJoiningDate,
              interviewDate: mergedInterviewDate,
              assessmentDeadline: mergedAssessmentDeadline,
              deadline: mergedDeadline,
              date: {
                type: finalDateType,
                value: finalDateValue
              },
              nextAction: res.nextAction,
              confidence: res.confidence,
              lastActivityDate: meta.originalEmail.receivedDate,
              latestUpdate: subject || `Status: ${updatedStatus}`,
              identifiers: {
                threadIds: existingApp.identifiers.threadIds,
                gmailMessageIds: gmailMessageId && !existingApp.identifiers.gmailMessageIds.includes(gmailMessageId)
                  ? [...existingApp.identifiers.gmailMessageIds, gmailMessageId]
                  : existingApp.identifiers.gmailMessageIds,
                emailFingerprints: !existingApp.identifiers.emailFingerprints.includes(fingerprint)
                  ? [...existingApp.identifiers.emailFingerprints, fingerprint]
                  : existingApp.identifiers.emailFingerprints
              },
              timeline: [...existingApp.timeline, newEvent],
              updatedAt: new Date().toISOString(),
              emailReceivedDate: meta.originalEmail.receivedDate
            };
            const newApps = [...prev];
            newApps[existingIndex] = updatedApp;
            return newApps;
          } else {
            telemetry.checks!.existingAppDetected = false;
            telemetry.checks!.timelineUpdated = true;

            const newApp: JobApplication = {
              id: "app_" + Math.random().toString(36).substr(2, 9),
              company: res.company,
              role: res.role,
              currentStatus: res.status,
              status: res.status,
              summary: res.summary,
              joiningDate: res.joiningDate || "Not available",
              interviewDate: res.interviewDate || "Not available",
              assessmentDeadline: res.assessmentDeadline || "Not available",
              deadline: res.deadline || "Not available",
              date: res.date,
              nextAction: res.nextAction,
              dateAdded: new Date().toISOString().split("T")[0],
              confidence: res.confidence,
              mode: meta.mode,
              location: meta.location,
              source: customSource || meta.source,
              latestUpdate: subject || `Status: ${res.status}`,
              lastActivityDate: meta.originalEmail.receivedDate,
              isStarred: false,
              identifiers: {
                threadIds: [],
                gmailMessageIds: gmailMessageId ? [gmailMessageId] : [],
                emailFingerprints: [fingerprint]
              },
              timeline: [newEvent],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              emailReceivedDate: meta.originalEmail.receivedDate
            };
            return [newApp, ...prev];
          }
        });
      }

      return telemetry;
    } finally {
      setIsProcessing(false);
    }
  };

  const addManualApplication = (app: Omit<JobApplication, "id" | "dateAdded" | "confidence" | "currentStatus" | "latestUpdate" | "lastActivityDate" | "isStarred" | "identifiers" | "timeline" | "createdAt" | "updatedAt" | "emailReceivedDate">) => {
    const cleanedCompany = cleanupCompanyName(app.company);
    const cleanedSummary = cleanSummaryText(app.summary || "Manually added application.", cleanedCompany, app.company);
    const joiningDate = app.date.type === "Joining Date" ? app.date.value : "Not available";
    const interviewDate = app.date.type === "Interview Date" ? app.date.value : "Not available";
    const assessmentDeadline = app.date.type === "Assessment Deadline" ? app.date.value : "Not available";
    const receivedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const manualEvent: TimelineEvent = {
      id: "evt_" + Math.random().toString(36).substr(2, 9),
      gmailMessageId: "",
      threadId: "",
      emailFingerprint: "",
      eventType: app.status,
      subject: `Application Status - ${app.role}`,
      sender: `Recruiter <recruiter@${cleanedCompany.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com>`,
      receivedDate: receivedDate,
      extractedDate: app.date.value || "Not available",
      summary: cleanedSummary,
      originalEmail: `No original email captured. This opportunity was tracked manually. \n\nDirect summary context: ${cleanedSummary}`,
      source: "Manual Entry"
    };

    const newApp: JobApplication = {
      company: cleanedCompany,
      role: app.role,
      status: app.status,
      summary: cleanedSummary,
      joiningDate,
      interviewDate,
      assessmentDeadline,
      deadline: "Not available",
      date: app.date,
      nextAction: app.nextAction,
      id: "app_" + Math.random().toString(36).substr(2, 9),
      dateAdded: new Date().toISOString().split("T")[0],
      confidence: 1.0,
      mode: app.date.type === "Interview Date" || app.date.type === "Assessment Deadline" ? "Online" : "Remote",
      location: "Remote",
      source: "Manual Entry",
      currentStatus: app.status,
      latestUpdate: `Application manually tracked`,
      lastActivityDate: receivedDate,
      isStarred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailReceivedDate: receivedDate,
      identifiers: {
        threadIds: [],
        gmailMessageIds: [],
        emailFingerprints: []
      },
      timeline: [manualEvent]
    };
    setApplications((prev) => [newApp, ...prev]);
  };

  const deleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
  };

  const updateApplicationStatus = (id: string, status: JobApplication["status"]) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          let newDateType = app.date.type;
          let newNextAction = app.nextAction;

          if (status === "ASSESSMENT") {
            newDateType = "Assessment Deadline";
            newNextAction = "Complete assessment before deadline and practice coding problems.";
          } else if (status === "INTERVIEW") {
            newDateType = "Interview Date";
            newNextAction = "Prepare DSA, projects, and interview concepts.";
          } else if (status === "OFFER") {
            newDateType = "Joining Date";
            newNextAction = "Review offer details and complete onboarding steps.";
          } else if (status === "REJECTED") {
            newDateType = "Not available";
            newNextAction = "Update status and continue applying.";
          }

          let newDateValue = app.date.value;
          if (status === "OFFER" && app.joiningDate && app.joiningDate !== "Not available") {
            newDateValue = app.joiningDate;
          } else if (status === "INTERVIEW" && app.interviewDate && app.interviewDate !== "Not available") {
            newDateValue = app.interviewDate;
          } else if (status === "ASSESSMENT" && app.assessmentDeadline && app.assessmentDeadline !== "Not available") {
            newDateValue = app.assessmentDeadline;
          }

          const receivedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          
          const newEvent: TimelineEvent = {
            id: "evt_" + Math.random().toString(36).substr(2, 9),
            gmailMessageId: "",
            threadId: "",
            emailFingerprint: "",
            eventType: status,
            subject: `Status manually updated to ${status}`,
            sender: "User",
            receivedDate: receivedDate,
            extractedDate: newDateValue || "Not available",
            summary: `Application status manually changed to ${status}.`,
            originalEmail: `Application status was manually updated to ${status} by the user.`,
            source: "Manual Entry"
          };

          return { 
            ...app, 
            status,
            currentStatus: status,
            date: {
              type: newDateType,
              value: newDateValue
            },
            nextAction: newNextAction,
            lastActivityDate: receivedDate,
            latestUpdate: `Status manually updated to ${status}`,
            timeline: [...app.timeline, newEvent],
            updatedAt: new Date().toISOString(),
            emailReceivedDate: receivedDate
          };
        }
        return app;
      })
    );
  };

  const toggleStarApplication = (id: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, isStarred: !app.isStarred } : app))
    );
  };

  const cleanupOldApplications = (months: number, keepStarred: boolean) => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    setApplications((prev) =>
      prev.filter((app) => {
        const appDate = new Date(app.dateAdded || app.lastActivityDate || new Date());
        const isOld = appDate < cutoffDate;
        if (isOld) {
          if (keepStarred && app.isStarred) {
            return true;
          }
          return false;
        }
        return true;
      })
    );
  };

  const clearLogs = () => {
    setActivityLogs([]);
  };

  const runSystemEvaluations = async () => {
    setIsEvaluating(true);
    setEvaluations([]);
    
    try {
      const testsResponse = await fetch("/evaluations/email_tests.json");
      let tests = [];
      if (testsResponse.ok) {
        tests = await testsResponse.json();
      } else {
        tests = [
          {
            id: "test_interview",
            name: "Google Interview Invitation",
            subject: "Interview with Google for Software Engineer",
            body: "Hi applicant, we were impressed by your resume and would like to schedule a 45-minute technical interview. Please use this calendar link to schedule by Friday, June 26, 2026. Best, Google Recruiting Team.",
            expected: { company: "Google", role: "Software Engineer", status: "INTERVIEW", deadline: "2026-06-26" }
          },
          {
            id: "test_assessment",
            name: "Amazon Coding Assessment",
            subject: "Amazon Software Dev Intern Online Assessment",
            body: "Thank you for applying to Amazon. We have sent you an invitation to take our Online Coding Assessment. You have 5 days to complete it. The deadline is June 24, 2026. Good luck!",
            expected: { company: "Amazon", role: "Software Dev Intern", status: "ASSESSMENT", deadline: "2026-06-24" }
          },
          {
            id: "test_offer",
            name: "Stripe Job Offer",
            subject: "Offer from Stripe!",
            body: "Dear candidate, we are thrilled to offer you the position of Frontend Engineer at Stripe. We've attached your offer letter detailing the base salary and equity. Please sign and return it by June 30, 2026.",
            expected: { company: "Stripe", role: "Frontend Engineer", status: "OFFER", deadline: "2026-06-30" }
          },
          {
            id: "test_rejection",
            name: "Meta Application Rejection",
            subject: "Your application to Meta",
            body: "Thank you for taking the time to interview with Meta. Unfortunately, we will not be moving forward with your application at this time. We will keep your profile in our database for future opportunities.",
            expected: { company: "Meta", role: "Not available", status: "REJECTED", deadline: "Not available" }
          }
        ];
      }

      const results: EvaluationReport[] = [];

      for (const test of tests) {
        const start = performance.now();
        const telemetry = await agentSystem.processEmail(test.body, test.subject, apiKey);
        const end = performance.now();

        const actualCompany = telemetry.result?.company || "Not available";
        const actualStatus = telemetry.result?.status || "GENERAL UPDATE";

        const companyMatch = actualCompany.toLowerCase() === test.expected.company.toLowerCase();
        const statusMatch = actualStatus === test.expected.status;
        const passed = companyMatch && statusMatch;

        results.push({
          id: test.id,
          name: test.name,
          expectedStatus: test.expected.status,
          actualStatus,
          expectedCompany: test.expected.company,
          actualCompany,
          statusMatch,
          companyMatch,
          passed,
          latencyMs: Math.round(end - start)
        });
      }

      setEvaluations(results);
    } catch (error) {
      console.error("Evaluation run failed:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const connectGmailAccount = async () => {
    try {
      const result = await connectGmail();
      setGmailAccessToken(result.access_token);
      setGmailProfileName(result.name);
      setGmailProfileImage(result.picture);
      setGmailProfileEmail(result.email);
      setGmailConnected(true);

      localStorage.setItem("careerpilot_gmail_profile_email", result.email);
      localStorage.setItem("careerpilot_gmail_profile_name", result.name);
      localStorage.setItem("careerpilot_gmail_profile_image", result.picture);
      localStorage.setItem("careerpilot_gmail_token", result.access_token);
      localStorage.setItem("careerpilot_gmailconnected", "true");

      if (!profileManuallySaved) {
        setUserName(result.name);
        setUserEmail(result.email);
        localStorage.setItem("careerpilot_username", result.name);
        localStorage.setItem("careerpilot_useremail", result.email);
      }
      return result;
    } catch (err: any) {
      console.error("Gmail Connection Error:", err);
      throw err;
    }
  };

  const disconnectGmailAccount = () => {
    setGmailAccessToken("");
    setGmailProfileName("");
    setGmailProfileImage("");
    setGmailProfileEmail("");
    setGmailLastSync("");
    setGmailConnected(false);

    localStorage.removeItem("careerpilot_gmail_token");
    localStorage.removeItem("careerpilot_gmail_profile_name");
    localStorage.removeItem("careerpilot_gmail_profile_image");
    localStorage.removeItem("careerpilot_gmail_profile_email");
    localStorage.removeItem("careerpilot_gmail_last_sync");
    localStorage.setItem("careerpilot_gmailconnected", "false");

    if (!profileManuallySaved) {
      setUserName("");
      setUserEmail("");
      localStorage.removeItem("careerpilot_username");
      localStorage.removeItem("careerpilot_useremail");
    }
  };

  const scanGmailWithGemini = async (limit: number = 50): Promise<{ fetched: number; processed: number; newEmailsProcessed: number; existingRecordsUpdated: number; duplicatesSkipped: number; opportunities: JobApplication[] }> => {
    if (!gmailAccessToken) {
      throw new Error("Gmail is not connected. Please link your Gmail account.");
    }

    setIsProcessing(true);
    let fetchedCount = 0;
    let processedCount = 0;
    let newEmailsProcessedCount = 0;
    let existingRecordsUpdatedCount = 0;
    let duplicatesSkippedCount = 0;
    const detectedOpportunities: JobApplication[] = [];

    try {
      const fetchedEmails = await fetchGmailEmails(gmailAccessToken, limit);
      fetchedCount = fetchedEmails.length;

      if (fetchedCount === 0) {
        const emptyTelemetry: AgentSystemTelemetry = {
          isJobRelated: false,
          result: null,
          logs: [
            "Gemini Agent Started",
            "Fetched 0 recruiter emails",
            "No recruiter emails found"
          ],
          skillsUsed: [],
          toolsCalled: [],
          guardrailStatus: "PASSED",
          guardrailLogs: ["Guardrail check: No emails fetched."],
          timestamp: new Date().toISOString()
        };
        setActivityLogs((prev) => [emptyTelemetry, ...prev]);
        setIsProcessing(false);
        return { fetched: 0, processed: 0, newEmailsProcessed: 0, existingRecordsUpdated: 0, duplicatesSkipped: 0, opportunities: [] };
      }

      let currentApps = [...applications];

      for (const email of fetchedEmails) {
        try {
          const fingerprint = generateEmailFingerprint(email.subject, email.senderEmail, email.receivedDate, email.body);

          const isMsgIdDuplicate = currentApps.some((app) => 
            app.identifiers.gmailMessageIds.includes(email.id) ||
            app.timeline.some((evt) => evt.gmailMessageId === email.id)
          );
          const isFingerprintDuplicate = currentApps.some((app) => 
            app.identifiers.emailFingerprints.includes(fingerprint) ||
            app.timeline.some((evt) => evt.emailFingerprint === fingerprint)
          );

          if (isMsgIdDuplicate || isFingerprintDuplicate) {
            duplicatesSkippedCount++;
            continue;
          }

          const telemetry = await agentSystem.processEmail(
            email.body,
            email.subject,
            apiKey,
            email.senderEmail
          );

          processedCount++;

          telemetry.checks = {
            messageIdChecked: true,
            duplicateScanCompleted: true,
            existingAppDetected: false,
            timelineUpdated: false
          };

          if (telemetry.isJobRelated && telemetry.result) {
            const res = telemetry.result;

            res.company = cleanupCompanyName(res.company, email.body, email.subject, email.senderEmail);
            res.summary = cleanSummaryText(res.summary, res.company, res.company);

            const originalEmail = {
              from: `${email.sender} <${email.senderEmail}>`,
              subject: email.subject,
              body: email.body,
              receivedDate: email.receivedDate
            };

            const extractedDate = res.status === "OFFER" ? (res.joiningDate || "Not available")
              : res.status === "INTERVIEW" ? (res.interviewDate || "Not available")
              : res.status === "ASSESSMENT" ? (res.assessmentDeadline || "Not available")
              : "Not available";

            const newEvent: TimelineEvent = {
              id: "evt_" + Math.random().toString(36).substr(2, 9),
              gmailMessageId: email.id,
              threadId: email.threadId || "",
              emailFingerprint: fingerprint,
              eventType: res.status,
              subject: email.subject,
              sender: originalEmail.from,
              receivedDate: email.receivedDate,
              extractedDate: extractedDate,
              summary: res.summary,
              originalEmail: email.body,
              source: "Gmail/Gemini"
            };

            let existingIndex = currentApps.findIndex((app) => {
              const isCompMatch = isCompanyMatch(app.company, res.company);
              const isRoleM = isRoleMatch(app.role, res.role);
              return isCompMatch && isRoleM;
            });

            if (existingIndex >= 0) {
              existingRecordsUpdatedCount++;
              const existingApp = currentApps[existingIndex];

              telemetry.checks!.existingAppDetected = true;
              telemetry.checks!.timelineUpdated = true;

              const oldStatus = existingApp.currentStatus;
              const newStatus = res.status;
              let statusProgressionText = "";
              let updatedStatus = oldStatus;

              if (canUpdateStatus(oldStatus, newStatus)) {
                updatedStatus = newStatus;
                statusProgressionText = `${oldStatus} → ${newStatus}`;
                telemetry.checks!.statusProgressed = statusProgressionText;
              }

              const getMergedDate = (newVal: string | undefined, oldVal: string | undefined): string => {
                if (!newVal || newVal === "Not available" || newVal.trim() === "") {
                  return oldVal || "Not available";
                }
                return newVal;
              };

              const mergedJoiningDate = getMergedDate(res.joiningDate, existingApp.joiningDate);
              const mergedInterviewDate = getMergedDate(res.interviewDate, existingApp.interviewDate);
              const mergedAssessmentDeadline = getMergedDate(res.assessmentDeadline, existingApp.assessmentDeadline);
              const mergedDeadline = getMergedDate(res.deadline, existingApp.deadline);

              let finalDateType = existingApp.date.type;
              let finalDateValue = existingApp.date.value;

              if (updatedStatus === "OFFER") {
                finalDateType = "Joining Date";
                finalDateValue = mergedJoiningDate;
              } else if (updatedStatus === "INTERVIEW") {
                finalDateType = "Interview Date";
                finalDateValue = mergedInterviewDate;
              } else if (updatedStatus === "ASSESSMENT") {
                finalDateType = "Assessment Deadline";
                finalDateValue = mergedAssessmentDeadline;
              }

              const updatedApp: JobApplication = {
                ...existingApp,
                currentStatus: updatedStatus,
                status: updatedStatus,
                summary: res.summary,
                joiningDate: mergedJoiningDate,
                interviewDate: mergedInterviewDate,
                assessmentDeadline: mergedAssessmentDeadline,
                deadline: mergedDeadline,
                date: {
                  type: finalDateType,
                  value: finalDateValue
                },
                nextAction: res.nextAction,
                confidence: res.confidence,
                lastActivityDate: email.receivedDate,
                latestUpdate: email.subject || `Status: ${updatedStatus}`,
                identifiers: {
                  threadIds: email.threadId && !existingApp.identifiers.threadIds.includes(email.threadId)
                    ? [...existingApp.identifiers.threadIds, email.threadId]
                    : existingApp.identifiers.threadIds,
                  gmailMessageIds: !existingApp.identifiers.gmailMessageIds.includes(email.id)
                    ? [...existingApp.identifiers.gmailMessageIds, email.id]
                    : existingApp.identifiers.gmailMessageIds,
                  emailFingerprints: !existingApp.identifiers.emailFingerprints.includes(fingerprint)
                    ? [...existingApp.identifiers.emailFingerprints, fingerprint]
                    : existingApp.identifiers.emailFingerprints
                },
                timeline: [...existingApp.timeline, newEvent],
                updatedAt: new Date().toISOString(),
                emailReceivedDate: email.receivedDate
              };

              currentApps[existingIndex] = updatedApp;
              detectedOpportunities.push(updatedApp);
            } else {
              newEmailsProcessedCount++;

              telemetry.checks!.existingAppDetected = false;
              telemetry.checks!.timelineUpdated = true;

              const newApp: JobApplication = {
                id: "app_" + Math.random().toString(36).substr(2, 9),
                company: res.company,
                role: res.role,
                currentStatus: res.status,
                status: res.status,
                summary: res.summary,
                joiningDate: res.joiningDate || "Not available",
                interviewDate: res.interviewDate || "Not available",
                assessmentDeadline: res.assessmentDeadline || "Not available",
                deadline: res.deadline || "Not available",
                date: res.date,
                nextAction: res.nextAction,
                dateAdded: new Date().toISOString().split("T")[0],
                confidence: res.confidence,
                mode: "Online",
                location: "Remote",
                source: "Gmail Ingestion",
                latestUpdate: email.subject || `Status: ${res.status}`,
                lastActivityDate: email.receivedDate,
                isStarred: false,
                identifiers: {
                  threadIds: email.threadId ? [email.threadId] : [],
                  gmailMessageIds: [email.id],
                  emailFingerprints: [fingerprint]
                },
                timeline: [newEvent],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                emailReceivedDate: email.receivedDate
              };
              currentApps = [newApp, ...currentApps];
              detectedOpportunities.push(newApp);
            }

            const customLogs = [
              "Gemini Agent Started",
              `Fetched ${fetchedCount} recruiter emails`,
              `Analyzed ${res.company} email`,
              `Extracted:`,
              `Company: ${res.company}`,
              `Status: ${res.status}`,
              `Date: ${res.date.value}`,
              `Updated application tracker`,
              ...telemetry.logs
            ];

            const emailTelemetry: AgentSystemTelemetry = {
              ...telemetry,
              logs: customLogs,
              timestamp: new Date().toISOString()
            };

            setActivityLogs((prev) => [emailTelemetry, ...prev]);
          } else {
            const nonCareerTelemetry: AgentSystemTelemetry = {
              ...telemetry,
              logs: [
                "Gemini Agent Started",
                `Fetched ${fetchedCount} recruiter emails`,
                `Analyzed incoming email from ${email.sender}`,
                "Filtered: Unrelated content",
                ...telemetry.logs
              ],
              timestamp: new Date().toISOString()
            };
            setActivityLogs((prev) => [nonCareerTelemetry, ...prev]);
          }
        } catch (err) {
          console.warn(`Error scanning email in Gmail batch:`, err);
        }
      }

      setApplications(currentApps);

      const syncTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
      setGmailLastSync(syncTime);
    } finally {
      setIsProcessing(false);
    }

    return {
      fetched: fetchedCount,
      processed: processedCount,
      newEmailsProcessed: newEmailsProcessedCount,
      existingRecordsUpdated: existingRecordsUpdatedCount,
      duplicatesSkipped: duplicatesSkippedCount,
      opportunities: sortApplications(detectedOpportunities)
    };
  };

  const enableDemoMode = async () => {
    setDemoMode(true);
    localStorage.setItem("careerpilot_demomode", "true");
    
    for (const email of DEMO_EMAILS) {
      await processEmailText(
        email.body,
        email.subject,
        email.senderEmail,
        email.id,
        "Demo Inbox"
      );
    }
  };

  const disableDemoMode = () => {
    setDemoMode(false);
    localStorage.setItem("careerpilot_demomode", "false");
    
    setApplications((prev) => {
      // 1. Remove all applications whose source is "Demo Inbox"
      const nonDemoApps = prev.filter(app => app.source !== "Demo Inbox");
      
      // 2. For each remaining application, filter out demo events and recalculate status/dates if modified
      return nonDemoApps.map(app => {
        const filteredTimeline = app.timeline.filter(evt => evt.source !== "Demo Inbox");
        if (filteredTimeline.length === app.timeline.length) {
          return app; // No changes
        }
        
        if (filteredTimeline.length === 0) {
          return {
            ...app,
            timeline: []
          };
        }
        
        const latestEvt = filteredTimeline[filteredTimeline.length - 1];
        
        let joiningDate = "Not available";
        let interviewDate = "Not available";
        let assessmentDeadline = "Not available";
        let deadline = "Not available";
        
        filteredTimeline.forEach(evt => {
          if (evt.eventType === "OFFER") {
            joiningDate = evt.extractedDate;
          } else if (evt.eventType === "INTERVIEW") {
            interviewDate = evt.extractedDate;
          } else if (evt.eventType === "ASSESSMENT") {
            assessmentDeadline = evt.extractedDate;
          }
        });

        let finalDateType = "Not available";
        let finalDateValue = "Not available";

        if (latestEvt.eventType === "OFFER") {
          finalDateType = "Joining Date";
          finalDateValue = joiningDate;
        } else if (latestEvt.eventType === "INTERVIEW") {
          finalDateType = "Interview Date";
          finalDateValue = interviewDate;
        } else if (latestEvt.eventType === "ASSESSMENT") {
          finalDateType = "Assessment Deadline";
          finalDateValue = assessmentDeadline;
        }
        
        return {
          ...app,
          currentStatus: latestEvt.eventType as any,
          status: latestEvt.eventType as any,
          summary: latestEvt.summary,
          latestUpdate: latestEvt.subject,
          lastActivityDate: latestEvt.receivedDate,
          joiningDate,
          interviewDate,
          assessmentDeadline,
          deadline,
          date: {
            type: finalDateType,
            value: finalDateValue
          },
          timeline: filteredTimeline
        };
      });
    });
  };

  const sortedApplications = React.useMemo(() => {
    return sortApplications(applications);
  }, [applications]);

  return (
    <AppContext.Provider
      value={{
        applications: sortedApplications,
        activityLogs,
        emails,
        apiKey,
        isProcessing,
        evaluations,
        isEvaluating,
        setApiKey,
        processEmailText,
        addManualApplication,
        deleteApplication,
        updateApplicationStatus,
        toggleStarApplication,
        cleanupOldApplications,
        runSystemEvaluations,
        clearLogs,
        currentView,
        setView,
        selectedAppId,
        setSelectedAppId,
        userName,
        setUserName,
        userEmail,
        setUserEmail,
        profileManuallySaved,
        setProfileManuallySaved,
        gmailProfileEmail,
        setGmailProfileEmail,
        displayName,
        displayEmail,
        selectedModel,
        setSelectedModel,
        gmailConnected,
        setGmailConnected,
        careerGoal,
        setCareerGoal,
        preferredRoles,
        setPreferredRoles,
        jobSearchStatus,
        setJobSearchStatus,
        gmailAccessToken,
        gmailProfileName,
        gmailProfileImage,
        gmailLastSync,
        connectGmailAccount,
        disconnectGmailAccount,
        scanGmailWithGemini,
        demoMode,
        enableDemoMode,
        disableDemoMode
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
