const BASE = 'http://localhost:8000'

export const api = {
  get: (path) => fetch(`${BASE}${path}`).then(r => r.json()),
  post: (path, body) =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(r => r.json()),
}
