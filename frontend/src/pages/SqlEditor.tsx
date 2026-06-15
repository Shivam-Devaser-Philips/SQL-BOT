import React, { useState } from "react";
import api from "../services/api";
import { Play, Download, HelpCircle, Code, Award, CheckCircle, AlertTriangle } from "lucide-react";

export default function SqlEditor() {
  const [sql, setSql] = useState("SELECT * FROM customers FETCH FIRST 10 ROWS ONLY");
  const [results, setResults] = useState<{ columns: string[]; rows: any[]; engine: string } | null>(null);
  const [plan, setPlan] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dmlWarning, setDmlWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const runQuery = async (forceDml = false) => {
    setLoading(true);
    setError(null);
    setDmlWarning(null);
    setSuccessMsg(null);
    setPlan(null);

    // Basic frontend safety warning for DML
    const cleanSql = sql.toUpperCase().trim();
    const isWrite = ["INSERT", "UPDATE", "DELETE", "MERGE"].some(k => cleanSql.includes(k));
    const isDdl = ["DROP", "TRUNCATE", "ALTER", "CREATE"].some(k => cleanSql.includes(k));

    if (isDdl) {
      setError("DDL / Administrative schema operations are rejected inside the SQL Editor for security.");
      setLoading(false);
      return;
    }

    if (isWrite && !forceDml) {
      setDmlWarning("Caution: You are about to execute a write operation (INSERT/UPDATE/DELETE). Do you want to proceed?");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/api/schema/execute", {
        sql,
        confirm_dml: forceDml,
      });
      if (res.data.status === "error") {
        setError(res.data.detail);
      } else {
        setResults({
          columns: res.data.columns,
          rows: res.data.rows,
          engine: res.data.engine
        });
        setPlan(res.data.plan);
        setSuccessMsg(`Query executed successfully in ${res.data.engine} database.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Execution failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!results || results.rows.length === 0) return;
    const headers = results.columns.join(",");
    const csvRows = results.rows.map(row => 
      results.columns.map(col => `"${String(row[col] || "").replace(/"/g, '""')}"`).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "query_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 p-6 gap-6 overflow-hidden">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Code className="w-5.5 h-5.5 text-blue-500" />
            Oracle SQL Sandbox
          </h2>
          <p className="text-xs text-slate-400">Directly query the database engine with validation and safety warnings</p>
        </div>
      </div>

      <div className="flex-1 grid grid-rows-2 gap-4 min-h-0">
        {/* SQL Input Area */}
        <div className="flex flex-col border border-slate-800 rounded-lg bg-slate-900 overflow-hidden">
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SQL Input</span>
            <div className="flex gap-2">
              <button
                onClick={() => runQuery(false)}
                disabled={loading || !sql.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-1 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                Run Query
              </button>
            </div>
          </div>
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            className="flex-1 p-4 bg-slate-950 text-green-400 font-mono text-xs focus:outline-none resize-none"
            spellCheck="false"
          />
        </div>

        {/* Results Area */}
        <div className="flex flex-col border border-slate-800 rounded-lg bg-slate-900 overflow-hidden min-h-0">
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Results Workbench</span>
            {results && results.rows.length > 0 && (
              <button
                onClick={downloadCsv}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-mono">
                <p className="font-semibold">Execution Error:</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {dmlWarning && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs flex flex-col gap-3">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  Write Approval Confirmation
                </div>
                <p>{dmlWarning}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => runQuery(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded font-medium"
                  >
                    Confirm Execution
                  </button>
                  <button
                    onClick={() => setDmlWarning(null)}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-3 py-1.5 rounded font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-4 h-4" />
                {successMsg}
              </div>
            )}

            {results && results.rows.length === 0 && (
              <p className="text-slate-500 italic text-xs">Query returned no records.</p>
            )}

            {results && results.rows.length > 0 && (
              <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                    <tr>
                      {results.columns.map((col) => (
                        <th key={col} className="px-3.5 py-2 border-b border-slate-800">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-slate-950">
                    {results.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-800/80 hover:bg-slate-900/60">
                        {results.columns.map((col, cidx) => (
                          <td key={cidx} className="px-3.5 py-2">{String(row[col] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {plan && plan.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                  Execution Plan Cost Analyzer
                </h3>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-[10px] font-mono text-slate-400 space-y-1 overflow-x-auto">
                  {plan.map((p, idx) => (
                    <div key={idx} className="border-b border-slate-900/60 pb-1 last:border-b-0">{p}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
