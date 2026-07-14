/**
 * CellScene — historically accurate Three.js recreation of Mandela's Cell B, Section B,
 * Robben Island (1964–1982).
 *
 * Dimensions: 2.1 m wide × 2.4 m deep × 2.4 m high
 * (Mandela: "I could walk the length of my cell in three paces.")
 *
 * Key details sourced from the Nelson Mandela Centre of Memory and museum records:
 * - Lime-washed whitewashed concrete block walls (cream/yellowish-white)
 * - Dark damp concrete floor
 * - Single wire-mesh-caged bare bulb, burned 24 hrs/day
 * - Small high barred window on back wall (~30 × 22 cm)
 * - Straw mat on floor (no bed), rolled blanket
 * - Iron "ballie" bucket (~25 cm diameter) with lid in corner
 * - Enamel food bowl
 * - Small wooden table against back wall
 * - Tally marks scratched into the lime wash
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import type { AudioManager } from './AudioManager';

const W = 2.1;   // width (m)
const D = 2.4;   // depth, front gate to back wall (m)
const H = 2.4;   // ceiling height (m) — oppressively low

// Historically accurate colours
const WALL_COLOR    = 0xE8DFCA;  // lime-washed cream — yellowed whitewash over concrete blocks
const FLOOR_COLOR   = 0x484540;  // cold damp concrete
const CEILING_COLOR = 0xD5CCBA;  // slightly darker cream (uneven lime wash)
const MAT_COLOR     = 0xB8943A;  // dry straw yellow
const BLANKET_COLOR = 0x3D2E1A;  // coarse dark-brown wool blanket
const BUCKET_COLOR  = 0x2A2A26;  // iron/tin, oxidised
const WOOD_COLOR    = 0x6B4C28;  // worn rough wood

export class CellScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private gatePivot!: THREE.Group;
  private gate!: THREE.Group;
  private barMaterial!: THREE.MeshStandardMaterial;
  private glowLight!: THREE.PointLight;
  private glowTween!: gsap.core.Tween;
  private gateClickables: THREE.Mesh[] = [];

  private rafId = 0;
  private gateTriggered = false;

  private onResolutionComplete: () => void;
  private audioManager: AudioManager;

  constructor(
    canvas: HTMLCanvasElement,
    audioManager: AudioManager,
    onResolutionComplete: () => void,
  ) {
    this.audioManager = audioManager;
    this.onResolutionComplete = onResolutionComplete;

    // ── Renderer ───────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.65; // darker, more oppressive

    // ── Scene ──────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080806);
    this.scene.fog = new THREE.FogExp2(0x080806, 0.2);

    // ── Camera ─────────────────────────────────────────────────────────────
    // Positioned outside the gate looking in — user sees bars + cell interior
    this.camera = new THREE.PerspectiveCamera(
      65,
      canvas.clientWidth / canvas.clientHeight,
      0.05,
      30,
    );
    this.camera.position.set(0, 1.35, D / 2 + 0.8);

    // ── Orbit controls ─────────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1.2, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 3.2;
    this.controls.maxPolarAngle = Math.PI * 0.80;
    this.controls.minPolarAngle = Math.PI * 0.12;

    this._buildLights();
    this._buildCell();
    this._buildFurnishings();
    this._buildGate();
    this._buildGlowFX();
    this._tryLoadGLB();

    canvas.addEventListener('click', this._onClick);
    canvas.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('resize', this._onResize);

    this._tick();
  }

  // ── Lighting ──────────────────────────────────────────────────────────────

  private _buildLights(): void {
    // Very faint ambient — the cell is starved of light
    this.scene.add(new THREE.AmbientLight(0xfff5e0, 0.04));

    // Primary: bare incandescent bulb hanging from centre of ceiling.
    // Burns 24 hours/day — warm amber, casts hard shadows.
    const bulb = new THREE.PointLight(0xffaa55, 1.2, 6);
    bulb.position.set(0, H - 0.18, 0.1);
    bulb.castShadow = true;
    bulb.shadow.mapSize.set(512, 512);
    bulb.shadow.radius = 3;
    this.scene.add(bulb);

    // Tiny visible glowing sphere inside wire cage
    const bulbCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({
        emissive: 0xffcc88,
        emissiveIntensity: 4,
        color: 0x000000,
      }),
    );
    bulbCore.position.copy(bulb.position);
    this.scene.add(bulbCore);

    // Faint cool light through the high window (moonlight / yard floodlight)
    const windowLight = new THREE.SpotLight(0x99aabb, 0.4, 4, Math.PI / 14, 0.6);
    windowLight.position.set(0, H - 0.22, -D / 2 + 0.05);
    windowLight.target.position.set(0, 0.5, -D / 2 + 1.2);
    this.scene.add(windowLight);
    this.scene.add(windowLight.target);
  }

  // ── Procedural cell shell ─────────────────────────────────────────────────

  private _buildCell(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: WALL_COLOR,
      roughness: 0.92,
      metalness: 0.0,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      roughness: 0.98,
      metalness: 0.0,
    });
    const ceilMat = new THREE.MeshStandardMaterial({
      color: CEILING_COLOR,
      roughness: 0.9,
      metalness: 0.0,
    });

    const plane = (w: number, h: number) => new THREE.PlaneGeometry(w, h, 3, 3);

    // Floor — cold, damp concrete
    const floor = new THREE.Mesh(plane(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling — oppressively close
    const ceiling = new THREE.Mesh(plane(W, D), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = H;
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);

    // Back wall (opposite gate) — lime-washed, window cut-out area
    const back = new THREE.Mesh(plane(W, H), wallMat);
    back.position.set(0, H / 2, -D / 2);
    back.receiveShadow = true;
    this.scene.add(back);

    // Left wall
    const leftWall = new THREE.Mesh(plane(D, H), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-W / 2, H / 2, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right wall — has the high window
    const rightWall = new THREE.Mesh(plane(D, H), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(W / 2, H / 2, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // ── High barred window on right wall ──
    // Historical: very small, near the ceiling, barely lets in light.
    // Approximately 30 cm wide × 22 cm tall, about 30 cm from ceiling.
    this._buildWindow();

    // ── Concrete block seams — painted horizontal lines ──
    // Simulate visible block coursing on walls (lime wash over breeze blocks)
    this._addBlockSeams();

    // ── Wire-mesh cage around the bare bulb ──
    this._buildBulbCage();

    // ── Tally marks scratched into lime wash ──
    this._buildTallyMarks();
  }

  private _buildWindow(): void {
    const WW = 0.30; // window width
    const WH = 0.22; // window height
    const WY = H - 0.32; // near ceiling
    const WZ = W / 2 - 0.01; // sits flush in right wall
    const WX = -0.1; // slightly toward back

    // Window recess (slightly inset darker plane to imply depth)
    const recessMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a14,
      roughness: 1.0,
    });
    const recess = new THREE.Mesh(
      new THREE.PlaneGeometry(WW, WH),
      recessMat,
    );
    recess.rotation.y = -Math.PI / 2;
    recess.position.set(WZ + 0.001, WY, WX);
    this.scene.add(recess);

    // Sky-glow plane behind it (additive blue-grey)
    const skyMat = new THREE.MeshStandardMaterial({
      color: 0x8899bb,
      emissive: 0x445566,
      emissiveIntensity: 0.5,
    });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), skyMat);
    sky.rotation.y = Math.PI / 2;
    sky.position.set(WZ + 0.15, WY, WX);
    this.scene.add(sky);

    // Iron bars across the window — 3 vertical
    const barMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a14,
      roughness: 0.4,
      metalness: 0.7,
    });
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, WH + 0.04, 6),
        barMat,
      );
      bar.rotation.z = Math.PI / 2; // horizontal cylinder becomes vertical when rotated
      // Actually keep vertical:
      bar.rotation.z = 0;
      bar.position.set(WZ - 0.02, WY, WX - WW / 2 + (i + 0.5) * (WW / 3));
      bar.rotation.y = Math.PI / 2;
      this.scene.add(bar);
    }

    // 1 horizontal bar across middle
    const hbar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, WW + 0.04, 6),
      barMat,
    );
    hbar.rotation.z = Math.PI / 2;
    hbar.position.set(WZ - 0.02, WY, WX);
    this.scene.add(hbar);
  }

  private _addBlockSeams(): void {
    // Thin dark lines on back wall to suggest concrete block coursing
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0xBEB5A2,
      roughness: 1.0,
    });
    // Horizontal block courses ~20cm high
    const courseHeight = 0.20;
    for (let y = courseHeight; y < H - 0.1; y += courseHeight) {
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(W - 0.001, 0.006, 0.003),
        seamMat,
      );
      seam.position.set(0, y, -D / 2 + 0.004);
      this.scene.add(seam);
    }
  }

  private _buildBulbCage(): void {
    // Wire mesh dome cage surrounding the bare bulb
    // Historical: bulbs were encased in a wire cage bolted to the ceiling
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a18,
      roughness: 0.4,
      metalness: 0.8,
      wireframe: true,
    });
    const cage = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      cageMat,
    );
    cage.position.set(0, H - 0.18, 0.1);
    this.scene.add(cage);

    // Cord from ceiling to cage
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.2, 5),
      new THREE.MeshStandardMaterial({ color: 0x1a1a14, roughness: 1.0 }),
    );
    cord.position.set(0, H - 0.09, 0.1);
    this.scene.add(cord);
  }

  private _buildTallyMarks(): void {
    // Scratched into the lime wash on the back wall — groups of 5 (IIII with diagonal)
    const markMat = new THREE.MeshStandardMaterial({
      color: 0xC8BFA8,  // slightly lighter than wall — scratched through to concrete
      roughness: 1.0,
    });

    const WZ = -D / 2 + 0.003;
    const baseY = H / 2 - 0.35;
    const baseX = 0.22;

    // First group of 5 tallies
    for (let i = 0; i < 4; i++) {
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.10, 0.003),
        markMat,
      );
      mark.position.set(baseX + i * 0.022, baseY, WZ);
      this.scene.add(mark);
    }
    // Diagonal slash
    const slash1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.13, 0.003),
      markMat,
    );
    slash1.position.set(baseX + 0.044, baseY, WZ);
    slash1.rotation.z = Math.PI / 5;
    this.scene.add(slash1);

    // Second incomplete group
    for (let i = 0; i < 3; i++) {
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.10, 0.003),
        markMat,
      );
      mark.position.set(baseX + 0.115 + i * 0.022, baseY, WZ);
      this.scene.add(mark);
    }

    // A lone year scratched below: "1964"
    // Simplified as a horizontal scratch line
    const yearLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.004, 0.003),
      markMat,
    );
    yearLine.position.set(baseX + 0.04, baseY - 0.10, WZ);
    this.scene.add(yearLine);
  }

  // ── Cell furnishings ──────────────────────────────────────────────────────

  private _buildFurnishings(): void {
    this._buildStrawMat();
    this._buildBallieBucket();
    this._buildFoodBowl();
    this._buildTable();
  }

  private _buildStrawMat(): void {
    // Historical: prisoners slept on a thin straw mat (ukhamba) directly on concrete
    // Positioned against the left wall, away from the gate
    const matMat = new THREE.MeshStandardMaterial({
      color: MAT_COLOR,
      roughness: 1.0,
      metalness: 0.0,
    });

    // Main mat — thin, yellowish straw
    const mat = new THREE.Mesh(
      new THREE.BoxGeometry(0.60, 0.03, 1.80),
      matMat,
    );
    mat.position.set(-W / 2 + 0.38, 0.015, -0.10);
    mat.receiveShadow = true;
    mat.castShadow = true;
    this.scene.add(mat);

    // Visible straw texture edge ridges
    for (let i = 0; i < 6; i++) {
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.60, 0.01, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xA07828, roughness: 1.0 }),
      );
      ridge.position.set(-W / 2 + 0.38, 0.03, -0.85 + i * 0.30);
      this.scene.add(ridge);
    }

    // Blanket — folded/rolled at one end of the mat
    const blanketMat = new THREE.MeshStandardMaterial({
      color: BLANKET_COLOR,
      roughness: 1.0,
    });
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.60, 0.08, 0.42),
      blanketMat,
    );
    blanket.position.set(-W / 2 + 0.38, 0.055, 0.69);
    blanket.rotation.y = 0.04;
    blanket.castShadow = true;
    this.scene.add(blanket);

    // Thin pillow-less head depression — just a slight raise in blanket
    const pillowArea = new THREE.Mesh(
      new THREE.BoxGeometry(0.50, 0.02, 0.22),
      blanketMat,
    );
    pillowArea.position.set(-W / 2 + 0.38, 0.085, 0.55);
    this.scene.add(pillowArea);
  }

  private _buildBallieBucket(): void {
    // Historical "ballie": an iron bucket ~25 cm diameter with concave metal lid.
    // Used as toilet. Positioned in far corner.
    const metalMat = new THREE.MeshStandardMaterial({
      color: BUCKET_COLOR,
      roughness: 0.5,
      metalness: 0.65,
    });
    const lidMat = new THREE.MeshStandardMaterial({
      color: 0x222220,
      roughness: 0.4,
      metalness: 0.7,
    });

    // Body — slightly tapered cylinder (wider at top)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.105, 0.28, 12),
      metalMat,
    );
    body.position.set(W / 2 - 0.18, 0.14, -D / 2 + 0.22);
    body.castShadow = true;
    this.scene.add(body);

    // Concave lid — flat disc on top
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.130, 0.130, 0.025, 12),
      lidMat,
    );
    lid.position.set(W / 2 - 0.18, 0.293, -D / 2 + 0.22);
    lid.castShadow = true;
    this.scene.add(lid);

    // Handle — thin semi-circular wire handle
    const handleGeo = new THREE.TorusGeometry(0.08, 0.008, 4, 16, Math.PI);
    const handle = new THREE.Mesh(handleGeo, metalMat);
    handle.position.set(W / 2 - 0.18, 0.29, -D / 2 + 0.22);
    handle.rotation.z = Math.PI;
    handle.rotation.y = Math.PI / 2;
    this.scene.add(handle);
  }

  private _buildFoodBowl(): void {
    // Historical: enamel bowl (mealie pap, vegetables). Placed near table.
    const enamelMat = new THREE.MeshStandardMaterial({
      color: 0x888878,
      roughness: 0.3,
      metalness: 0.4,
    });

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.08, 0.07, 12),
      enamelMat,
    );
    bowl.position.set(W / 2 - 0.30, 0.035, -D / 2 + 0.55);
    bowl.castShadow = true;
    this.scene.add(bowl);
  }

  private _buildTable(): void {
    // Historical: a small rough wooden table or shelf, added later in imprisonment.
    // Positioned against the back-right wall.
    const tableMat = new THREE.MeshStandardMaterial({
      color: WOOD_COLOR,
      roughness: 0.95,
      metalness: 0.0,
    });

    const tableTop = 0.55; // table height

    // Table surface
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.04, 0.32),
      tableMat,
    );
    top.position.set(W / 2 - 0.32, tableTop, -D / 2 + 0.23);
    top.castShadow = true;
    top.receiveShadow = true;
    this.scene.add(top);

    // Two legs (or leaning against wall — simpler)
    const legMat = tableMat.clone();
    [-0.18, 0.18].forEach((xOff) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, tableTop, 0.04),
        legMat,
      );
      leg.position.set(W / 2 - 0.32 + xOff, tableTop / 2, -D / 2 + 0.18);
      this.scene.add(leg);
    });

    // Shelf above table (a plank on small pegs, added by Mandela for study books)
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.03, 0.22),
      tableMat,
    );
    shelf.position.set(W / 2 - 0.32, tableTop + 0.42, -D / 2 + 0.13);
    this.scene.add(shelf);
  }

  // ── Iron gate (front face, hinged at left post) ──────────────────────────

  private _buildGate(): void {
    this.barMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a16,
      roughness: 0.4,
      metalness: 0.85,
      emissive: 0x000000,
    });

    // Pivot at left edge of gate opening (the hinge side)
    this.gatePivot = new THREE.Group();
    this.gatePivot.position.set(-W / 2, 0, D / 2);
    this.scene.add(this.gatePivot);

    // Gate group offset so local origin is at left hinge edge
    this.gate = new THREE.Group();
    this.gate.position.x = W / 2;
    this.gatePivot.add(this.gate);

    const R = 0.032; // bar radius — slightly thinner for historical accuracy

    // ── 8 vertical bars ──
    const barCount = 8;
    for (let i = 0; i < barCount; i++) {
      const x = -W / 2 + (W / (barCount - 1)) * i;
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R, H, 10),
        this.barMaterial,
      );
      bar.position.set(x, H / 2, 0);
      bar.castShadow = true;
      this.gate.add(bar);
      this.gateClickables.push(bar);
    }

    // ── 3 horizontal rails ──
    const railGeo = new THREE.CylinderGeometry(R * 1.15, R * 1.15, W, 10);
    railGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    [0.15, H * 0.48, H - 0.15].forEach((y) => {
      const rail = new THREE.Mesh(railGeo.clone(), this.barMaterial);
      rail.position.set(0, y, 0);
      this.gate.add(rail);
      this.gateClickables.push(rail);
    });

    // ── Frame posts ──
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x111110,
      roughness: 0.3,
      metalness: 0.9,
    });
    const framePost = new THREE.BoxGeometry(0.065, H + 0.06, 0.065);
    [-W / 2, W / 2].forEach((x) => {
      const post = new THREE.Mesh(framePost, frameMat);
      post.position.set(x, H / 2, 0);
      this.gate.add(post);
    });
    // Top rail
    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.065, 0.065, 0.065),
      frameMat,
    );
    topBar.position.set(0, H, 0);
    this.gate.add(topBar);

    // ── Lock box on right post ──
    const lockBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.10, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x222220, roughness: 0.3, metalness: 0.8 }),
    );
    lockBox.position.set(W / 2 - 0.04, H * 0.48, 0.04);
    this.gate.add(lockBox);
  }

  // ── Pulsing amber glow on gate bars ──────────────────────────────────────

  private _buildGlowFX(): void {
    this.glowLight = new THREE.PointLight(0xff7722, 0, 4);
    this.glowLight.position.set(0, H * 0.5, D / 2 + 0.35);
    this.scene.add(this.glowLight);

    this.glowTween = gsap.to(this.glowLight, {
      intensity: 0.5,
      duration: 2.0,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }

  // ── Optional .glb model overlay ───────────────────────────────────────────

  private _tryLoadGLB(): void {
    const loader = new GLTFLoader();
    loader.load(
      '/assets/models/cell.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.scene.add(gltf.scene);
      },
      undefined,
      () => { /* no GLB — procedural geometry is the full experience */ },
    );
  }

  // ── Gate open → camera rush → Act 3 ─────────────────────────────────────

  triggerResolution(canvasEl: HTMLCanvasElement): void {
    if (this.gateTriggered) return;
    this.gateTriggered = true;
    this.controls.enabled = false;
    this.glowTween.kill();

    this.audioManager.stopCell();
    this.audioManager.playInauguration();

    const tl = gsap.timeline({
      onComplete: () => this.onResolutionComplete(),
    });

    // Gate swings open on the left hinge
    tl.to(this.gatePivot.rotation, {
      y: -Math.PI * 0.80,
      duration: 2.4,
      ease: 'power3.inOut',
    });

    // Camera rushes through and out into light
    tl.to(
      this.camera.position,
      { z: -8, y: 1.0, duration: 3.0, ease: 'power4.in' },
      '-=1.4',
    );

    // Remove fade wrapper class to trigger CSS opacity → 0 transition
    const wrapper = canvasEl.closest('.act2-fade-wrapper') as HTMLElement | null;
    if (wrapper) {
      setTimeout(() => wrapper.classList.remove('act2-fade-wrapper--visible'), 700);
    }
  }

  // ── Raycasting ────────────────────────────────────────────────────────────

  private _onClick = (e: MouseEvent): void => {
    if (this.gateTriggered) return;
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (this.raycaster.intersectObjects(this.gateClickables).length > 0) {
      this.triggerResolution(canvas);
    }
  };

  private _onMouseMove = (e: MouseEvent): void => {
    if (this.gateTriggered) return;
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.gateClickables).length > 0;
    canvas.style.cursor = hit ? 'pointer' : 'grab';
    this.barMaterial.emissive.setHex(hit ? 0x553300 : 0x000000);
    if (hit) this.glowLight.intensity = Math.max(this.glowLight.intensity, 0.9);
  };

  private _onResize = (): void => {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  // ── Render loop ───────────────────────────────────────────────────────────

  private _tick = (): void => {
    this.rafId = requestAnimationFrame(this._tick);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.glowTween?.kill();
    window.removeEventListener('resize', this._onResize);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('click', this._onClick);
    canvas.removeEventListener('mousemove', this._onMouseMove);
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
          (m) => (m as THREE.Material).dispose(),
        );
      }
    });
  }
}
