import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

// Create a JSDOM instance for server-side sanitization
const { window } = new JSDOM("");
const purify = DOMPurify(window as unknown as typeof globalThis);

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Allows safe formatting tags but removes script/event handlers.
 */
export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "a",
      "mark",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitizes plain text to allow only safe characters.
 * Removes any HTML tags.
 */
export function sanitizeText(text: string): string {
  return purify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}
