export const decodeEntities = (str: string): string => {
  const translate_re = /&(nbsp|amp|quot|lt|gt|apos);/g;
  const translate: Record<string, string> = {
    "nbsp": " ",
    "amp": "&",
    "quot": "\"",
    "lt": "<",
    "gt": ">",
    "apos": "'"
  };
  return str.replace(translate_re, (_, entity) => translate[entity]).replace(/&#(\d+);/gi, (_, numStr) => {
    const num = parseInt(numStr, 10);
    return String.fromCharCode(num);
  }).replace(/&#x([a-f0-9]+);/gi, (_, hexStr) => {
    const num = parseInt(hexStr, 16);
    return String.fromCharCode(num);
  });
};

/**
 * Sanitizes HTML or rich text email bodies to clean readable plain text.
 * Strips <style> and <script>, removes CSS, preserves paragraphs/links,
 * decodes entities, and flags inline/attached files with a clean placeholder.
 */
export const sanitizeEmailContent = (html: string): string => {
  if (!html) return "";

  // Check for images or attachment indicators
  const hasImagesOrAttachments = /<img\b/i.test(html) || /src=["']cid:/i.test(html) || html.includes("📎") || html.includes("attachmentId");

  let cleaned = html;

  // 1. Strip <style> and <script> tags and their contents
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  // 2. Preserve links: replace <a href="url">Text</a> with Text (url)
  cleaned = cleaned.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url, text) => {
    const cleanText = text.replace(/<[^>]*>/g, "").trim();
    const cleanUrl = url.trim();
    if (cleanText && cleanUrl && cleanText !== cleanUrl && !cleanUrl.startsWith("mailto:")) {
      return `${cleanText} (${cleanUrl})`;
    }
    return cleanText || cleanUrl;
  });

  // 3. Preserve paragraphs: replace block level tags with newlines
  cleaned = cleaned.replace(/<\/p>/gi, "\n\n");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/<\/div>/gi, "\n");
  cleaned = cleaned.replace(/<\/tr>/gi, "\n");
  cleaned = cleaned.replace(/<\/li>/gi, "\n");
  cleaned = cleaned.replace(/<\/h[1-6]>/gi, "\n\n");

  // 4. Strip all HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // 5. Decode HTML entities
  cleaned = decodeEntities(cleaned);

  // 6. Clean up excessive newlines and whitespace
  cleaned = cleaned.split(/\r?\n/).map(line => line.trim()).join("\n");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  // 7. Prepend placeholder if images or attachments are present
  if (hasImagesOrAttachments) {
    if (cleaned.replace(/\s+/g, "").length === 0) {
      cleaned = `📎 This email contains rich media/images. Open Gmail to view complete email.`;
    } else {
      cleaned = `📎 This email contains images or attachments. Open Gmail to view full content.\n\n${cleaned}`;
    }
  }

  return cleaned;
};
