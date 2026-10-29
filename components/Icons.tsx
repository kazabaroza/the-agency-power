/** Small line-icon set (24px grid, currentColor) used across the marketing pages. */
type P = { className?: string };
const base = (path: React.ReactNode, className = "h-6 w-6") => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {path}
  </svg>
);

export const IconImage = ({ className }: P) => base(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 9" /></>, className);
export const IconLayout = ({ className }: P) => base(<><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M3 9h18M9 21V9" /></>, className);
export const IconVideo = ({ className }: P) => base(<><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="m15.5 10 6-3.5v11l-6-3.5" /></>, className);
export const IconCalendar = ({ className }: P) => base(<><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M8 3v4M16 3v4M3 10h18" /></>, className);
export const IconChart = ({ className }: P) => base(<><path d="M4 20V4M4 20h16" /><path d="m8 15 3.5-4 3 2.5L20 7" /></>, className);
export const IconSearch = ({ className }: P) => base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, className);
export const IconShield = ({ className }: P) => base(<><path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>, className);
export const IconChat = ({ className }: P) => base(<><path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-5 4V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8Z" /></>, className);
export const IconUsers = ({ className }: P) => base(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.8 2.6 3 5.2" /></>, className);
export const IconCheck = ({ className }: P) => base(<path d="m5 12.5 4.5 4.5L19 7.5" />, className);
export const IconArrow = ({ className }: P) => base(<path d="M19 12H5m6-6-6 6 6 6" />, className);
export const IconBolt = ({ className }: P) => base(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />, className);
export const IconPlug = ({ className }: P) => base(<><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7Z" /><path d="M12 17v5" /></>, className);
export const IconFolder = ({ className }: P) => base(<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />, className);
export const IconTarget = ({ className }: P) => base(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" /></>, className);
export const IconPalette = ({ className }: P) => base(<><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.5-1.2-1.8-1.2-3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="14.5" cy="7" r="1" /></>, className);
