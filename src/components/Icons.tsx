import type { SVGProps } from "react";
import { ArchiveRestore, ArrowUpDown, ChevronDown, ChevronRight, CircleCheck, CircleX, Clock3, Cloud, FolderOpen, HardDrive, History, House, Library, ListFilter, MoreVertical, Pencil, Plus, RefreshCw, Search, Settings, TriangleAlert, Upload, type LucideIcon } from "lucide-react";
import driveIcon from "../assets/drive.svg";
import megaIcon from "../assets/mega.png";

type P = SVGProps<SVGSVGElement> & { size?: number; name: string };
const icons: Record<string, LucideIcon> = { library: Library, backups: ArchiveRestore, cloud: Cloud, activity: Clock3, settings: Settings, search: Search, filter: ListFilter, upload: Upload, refresh: RefreshCw, plus: Plus, more: MoreVertical, folder: FolderOpen, edit: Pencil, restore: History, chevron: ChevronRight, down: ChevronDown, sort: ArrowUpDown, home: House };

export function Icon({ name, size = 20, ...props }: P) {
  const Component = icons[name] ?? CircleCheck;
  return <Component size={size} strokeWidth={1.8} aria-hidden="true" {...props}/>;
}

export function ProviderIcon({ type }: { type: string }) {
  if (type === "drive") return <span className="provider drive" title="Google Drive"><img src={driveIcon} alt=""/></span>;
  if (type === "mega") return <span className="provider mega" title="MEGA"><img src={megaIcon} alt=""/></span>;
  return <span className={`provider ${type}`} title={type === "nas" ? "NAS" : "Local folder"}><HardDrive size={21} strokeWidth={1.7}/></span>;
}

export function StatusIcon({ status }: { status: string }) {
  const Component = status === "healthy" ? CircleCheck : status === "warning" ? TriangleAlert : CircleX;
  return <span className={`status-icon ${status}`} aria-label={status}><Component size={21} strokeWidth={2}/></span>;
}
