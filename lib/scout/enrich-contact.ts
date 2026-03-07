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
    /<div[^>]*id="[^"]*footer[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const pattern of footerPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const footerEmails = extractEmails(match[1], websiteDomain);
      if (footerEmails.length > 0) return footerEmails;
    }
  }

  // Check meta tags for contact/email info
  const metaPatterns = [
    /<meta[^>]*(?:name|property)="[^"]*(?:contact|email)[^"]*"[^>]*content="([^"]+)"/gi,
    /<meta[^>]*content="([^"]+)"[^>]*(?:name|property)="[^"]*(?:contact|email)[^"]*"/gi,
  ];

  for (const pattern of metaPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const emails = extractEmails(match[1], websiteDomain);
      if (emails.length > 0) return emails;
    }
  }

  // Check <a> tags inside footer-like sections for mailto
  const footerLinkPattern = /<footer[^>]*>[\s\S]*?<a[^>]*href="mailto:([^"]+)"[^>]*>/gi;
  let linkMatch;
  while ((linkMatch = footerLinkPattern.exec(html)) !== null) {
    const email = linkMatch[1].toLowerCase();
    if (!isBlacklisted(email)) return [email];
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

/**
 * Prioritized email ranking:
 * 1. Email with own website domain (e.g. contacto@ouioui.cl)
 * 2. Email from mailto: link
 * 3. Email scraped from HTML
 * 4. Email from Instagram bio
 * 5. Generic email (gmail, hotmail) as last resort
 */
function pickBestEmail(
  candidates: Array<{ email: string; source: string }>,
  websiteDomain: string | null,
): { email: string; source: string } | null {
  if (candidates.length === 0) return null;

  // 1. Own domain emails first
  if (websiteDomain) {
    const ownDomain = candidates.find((c) => c.email.includes(websiteDomain));
    if (ownDomain) return ownDomain;
  }

  // 2. Non-generic emails
  const nonGeneric = candidates.find(
    (c) =>
      !c.email.includes("gmail.") &&
      !c.email.includes("hotmail.") &&
      !c.email.includes("yahoo.") &&
      !c.email.includes("outlook."),
  );
  if (nonGeneric) return nonGeneric;

  // 3. Any email (generic as last resort)
  return candidates[0];
}

export async function enrichContactDeep(
  website: string,
  instagramHandle?: string | null,
): Promise<EnrichResult> {
  const domain = getDomain(website);
  let foundInstagram: string | null = null;
  const emailCandidates: Array<{ email: string; source: string }> = [];

  // 1. Try homepage
  const homeHtml = await fetchPage(website);
  if (homeHtml) {
    const emails = extractEmails(homeHtml, domain);
    foundInstagram = extractInstagram(homeHtml);

    for (const email of emails) {
      emailCandidates.push({ email, source: "website_home" });
    }

    // 2. Try footer/meta specifically (if no own-domain email found yet)
    if (!emailCandidates.some((c) => domain && c.email.includes(domain))) {
      const footerEmails = extractEmailsFromFooter(homeHtml, domain);
      for (const email of footerEmails) {
        if (!emailCandidates.some((c) => c.email === email)) {
          emailCandidates.push({ email, source: "website_footer" });
        }
      }
    }
  }

  // 3. Try contact/about subpages (if no own-domain email found yet)
  if (!emailCandidates.some((c) => domain && c.email.includes(domain))) {
    for (const path of CONTACT_PATHS) {
      const baseUrl = website.replace(/\/$/, "");
      const html = await fetchPage(`${baseUrl}${path}`);
      if (html) {
        const emails = extractEmails(html, domain);
        const ig = extractInstagram(html);
        if (!foundInstagram && ig) foundInstagram = ig;

        for (const email of emails) {
          if (!emailCandidates.some((c) => c.email === email)) {
            emailCandidates.push({ email, source: `website${path}` });
          }
        }

        // If we found an own-domain email, stop searching subpages
        if (domain && emails.some((e) => e.includes(domain))) break;
      }
    }
  }

  // 4. Try Instagram bio
  const igHandle = instagramHandle || foundInstagram;
  if (igHandle) {
    const igEmail = await enrichFromInstagram(igHandle);
    if (igEmail && !emailCandidates.some((c) => c.email === igEmail)) {
      emailCandidates.push({ email: igEmail, source: "instagram_bio" });
    }
  }

  // Pick the best email based on priority
  const best = pickBestEmail(emailCandidates, domain);

  if (best) {
    return {
      email: best.email,
      instagram: foundInstagram || igHandle || null,
      email_source: best.source,
    };
  }

  return {
    email: null,
    instagram: foundInstagram || igHandle || null,
    email_source: null,
  };
}
