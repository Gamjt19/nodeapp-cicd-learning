// Pipeline Defender - DevOps Retro Cyber-Arcade Game
(function () {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Virtual resolution
    const V_WIDTH = 800;
    const V_HEIGHT = 500;
    canvas.width = V_WIDTH;
    canvas.height = V_HEIGHT;

    // Game state
    let state = "READY"; // READY, PLAYING, PAUSED, GAMEOVER
    let score = 0;
    let highScore = parseInt(localStorage.getItem("pipeline_defender_highscore") || "0", 10);
    let wave = 1;
    let combo = 0;
    let comboTimer = 0;
    let nukes = 1;
    let screenShake = 0;

    // Keys
    const keys = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false,
        KeyA: false,
        KeyD: false,
        KeyW: false,
        KeyS: false,
        Space: false,
        KeyB: false
    };

    // Parallax Starfield
    const stars = [];
    for (let i = 0; i < 70; i++) {
        stars.push({
            x: Math.random() * V_WIDTH,
            y: Math.random() * V_HEIGHT,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 2 + 0.8,
            alpha: Math.random() * 0.7 + 0.3
        });
    }

    // Player object
    const player = {
        x: V_WIDTH / 2 - 20,
        y: V_HEIGHT - 60,
        width: 44,
        height: 38,
        speed: 6.5,
        hp: 3,
        maxHp: 3,
        shield: true,
        tripleShotTimer: 0,
        invulnerableTimer: 0,
        shootCooldown: 0
    };

    let bullets = [];
    let enemyBullets = [];
    let enemies = [];
    let particles = [];
    let floatingTexts = [];
    let powerups = [];
    let boss = null;
    let waveEnemyCount = 0;
    let waveSpawnTimer = 0;

    // UI elements
    const scoreVal = document.getElementById("scoreVal");
    const highScoreVal = document.getElementById("highScoreVal");
    const waveVal = document.getElementById("waveVal");
    const hpVal = document.getElementById("hpVal");
    const shieldStatus = document.getElementById("shieldStatus");
    const nukeVal = document.getElementById("nukeVal");
    const startOverlay = document.getElementById("startOverlay");
    const gameOverOverlay = document.getElementById("gameOverOverlay");
    const finalScoreVal = document.getElementById("finalScoreVal");
    const bestScoreVal = document.getElementById("bestScoreVal");
    const btnStart = document.getElementById("btnStart");
    const btnRestart = document.getElementById("btnRestart");
    const btnPause = document.getElementById("btnPause");
    const btnMute = document.getElementById("btnMute");
    const btnNukeMobile = document.getElementById("btnNukeMobile");

    if (highScoreVal) highScoreVal.textContent = highScore;

    // Event listeners
    window.addEventListener("keydown", (e) => {
        if (e.code in keys) {
            keys[e.code] = true;
            if (e.code === "Space") e.preventDefault();
        }
        if (e.code === "KeyP") {
            togglePause();
        }
        if (e.code === "KeyB" && state === "PLAYING") {
            triggerNuke();
        }
    });

    window.addEventListener("keyup", (e) => {
        if (e.code in keys) {
            keys[e.code] = false;
        }
    });

    // Mouse and Touch controls
    let isMouseDown = false;
    canvas.addEventListener("mousemove", (e) => {
        if (state !== "PLAYING") return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = V_WIDTH / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;
        player.x = Math.max(10, Math.min(V_WIDTH - player.width - 10, mouseX - player.width / 2));
    });

    canvas.addEventListener("mousedown", (e) => {
        isMouseDown = true;
        if (state === "PLAYING") {
            keys.Space = true;
        }
    });

    window.addEventListener("mouseup", () => {
        isMouseDown = false;
        keys.Space = false;
    });

    // Touch controls for mobile
    let touchStartX = null;
    canvas.addEventListener("touchstart", (e) => {
        if (state === "READY") {
            startGame();
            return;
        }
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            touchStartX = (touch.clientX - rect.left) * (V_WIDTH / rect.width);
            keys.Space = true;
        }
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
        if (state !== "PLAYING") return;
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const currentX = (touch.clientX - rect.left) * (V_WIDTH / rect.width);
            player.x = Math.max(10, Math.min(V_WIDTH - player.width - 10, currentX - player.width / 2));
        }
    }, { passive: false });

    canvas.addEventListener("touchend", () => {
        keys.Space = false;
    });

    if (btnStart) btnStart.addEventListener("click", startGame);
    if (btnRestart) btnRestart.addEventListener("click", startGame);
    if (btnPause) btnPause.addEventListener("click", togglePause);
    if (btnNukeMobile) btnNukeMobile.addEventListener("click", triggerNuke);
    if (btnMute) {
        btnMute.addEventListener("click", () => {
            const isMuted = window.soundFX.toggleMute();
            btnMute.textContent = isMuted ? "🔇 Unmute" : "🔊 Audio ON";
            btnMute.classList.toggle("btn-active", !isMuted);
        });
    }

    function startGame() {
        state = "PLAYING";
        score = 0;
        wave = 1;
        combo = 0;
        comboTimer = 0;
        nukes = 1;
        player.x = V_WIDTH / 2 - 22;
        player.y = V_HEIGHT - 65;
        player.hp = 3;
        player.shield = true;
        player.tripleShotTimer = 0;
        player.invulnerableTimer = 0;
        bullets = [];
        enemyBullets = [];
        enemies = [];
        particles = [];
        floatingTexts = [];
        powerups = [];
        boss = null;
        waveEnemyCount = 0;
        waveSpawnTimer = 0;

        if (startOverlay) startOverlay.style.display = "none";
        if (gameOverOverlay) gameOverOverlay.style.display = "none";
        if (btnPause) btnPause.textContent = "⏸ Pause";

        updateHUD();
        window.soundFX.powerup();
    }

    function togglePause() {
        if (state === "PLAYING") {
            state = "PAUSED";
            if (btnPause) btnPause.textContent = "▶ Resume";
        } else if (state === "PAUSED") {
            state = "PLAYING";
            if (btnPause) btnPause.textContent = "⏸ Pause";
        }
    }

    function gameOver() {
        state = "GAMEOVER";
        window.soundFX.explosion();
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("pipeline_defender_highscore", highScore);
            if (highScoreVal) highScoreVal.textContent = highScore;
        }
        if (finalScoreVal) finalScoreVal.textContent = score;
        if (bestScoreVal) bestScoreVal.textContent = highScore;
        if (gameOverOverlay) gameOverOverlay.style.display = "flex";
    }

    function triggerNuke() {
        if (nukes <= 0) return;
        nukes--;
        screenShake = 20;
        window.soundFX.nuke();

        // Wipe out all regular enemies
        for (let enemy of enemies) {
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#ff0077", 20);
            score += enemy.score;
        }
        enemies = [];
        enemyBullets = [];

        if (boss) {
            boss.hp -= 15;
            createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, "#00f2fe", 25);
            if (boss.hp <= 0) destroyBoss();
        }

        addFloatingText("ROLLBACK NUKE TRIGGERED!", V_WIDTH / 2, V_HEIGHT / 2, "#ff0055", 26);
        updateHUD();
    }

    function updateHUD() {
        if (scoreVal) scoreVal.textContent = score;
        if (waveVal) waveVal.textContent = wave;
        if (hpVal) {
            hpVal.innerHTML = "❤️".repeat(Math.max(0, player.hp));
        }
        if (shieldStatus) {
            shieldStatus.textContent = player.shield ? "SHIELD: ACTIVE" : "SHIELD: OFF";
            shieldStatus.className = player.shield ? "badge badge-neon" : "badge badge-dim";
        }
        if (nukeVal) nukeVal.textContent = nukes;
    }

    function addFloatingText(text, x, y, color = "#00f2fe", size = 16) {
        floatingTexts.push({
            text,
            x,
            y,
            color,
            size,
            alpha: 1.0,
            vy: -1.2
        });
    }

    function createExplosion(x, y, color = "#ffaa00", count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 1,
                color,
                alpha: 1.0,
                decay: Math.random() * 0.03 + 0.02
            });
        }
    }

    // Spawn wave system
    function spawnWave() {
        const isBossWave = wave % 5 === 0;
        if (isBossWave && !boss) {
            boss = {
                x: V_WIDTH / 2 - 60,
                y: -100,
                targetY: 60,
                width: 120,
                height: 70,
                hp: 40 + wave * 10,
                maxHp: 40 + wave * 10,
                vx: 2.5,
                attackTimer: 0,
                name: "🚨 PROD OUTAGE INCIDENT (BOSS)"
            };
            addFloatingText("WARNING: SEV-1 OUTAGE DETECTED!", V_WIDTH / 2, 140, "#ff0044", 24);
            return;
        }

        // Regular enemies
        const count = 6 + wave * 2;
        if (waveEnemyCount < count) {
            waveSpawnTimer++;
            if (waveSpawnTimer > 40) {
                waveSpawnTimer = 0;
                waveEnemyCount++;

                const rand = Math.random();
                let type = "syntax_bug";
                let enemyColor = "#10b981";
                let w = 32, h = 30, hp = 1, pts = 50, speed = 2.2 + wave * 0.2;

                if (rand > 0.8 && wave >= 3) {
                    type = "memory_leak";
                    enemyColor = "#a855f7";
                    w = 44; h = 42; hp = 4; pts = 250; speed = 1.3;
                } else if (rand > 0.55 && wave >= 2) {
                    type = "merge_conflict";
                    enemyColor = "#f59e0b";
                    w = 36; h = 34; hp = 2; pts = 150; speed = 2.0;
                } else if (rand > 0.35) {
                    type = "server_error";
                    enemyColor = "#ef4444";
                    w = 34; h = 34; hp = 1; pts = 100; speed = 2.4;
                }

                enemies.push({
                    type,
                    x: Math.random() * (V_WIDTH - w - 40) + 20,
                    y: -40,
                    width: w,
                    height: h,
                    hp,
                    maxHp: hp,
                    speed,
                    color: enemyColor,
                    score: pts,
                    time: Math.random() * 100,
                    shootTimer: Math.random() * 60
                });
            }
        } else if (enemies.length === 0 && !boss) {
            // Wave cleared!
            wave++;
            waveEnemyCount = 0;
            waveSpawnTimer = -50;
            score += wave * 100;
            addFloatingText(`BUILD #${wave} DEPLOYED! ZERO DOWNTIME!`, V_WIDTH / 2, V_HEIGHT / 2, "#00f2fe", 22);
            window.soundFX.powerup();

            // 50% chance to drop bonus nuke or shield
            if (Math.random() > 0.5) {
                powerups.push({
                    x: V_WIDTH / 2,
                    y: 100,
                    type: Math.random() > 0.5 ? "shield" : "nuke",
                    vy: 1.5,
                    width: 26,
                    height: 26
                });
            }
            updateHUD();
        }
    }

    function destroyBoss() {
        createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, "#00f2fe", 50);
        createExplosion(boss.x + 20, boss.y + 20, "#ff0055", 30);
        createExplosion(boss.x + boss.width - 20, boss.y + boss.height - 20, "#10b981", 30);
        score += 2000;
        addFloatingText("HOTFIX DEPLOYED! OUTAGE RESOLVED! +2000", V_WIDTH / 2, V_HEIGHT / 2, "#10b981", 24);
        window.soundFX.explosion();

        // Drop huge rewards
        powerups.push({ x: boss.x + 30, y: boss.y, type: "triple", vy: 1.8, width: 26, height: 26 });
        powerups.push({ x: boss.x + 60, y: boss.y, type: "hotfix", vy: 1.8, width: 26, height: 26 });
        powerups.push({ x: boss.x + 90, y: boss.y, type: "nuke", vy: 1.8, width: 26, height: 26 });

        boss = null;
        wave++;
        waveEnemyCount = 0;
        waveSpawnTimer = -50;
        updateHUD();
    }

    // MAIN UPDATE LOOP
    function update() {
        if (state !== "PLAYING") return;

        // Combo decay
        if (comboTimer > 0) {
            comboTimer--;
            if (comboTimer === 0) combo = 0;
        }

        // Screen shake decay
        if (screenShake > 0) screenShake *= 0.88;
        if (screenShake < 0.2) screenShake = 0;

        // Player timers
        if (player.invulnerableTimer > 0) player.invulnerableTimer--;
        if (player.tripleShotTimer > 0) player.tripleShotTimer--;
        if (player.shootCooldown > 0) player.shootCooldown--;

        // Player Movement
        if (keys.ArrowLeft || keys.KeyA) player.x -= player.speed;
        if (keys.ArrowRight || keys.KeyD) player.x += player.speed;
        if (keys.ArrowUp || keys.KeyW) player.y -= player.speed * 0.8;
        if (keys.ArrowDown || keys.KeyS) player.y += player.speed * 0.8;

        // Bounds
        player.x = Math.max(10, Math.min(V_WIDTH - player.width - 10, player.x));
        player.y = Math.max(V_HEIGHT / 2, Math.min(V_HEIGHT - player.height - 15, player.y));

        // Player Shooting
        if ((keys.Space || isMouseDown) && player.shootCooldown === 0) {
            player.shootCooldown = 11;
            window.soundFX.laser();

            if (player.tripleShotTimer > 0) {
                // Triple Spread
                bullets.push({ x: player.x + player.width / 2, y: player.y, vx: 0, vy: -9, color: "#00f2fe" });
                bullets.push({ x: player.x + player.width / 2 - 8, y: player.y + 4, vx: -2.2, vy: -8.5, color: "#38bdf8" });
                bullets.push({ x: player.x + player.width / 2 + 8, y: player.y + 4, vx: 2.2, vy: -8.5, color: "#38bdf8" });
            } else {
                // Dual Straight Lasers
                bullets.push({ x: player.x + 10, y: player.y, vx: 0, vy: -9, color: "#00f2fe" });
                bullets.push({ x: player.x + player.width - 14, y: player.y, vx: 0, vy: -9, color: "#00f2fe" });
            }
        }

        // Bullets update
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            if (b.y < -10 || b.x < 0 || b.x > V_WIDTH) {
                bullets.splice(i, 1);
            }
        }

        // Enemy Bullets
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const eb = enemyBullets[i];
            eb.x += eb.vx;
            eb.y += eb.vy;

            // Hit player check
            if (checkCollision(eb, player) && player.invulnerableTimer === 0) {
                enemyBullets.splice(i, 1);
                handlePlayerHit();
                continue;
            }

            if (eb.y > V_HEIGHT + 20) {
                enemyBullets.splice(i, 1);
            }
        }

        // Spawning
        spawnWave();

        // Boss update
        if (boss) {
            if (boss.y < boss.targetY) {
                boss.y += 1.5;
            } else {
                boss.x += boss.vx;
                if (boss.x <= 20 || boss.x + boss.width >= V_WIDTH - 20) {
                    boss.vx = -boss.vx;
                }

                boss.attackTimer++;
                if (boss.attackTimer % 55 === 0) {
                    // Spread attack
                    const centerX = boss.x + boss.width / 2;
                    const bY = boss.y + boss.height;
                    enemyBullets.push({ x: centerX, y: bY, vx: 0, vy: 4, color: "#ef4444", width: 6, height: 12 });
                    enemyBullets.push({ x: centerX - 20, y: bY, vx: -1.8, vy: 3.5, color: "#ef4444", width: 6, height: 12 });
                    enemyBullets.push({ x: centerX + 20, y: bY, vx: 1.8, vy: 3.5, color: "#ef4444", width: 6, height: 12 });
                }
            }

            // Boss collisions with bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                if (checkCollision(b, boss)) {
                    bullets.splice(i, 1);
                    boss.hp--;
                    createExplosion(b.x, b.y, "#00f2fe", 4);
                    window.soundFX.hit();
                    if (boss.hp <= 0) {
                        destroyBoss();
                        break;
                    }
                }
            }
        }

        // Update enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.time += 0.05;

            // Movement patterns
            if (e.type === "syntax_bug") {
                e.x += Math.sin(e.time * 2) * 2.8;
                e.y += e.speed;
            } else if (e.type === "server_error") {
                e.y += e.speed;
                e.shootTimer++;
                if (e.shootTimer > 90) {
                    e.shootTimer = 0;
                    enemyBullets.push({
                        x: e.x + e.width / 2,
                        y: e.y + e.height,
                        vx: 0,
                        vy: 4.2,
                        color: "#ef4444",
                        width: 5,
                        height: 10
                    });
                }
            } else if (e.type === "merge_conflict") {
                e.y += e.speed;
                e.x += Math.cos(e.time) * 1.5;
            } else if (e.type === "memory_leak") {
                e.y += e.speed;
            }

            // Bullet vs Enemy collision
            for (let j = bullets.length - 1; j >= 0; j--) {
                const b = bullets[j];
                if (checkCollision(b, e)) {
                    bullets.splice(j, 1);
                    e.hp--;
                    createExplosion(b.x, b.y, e.color, 5);
                    window.soundFX.hit();

                    if (e.hp <= 0) {
                        // Destroyed
                        window.soundFX.explosion();
                        createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 16);

                        // Combo multiplier
                        combo++;
                        comboTimer = 120;
                        const pts = e.score * Math.min(5, combo);
                        score += pts;
                        addFloatingText(`+${pts} ${combo > 1 ? `(x${combo})` : ""}`, e.x, e.y, e.color, 14);

                        // Merge Conflict splits
                        if (e.type === "merge_conflict" && !e.isChild) {
                            enemies.push({
                                type: "merge_conflict",
                                x: e.x - 15,
                                y: e.y,
                                width: 24,
                                height: 22,
                                hp: 1,
                                maxHp: 1,
                                speed: 3.2,
                                color: "#f59e0b",
                                score: 60,
                                isChild: true,
                                time: 0
                            });
                            enemies.push({
                                type: "merge_conflict",
                                x: e.x + 15,
                                y: e.y,
                                width: 24,
                                height: 22,
                                hp: 1,
                                maxHp: 1,
                                speed: 3.2,
                                color: "#f59e0b",
                                score: 60,
                                isChild: true,
                                time: 3.14
                            });
                        }

                        // Chance to drop power-up
                        const dropRoll = Math.random();
                        if (dropRoll < 0.15) {
                            const types = ["shield", "triple", "hotfix", "nuke"];
                            powerups.push({
                                x: e.x + e.width / 2 - 12,
                                y: e.y + e.height / 2 - 12,
                                type: types[Math.floor(Math.random() * types.length)],
                                vy: 1.8,
                                width: 24,
                                height: 24
                            });
                        }

                        enemies.splice(i, 1);
                        updateHUD();
                        break;
                    }
                }
            }

            // Player vs Enemy collision
            if (checkCollision(e, player) && player.invulnerableTimer === 0) {
                enemies.splice(i, 1);
                createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 15);
                handlePlayerHit();
                continue;
            }

            // Enemy reaches bottom
            if (e.y > V_HEIGHT + 30) {
                enemies.splice(i, 1);
            }
        }

        // Powerups update
        for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];
            p.y += p.vy;

            if (checkCollision(p, player)) {
                window.soundFX.powerup();
                if (p.type === "shield") {
                    player.shield = true;
                    addFloatingText("DOCKER SHIELD UP!", player.x, player.y - 10, "#38bdf8", 16);
                } else if (p.type === "triple") {
                    player.tripleShotTimer = 450; // ~7.5 seconds
                    addFloatingText("PARALLEL BUILD CLUSTER!", player.x, player.y - 10, "#00f2fe", 16);
                } else if (p.type === "hotfix") {
                    if (player.hp < player.maxHp) player.hp++;
                    addFloatingText("HOTFIX APPLIED: +1 HP", player.x, player.y - 10, "#10b981", 16);
                } else if (p.type === "nuke") {
                    nukes = Math.min(3, nukes + 1);
                    addFloatingText("ROLLBACK BOMB ACQUIRED!", player.x, player.y - 10, "#f43f5e", 16);
                }
                createExplosion(p.x + p.width / 2, p.y + p.height / 2, "#00f2fe", 12);
                powerups.splice(i, 1);
                updateHUD();
                continue;
            }

            if (p.y > V_HEIGHT + 30) {
                powerups.splice(i, 1);
            }
        }

        // Particles update
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                particles.splice(i, 1);
            }
        }

        // Floating texts update
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.02;
            if (ft.alpha <= 0) {
                floatingTexts.splice(i, 1);
            }
        }

        // Starfield
        for (let s of stars) {
            s.y += s.speed;
            if (s.y > V_HEIGHT) {
                s.y = 0;
                s.x = Math.random() * V_WIDTH;
            }
        }
    }

    function handlePlayerHit() {
        if (player.shield) {
            player.shield = false;
            player.invulnerableTimer = 40;
            screenShake = 10;
            window.soundFX.explosion();
            addFloatingText("SHIELD BROKEN!", player.x, player.y - 10, "#ef4444", 16);
            updateHUD();
            return;
        }

        player.hp--;
        player.invulnerableTimer = 60;
        screenShake = 15;
        window.soundFX.explosion();
        addFloatingText("PIPELINE DAMAGE!", player.x, player.y - 10, "#ef4444", 18);
        updateHUD();

        if (player.hp <= 0) {
            gameOver();
        }
    }

    function checkCollision(r1, r2) {
        const w1 = r1.width || 4;
        const h1 = r1.height || 10;
        const w2 = r2.width;
        const h2 = r2.height;
        return (
            r1.x < r2.x + w2 &&
            r1.x + w1 > r2.x &&
            r1.y < r2.y + h2 &&
            r1.y + h1 > r2.y
        );
    }

    // DRAW LOOP
    function draw() {
        ctx.save();

        // Screen shake
        if (screenShake > 0) {
            const sx = (Math.random() - 0.5) * screenShake;
            const sy = (Math.random() - 0.5) * screenShake;
            ctx.translate(sx, sy);
        }

        // Dark Background with subtle cyber grid
        ctx.fillStyle = "#0a0e17";
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

        // Draw parallax stars
        for (let s of stars) {
            ctx.fillStyle = `rgba(180, 220, 255, ${s.alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw subtle grid lines
        ctx.strokeStyle = "rgba(0, 242, 254, 0.04)";
        ctx.lineWidth = 1;
        for (let x = 0; x < V_WIDTH; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, V_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y < V_HEIGHT; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(V_WIDTH, y);
            ctx.stroke();
        }

        // Draw Player
        if (state !== "GAMEOVER") {
            const isFlicker = player.invulnerableTimer > 0 && Math.floor(player.invulnerableTimer / 4) % 2 === 0;
            if (!isFlicker) {
                // Thruster particles
                if (state === "PLAYING") {
                    ctx.fillStyle = Math.random() > 0.5 ? "#00f2fe" : "#3b82f6";
                    ctx.beginPath();
                    ctx.arc(player.x + player.width / 2 + (Math.random() * 6 - 3), player.y + player.height + 4, Math.random() * 4 + 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Docker Ship Hull (Modern Sci-Fi Container)
                ctx.shadowColor = "#00f2fe";
                ctx.shadowBlur = 12;

                // Main body
                ctx.fillStyle = "#1e293b";
                ctx.beginPath();
                ctx.moveTo(player.x + player.width / 2, player.y);
                ctx.lineTo(player.x + player.width, player.y + player.height - 8);
                ctx.lineTo(player.x + player.width - 6, player.y + player.height);
                ctx.lineTo(player.x + 6, player.y + player.height);
                ctx.lineTo(player.x, player.y + player.height - 8);
                ctx.closePath();
                ctx.fill();

                // Neon Trim
                ctx.strokeStyle = "#00f2fe";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Cockpit / Container Core
                ctx.fillStyle = "#38bdf8";
                ctx.beginPath();
                ctx.ellipse(player.x + player.width / 2, player.y + 16, 7, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Docker whale logo accent / containers
                ctx.fillStyle = "#0284c7";
                ctx.fillRect(player.x + 14, player.y + 24, 16, 6);

                // Shield bubble
                if (player.shield) {
                    ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = "#38bdf8";
                    ctx.shadowBlur = 15;
                    ctx.beginPath();
                    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width * 0.75, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.shadowBlur = 0;
            }
        }

        // Draw Bullets
        for (let b of bullets) {
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x - 2, b.y, 4, 12);
        }
        ctx.shadowBlur = 0;

        // Draw Enemy Bullets
        for (let eb of enemyBullets) {
            ctx.shadowColor = eb.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = eb.color;
            ctx.beginPath();
            ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Draw Enemies
        for (let e of enemies) {
            ctx.shadowColor = e.color;
            ctx.shadowBlur = 10;

            if (e.type === "syntax_bug") {
                // Bug Alien shape
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2.5, e.height / 2.2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Eyes
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(e.x + 8, e.y + 8, 4, 4);
                ctx.fillRect(e.x + e.width - 12, e.y + 8, 4, 4);
            } else if (e.type === "server_error") {
                // 500 Hazard Diamond
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.moveTo(e.x + e.width / 2, e.y);
                ctx.lineTo(e.x + e.width, e.y + e.height / 2);
                ctx.lineTo(e.x + e.width / 2, e.y + e.height);
                ctx.lineTo(e.x, e.y + e.height / 2);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 11px monospace";
                ctx.textAlign = "center";
                ctx.fillText("500", e.x + e.width / 2, e.y + e.height / 2 + 4);
            } else if (e.type === "merge_conflict") {
                // Dual branching hazard
                ctx.fillStyle = e.color;
                ctx.fillRect(e.x + 4, e.y + 6, e.width - 8, e.height - 12);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 13px monospace";
                ctx.textAlign = "center";
                ctx.fillText("≠", e.x + e.width / 2, e.y + e.height / 2 + 5);
            } else if (e.type === "memory_leak") {
                // Giant Armored Orb
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, 0, Math.PI * 2);
                ctx.fill();

                // Core
                ctx.fillStyle = "#3b0764";
                ctx.beginPath();
                ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 3.5, 0, Math.PI * 2);
                ctx.fill();

                // HP Bar
                ctx.fillStyle = "#22c55e";
                const hpPct = e.hp / e.maxHp;
                ctx.fillRect(e.x, e.y - 7, e.width * hpPct, 3);
            }
        }
        ctx.shadowBlur = 0;

        // Draw Boss
        if (boss) {
            ctx.shadowColor = "#ef4444";
            ctx.shadowBlur = 20;

            // Boss Body
            ctx.fillStyle = "#7f1d1d";
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(boss.x, boss.y, boss.width, boss.height, 8);
            ctx.fill();
            ctx.stroke();

            // Threat warning stripes
            ctx.fillStyle = "#ef4444";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "center";
            ctx.fillText(boss.name, boss.x + boss.width / 2, boss.y + 24);

            // Boss Health Bar
            const barW = boss.width - 20;
            const barX = boss.x + 10;
            const barY = boss.y + 40;
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(barX, barY, barW, 10);
            ctx.fillStyle = "#ef4444";
            const hpWidth = Math.max(0, (boss.hp / boss.maxHp) * barW);
            ctx.fillRect(barX, barY, hpWidth, 10);
            ctx.strokeStyle = "#fca5a5";
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, 10);

            ctx.shadowBlur = 0;
        }

        // Draw Power-ups
        for (let p of powerups) {
            ctx.shadowColor = "#00f2fe";
            ctx.shadowBlur = 10;
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            let symbol = "⚡";
            if (p.type === "shield") symbol = "🛡️";
            if (p.type === "hotfix") symbol = "💚";
            if (p.type === "nuke") symbol = "💣";
            ctx.fillText(symbol, p.x + p.width / 2, p.y + p.height / 2);
        }
        ctx.shadowBlur = 0;

        // Draw Particles
        for (let p of particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Draw Floating Texts
        for (let ft of floatingTexts) {
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.font = `bold ${ft.size}px 'JetBrains Mono', monospace`;
            ctx.textAlign = "center";
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.globalAlpha = 1.0;

        ctx.restore();
    }

    // Animation loop
    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
})();
