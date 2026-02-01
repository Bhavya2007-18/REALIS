import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Global specific state
let scene, camera, renderer, controls;
let simulationData = null;
let isPlaying = false;
let currentTime = 0.0;
let maxTime = 10.0;
let playbackSpeed = 1.0;

// Visual Elements Groups
let currentSystemGroup = null;

// Init
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Axes
    scene.add(new THREE.AxesHelper(1));

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // UI Setup
    setupUI();
    window.addEventListener('resize', onWindowResize);

    // Start Loop
    renderer.setAnimationLoop(animate);

    // Fetch
    fetchRuns();
}

// --- RENDERERS ---

class MassSpringRenderer {
    setup(scene) {
        this.group = new THREE.Group();
        const anchor = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: 0x888888 }));
        anchor.position.y = 2.0;
        this.group.add(anchor);
        this.mass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x00ddff }));
        this.group.add(this.mass);
        const pt = [new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 0, 0)];
        this.spring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pt), new THREE.LineBasicMaterial({ color: 0xffffff }));
        this.group.add(this.spring);
        scene.add(this.group);
        return this.group;
    }
    update(state) {
        const x = state[0];
        const y = -x;
        this.mass.position.y = y;
        const pos = this.spring.geometry.attributes.position.array;
        pos[1] = 2.0; pos[4] = y;
        this.spring.geometry.attributes.position.needsUpdate = true;
    }
}

class SimplePendulumRenderer {
    setup(scene) {
        this.group = new THREE.Group();
        const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshLambertMaterial({ color: 0x888888 }));
        pivot.position.set(0, 2, 0);
        this.group.add(pivot);
        const pt = [new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 1, 0)];
        this.rod = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pt), new THREE.LineBasicMaterial({ color: 0xffffff }));
        this.group.add(this.rod);
        this.bob = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshLambertMaterial({ color: 0xff0055 }));
        this.group.add(this.bob);
        scene.add(this.group);
        return this.group;
    }
    update(state) {
        const theta = state[0];
        const L = 2.0;
        const x = L * Math.sin(theta);
        const y = -L * Math.cos(theta);
        this.bob.position.set(x, 2 + y, 0);
        const pos = this.rod.geometry.attributes.position.array;
        pos[0] = 0; pos[1] = 2; pos[2] = 0;
        pos[3] = x; pos[4] = 2 + y; pos[5] = 0;
        this.rod.geometry.attributes.position.needsUpdate = true;
    }
}

class DoublePendulumRenderer {
    setup(scene) {
        this.group = new THREE.Group();
        this.group.add(new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshLambertMaterial({ color: 0x888888 })).translateY(2));
        const pts = [new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0)];
        this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff }));
        this.group.add(this.line);
        this.bob1 = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshLambertMaterial({ color: 0xffaa00 }));
        this.group.add(this.bob1);
        this.bob2 = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshLambertMaterial({ color: 0xff0055 }));
        this.group.add(this.bob2);
        scene.add(this.group);
        return this.group;
    }
    update(state) {
        const q1 = state[0]; const q2 = state[1];
        const L1 = 1.5; const L2 = 1.5;
        const x0 = 0; const y0 = 2;
        const x1 = x0 + L1 * Math.sin(q1);
        const y1 = y0 - L1 * Math.cos(q1);
        const x2 = x1 + L2 * Math.sin(q2);
        const y2 = y1 - L2 * Math.cos(q2);
        this.bob1.position.set(x1, y1, 0);
        this.bob2.position.set(x2, y2, 0);
        const pos = this.line.geometry.attributes.position.array;
        pos[0] = x0; pos[1] = y0; pos[3] = x1; pos[4] = y1; pos[6] = x2; pos[7] = y2;
        this.line.geometry.attributes.position.needsUpdate = true;
    }
}

