import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Global specific state
let scene, camera, renderer, controls;
let simulationData = null;
let isPlaying = false;
let currentTime = 0.0;
let maxTime = 10.0;
let playbackSpeed = 1.0;

// Visual Elements
let massMesh, springLine, anchorMesh;

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
    gridHelper.rotation.x = Math.PI / 2; // Z-up preference? Standard is Y-up. Let's stick to Y-up for Three.js defaults.
    // Actually, let's keep vertical = Y.
    gridHelper.rotation.x = 0;
    scene.add(gridHelper);

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 5, 2);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Objects
    setupSceneObjects();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    setupUI();

    // Start Loop
    renderer.setAnimationLoop(animate);

    // Fetch Run List
    fetchRuns();
}

function setupSceneObjects() {
    // Anchor
    const anchorGeom = new THREE.BoxGeometry(2, 0.2, 0.2);
    const anchorMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    anchorMesh = new THREE.Mesh(anchorGeom, anchorMat);
    anchorMesh.position.y = 2.0;
    scene.add(anchorMesh);

    // Mass
    const massGeom = new THREE.BoxGeometry(1, 1, 1);
    const massMat = new THREE.MeshLambertMaterial({ color: 0x00ddff });
    massMesh = new THREE.Mesh(massGeom, massMat);
    scene.add(massMesh);

    // Spring (Line)
    const points = [new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 0, 0)];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    springLine = new THREE.Line(lineGeom, lineMat);
    scene.add(springLine);
}

function updateVisuals(time) {
    if (!simulationData) return;

    const times = simulationData.data.time;
    const states = simulationData.data.states;

    // Binary Search / Find Index
    // Ideally we assume sorted time.
    let idx = times.findIndex(t => t >= time);

    if (idx === -1) idx = times.length - 1; // End
    if (idx === 0) idx = 1; // Start

    const t1 = times[idx - 1];
    const t2 = times[idx];
    const s1 = states[idx - 1]; // [x, v]
    const s2 = states[idx];

    // Linear Interpolation factor
    let alpha = (time - t1) / (t2 - t1);
    if (alpha < 0) alpha = 0;
    if (alpha > 1) alpha = 1;

    // Interpolate x
    const x1 = s1[0];
    const x2 = s2[0];
    const x = x1 + (x2 - x1) * alpha; // LERP

    // Mapping: x=0 is equilibrium. Let's say equilibrium is at Y=0 relative to anchor?
    // In physics, Force = -kx. x is displacement from rest.
    // If rest_length = 2.0. Then absolute Y = AnchorY - RestLength - x.
    const anchorY = 2.0;
    const restLength = 2.0;
    const currentY = anchorY - restLength - x;

    massMesh.position.y = currentY;

    // Update Spring
    const positions = springLine.geometry.attributes.position.array;
    positions[1] = 2.0; // Y1 (Anchor)
    positions[4] = currentY; // Y2 (Mass top? center?)
    // Mass center is currentY. Spring goes to center roughly.
    springLine.geometry.attributes.position.needsUpdate = true;

    // Energy HUD
    const e1 = simulationData.data.energy[idx - 1];
    const e2 = simulationData.data.energy[idx];
    const e = e1 + (e2 - e1) * alpha;
    document.getElementById('energy').innerText = `Energy: ${e.toFixed(4)} J`;

    // Playhead
    const pct = (time / maxTime) * 100;
    document.getElementById('playhead').style.left = `${pct}%`;
}


function animate() {
    controls.update();

    if (isPlaying && simulationData) {
        // Wall clock delta unfortunately not passed easily in setAnimationLoop? 
        // Can use clock.
        const dt = 1 / 60.0 * playbackSpeed; // Approximation
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
        opt.innerText = `${r.metadata.system} (${r.metadata.solver})`;
        sel.appendChild(opt);
    });
}

async function loadRun(id) {
    document.getElementById('status').innerText = "Loading data...";
    const res = await fetch(`/api/runs/${id}`);
    simulationData = await res.json();
    maxTime = simulationData.data.time[simulationData.data.time.length - 1];
    currentTime = 0;
    isPlaying = false;
    document.getElementById('status').innerText = "Ready";
    document.getElementById('metadata').innerText = `Steps: ${simulationData.data.time.length} | dt: ${simulationData.metadata.dt}`;
    updateVisuals(0);
}

// UI Setup
function setupUI() {
    document.getElementById('btnLoad').onclick = () => {
        const id = document.getElementById('runSelect').value;
        loadRun(id);
    };

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

    // Scrubbing
    document.getElementById('timeline').onclick = (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        currentTime = pct * maxTime;
        updateVisuals(currentTime);
    };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
