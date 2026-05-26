import sanitizeHtmlLib from "sanitize-html";

export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      "p", "br", "strong", "em", "u",
      "h1", "h2", "h3",
      "ul", "ol", "li",
      "blockquote", "code", "pre",
      "a", "mark",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

export function sanitizeText(text: string): string {
  return sanitizeHtmlLib(text, {
    allowedTags: [],
    allowedAttributes: {},
  });
}