class RollingDiskRenderer {
    setup(scene) {
        this.group = new THREE.Group();

        // 1. Slope Group: Rotated by -theta to align "x" with slope surface
        this.slopeGroup = new THREE.Group();
        this.theta = Math.PI / 6; // Default, will update
        this.slopeGroup.rotation.z = -this.theta;

        // Visual Ground (Inside Slope Group)
        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(20, 0.2, 5),
            new THREE.MeshLambertMaterial({ color: 0x444444 })
        );
        ground.position.y = -0.1; // Just below x-axis
        this.slopeGroup.add(ground);

        // 2. Translational Group (Moves along X)
        this.transGroup = new THREE.Group();
        this.slopeGroup.add(this.transGroup);

        // 3. Disk Mesh (Rotates locally)
        this.disk = new THREE.Mesh(
            new THREE.CylinderGeometry(1, 1, 0.2, 32),
            new THREE.MeshLambertMaterial({ color: 0x00ff00 })
        );
        // Align cylinder axis (Y) to world Z initially (rolling axis)
        // Rotate X by 90 deg -> Axis becomes Z.
        this.disk.rotation.x = Math.PI / 2;
        this.disk.position.y = 1.0; // Radius = 1.0, sits on top of axis

        // Marker
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.3), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        // Marker needs to be attached to disk before rotation
        this.disk.add(marker);

        this.transGroup.add(this.disk);
        this.group.add(this.slopeGroup);

        scene.add(this.group);
        return this.group;
    }

    update(state) {
        const x = state[0];

        // Move along slope
        this.transGroup.position.x = x;

        // Rotate disk
        // v = omega * r => x = theta * r => theta = x / r
        const r = 1.0;
        const angle = x / r;

        // Visual Rotation (Negative because rolling down positive x usually means clockwise rotation)
        this.disk.rotation.z = -angle;
    }
}

// Global Renderer
let activeRenderer = null;

function setSystemType(type) {
    if (activeRenderer) {
        scene.remove(currentSystemGroup);
    }

    if (type === "simple_pendulum") activeRenderer = new SimplePendulumRenderer();
    else if (type === "double_pendulum") activeRenderer = new DoublePendulumRenderer();
    else if (type === "rolling_disk") activeRenderer = new RollingDiskRenderer();
    else activeRenderer = new MassSpringRenderer(); // Default

    currentSystemGroup = activeRenderer.setup(scene);
}


function updateVisuals(time) {
    if (!simulationData || !activeRenderer) return;

    const times = simulationData.data.time;
    const states = simulationData.data.states;

    let idx = times.findIndex(t => t >= time);
    if (idx === -1) idx = times.length - 1;
    if (idx === 0) idx = 1;

    const t1 = times[idx - 1];
    const t2 = times[idx];
    const s1 = states[idx - 1];
    const s2 = states[idx];

    let alpha = (time - t1) / (t2 - t1);
    if (alpha < 0) alpha = 0; if (alpha > 1) alpha = 1;

    const s = [];
    for (let i = 0; i < s1.length; i++) {
        s.push(s1[i] + (s2[i] - s1[i]) * alpha);
    }

    activeRenderer.update(s);

    if (simulationData.data.energy) {
        const e1 = simulationData.data.energy[idx - 1];
        const e2 = simulationData.data.energy[idx];
        const e = e1 + (e2 - e1) * alpha;
        document.getElementById('energy').innerText = `Energy: ${e.toFixed(4)}`;
    }

    const pct = (time / maxTime) * 100;
    document.getElementById('playhead').style.left = `${pct}%`;
}


function animate() {
    controls.update();

    if (isPlaying && simulationData) {
        const dt = 1 / 60.0 * playbackSpeed;
        currentTime += dt;
        if (currentTime > maxTime) {
            currentTime = maxTime;
            isPlaying = false;
            document.getElementById('btnPlay').innerText = "Replay";
        }
        updateVisuals(currentTime);
    }

    renderer.render(scene, camera);
}

