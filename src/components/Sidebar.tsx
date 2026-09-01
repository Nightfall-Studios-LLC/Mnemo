import { Icon } from "./Icons";

export type Page = "Library" | "Backups" | "Providers" | "Activity" | "Settings";
const items: [Page, string][] = [["Library", "library"], ["Backups", "backups"], ["Providers", "cloud"], ["Activity", "activity"], ["Settings", "settings"]];

export function Sidebar({ page, onChange }: { page: Page; onChange: (p: Page) => void }) {
  return <aside className="sidebar">
    <div className="brand"><img src="/src/assets/mnemo.svg"/><strong>mnemo</strong></div>
    <nav>{items.map(([label, icon]) => <button key={label} className={page === label ? "active" : ""} onClick={() => onChange(label)}><Icon name={icon}/><span>{label}</span></button>)}</nav>
    <button className="collapse" title="Collapse sidebar">«</button>
  </aside>;
}
