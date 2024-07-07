
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
   }
]

module.exports = PROXY_CONFIG;