// Terminal & CI/CD Pipeline Simulation + Live Telemetry
(function () {
    // DOM Elements
    const uptimeEl = document.getElementById("metricUptime");
    const memoryEl = document.getElementById("metricMemory");
    const requestsEl = document.getElementById("metricRequests");
    const nodeVerEl = document.getElementById("metricNodeVer");
    const latencyEl = document.getElementById("metricLatency");
    const pingBadge = document.getElementById("pingBadge");
    const terminalLogs = document.getElementById("terminalLogs");
    const btnRunPipeline = document.getElementById("btnRunPipeline");
    const pipelineProgress = document.getElementById("pipelineProgressBar");

    // Telemetry Polling
    async function fetchTelemetry() {
        try {
            const start = performance.now();
            const res = await fetch("/api/status");
            const duration = Math.round(performance.now() - start);

            if (res.ok) {
                const data = await res.json();
                if (uptimeEl) uptimeEl.textContent = data.uptimeFormatted;
                if (memoryEl) memoryEl.textContent = `${data.memory.heapUsedMB} MB / ${data.memory.rssMB} MB`;
                if (requestsEl) requestsEl.textContent = data.requestsServed;
                if (nodeVerEl) nodeVerEl.textContent = `${data.nodeVersion} (${data.platform}-${data.arch})`;
                if (latencyEl) latencyEl.textContent = `${duration}ms`;
                if (pingBadge) {
                    pingBadge.className = "status-indicator online";
                    pingBadge.title = `Latency: ${duration}ms`;
                }
            }
        } catch (err) {
            console.error("Telemetry error", err);
            if (pingBadge) pingBadge.className = "status-indicator offline";
        }
    }

    fetchTelemetry();
    setInterval(fetchTelemetry, 3500);

    // Tab switcher
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-tab");
            tabButtons.forEach(b => b.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            const target = document.getElementById(targetId);
            if (target) target.classList.add("active");
        });
    });

    // CI/CD Runner Simulator
    const PIPELINE_STEPS = [
        {
            name: "Trigger Event",
            icon: "🚀",
            logs: [
                "git push origin main",
                "webhook received: GitHub Actions workflow triggered (event: push)",
                "Workflow 'CI/CD workflow' queued on ubuntu-latest"
            ],
            duration: 900
        },
        {
            name: "Checkout Code",
            icon: "📥",
            logs: [
                "actions/checkout@v4 starting...",
                "Syncing repository 'Gamjt19/nodeapp-cicd-learning'",
                "HEAD is now at a4c48cc: fix(ci): update build step and docker tags",
                "Checkout completed in 0.4s"
            ],
            duration: 1100
        },
        {
            name: "Setup Node.js 20",
            icon: "⚙️",
            logs: [
                "actions/setup-node@v7 starting...",
                "Resolved node:20.18.0 (LTS) for linux-x64",
                "Writing npm configuration and environment variables",
                "Node.js 20 configured successfully"
            ],
            duration: 1000
        },
        {
            name: "Install Dependencies",
            icon: "📦",
            logs: [
                "Running: npm ci",
                "Audited 0 packages in 0.05s",
                "Zero dependencies verified - pure native Node.js core modules",
                "npm ci completed with code 0"
            ],
            duration: 1200
        },
        {
            name: "Test Suite",
            icon: "🧪",
            logs: [
                "Running: npm test",
                "> node --check app.js",
                "Syntax validation: OK",
                "Route tree check: /api/status, /api/ping, static routes -> OK",
                "All CI/CD tests PASSED without regressions"
            ],
            duration: 1300
        },
        {
            name: "Docker Setup & Login",
            icon: "🔑",
            logs: [
                "Job 'docker' starting (needs: build -> SUCCESS)",
                "docker/login-action@v4: authenticating with registry 'docker.io'...",
                "Login Succeeded (Docker Hub token verified)",
                "docker/setup-buildx-action@v4: Buildx engine initialized"
            ],
            duration: 1400
        },
        {
            name: "Docker Build & Push",
            icon: "🐳",
            logs: [
                "docker build --file Dockerfile --tag ${{ vars.DOCKERHUB_USERNAME }}/project-49-cicd:sha-a4c48cc .",
                "[1/5] FROM docker.io/library/node:20",
                "[2/5] WORKDIR /app",
                "[3/5] COPY package.json . && RUN npm install",
                "[4/5] COPY . .",
                "[5/5] EXPOSE 3000",
                "Pushing image layers to docker.io...",
                "digest: sha256:8f4c219198b18ec402e1b9b9 size: 1324",
                "✅ Image pushed successfully to Docker Hub registry!"
            ],
            duration: 2200
        }
    ];

    let isPipelineRunning = false;

    async function runPipelineSimulation() {
        if (isPipelineRunning) return;
        isPipelineRunning = true;
        btnRunPipeline.disabled = true;
        btnRunPipeline.textContent = "⚡ Running Pipeline...";

        if (terminalLogs) terminalLogs.innerHTML = "";
        appendLog(`[SYSTEM] Starting GitHub Actions CI/CD Pipeline execution...`, "system");

        const stepIndicators = document.querySelectorAll(".pipeline-step");
        stepIndicators.forEach(s => {
            s.classList.remove("active", "completed", "failed");
        });

        for (let i = 0; i < PIPELINE_STEPS.length; i++) {
            const step = PIPELINE_STEPS[i];
            const indicator = stepIndicators[i];
            if (indicator) indicator.classList.add("active");

            const progressPct = Math.round(((i) / PIPELINE_STEPS.length) * 100);
            if (pipelineProgress) pipelineProgress.style.width = `${progressPct}%`;

            appendLog(`\n--- [STAGE ${i + 1}/${PIPELINE_STEPS.length}]: ${step.name} ---`, "stage-header");

            for (let line of step.logs) {
                appendLog(line, line.includes("SUCCESS") || line.includes("PASSED") || line.includes("✅") ? "success" : "info");
                await wait(step.duration / step.logs.length);
            }

            if (indicator) {
                indicator.classList.remove("active");
                indicator.classList.add("completed");
            }
        }

        if (pipelineProgress) pipelineProgress.style.width = `100%`;
        appendLog(`\n🎉 CI/CD WORKFLOW COMPLETED SUCCESSFULLY! All jobs passed.`, "success-banner");

        btnRunPipeline.disabled = false;
        btnRunPipeline.textContent = "🚀 Trigger CI/CD Pipeline Again";
        isPipelineRunning = false;
    }

    function appendLog(msg, type = "info") {
        if (!terminalLogs) return;
        const line = document.createElement("div");
        line.className = `log-line ${type}`;

        const timestamp = new Date().toTimeString().split(" ")[0];
        line.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-text">${escapeHtml(msg)}</span>`;
        terminalLogs.appendChild(line);
        terminalLogs.scrollTop = terminalLogs.scrollHeight;
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    if (btnRunPipeline) {
        btnRunPipeline.addEventListener("click", runPipelineSimulation);
    }
})();
