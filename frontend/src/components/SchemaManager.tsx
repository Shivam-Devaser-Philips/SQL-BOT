import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import {
  Database,
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
  Table,
  RefreshCw,
} from "lucide-react";

interface ColumnInfo {
  name: string;
  type: string;
  pk: boolean;
}

interface TableInfo {
  columns: ColumnInfo[];
  foreign_keys: { from_col: string; to_table: string; to_col: string }[];
}

interface UploadRecord {
  id: number;
  name: string;
  file_type: string;
  summary: string | null;
  created_at: string;
}

export function SchemaManager() {
  const [schema, setSchema] = useState<Record<string, TableInfo>>({});
  const [engine, setEngine] = useState("sqlite");
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSchema = async () => {
    try {
      const res = await api.get("/api/schema/active");
      setSchema(res.data.schema || {});
      setEngine(res.data.engine || "sqlite");
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      setError(detail || "Failed to fetch active schema.");
    }
  };

  const fetchUploads = async () => {
    try {
      const res = await api.get("/api/schema/uploads");
      setUploads(res.data);
    } catch {
      setError("Failed to fetch upload history.");
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchSchema(), fetchUploads()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/api/schema/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMessage(res.data.message);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadAll();
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      setError(detail || "Failed to upload schema.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUpload = async (id: number) => {
    if (!confirm("Remove this upload record from history?")) return;
    try {
      await api.delete(`/api/schema/uploads/${id}`);
      setUploads((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError("Failed to delete upload record.");
    }
  };

  const tableNames = Object.keys(schema).sort();

  return (
    <div className="h-full flex flex-col bg-slate-950 p-6 gap-5 overflow-hidden">
      <div className="flex justify-between items-start shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            Schema Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live database schema ({engine}) and DDL upload management
          </p>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="text-slate-400 hover:text-white p-2 rounded-lg border border-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm shrink-0">
          {error}
        </div>
      )}
      {uploadMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm shrink-0">
          {uploadMessage}
        </div>
      )}

      <div className="flex-1 grid grid-cols-2 gap-5 min-h-0">
        {/* Active Schema */}
        <div className="flex flex-col border border-slate-800 rounded-lg bg-slate-900/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 shrink-0">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Table className="w-4 h-4 text-blue-400" />
              Active Tables ({tableNames.length})
            </h3>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-1">
            {tableNames.length === 0 ? (
              <p className="text-slate-500 text-xs italic p-2">No tables found.</p>
            ) : (
              tableNames.map((name) => {
                const info = schema[name];
                const isOpen = expandedTables.has(name);
                return (
                  <div key={name} className="border border-slate-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleTable(name)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-slate-800/60 transition-colors text-left"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span className="font-mono text-xs">{name}</span>
                      <span className="text-[10px] text-slate-500 ml-auto">
                        {info.columns.length} cols
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2 bg-slate-950/40">
                        <table className="w-full text-[10px] text-slate-400">
                          <thead>
                            <tr className="text-slate-500 uppercase">
                              <th className="text-left py-1">Column</th>
                              <th className="text-left py-1">Type</th>
                              <th className="text-left py-1">Key</th>
                            </tr>
                          </thead>
                          <tbody>
                            {info.columns.map((col) => (
                              <tr key={col.name} className="font-mono">
                                <td className="py-0.5 text-green-400">{col.name}</td>
                                <td className="py-0.5">{col.type}</td>
                                <td className="py-0.5">
                                  {col.pk ? (
                                    <span className="text-amber-400">PK</span>
                                  ) : (
                                    ""
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {info.foreign_keys.length > 0 && (
                          <div className="text-[10px] text-slate-500 space-y-0.5">
                            {info.foreign_keys.map((fk, i) => (
                              <div key={i}>
                                FK {fk.from_col} → {fk.to_table}.{fk.to_col}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upload Management */}
        <div className="flex flex-col gap-4 min-h-0">
          <form
            onSubmit={handleUpload}
            className="border border-slate-800 rounded-lg bg-slate-900/60 p-4 shrink-0"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-blue-400" />
              Upload DDL / Schema
            </h3>
            <input
              type="file"
              ref={fileInputRef}
              accept=".sql,.ddl,.json"
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-500 mb-3"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Upload & Execute
            </button>
          </form>

          <div className="flex-1 flex flex-col border border-slate-800 rounded-lg bg-slate-900/60 overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-semibold text-white">
                Upload History ({uploads.length})
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {uploads.length === 0 ? (
                <p className="text-slate-500 text-xs italic p-2">
                  No uploads yet.
                </p>
              ) : (
                uploads.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-start justify-between gap-2 p-3 border border-slate-800 rounded-lg bg-slate-950/40"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-white font-medium truncate">
                        {u.name}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {u.file_type} ·{" "}
                        {new Date(u.created_at).toLocaleDateString()}
                      </p>
                      {u.summary && (
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                          {u.summary}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteUpload(u.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 shrink-0 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