// Data Fetching
async function fetchRuns() {
    const res = await fetch('/api/runs');
    const runs = await res.json();
    const sel = document.getElementById('runSelect');
    sel.innerHTML = '';
    runs.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        const sys = r.metadata.system_type || "Unknown";
        opt.innerText = `${r.metadata.system} [${sys}]`;
        sel.appendChild(opt);
    });
    // Auto load top
    if (runs.length > 0) {
        // Optional: loadRun(runs[0].id);
    }
}

async function loadRun(id) {
    document.getElementById('status').innerText = "Loading data...";
    const res = await fetch(`/api/runs/${id}`);
    simulationData = await res.json();
    maxTime = simulationData.data.time[simulationData.data.time.length - 1];

    const type = simulationData.metadata.system_type || "mass_spring_1d";
    setSystemType(type);

    currentTime = 0;
    isPlaying = false;
    document.getElementById('status').innerText = "Ready";
    document.getElementById('metadata').innerText = `Type: ${type} | Steps: ${simulationData.data.time.length}`;
    updateVisuals(0);
}

// UI Setup
function setupUI() {
    // Load button
    document.getElementById('btnLoad').onclick = () => {
        const id = document.getElementById('runSelect').value;
        loadRun(id);
    };

    // Playback
    document.getElementById('btnPlay').onclick = () => {
        isPlaying = true;
        document.getElementById('btnPlay').innerText = "Play";
        if (currentTime >= maxTime) currentTime = 0;
    };
    document.getElementById('btnPause').onclick = () => isPlaying = false;
    document.getElementById('btnReset').onclick = () => {
        currentTime = 0;
        updateVisuals(0);
        isPlaying = false;
    };

    // Speed
    const speedRange = document.getElementById('speedRange');
    const speedVal = document.getElementById('speedVal');
    speedRange.oninput = () => {
        playbackSpeed = parseFloat(speedRange.value);
        speedVal.innerText = playbackSpeed.toFixed(1) + "x";
    };

    // Timeline
    document.getElementById('timeline').onclick = (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        currentTime = pct * maxTime;
        updateVisuals(currentTime);
    };

    // Sim Model defaults
    const modelSelect = document.getElementById('simModel');
    const paramsInput = document.getElementById('simParams');
    const stateInput = document.getElementById('simState');

    modelSelect.onchange = () => {
        const m = modelSelect.value;
        if (m === "mass_spring") {
            paramsInput.value = '{"k":10.0, "m":1.0, "c":0.2}';
            stateInput.value = '[2.0, 0.0]';
        } else if (m === "simple_pendulum") {
            paramsInput.value = '{"length":1.0, "mass":1.0, "damping":0.0}';
            stateInput.value = '[1.5, 0.0]';
        } else if (m === "double_pendulum") {
            paramsInput.value = '{"L1":1.0, "L2":1.0, "m1":1.0, "m2":1.0}';
            stateInput.value = '[1.57, 1.57, 0.0, 0.0]';
        } else if (m === "rolling_disk") {
            paramsInput.value = '{"mass":2.0, "radius":0.5, "theta":0.52}';
            stateInput.value = '[0.0, 0.0]';
        }
    };

    // API Run
    document.getElementById('btnRunSim').onclick = async () => {
        const btn = document.getElementById('btnRunSim');
        btn.innerText = "Running...";
        btn.disabled = true;

        try {
            const config = {
                model: modelSelect.value,
                params: JSON.parse(paramsInput.value),
                state0: JSON.parse(stateInput.value),
                steps: parseInt(document.getElementById('simSteps').value),
                dt: 0.01
            };

            const req = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const res = await req.json();

            if (res.status === "success") {
                await fetchRuns(); // Refresh list
                document.getElementById('runSelect').value = res.id;
                loadRun(res.id); // Auto load
            } else {
                alert("Sim failed: " + res.error);
            }
        } catch (e) {
            alert("Error: " + e);
        }

        btn.innerText = "Run Simulation";
        btn.disabled = false;
    };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
