export interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
}

export const SAMPLE_EMAILS: EmailMessage[] = [
  {
    id: "gmail_001",
    sender: "Google Careers Team",
    senderEmail: "careers@google.com",
    subject: "Interview Schedule: Software Engineer, Front-End",
    body: `Hi Applicant,

Thank you for your interest in the Software Engineer position at Google. 

We were highly impressed by your application and profile, and we would like to invite you for a 45-minute technical screen interview via Google Meet. 

Please use the scheduling portal link below to reserve your interview time. Please complete your scheduling by Friday, June 26, 2026.

Scheduling Portal Link: https://careers.google.com/scheduling/portal/1239847
If you have any questions, feel free to reply to this email.

Best regards,
Google Recruiting`,
    date: "2026-06-19",
    isRead: false
  },
  {
    id: "gmail_002",
    sender: "Amazon Recruiting",
    senderEmail: "no-reply@amazon.com",
    subject: "Action Required: Amazon Coding Assessment invitation",
    body: `Dear Candidate,

Thank you for applying for the Software Development Engineer Intern role at Amazon.

To proceed with your application, you are required to complete an Online Coding Assessment. The assessment will test your data structures, algorithms, and logical problem-solving skills on HackerRank.

You must complete the coding assessment within 5 days of receiving this email. The ultimate deadline to submit is June 24, 2026.

Access link: https://hackerrank.com/amazon-eval/test_abc123
Please ensure you are in a quiet, distraction-free environment before starting.

Good luck!
Amazon HR Team`,
    date: "2026-06-18",
    isRead: false
  },
  {
    id: "gmail_003",
    sender: "Stripe Recruiting",
    senderEmail: "offers@stripe.com",
    subject: "Job Offer from Stripe - Frontend Engineer",
    body: `Dear Applicant,

We are thrilled to offer you the position of Frontend Engineer at Stripe! 

We were incredibly impressed by your interviews and coding sessions. The team is excited about the prospect of you joining us.

We have attached your official offer package detailing a competitive base salary, stock options, and comprehensive benefits. 

Please review, sign, and return the offer package by June 30, 2026. 

We look forward to welcoming you to the Stripe team!

Best,
The Stripe Recruiting Team`,
    date: "2026-06-19",
    isRead: false
  },
  {
    id: "gmail_004",
    sender: "Meta Careers",
    senderEmail: "careers-no-reply@meta.com",
    subject: "Your application for Software Engineer position at Meta",
    body: `Hello,

Thank you for taking the time to interview with us for the Software Engineer role. We appreciate your dedication and effort during the process.

Unfortunately, after careful consideration, we have decided not to move forward with your application at this time. The decision was very difficult, as we had many talented candidates.

We will keep your resume on file and reach out if another matching opportunity opens up. We wish you the best in your job search.

Sincerely,
Meta Talent Acquisition`,
    date: "2026-06-17",
    isRead: true
  },
  {
    id: "gmail_005",
    sender: "Netflix Jobs",
    senderEmail: "jobs@netflix.com",
    subject: "Application Received: Software Engineer",
    body: `Hi Candidate,

Thanks for applying to Netflix!

We have successfully received your application for the Software Engineer position. Our recruiting team will review your profile against the role requirements. 

Due to the high volume of applications, it may take 1-2 weeks to get back to you. You can check your application status on our job portal.

Best,
Netflix Careers`,
    date: "2026-06-19",
    isRead: true
  },
  {
    id: "gmail_006",
    sender: "Duolingo Newsletter",
    senderEmail: "news@duolingo.com",
    subject: "Keep your daily streak alive! 🦉",
    body: `Hi Learner,

Duo is checking in! Don't let your 10-day language learning streak die. 

Spend just 5 minutes today to learn a new skill in Spanish or Japanese. Tap the button below to start your daily lesson now!

Let's do this!
Team Duolingo`,
    date: "2026-06-19",
    isRead: true
  }
];

/**
 * Fetch list of emails.
 * In a real application, this would use Gmail OAuth to fetch emails from the user's inbox.
 */
export const fetchEmails = async (): Promise<EmailMessage[]> => {
  // ==========================================
  // FUTURE GMAIL API INTEGRATION PLACEHOLDER
  // ==========================================
  // In future versions, this function will make an authorized API call to the Gmail API:
  //
  // const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=newer_than:7d", {
  //   headers: {
  //     Authorization: `Bearer ${userAccessToken}`
  //   }
  // });
  // const data = await response.json();
  //
  // For each message, we would then fetch details:
  // const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`);
  // ... parse headers (Subject, From, Date) and message body ...
  //
  // For Version 1, we return the mock sample emails:
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...SAMPLE_EMAILS]);
    }, 400); // simulate network latency
  });
};
