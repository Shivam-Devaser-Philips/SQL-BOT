import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import Plot from "react-plotly.js";
import { 
  Send, HelpCircle, Code, Award, Lightbulb, Play, AlertTriangle, 
  CheckCircle, Database, ChevronRight, BookOpen, Clock, Activity 
} from "lucide-react";

interface Message {
  role: "user" | "bot";
  content: string;
  sql?: string;
  reasoning?: string;
  confidence?: number;
  data?: any[];
  executionPlan?: string[];
  requiresConfirmation?: boolean;
  glossary?: any[];
  engineUsed?: string;
  error?: string;
}

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // States for active inspector panels
  const [inspectedSql, setInspectedSql] = useState<string | null>(null);
  const [inspectedPlan, setInspectedPlan] = useState<string[] | null>(null);
  const [inspectedData, setInspectedData] = useState<any[] | null>(null);
  const [inspectedGlossary, setInspectedGlossary] = useState<any[] | null>(null);
  const [inspectedChart, setInspectedChart] = useState<{ type: string; data: any[] } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (messageText: string, confirmDml = false) => {
    if (!messageText.trim()) return;

    setLoading(true);
    setError(null);

    // If it's a confirmation, we modify the last message status rather than adding a new user bubble
    if (!confirmDml) {
      setMessages((prev) => [...prev, { role: "user", content: messageText }]);
      setInput("");
    }

    try {
      const res = await api.post("/api/chat/", {
        message: messageText,
        confirm_dml: confirmDml
      });
      
      const botMsg: Message = {
        role: "bot",
        content: res.data.explanation || "Query completed.",
        sql: res.data.sql,
        reasoning: res.data.reasoning,
        confidence: res.data.confidence,
        data: res.data.data,
        executionPlan: res.data.execution_plan,
        requiresConfirmation: res.data.requires_confirmation,
        glossary: res.data.glossary,
        engineUsed: res.data.engine_used,
        error: res.data.error
      };

      if (confirmDml) {
        // Replace the last block requiring confirmation with this final execution result
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].requiresConfirmation) {
            updated[updated.length - 1] = botMsg;
          } else {
            updated.push(botMsg);
          }
          return updated;
        });
      } else {
        setMessages((prev) => [...prev, botMsg]);
      }

      // Automatically inspect the returned SQL and details
      if (res.data.sql) setInspectedSql(res.data.sql);
      if (res.data.execution_plan) setInspectedPlan(res.data.execution_plan);
      if (res.data.data) setInspectedData(res.data.data);
      if (res.data.glossary && res.data.glossary.length > 0) setInspectedGlossary(res.data.glossary);
      
      // Setup Plotly recommendations
      if (res.data.suggested_chart && res.data.suggested_chart !== "none" && res.data.data && res.data.data.length > 0) {
        setInspectedChart({
          type: res.data.suggested_chart,
          data: res.data.data
        });
      } else {
        setInspectedChart(null);
      }

    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not reach assistant service.");
    } finally {
      setLoading(false);
    }
  };

  const executeDmlApproval = (messageText: string) => {
    handleSend(messageText, true);
  };

  const getChartData = (chartType: string, rawData: any[]) => {
    if (!rawData || rawData.length === 0) return [];
    
    // Dynamically identify columns
    const columns = Object.keys(rawData[0]);
    let labelCol = columns[0];
    let valCol = columns[1] || columns[0];

    // Better identification: check which column contains strings and which contains numbers
    for (const col of columns) {
      const val = rawData[0][col];
      if (typeof val === "number") {
        valCol = col;
      } else {
        labelCol = col;
      }
    }

    const labels = rawData.map(r => r[labelCol]);
    const values = rawData.map(r => r[valCol]);

    if (chartType === "pie") {
      return [{
        labels,
        values,
        type: "pie",
        marker: { colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"] }
      }];
    } else if (chartType === "bar") {
      return [{
        x: labels,
        y: values,
        type: "bar",
        marker: { color: "#3b82f6" }
      }];
    } else if (chartType === "scatter") {
      return [{
        x: labels,
        y: values,
        mode: "markers",
        type: "scatter",
        marker: { color: "#10b981", size: 10 }
      }];
    } else {
      return [{
        x: labels,
        y: values,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#3b82f6", width: 3 }
      }];
    }
  };

  return (
    <div className="h-full flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800">
        
        {/* Chat Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Banking Analytics Copilot
            </h2>
            <p className="text-xs text-slate-400">Ask questions about CASA, exposure, and customer trends</p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-full text-xs font-semibold text-slate-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Grok Engine Active
            </span>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-lg mx-auto">
              <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-lg animate-pulse">
                <HelpCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white">Ask anything about the banking database</h3>
              <p className="text-sm text-slate-400">
                Type natural language queries to generate, optimize, and run Oracle SQL statements automatically.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full pt-4 text-left">
                {[
                  "Show top 10 customers by balance",
                  "Which branch has highest loan exposure?",
                  "Show CASA growth trend",
                  "Generate a procedure to archive accounts"
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="p-3 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition-colors text-left font-medium"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-4 border shadow-sm ${
                msg.role === "user" 
                  ? "bg-blue-600 border-blue-500 text-white rounded-br-none" 
                  : "bg-slate-900 border-slate-800 text-slate-100 rounded-bl-none"
              }`}>
                <div className="text-sm leading-relaxed">{msg.content}</div>

                {msg.requiresConfirmation && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      DML Warning: Write confirmation required
                    </div>
                    <p className="text-xs">
                      This operation attempts to insert, update or delete records in the database.
                    </p>
                    <button
                      onClick={() => executeDmlApproval(messages[idx-1].content)}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded font-medium text-xs self-start transition-colors"
                    >
                      Approve & Execute Write Operation
                    </button>
                  </div>
                )}

                {msg.error && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Error: {msg.error}</span>
                  </div>
                )}

                {msg.sql && (
                  <div className="mt-4 border-t border-slate-800/80 pt-3 flex flex-wrap gap-2 items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/30">
                      Oracle SQL
                    </span>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          setInspectedSql(msg.sql || null);
                          setInspectedPlan(msg.executionPlan || null);
                          setInspectedData(msg.data || null);
                          setInspectedGlossary(msg.glossary || null);
                          if (msg.data && msg.data.length > 0) {
                            setInspectedChart({ type: "bar", data: msg.data });
                          }
                        }}
                        className="hover:text-white flex items-center gap-1 font-medium transition-colors"
                      >
                        <Code className="w-3.5 h-3.5" />
                        Inspect Code & Results
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none px-5 py-4 text-slate-400 animate-pulse text-sm">
                Grok AI is thinking and structuring SQL statements...
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-600 text-sm"
              placeholder="Query database: e.g., 'Show CASA accounts with high balances'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
              disabled={loading}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2.5 font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Details Inspector Panel */}
      {inspectedSql && (
        <div className="w-96 bg-slate-900 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Analysis Inspector</h3>
            <button onClick={() => setInspectedSql(null)} className="text-slate-400 hover:text-white text-xs">
              Close
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Generated SQL */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-blue-500" />
                Generated SQL
              </h4>
              <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-[11px] font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
                {inspectedSql}
              </pre>
            </div>

            {/* Plotly Chart Visualization if available */}
            {inspectedChart && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  Plotly Chart Recommendation
                </h4>
                <div className="bg-white rounded-lg p-2 overflow-hidden flex justify-center">
                  <Plot
                    data={getChartData(inspectedChart.type, inspectedChart.data)}
                    layout={{
                      width: 330,
                      height: 200,
                      margin: { t: 10, r: 10, b: 40, l: 40 },
                      paper_bgcolor: "#ffffff",
                      plot_bgcolor: "#ffffff",
                      font: { size: 9 },
                    }}
                    config={{ displayModeBar: false }}
                  />
                </div>
              </div>
            )}

            {/* Glossary Match */}
            {inspectedGlossary && inspectedGlossary.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                  Banking Glossary Dictionary
                </h4>
                <div className="space-y-2">
                  {inspectedGlossary.map((g, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg text-xs">
                      <div className="font-semibold text-blue-400">{g.term} ({g.full_name})</div>
                      <p className="text-slate-300 mt-1 text-[11px]">{g.definition}</p>
                      <div className="text-[10px] text-slate-500 mt-1.5 border-t border-slate-800/60 pt-1">
                        Hint: {g.hint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Plan */}
            {inspectedPlan && inspectedPlan.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  Execution Plan Cost
                </h4>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-[10px] font-mono text-slate-400 overflow-x-auto space-y-1">
                  {inspectedPlan.map((p, idx) => (
                    <div key={idx} className="border-b border-slate-900/60 pb-1 last:border-b-0">{p}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Query Data Results */}
            {inspectedData && inspectedData.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  Returned Records ({inspectedData.length})
                </h4>
                <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-60 overflow-y-auto">
                  <table className="w-full text-[10px] text-left text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] sticky top-0">
                      <tr>
                        {Object.keys(inspectedData[0]).map((col) => (
                          <th key={col} className="px-2.5 py-1.5 border-b border-slate-800">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-slate-900">
                      {inspectedData.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-850">
                          {Object.values(row).map((val: any, cidx) => (
                            <td key={cidx} className="px-2.5 py-1.5">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
