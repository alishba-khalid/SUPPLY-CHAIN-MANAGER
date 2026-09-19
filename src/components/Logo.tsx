interface LogoProps {
  className?: string;
  size?: number;
  /**
   * "solid" (default): every stroke/fill uses currentColor, so the mark is
   * one flat color set by the parent's `color` — this is the tile treatment
   * used in the nav/sidebar/footer.
   * "accent": the checkmark stroke is hardcoded to #5FD6AA instead of
   * currentColor — the two-tone look for placing the mark directly on a
   * dark background (no tile) rather than inside the green tile.
   */
  variant?: "solid" | "accent";
}

export function Logo({ className, size = 32, variant = "solid" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Supply Chain Manager"
      className={className}
    >
      <path d="M25 7h14v7a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V7Z" fill="currentColor" />
      <rect x="11" y="14" width="42" height="43" rx="11" stroke="currentColor" strokeWidth="4" />
      <path
        d="M23 36.5 30 43.5 44 29"
        stroke={variant === "accent" ? "#5FD6AA" : "currentColor"}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
