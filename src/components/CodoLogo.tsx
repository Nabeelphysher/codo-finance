import { cn } from "@/lib/utils";

interface CodoLogoProps {
  className?: string;
}

export const CodoLogo = ({ className }: CodoLogoProps) => {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="CODO logo"
      className={cn("h-10 w-10", className)}
    >
      <title>CODO</title>
      <path
        fill="#0F1D3B"
        d="M6.5 18.2c0-3.2 3.4-5.2 6.3-3.6l19.5 10.8c3.1 1.7 3.1 6.1 0 7.8l-19.5 10.8c-2.9 1.6-6.3-.4-6.3-3.6V18.2Z"
      />
      <path
        fill="#0F1D3B"
        d="M6.5 47.7c0-3.2 3.4-5.2 6.3-3.6l9.8 5.4c3.1 1.7 3.1 6.1 0 7.8l-9.8 5.4c-2.9 1.6-6.3-.4-6.3-3.6v-5.8Z"
      />
      <rect x="32" y="6" width="21" height="26" rx="10.5" fill="#0F1D3B" />
      <rect x="32" y="36" width="21" height="22" rx="10.5" fill="#1FB26A" />
    </svg>
  );
};


