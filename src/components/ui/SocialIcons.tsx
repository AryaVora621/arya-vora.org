"use client";

import { cn } from "@/lib/utils";

interface SocialIconProps {
  className?: string;
  size?: number;
  "aria-label"?: string;
}

export function GithubIcon({ className, size = 24, "aria-label": ariaLabel = "GitHub", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function LinkedinIcon({ className, size = 24, "aria-label": ariaLabel = "LinkedIn", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function TwitterIcon({ className, size = 24, "aria-label": ariaLabel = "Twitter", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.24-3.296 3.334-8.496-9.27-8.456 9.227-3.324-3.313 8.501-9.23-7.238-8.218h3.32l7.13 8.158 7.174-8.158z" />
    </svg>
  );
}

export function MailIcon({ className, size = 24, "aria-label": ariaLabel = "Email", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={ariaLabel}
      {...props}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export function MapPinIcon({ className, size = 24, "aria-label": ariaLabel = "Location", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function SendIcon({ className, size = 24, "aria-label": ariaLabel = "Send", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

export function MessageSquareIcon({ className, size = 24, "aria-label": ariaLabel = "Message", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function Loader2Icon({ className, size = 24, "aria-label": ariaLabel = "Loading", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("animate-spin text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function CheckCircleIcon({ className, size = 24, "aria-label": ariaLabel = "Success", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function ArrowRightIcon({ className, size = 24, "aria-label": ariaLabel = "Arrow right", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function ExternalLinkIcon({ className, size = 24, "aria-label": ariaLabel = "External link", ...props }: SocialIconProps) {
  return (
    <svg
      className={cn("text-current", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={ariaLabel}
      {...props}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}