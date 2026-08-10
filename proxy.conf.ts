
const PROXY_CONFIG = [
  {
    context: [
        "/api/frontver/"
    ],
    target: "http://127.0.0.1/",
    secure: false,
    "changeOrigin": true,
    logLevel: "debug",
   },
  {
    context: [
        "/api"
    ],
    target: "http://172.17.0.1:8181/",
    secure: false,
    "changeOrigin": true,
   },
  // Browser terminal WebSocket — host 8201 → container 8200
  // (host 8200 is reserved for speedtest module)
  {
    context: [
        "/terminal-ws"
    ],
    target: "http://127.0.0.1:8201/",
    secure: false,
    ws: true,
    changeOrigin: true,
    pathRewrite: {
      "^/terminal-ws": ""
    }
  },
  // Agent phone-home — host 8202 → container 8201
  // Keep /agent prefix: gateway accepts /agent/check and /agent/log
  {
    context: ["/agent"],
    target: "http://127.0.0.1:8202",
    secure: false,
    changeOrigin: true
  }
]

module.exports = PROXY_CONFIG;
