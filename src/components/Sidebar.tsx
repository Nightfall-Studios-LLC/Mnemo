import { Icon } from "./Icons";
import mnemoLogo from "../assets/mnemo.svg";
import { Button } from "@heroui/react";

export type Page = "Library" | "Backups" | "Providers" | "Activity" | "Settings";
const items: [Page, string, string][] = [["Library", "library", "Library"], ["Backups", "backups", "Backups"], ["Providers", "cloud", "Storage"], ["Activity", "activity", "Activity"]];

export function Sidebar({ page, collapsed, onChange, onCollapse }: { page: Page; collapsed: boolean; onChange: (p: Page) => void; onCollapse: () => void }) {
  return <aside className="sidebar">
    <div className="brand"><img src={mnemoLogo} alt=""/><strong>mnemo</strong></div>
    <nav aria-label="Main navigation">{items.map(([pageId, icon, label]) => <Button variant="ghost" aria-label={collapsed ? label : undefined} key={pageId} className={page === pageId ? "active" : ""} onPress={() => onChange(pageId)}><Icon name={icon}/><span>{label}</span></Button>)}</nav>
    <div className="sidebar-bottom">
      <Button variant="ghost" className={`settings-link ${page === "Settings" ? "active" : ""}`} aria-label={collapsed ? "Settings" : undefined} onPress={() => onChange("Settings")}><Icon name="settings"/><span>Settings</span></Button>
      <div className="system-health" role="status"><i/><span>All systems operational</span></div>
      <Button isIconOnly size="sm" variant="ghost" className="collapse" onPress={onCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><Icon name="collapse"/></Button>
    </div>
  </aside>;
}
