import { Icon } from "./Icons";
import { Button } from "@heroui/react";
import { SelectMenu } from "./SelectMenu";

export function Toolbar({
  search,
  onSearch,
  filter,
  onFilter,
  sort,
  onSort,
  onBackupAll,
  disabled = false,
}: {
  search: string;
  onSearch: (v: string) => void;
  filter: boolean;
  onFilter: () => void;
  sort: string;
  onSort: (v: string) => void;
  onBackupAll: () => void;
  disabled?: boolean;
}) {
  return (
    <header className="toolbar">
      <label className="search">
        <Icon name="search" />
        <span className="sr-only">Search games</span>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search your library"
        />
      </label>
      <Button
        className={`quiet-control ${filter ? "selected" : ""}`}
        variant="ghost"
        aria-pressed={filter}
        onPress={onFilter}
      >
        <Icon name="filter" />
        Needs attention
      </Button>
      <SelectMenu
        className="library-select"
        label="Sort games"
        value={sort}
        onChange={onSort}
        options={[
          { value: "last", label: "Recently played" },
          { value: "name", label: "Name" },
          { value: "targets", label: "Save count" },
        ]}
      />
      <Button
        className="mnemo-button secondary backup-all"
        variant="outline"
        isDisabled={disabled}
        onPress={onBackupAll}
      >
        <Icon name="upload" />
        Back Up All
      </Button>
    </header>
  );
}
