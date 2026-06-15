import { useState } from "react";

export function ChatInterface() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string; sql?: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { 
          role: "bot", 
          content: data.explanation || "No explanation provided.", 
          sql: data.sql 
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: `Error: ${(error as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-card">
        <h2 className="text-xl font-semibold">Banking Analytics Copilot</h2>
        <p className="text-sm text-muted-foreground">Ask me anything about your banking data.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p>{msg.content}</p>
              {msg.sql && (
                <div className="mt-2 p-2 bg-black text-green-400 rounded text-xs font-mono overflow-x-auto">
                  {msg.sql}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 text-muted-foreground animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Show top 10 customers by balance"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
