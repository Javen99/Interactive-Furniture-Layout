import { Download, Upload } from "lucide-react";

type JsonPanelProps = {
  json: string;
  error: string | null;
  onJsonChange: (json: string) => void;
  onExport: () => void;
  onImport: () => void;
};

export default function JsonPanel({ json, error, onJsonChange, onExport, onImport }: JsonPanelProps) {
  return (
    <section className="panel json-panel">
      <div className="panel-title">
        <Download size={18} />
        <h2>Scene JSON</h2>
      </div>
      <textarea value={json} onChange={(event) => onJsonChange(event.target.value)} spellCheck={false} />
      {error ? <div className="json-error">{error}</div> : null}
      <div className="button-row">
        <button type="button" onClick={onExport}>
          <Download size={16} />
          Export
        </button>
        <button type="button" onClick={onImport}>
          <Upload size={16} />
          Import
        </button>
      </div>
    </section>
  );
}

