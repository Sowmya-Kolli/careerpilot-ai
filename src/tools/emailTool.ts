export interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  bodyHtml?: string;
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
    bodyHtml: `<div style="background-color: #f8fafc; padding: 24px; font-family: 'Segoe UI', system-ui, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #4285F4, #34A853); padding: 24px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Google Careers</h2>
    </div>
    <div style="padding: 30px; color: #334155; line-height: 1.6; font-size: 14px;">
      <p style="margin-top: 0; font-size: 16px; font-weight: bold; color: #0f172a;">Hi Applicant,</p>
      <p>Thank you for your interest in the <strong>Software Engineer, Front-End</strong> position at Google.</p>
      <p>We were highly impressed by your application and profile, and we would like to invite you for a 45-minute technical screen interview via Google Meet.</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="https://careers.google.com/scheduling/portal/1239847" style="background-color: #4285F4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; display: inline-block; box-shadow: 0 4px 10px rgba(66, 133, 244, 0.3); transition: all 0.2s;">Schedule Your Interview</a>
      </div>
      <p style="font-size: 12px; color: #64748b; font-style: italic;">Please complete your scheduling by Friday, June 26, 2026.</p>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
      <p style="font-size: 12px; color: #94a3b8; margin-bottom: 24px;">If you have any questions, feel free to reply to this email directly.</p>
      <p style="margin: 0; font-weight: bold; color: #0f172a;">Best regards,</p>
      <p style="margin: 4px 0 0 0; color: #475569; font-weight: 600;">Google Recruiting Team</p>
    </div>
  </div>
</div>`,
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
    bodyHtml: `<div style="background-color: #fafafa; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
    <div style="background: #232f3e; padding: 20px 30px;">
      <h2 style="color: #ff9900; margin: 0; font-size: 20px; font-weight: 700;">amazon jobs</h2>
    </div>
    <div style="padding: 30px; color: #444444; line-height: 1.6; font-size: 14px;">
      <p style="margin-top: 0; font-weight: 700; color: #111111;">Dear Candidate,</p>
      <p>Thank you for applying for the <strong>Software Development Engineer Intern</strong> role at Amazon.</p>
      <p>To proceed with your application, you are required to complete an Online Coding Assessment on HackerRank to test your data structures, algorithms, and problem-solving skills.</p>
      <p style="background-color: #fff8e7; border-left: 4px solid #ff9900; padding: 12px 18px; font-weight: 600; color: #664d03; border-radius: 4px;">
        ⚠️ Action Required: You must complete this assessment within 5 days. The deadline to submit is June 24, 2026.
      </p>
      <div style="margin: 28px 0;">
        <a href="https://hackerrank.com/amazon-eval/test_abc123" style="background-color: #ff9900; color: #111111; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 700; display: inline-block;">Access Online Assessment</a>
      </div>
      <p style="font-size: 12.5px; color: #666666;">Please ensure you are in a quiet, distraction-free environment before starting. Once started, the timer cannot be paused.</p>
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 24px 0;">
      <p style="margin: 0; font-weight: 700; color: #111111;">Good luck,</p>
      <p style="margin: 4px 0 0 0; color: #555555;">Amazon Student Recruiting Team</p>
    </div>
  </div>
</div>`,
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
    bodyHtml: `<div style="background-color: #f6f9fc; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eef2f6; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.02);">
    <div style="background: #635bff; padding: 24px; text-align: left;">
      <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">stripe</h2>
    </div>
    <div style="padding: 32px; color: #4f5b76; line-height: 1.6; font-size: 14px;">
      <h3 style="color: #0a2540; font-size: 18px; margin-top: 0; font-weight: 800;">Welcome to Stripe!</h3>
      <p>Dear Applicant,</p>
      <p>We are thrilled to offer you the position of <strong>Frontend Engineer</strong> at Stripe!</p>
      <p>We were incredibly impressed by your technical knowledge, coding sessions, and system design interviews. The team is extremely excited about the prospect of you joining us to help build the economic infrastructure for the internet.</p>
      <p>Attached to this email, you will find your official offer package detailing your base compensation, stock options grant, and benefits details.</p>
      <div style="background-color: #f8fafc; border: 1px dashed #635bff; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <span style="font-weight: bold; color: #0a2540; block; margin-bottom: 6px;">Offer Acceptance Steps:</span>
        <ol style="margin: 0; padding-left: 20px; color: #4f5b76;">
          <li>Review the attached PDF offer letter.</li>
          <li>Sign and date the document.</li>
          <li>Return the signed copy by the deadline of <strong>June 30, 2026</strong>.</li>
        </ol>
      </div>
      <p>We look forward to having you on board!</p>
      <p style="margin: 24px 0 0 0; font-weight: bold; color: #0a2540;">Best regards,</p>
      <p style="margin: 4px 0 0 0; color: #0a2540; font-weight: 600;">The Stripe Recruiting Team</p>
    </div>
  </div>
</div>`,
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
    bodyHtml: `<div style="background-color: #f0f2f5; padding: 24px; font-family: Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #dddfe2;">
    <div style="background: #ffffff; border-bottom: 1px solid #e5e5e5; padding: 20px; text-align: left;">
      <span style="font-size: 22px; font-weight: bold; color: #1877f2;">meta careers</span>
    </div>
    <div style="padding: 24px; color: #4b4f56; line-height: 1.6; font-size: 13.5px;">
      <p>Hello,</p>
      <p>Thank you for taking the time to interview with us for the <strong>Software Engineer</strong> role. We appreciate your dedication and the effort you put into the programming assessments and conversations with our engineering teams.</p>
      <p>After careful consideration of your application, we regret to inform you that we have decided not to move forward with your profile at this time. This decision was very difficult, as we had a large number of exceptionally qualified candidates.</p>
      <p>We will keep your professional information on file and will certainly reach out to you if another opportunity matching your experience becomes available in the future.</p>
      <p>We sincerely appreciate your interest in Meta and wish you success with your ongoing job search.</p>
      <hr style="border: 0; border-top: 1px solid #e9ebee; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #333333;">Sincerely,</p>
      <p style="margin: 4px 0 0 0; color: #90949c; font-weight: 600;">Meta Talent Acquisition Team</p>
    </div>
  </div>
</div>`,
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
    bodyHtml: `<div style="background-color: #141414; padding: 24px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #1f1f1f; border-radius: 8px; overflow: hidden; border: 1px solid #2d2d2d; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
    <div style="background: #141414; border-bottom: 2px solid #e50914; padding: 24px; text-align: left;">
      <h2 style="color: #e50914; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 0.5px;">NETFLIX</h2>
    </div>
    <div style="padding: 30px; color: #cccccc; line-height: 1.6; font-size: 14px;">
      <p style="margin-top: 0; color: #ffffff; font-size: 16px; font-weight: bold;">Hi Candidate,</p>
      <p>Thanks for applying to Netflix!</p>
      <p>We have successfully received your application for the <strong>Software Engineer</strong> position. Our technical recruiting team will review your resume and profile details against our core engineering competencies.</p>
      <p style="background: #2a2a2a; border-left: 4px solid #e50914; padding: 12px 16px; border-radius: 4px; color: #ffffff;">
        📋 Status: Application Received and In Review.
      </p>
      <p>Due to the volume of submissions, it may take 1 to 2 weeks for us to complete our review. You can log into your candidate dashboard at any time to monitor updates.</p>
      <p>Thank you for your interest in joining our team and help shape the future of entertainment.</p>
      <hr style="border: 0; border-top: 1px solid #333333; margin: 24px 0;">
      <p style="margin: 0; color: #ffffff; font-weight: bold;">Best,</p>
      <p style="margin: 4px 0 0 0; color: #e50914; font-weight: 600;">Netflix Careers Team</p>
    </div>
  </div>
</div>`,
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
    bodyHtml: `<div style="background-color: #e8f5e9; padding: 24px; font-family: sans-serif; text-align: center;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 2px solid #a5d6a7; padding: 30px; box-shadow: 0 8px 16px rgba(0,0,0,0.05);">
    <div style="font-size: 50px; margin-bottom: 12px;">🦉</div>
    <h2 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 22px; font-weight: 800;">Keep your streak alive!</h2>
    <p style="color: #555555; line-height: 1.6; font-size: 14.5px; margin-bottom: 24px;">
      Hi Learner, Duo is checking in! You have a <strong>10-day streak</strong> going. Don't let it freeze today!
    </p>
    <div style="margin: 24px 0;">
      <a href="https://duolingo.com/start-lesson" style="background-color: #58cc02; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 15px; display: inline-block; border-bottom: 4px solid #46a302; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">Start Daily Lesson (5m)</a>
    </div>
    <p style="color: #888888; font-size: 11px;">You are receiving this language streak reminder because you are registered on Duolingo. <a href="https://duolingo.com/unsubscribe" style="color: #888888;">Unsubscribe</a></p>
  </div>
</div>`,
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
