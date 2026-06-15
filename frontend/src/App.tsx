import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Login from "./pages/Login";
import ChatAssistant from "./pages/ChatAssistant";
import SqlEditor from "./pages/SqlEditor";
import QueryHistory from "./pages/QueryHistory";
import { SchemaManager } from "./components/SchemaManager";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ChatAssistant />} />
          <Route path="sql-editor" element={<SqlEditor />} />
          <Route path="history" element={<QueryHistory />} />
          <Route path="schema" element={<SchemaManager />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
