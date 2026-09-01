import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
export function Icon({ name, size = 20, ...props }: P & { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    library: <><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M9 20v-6h6v6"/></>,
    backups: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 5V3h8v2M9 9h6"/></>,
    cloud: <path d="M6 19h12a4 4 0 0 0 .7-7.94A7 7 0 0 0 5.2 9.1 5 5 0 0 0 6 19Z"/>,
    activity: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.6-1.4.9-2-2.1-2.1-2 .9-1.4-.6L10.5 2h-3l-.7 2-1.4.6-2-.9-2.1 2.1.9 2-.6 1.4-2 .7v3l2 .7.6 1.4-.9 2 2.1 2.1 2-.9 1.4.6.7 2h3l.7-2 1.4-.6 2 .9 2.1-2.1-.9-2 .6-1.4Z" transform="translate(2) scale(.84)"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>,
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8z"/>,
    upload: <><path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M4 14v6h16v-6"/></>,
    refresh: <><path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 5v6h-6"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    more: <><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></>,
    folder: <path d="M3 6h7l2 2h9v11H3z"/>,
    edit: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10z"/><path d="m13.5 7 3.5 3.5"/></>,
    restore: <><path d="M4 9V4m0 0h5"/><path d="M5 5a9 9 0 1 1-1 10"/></>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    down: <path d="m6 9 6 6 6-6"/>,
    sort: <path d="m8 7 4-4 4 4M12 3v18m4-4-4 4-4-4"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export function ProviderIcon({ type }: { type: string }) {
  if (type === "drive") return <span className="provider drive" title="Google Drive"><i/><i/><i/></span>;
  if (type === "mega") return <span className="provider mega" title="MEGA">M</span>;
  if (type === "nas") return <span className="provider nas" title="NAS"><i/><i/></span>;
  return <span className="provider local" title="Local folder"><span>▰</span></span>;
}

export function StatusIcon({ status }: { status: string }) {
  return <span className={`status-icon ${status}`} aria-label={status}>{status === "healthy" ? "✓" : status === "warning" ? "!" : "×"}</span>;
}
