import type { SVGProps } from "react";
import {
  ArchiveRestore,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleX,
  Clock3,
  Cloud,
  EllipsisVertical,
  Folder,
  Gamepad2,
  HardDrive,
  History,
  Library,
  ListFilter,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  TriangleAlert,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

type P = SVGProps<SVGSVGElement> & { size?: number; name: string };
const icons: Record<string, LucideIcon> = {
  library: Library,
  backups: ArchiveRestore,
  cloud: Cloud,
  storage: HardDrive,
  folder: Folder,
  activity: Clock3,
  settings: Settings,
  search: Search,
  filter: ListFilter,
  upload: Upload,
  plus: Plus,
  restore: History,
  chevron: ChevronRight,
  collapse: ChevronLeft,
  down: ChevronDown,
  check: Check,
  more: EllipsisVertical,
  game: Gamepad2,
  refresh: RefreshCw,
  "window-minimize": Minus,
  "window-close": X,
};

export function Icon({ name, size = 20, ...props }: P) {
  const Component = icons[name] ?? CircleCheck;
  return (
    <Component size={size} strokeWidth={1.8} aria-hidden="true" {...props} />
  );
}

export function ProviderIcon({ type }: { type: string }) {
  if (type === "nas")
    return (
      <span className="provider nas" title="Network storage">
        <Server size={20} strokeWidth={1.8} />
      </span>
    );
  return (
    <span className="provider local" title="Local folder">
      <HardDrive size={20} strokeWidth={1.8} />
    </span>
  );
}

export function StatusIcon({ status }: { status: string }) {
  const Component =
    status === "healthy"
      ? CircleCheck
      : status === "warning"
        ? TriangleAlert
        : status === "neutral"
          ? Circle
          : CircleX;
  return (
    <span className={`status-icon ${status}`} aria-label={status}>
      <Component size={21} strokeWidth={2} />
    </span>
  );
}
