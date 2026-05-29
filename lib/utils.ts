import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const portfolioUrlValidators: Record<string, RegExp> = {
  youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
  vimeo: /^https?:\/\/(www\.)?vimeo\.com\/.+/,
  drive: /^https?:\/\/drive\.google\.com\/.+/,
  website: /^https:\/\/.+/,
  social: /^https?:\/\/(www\.)?(instagram\.com|twitter\.com|x\.com|tiktok\.com|linkedin\.com)\/.+/,
};

export function validatePortfolioUrl(type: string, url: string): { valid: boolean; reason?: string } {
  const validator = portfolioUrlValidators[type];
  if (!validator) {
    return { valid: false, reason: `Unknown portfolio type: ${type}` };
  }
  if (!validator.test(url)) {
    return { valid: false, reason: `URL does not match expected format for ${type}` };
  }
  return { valid: true };
}

export function calculateProfileCompletion(user: {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  is_public: boolean;
  social_links: Record<string, string>;
}, portfolioItems: Array<{ type: string }>): number {
  let points = 0;

  if (user.full_name) points += 1;
  if (user.avatar_url) points += 1;
  if (user.bio) points += 1;
  if (user.location) points += 1;
  if (user.website_url) points += 1;
  if (Object.keys(user.social_links).length > 0) points += 1;

  const hasVideoPortfolio = portfolioItems.some((i) => i.type === "youtube" || i.type === "vimeo");
  if (hasVideoPortfolio) points += 2;

  const hasOtherPortfolio = portfolioItems.some((i) => i.type !== "youtube" && i.type !== "vimeo");
  if (hasOtherPortfolio) points += 1;

  if (user.is_public) points += 1;

  return Math.round((points / 10) * 100);
}
