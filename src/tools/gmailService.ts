import { sanitizeEmailContent } from "./emailSanitizer";

export interface GmailMessageDetail {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  receivedDate: string;
  threadId?: string;
}

/**
 * Safely decodes base64url encoded strings (standard encoding for Gmail message payloads)
 * including multi-byte UTF-8 sequences.
 */
function decodeBase64Url(base64url: string): string {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  try {
    return decodeURIComponent(
      raw
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    return raw;
  }
}

/**
 * Recursively extracts plain text (or stripped HTML) body from a Gmail message payload.
 */
function getMessageBody(payload: any): string {
  if (!payload) return "";

  // If text/plain mimeType is at root
  if (payload.mimeType === "text/plain" && payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  // If text/html is at root
  if (payload.mimeType === "text/html" && payload.body && payload.body.data) {
    const html = decodeBase64Url(payload.body.data);
    return sanitizeEmailContent(html);
  }

  // If nested parts exist
  if (payload.parts && payload.parts.length > 0) {
    return getPartBody(payload.parts);
  }

  return "";
}

function getPartBody(parts: any[]): string {
  // First priority: find a plain text part
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body && part.body.data) {
      return decodeBase64Url(part.body.data);
    }
  }

  // Second priority: search recursively in sub-parts
  for (const part of parts) {
    if (part.parts && part.parts.length > 0) {
      const body = getPartBody(part.parts);
      if (body) return body;
    }
  }

  // Third priority: fallback to text/html and run sanitizer
  for (const part of parts) {
    if (part.mimeType === "text/html" && part.body && part.body.data) {
      const html = decodeBase64Url(part.body.data);
      return sanitizeEmailContent(html);
    }
  }

  return "";
}

/**
 * Initializes and retrieves the Google Identity Services token client.
 */
export const getGoogleTokenClient = (
  onTokenReceived: (resp: { access_token: string }) => void,
  onError: (err: any) => void
) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    onError(new Error("GOOGLE_CLIENT_ID is not configured in environment variables. Please add VITE_GOOGLE_CLIENT_ID to your .env file."));
    return null;
  }

  const win = window as any;
  if (!win.google || !win.google.accounts || !win.google.accounts.oauth2) {
    onError(new Error("Google Identity Services script is not loaded yet. Please wait a moment and try again."));
    return null;
  }

  try {
    const client = win.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          onError(tokenResponse);
        } else if (tokenResponse.access_token) {
          onTokenReceived(tokenResponse);
        } else {
          onError(new Error("No access token was returned."));
        }
      },
      error_callback: (err: any) => {
        onError(err);
      }
    });
    return client;
  } catch (err) {
    onError(err);
    return null;
  }
};

/**
 * Fetches the user profile info from Google OAuth2 userinfo endpoint.
 */
export const fetchUserProfile = async (accessToken: string) => {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    throw new Error("Failed to retrieve profile info. Access token may be invalid or expired.");
  }
  return await res.json();
};

/**
 * Connects Gmail by opening the GIS OAuth popup and retrieving token and profile info.
 */
export const connectGmail = (): Promise<{ access_token: string; email: string; name: string; picture: string }> => {
  return new Promise((resolve, reject) => {
    const client = getGoogleTokenClient(
      async (tokenResponse) => {
        try {
          const profile = await fetchUserProfile(tokenResponse.access_token);
          resolve({
            access_token: tokenResponse.access_token,
            email: profile.email,
            name: profile.name || profile.email.split("@")[0],
            picture: profile.picture || ""
          });
        } catch (err: any) {
          reject(err);
        }
      },
      (err: any) => {
        if (err.error === "access_denied") {
          reject(new Error("Gmail read-only permission was denied."));
        } else if (err.error === "popup_closed_by_user" || err.type === "popup_closed") {
          reject(new Error("Sign-in popup was closed. Please try again."));
        } else {
          reject(err || new Error("Google authentication failed."));
        }
      }
    );

    if (client) {
      client.requestAccessToken({ prompt: "consent" });
    }
  });
};

/**
 * Fetches recruiter emails matching recruitment status queries and parses them.
 */
export const fetchGmailEmails = async (accessToken: string, limit: number = 50): Promise<GmailMessageDetail[]> => {
  const query = "newer_than:90d AND (interview OR assessment OR shortlisted OR selected OR offer OR rejected OR application OR internship OR opportunity)";
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${limit}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (res.status === 403) {
    throw new Error("Gmail permission denied. Please reconnect Gmail to allow access.");
  } else if (res.status === 429) {
    throw new Error("Gmail API rate limit exceeded. Please try again later.");
  } else if (!res.ok) {
    throw new Error("Failed to fetch emails from Gmail. Token may have expired.");
  }

  const listData = await res.json();
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  const fetchedEmails: GmailMessageDetail[] = [];

  for (const msg of listData.messages) {
    try {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      const detailRes = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!detailRes.ok) continue;

      const message = await detailRes.json();
      const headers = message.payload?.headers || [];

      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "";
      const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";

      // Ignore promotions/newsletter/marketing emails by checking headers
      const hasUnsubscribe = headers.some(
        (h: any) => h.name.toLowerCase() === "list-unsubscribe" || h.name.toLowerCase() === "precedence" && h.value.toLowerCase() === "bulk"
      );
      if (hasUnsubscribe) {
        continue;
      }

      // Ignore common newsletter/advertisement terms in subject/body
      const body = getMessageBody(message.payload);
      const lowerSubject = subject.toLowerCase();
      const lowerBody = body.toLowerCase();
      if (
        lowerSubject.includes("newsletter") ||
        lowerSubject.includes("weekly digest") ||
        lowerSubject.includes("promotion") ||
        lowerSubject.includes("advertisement") ||
        lowerBody.includes("unsubscribe from") ||
        lowerBody.includes("view in browser") ||
        lowerBody.includes("replying to this newsletter")
      ) {
        continue;
      }

      // Extract sender name and email address
      let sender = "";
      let senderEmail = "";
      const match = fromHeader.match(/(.*)<(.*)>/);
      if (match) {
        sender = match[1].trim().replace(/^["']|["']$/g, "");
        senderEmail = match[2].trim();
      } else {
        senderEmail = fromHeader.trim();
        sender = fromHeader.split("@")[0] || fromHeader;
      }

      let receivedDate = dateHeader;
      try {
        const parsedDate = new Date(dateHeader);
        if (!isNaN(parsedDate.getTime())) {
          receivedDate = parsedDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          });
        }
      } catch (e) {
        // Fallback to original string
      }

      fetchedEmails.push({
        id: msg.id,
        sender,
        senderEmail,
        subject,
        body,
        receivedDate,
        threadId: message.threadId
      });
    } catch (e) {
      console.warn("Could not retrieve message details for id " + msg.id, e);
    }
  }

  return fetchedEmails;
};
