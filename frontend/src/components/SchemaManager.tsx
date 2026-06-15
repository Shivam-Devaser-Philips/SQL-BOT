import { useState, useEffect, useRef } from "react";

interface Schema {
  name: string;
  size_bytes: number;
}

export function SchemaManager() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSchemaName, setNewSchemaName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSchemas = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/schema/");
      const data = await res.json();
      if (data.status === "success") {
        setSchemas(data.schemas);
      } else {
        setError("Failed to fetch schemas");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  useEffect(() => {
    fetchSchemas();
  }, []);

  const handleAddSchema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchemaName.trim()) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", newSchemaName);
    if (fileInputRef.current?.files?.[0]) {
      formData.append("file", fileInputRef.current.files[0]);
    }

    try {
      const res = await fetch("http://localhost:8000/api/schema/add", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add schema");

      setNewSchemaName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchSchemas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add schema");
    } finally {
      setLoading(false);
    }
  };

  const handleDropSchema = async (name: string) => {
    if (!confirm(`Are you sure you want to drop schema ${name}?`)) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:8000/api/schema/${name}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to drop schema");

      await fetchSchemas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to drop schema");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Add New Schema</h2>
        <form onSubmit={handleAddSchema} className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg border">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Schema Name</label>
            <input
              type="text"
              value={newSchemaName}
              onChange={(e) => setNewSchemaName(e.target.value)}
              placeholder="e.g., banking_data"
              className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">DDL File (Optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".sql,.ddl"
              className="w-full border rounded p-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Add Schema
          </button>
        </form>
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded border border-red-300">{error}</div>}

      <div className="flex-1 overflow-auto">
        <h2 className="text-xl font-bold mb-4">Available Schemas</h2>
        {schemas.length === 0 ? (
          <p className="text-gray-500 italic">No schemas available.</p>
        ) : (
          <div className="grid gap-4">
            {schemas.map((s) => (
              <div key={s.name} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                <div>
                  <h3 className="font-medium text-gray-900">{s.name}</h3>
                  <p className="text-sm text-gray-500">{(s.size_bytes / 1024).toFixed(2)} KB</p>
                </div>
                <button
                  onClick={() => handleDropSchema(s.name)}
                  disabled={loading}
                  className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
                >
                  Drop
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
