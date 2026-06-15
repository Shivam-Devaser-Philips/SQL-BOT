import { useState } from "react";
import { ChatInterface } from "./components/ChatInterface"
import { SchemaManager } from "./components/SchemaManager"

function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "schemas">("chat");

  return (
    <div className="w-full h-screen p-4 bg-gray-50 flex justify-center">
      <div className="w-full max-w-5xl h-full flex flex-col">
        <header className="mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Banking Analytics Copilot</h1>
            <p className="text-gray-600">AI-powered SQL and PL/SQL Assistant</p>
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === "chat" ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("schemas")}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === "schemas" ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Schema Manager
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden shadow-xl rounded-xl border border-gray-200 bg-white">
          {activeTab === "chat" ? <ChatInterface /> : <SchemaManager />}
        </main>
      </div>
    </div>
  )
}

export default App
