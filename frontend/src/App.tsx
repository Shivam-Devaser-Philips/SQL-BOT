import { ChatInterface } from "./components/ChatInterface"

function App() {
  return (
    <div className="w-full h-screen p-4 bg-gray-50 flex justify-center">
      <div className="w-full max-w-5xl h-full flex flex-col">
        <header className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Banking Analytics Copilot</h1>
          <p className="text-gray-600">AI-powered SQL and PL/SQL Assistant</p>
        </header>
        <main className="flex-1 overflow-hidden shadow-xl rounded-xl border border-gray-200 bg-white">
          <ChatInterface />
        </main>
      </div>
    </div>
  )
}

export default App
