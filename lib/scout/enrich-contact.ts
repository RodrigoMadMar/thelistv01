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
  "automattic",
  "jquery",
  "bootstrapcdn",
  "fontawesome",
  "googleapis",
  "gstatic",
];

const CONTACT_PATHS = ["/contacto", "/contact", "/about", "/nosotros"];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface EnrichResult {
  email: string | null;
  instagram: string | null;
  email_source: string | null;
}

async function fetchPage(url: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

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

  // 1. mailto: links (highest priority)
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

  // Prioritize: own domain > mailto > others > generic
  if (websiteDomain) {
    const ownDomain = emails.filter((e) => e.includes(websiteDomain));
    if (ownDomain.length > 0) return ownDomain;
  }

  // Deprioritize generic emails (gmail, hotmail) — put them last
  const custom = emails.filter(
    (e) => !e.includes("gmail.") && !e.includes("hotmail.") && !e.includes("yahoo.") && !e.includes("outlook."),
  );
  const generic = emails.filter(
    (e) => e.includes("gmail.") || e.includes("hotmail.") || e.includes("yahoo.") || e.includes("outlook."),
  );

  return [...custom, ...generic];
}

function extractEmailsFromFooter(html: string, websiteDomain: string | null): string[] {
  // Try to extract emails specifically from footer sections
  const footerPatterns = [
    /<footer[^>]*>([\s\S]*?)<\/footer>/gi,
    /<div[^>]*class="[^"]*footer[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*id="[^"]*contact[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
  ];

  for (const pattern of footerPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const footerEmails = extractEmails(match[1], websiteDomain);
      if (footerEmails.length > 0) return footerEmails;
    }
  }

  // Also check meta tags
  const metaMatch = html.match(/<meta[^>]*(?:name|property)="[^"]*(?:contact|email)[^"]*"[^>]*content="([^"]+)"/i);
  if (metaMatch) {
    const emails = extractEmails(metaMatch[1], websiteDomain);
    if (emails.length > 0) return emails;
  }

  return [];
}

function isBlacklisted(email: string): boolean {
  return EMAIL_BLACKLIST.some((bl) => email.includes(bl));
}

function extractInstagram(html: string): string | null {
  const igRegex = /instagram\.com\/([a-zA-Z0-9._]+)/gi;
  const matches = Array.from(html.matchAll(igRegex));
  const excluded = ["p", "reel", "stories", "explore", "accounts", "about", "developer", "legal"];

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

async function enrichFromInstagram(handle: string): Promise<string | null> {
  try {
    const html = await fetchPage(`https://www.instagram.com/${handle}/`, 5000);
    if (!html) return null;

    // Instagram embeds profile data in meta tags and JSON-LD
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const allEmails = html.match(emailRegex) || [];

    for (const email of allEmails) {
      const lower = email.toLowerCase();
      if (!isBlacklisted(lower)) return lower;
    }
  } catch {
    // Instagram may block — fail silently
  }
  return null;
}

export async function enrichContactDeep(
  website: string,
  instagramHandle?: string | null,
): Promise<EnrichResult> {
  const domain = getDomain(website);
  let foundInstagram: string | null = null;

  // 1. Try homepage
  const homeHtml = await fetchPage(website);
  if (homeHtml) {
    const emails = extractEmails(homeHtml, domain);
    foundInstagram = extractInstagram(homeHtml);

    if (emails.length > 0) {
      return {
        email: emails[0],
        instagram: foundInstagram,
        email_source: "website_home",
      };
    }

    // 2. Try footer/meta specifically
    const footerEmails = extractEmailsFromFooter(homeHtml, domain);
    if (footerEmails.length > 0) {
      return {
        email: footerEmails[0],
        instagram: foundInstagram,
        email_source: "website_footer",
      };
    }
  }

  // 3. Try contact/about subpages
  for (const path of CONTACT_PATHS) {
    const baseUrl = website.replace(/\/$/, "");
    const html = await fetchPage(`${baseUrl}${path}`);
    if (html) {
      const emails = extractEmails(html, domain);
      const ig = extractInstagram(html);
      if (!foundInstagram && ig) foundInstagram = ig;

      if (emails.length > 0) {
        return {
          email: emails[0],
          instagram: foundInstagram || ig,
          email_source: `website${path}`,
        };
      }
    }
  }

  // 4. Try Instagram bio
  const igHandle = instagramHandle || foundInstagram;
  if (igHandle) {
    const igEmail = await enrichFromInstagram(igHandle);
    if (igEmail) {
      return {
        email: igEmail,
        instagram: igHandle,
        email_source: "instagram_bio",
      };
    }
  }

  return {
    email: null,
    instagram: foundInstagram || igHandle || null,
    email_source: null,
  };
}
