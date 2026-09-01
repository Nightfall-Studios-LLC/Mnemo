import { Icon } from "./Icons";

export function Toolbar({ search, onSearch, filter, onFilter, sort, onSort, onBackupAll }: { search: string; onSearch: (v: string) => void; filter: boolean; onFilter: () => void; sort: string; onSort: (v: string) => void; onBackupAll: () => void }) {
  return <header className="toolbar">
    <label className="search"><Icon name="search"/><input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search games..."/></label>
    <button className={filter ? "control selected" : "control"} onClick={onFilter}><Icon name="filter"/>Filter</button>
    <label className="sort-control">Sort: <select value={sort} onChange={e => onSort(e.target.value)}><option value="last">Last Played</option><option value="name">Name</option><option value="targets">Save Targets</option></select><Icon name="down" size={17}/></label>
    <button className="control backup-all" onClick={onBackupAll}><Icon name="upload"/>Back Up All</button>
  </header>;
}
