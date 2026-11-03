# Resumen de arquitectura

```mermaid
flowchart LR
  A[G3 Ops / Panel React en Netlify] -->|HTTPS POST /api/send| B[Servidor Node.js + Socket.IO]
  B -->|WebSocket seguro WSS| C[Agente Electron PC 1]
  B -->|WSS| D[Agente Electron PC 2]
  B -->|WSS| E[Agente Electron PC N]
  C --> F[Toast corporativo]
  F --> G[Detalle / URL / Ack]
```

**Idea clave:** Netlify hospeda el panel React estático. El canal Socket.IO debe vivir en un servidor que mantenga conexiones persistentes (VM, contenedor o PaaS compatible). Electron se instala una vez en cada PC, arranca con Windows y permanece conectado aunque el navegador esté cerrado.
