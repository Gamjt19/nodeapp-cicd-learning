const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8"
};

let requestCount = 0;
const startTime = Date.now();

const server = http.createServer((req, res) => {
    requestCount++;
    const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = reqUrl.pathname;

    // CORS & Security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");

    // API Routes
    if (pathname === "/api/status") {
        const mem = process.memoryUsage();
        const telemetry = {
            status: "HEALTHY",
            app: "Project 49 - CI/CD Pipeline App",
            uptimeSeconds: Math.floor(process.uptime()),
            uptimeFormatted: formatUptime(process.uptime()),
            requestsServed: requestCount,
            startedAt: new Date(startTime).toISOString(),
            serverTime: new Date().toISOString(),
            environment: process.env.NODE_ENV || "production",
            nodeVersion: process.version,
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: {
                rssMB: (mem.rss / 1024 / 1024).toFixed(2),
                heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
                heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2)
            },
            systemMemory: {
                totalMB: (os.totalmem() / 1024 / 1024).toFixed(0),
                freeMB: (os.freemem() / 1024 / 1024).toFixed(0)
            }
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(telemetry, null, 2));
    }

    if (pathname === "/api/ping") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ pong: true, timestamp: Date.now() }));
    }

    if (pathname === "/api/cicd") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
            project: "Project 49 CI/CD Pipeline",
            version: "1.0.0",
            buildStatus: "SUCCESS",
            dockerTag: process.env.DOCKER_TAG || "latest",
            workflow: {
                name: "CI/CD workflow",
                triggers: ["push to main"],
                jobs: [
                    { name: "build", runner: "ubuntu-latest", steps: ["checkout", "setup node:20", "npm ci", "npm test"] },
                    { name: "docker", runner: "ubuntu-latest", steps: ["checkout", "docker login", "buildx setup", "build & push"] }
                ]
            }
        }, null, 2));
    }

    // Static file serving
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
    if (safePath === "/" || safePath === "\\") {
        safePath = "/index.html";
    }

    const filePath = path.join(PUBLIC_DIR, safePath);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        return res.end("403 Forbidden");
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // If route not found, return 404 or index.html for SPA feel
            if (path.extname(filePath) === "") {
                return serveFile(path.join(PUBLIC_DIR, "index.html"), res);
            }
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("404 Not Found");
        }

        serveFile(filePath, res);
    });
});

function serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            return res.end("500 Internal Server Error");
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    });
}

function formatUptime(seconds) {
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

server.listen(PORT, () => {
    console.log(`[Project-49] Server running on port ${PORT}`);
    console.log(`[Project-49] Health check available at http://localhost:${PORT}/api/status`);
});