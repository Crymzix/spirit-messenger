import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen bg-msn-bg font-msn p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-msn-blue mb-6">
          MSN Messenger Clone
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Project Setup Complete! ✓</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-msn-online rounded-full"></span>
              <span>Tauri + React + TypeScript</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-msn-online rounded-full"></span>
              <span>TailwindCSS configured with MSN theme</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-msn-online rounded-full"></span>
              <span>Supabase client ready</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-msn-online rounded-full"></span>
              <span>Project structure organized</span>
            </div>
          </div>
        </div>

        <div className="bg-msn-light-blue rounded-lg p-6">
          <h3 className="font-semibold mb-3">Test Tauri Integration:</h3>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              greet();
            }}
          >
            <input
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-msn-blue"
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Enter a name..."
              value={name}
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-msn-blue text-white rounded hover:bg-blue-700 transition-colors"
            >
              Greet
            </button>
          </form>
          {greetMsg && (
            <p className="mt-3 text-sm font-semibold text-msn-blue">{greetMsg}</p>
          )}
        </div>

        <div className="mt-6 flex gap-4 justify-center">
          <a href="https://vite.dev" target="_blank" className="opacity-60 hover:opacity-100 transition-opacity">
            <img src="/vite.svg" className="h-12" alt="Vite logo" />
          </a>
          <a href="https://tauri.app" target="_blank" className="opacity-60 hover:opacity-100 transition-opacity">
            <img src="/tauri.svg" className="h-12" alt="Tauri logo" />
          </a>
          <a href="https://react.dev" target="_blank" className="opacity-60 hover:opacity-100 transition-opacity">
            <img src={reactLogo} className="h-12" alt="React logo" />
          </a>
        </div>
      </div>
    </main>
  );
}

export default App;
