import { Icon } from "./Icons";
import { Button } from "@heroui/react";

export function Toolbar({ search, onSearch, filter, onFilter, sort, onSort, onBackupAll }: { search: string; onSearch: (v: string) => void; filter: boolean; onFilter: () => void; sort: string; onSort: (v: string) => void; onBackupAll: () => void }) {
  return <header className="toolbar" data-tauri-drag-region>
    <label className="search"><Icon name="search"/><span className="sr-only">Search games</span><input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search your library"/></label>
    <Button className={`quiet-control ${filter ? "selected" : ""}`} variant="ghost" aria-pressed={filter} onPress={onFilter}><Icon name="filter"/>Needs attention</Button>
    <label className="sort-control"><span className="sr-only">Sort games</span><select value={sort} onChange={e => onSort(e.target.value)}><option value="last">Recently played</option><option value="name">Name</option><option value="targets">Save count</option></select><Icon name="down" size={15}/></label>
    <Button className="mnemo-button secondary backup-all" variant="outline" onPress={onBackupAll}><Icon name="upload"/>Back Up All</Button>
  </header>;
}
