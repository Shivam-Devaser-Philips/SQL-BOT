import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  History,
  Search,
  Trash2,
  Play,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface HistoryItem {
  id: number;
  username: string | null;
  prompt: string;
  sql: string;
  query_type: string;
  timestamp: string;
}

export default function QueryHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rerunResult, setRerunResult] = useState<{
    id: number;
    columns: string[];
    rows: Record<string, unknown>[];
    engine: string;
  } | null>(null);

  const fetchHistory = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = query ? { search: query } : {};
      const res = await api.get("/api/history/", { params });
      setItems(res.data);
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      setError(detail || "Failed to load query history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(search.trim() || undefined);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this history entry?")) return;
    try {
      await api.delete(`/api/history/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      setError("Failed to delete history item.");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all query history? This cannot be undone.")) return;
    try {
      await api.delete("/api/history/");
      setItems([]);
      setExpandedId(null);
      setRerunResult(null);
    } catch {
      setError("Failed to clear history.");
    }
  };

  const handleRerun = async (id: number) => {
    try {
      const res = await api.post(`/api/history/re-run/${id}`);
      setRerunResult({
        id,
        columns: res.data.columns || [],
        rows: res.data.rows || [],
        engine: res.data.engine || "sqlite",
      });
      setExpandedId(id);
    } catch {
      setError("Failed to re-run query.");
    }
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="h-full flex flex-col bg-slate-950 p-6 gap-5 overflow-hidden">
      <div className="flex justify-between items-start shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            Query History
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review past NL prompts, generated SQL, and re-run queries
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts or SQL..."
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            fetchHistory();
          }}
          className="text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-3 min-h-0">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading history...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm italic">
            No query history yet. Ask a question in the Chat Assistant.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="border border-slate-800 rounded-lg bg-slate-900/60 overflow-hidden"
            >
              <div className="p-4 flex items-start justify-between gap-4">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {item.query_type}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatDate(item.timestamp)}
                    </span>
                    {item.username && (
                      <span className="text-[10px] text-slate-500">
                        by {item.username}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white truncate">{item.prompt}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleRerun(item.id)}
                    title="Re-run query"
                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedId === item.id && (
                <div className="border-t border-slate-800 p-4 bg-slate-950/60 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Generated SQL
                    </p>
                    <pre className="text-xs font-mono text-green-400 bg-slate-950 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {item.sql}
                    </pre>
                  </div>

                  {rerunResult?.id === item.id && rerunResult.rows.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                        Re-run Results ({rerunResult.engine})
                      </p>
                      <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                        <table className="w-full text-xs text-left text-slate-300">
                          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                            <tr>
                              {rerunResult.columns.map((col) => (
                                <th
                                  key={col}
                                  className="px-3 py-2 border-b border-slate-800"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rerunResult.rows.map((row, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-slate-800/80"
                              >
                                {rerunResult.columns.map((col) => (
                                  <td key={col} className="px-3 py-2">
                                    {String(row[col] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
