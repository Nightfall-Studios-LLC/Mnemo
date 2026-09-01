import "./App.css";

function App() {
  return (
    <main className="app-shell">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <span className="eyebrow">Mnemo baseplate</span>
        <h1 id="welcome-title">Ready to build.</h1>
        <p>
          Tauri 2, React, and TypeScript are configured and running together.
        </p>
        <div className="stack" aria-label="Application stack">
          <span>Tauri 2</span>
          <span>React 19</span>
          <span>TypeScript</span>
          <span>Vite</span>
        </div>
      </section>
    </main>
  );
}

export default App;
