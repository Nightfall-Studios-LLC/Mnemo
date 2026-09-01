import { useState } from "react";
import { Icon } from "./Icons";

export function PathDialog({ title, confirmLabel, onClose, onConfirm, initial = "" }: { title: string; confirmLabel: string; onClose: () => void; onConfirm: (path: string, name: string) => void; initial?: string }) {
  const [name, setName] = useState(""); const [path, setPath] = useState(initial);
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={e => { e.preventDefault(); if (path.trim()) onConfirm(path.trim(), name.trim()); }}><h3>{title}</h3><p>Choose a readable save location or backup destination.</p><label>Name (optional)<input value={name} onChange={e => setName(e.target.value)} placeholder="My save target"/></label><label>Folder path<div className="path-input"><input autoFocus value={path} onChange={e => setPath(e.target.value)} placeholder="C:\\Games\\Saves"/><Icon name="folder"/></div></label><div><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={!path.trim()}>{confirmLabel}</button></div></form></div>;
}

export function ConfirmDialog({ title, message, confirmLabel, danger, onClose, onConfirm }: { title: string; message: string; confirmLabel: string; danger?: boolean; onClose: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><div className="modal"><h3>{title}</h3><p>{message}</p><div><button onClick={onClose}>Cancel</button><button className={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}
