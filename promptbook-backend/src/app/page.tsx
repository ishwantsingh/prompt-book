export default function HomePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>PromptBook Backend API</h1>
      <p>This is the backend API server for PromptBook.</p>
      <p>Available endpoints:</p>
      <ul>
        <li><code>GET /api/health</code> - Health check</li>
        <li><code>GET /api/categories</code> - Get categories</li>
        <li><code>GET /api/prompts</code> - Get prompts</li>
        <li><code>POST /api/prompts</code> - Create prompt</li>
        <li>And many more...</li>
      </ul>
      <p>
        <a href="/api/health" style={{ color: '#0070f3' }}>
          Test Health Endpoint
        </a>
      </p>
    </div>
  )
}
