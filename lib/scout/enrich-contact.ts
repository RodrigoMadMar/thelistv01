const EMAIL_BLACKLIST = [
  "sentry",
  "google",
  "facebook",
  "w3",
  "schema",
  "wixpress",
  "cloudflare",
  "wordpress",
  "example",
  "gravatar",
  "googleapis",
  "gstatic",
];

const CONTACT_PATHS = ["/contacto", "/contact", "/about", "/nosotros"];

const USER_AGENT = "Mozilla/5.0 (compatible; thelistbot/1.0)";

interface EnrichResult {
  email: string | null;
  instagram: string | null;
  email_source: string | null;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractEmails(html: string, websiteDomain: string | null): string[] {
  const emails: string[] = [];

  // 1. mailto: links
  const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi);
  if (mailtoMatches) {
    for (const m of mailtoMatches) {
      const email = m.replace(/^mailto:/i, "").toLowerCase();
      if (!isBlacklisted(email)) emails.push(email);
    }
  }

  // 2. Regex pattern for emails in text
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const allEmails = html.match(emailRegex) || [];
  for (const email of allEmails) {
    const lower = email.toLowerCase();
    if (!isBlacklisted(lower) && !emails.includes(lower)) {
      emails.push(lower);
    }
  }

  // Prioritize emails with the website's own domain
  if (websiteDomain) {
    const ownDomain = emails.filter((e) => e.includes(websiteDomain));
    if (ownDomain.length > 0) return ownDomain;
  }

  return emails;
}

function isBlacklisted(email: string): boolean {
  return EMAIL_BLACKLIST.some((bl) => email.includes(bl));
}

function extractInstagram(html: string): string | null {
  const igRegex = /instagram\.com\/([a-zA-Z0-9._]+)/gi;
  const matches = Array.from(html.matchAll(igRegex));
  const excluded = ["p", "reel", "stories", "explore", "accounts", "about"];

  for (const match of matches) {
    const handle = match[1].replace(/\/$/, "");
    if (!excluded.includes(handle.toLowerCase())) {
      return handle;
    }
  }
  return null;
}

function getDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function enrichContactDeep(website: string): Promise<EnrichResult> {
  const domain = getDomain(website);

  // Try homepage first
  const homeHtml = await fetchPage(website);
  if (homeHtml) {
    const emails = extractEmails(homeHtml, domain);
    const instagram = extractInstagram(homeHtml);

    if (emails.length > 0) {
      return {
        email: emails[0],
        instagram,
        email_source: "website_home",
      };
    }

    if (instagram && emails.length === 0) {
      // Try contact pages before giving up on email
      for (const path of CONTACT_PATHS) {
        const baseUrl = website.replace(/\/$/, "");
        const contactHtml = await fetchPage(`${baseUrl}${path}`);
        if (contactHtml) {
          const contactEmails = extractEmails(contactHtml, domain);
          const contactIg = extractInstagram(contactHtml);
          if (contactEmails.length > 0) {
            return {
              email: contactEmails[0],
              instagram: instagram || contactIg,
              email_source: `website${path}`,
            };
          }
        }
      }

      return { email: null, instagram, email_source: null };
    }
  }

  // Try contact pages if homepage had nothing
  for (const path of CONTACT_PATHS) {
    const baseUrl = website.replace(/\/$/, "");
    const html = await fetchPage(`${baseUrl}${path}`);
    if (html) {
      const emails = extractEmails(html, domain);
      const instagram = extractInstagram(html);
      if (emails.length > 0 || instagram) {
        return {
          email: emails[0] || null,
          instagram,
          email_source: emails.length > 0 ? `website${path}` : null,
        };
      }
    }
  }

  return { email: null, instagram: null, email_source: null };
}
