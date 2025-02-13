import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { TAARenderPass } from "three/examples/jsm/postprocessing/TAARenderPass.js";
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
// import { label } from "three/tsl";

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------
/**
 * Returns true if the device is a phone.
 */
function isPhone() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Events Tags, adjust positions slightly
// Optimisation
// Main Website Integration
// Design
// Spinning Issue


// ---------------------------------------------------------------------------
// Global Parameters & Configuration
// ---------------------------------------------------------------------------
const sites = [
  "https://www.google.com",
  "https://www.bing.com",
  "https://www.duckduckgo.com",
  "https://www.yahoo.com",
  "https://www.baidu.com",
];

let params = {
  showStats: false,
  userInteracting: true,
  fov: 27,
  fxaa: false,
  taa: false,
  bloomPass: true,
  taaSampleLevel: 1,
  nightAmount: 0,
  bloomStrength: 1,
  bloomRadius: 0.7,
  bloomThreshold: 0.8,
  fogHeight: 1,
  fogColor: 0x446677,
  groundFogDensity: 10,
  cameraInitialX: 10,
  cameraInitialY: 3,
  cameraInitialZ: 10,
  lookAt: new THREE.Vector3(0, 1, 0),
  enableHorizontalSpin: true,
  spinSpeed: 0.01,
  noOfStars: 1000,
  moonColor: 0x91a3b0,
  skyColor: 0x546bab,
};

if (isPhone()) {
  params = {
    showStats: true,
    userInteracting: true,
    fov: 30,
    fxaa: false,
    taa: false,
    bloomPass: true,
    taaSampleLevel: 1,
    nightAmount: 0,
    bloomStrength: 1,
    bloomRadius: 0.5,
    bloomThreshold: 0.8,
    fogHeight: 1.5,
    fogColor: 0x446677,
    groundFogDensity: 8,
    cameraInitialX: 15,
    cameraInitialY: 3,
    cameraInitialZ: 15,
    lookAt: new THREE.Vector3(0, 1, 1.5),
    enableHorizontalSpin: true,
    spinSpeed: 0.01,
    noOfStars: 400,
    moonColor: 0x91a3b0,
    skyColor: 0x546bab,
  };
}

// ---------------------------------------------------------------------------
// Global Variables & Scene Setup
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  params.fov,
  window.innerWidth / window.innerHeight,
  1,
  3000
);

const rendererParams = {
  antialias: false,
  logarithmicDepthBuffer: true,
  precision: "highp",
};
const renderer = new THREE.WebGLRenderer(rendererParams);
renderer.setPixelRatio(isPhone() ? 1 : window.devicePixelRatio);

// Global clipping plane
const globalPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.5);
renderer.clippingPlanes = [globalPlane];

const clock = new THREE.Clock();

// Post–processing variables
let composer;
let labelRenderer;
let taaRenderPass; // Global reference to TAARenderPass
let taaIndex = 0; // Frame counter for toggling accumulation

// Model definitions and colors
const models = Array.from({ length: 15 }, (_, i) => `./model_${i}.obj`);
const modelColors = {
  0: { color: 0x754e1a, opacity: 1 },  // Ground
  1: { color: 0x754e1a, opacity: 1 },
  2: { color: 0x754e1a, opacity: 1 },
  3: { color: 0x2b4e2a, opacity: 1 },  // Grass
  4: { color: 0x66665c, opacity: 1 },  // Walls 1
  5: { color: 0x66665c, opacity: 1 },  // Walls 2
  6: { color: 0x7e99a3, opacity: 1 },  // Roofs
  7: { color: 0xffffff, opacity: 1 },  // Windows
  8: { color: 0xffffff, opacity: 1 },
  9: { color: 0xffffff, opacity: 1 },
  10: { color: 0xb4b4b4, opacity: 1 }, // Window Railings
  11: { color: 0xe8f9ff, opacity: 1 }, // Green Houses
  12: { color: 0xffffff, opacity: 1 },
  13: { color: 0xffffff, opacity: 1 },
  14: { color: 0xffffff, opacity: 0.5 }, // Clock Window
  15: { color: 0x865110, opacity: 1 }, // UnderGround
  16: { color: 0xe8f9ff, opacity: 0.8 }, // Water
};

// Hitboxes for clickable areas (created only once)
const hitboxes = [];
const hitboxPositions = [
  [-1.4, 0.8, 1.45],
  [1.2, 0, 0.2],
  [0.2, 1.4, 0],
  [-1.9, -0.2, 2],
  [0.5, -0.5, -1.7],
];
const hitboxSizes = [
  new THREE.Vector3(0.6, 1.6, 0.6),
  new THREE.Vector3(1.5, 1, 1.5),
  new THREE.Vector3(0.6, 1.7, 0.6), // Ravenclaw Event
  new THREE.Vector3(1.2, 0.9, 1.2),
  new THREE.Vector3(0.3, 1.9, 0.3),
];
const raycaster = new THREE.Raycaster();

// ---------------------------------------------------------------------------
// Material & Model Loading Functions
// ---------------------------------------------------------------------------

// Cache for materials to avoid duplicate shader compilations.
const materialCache = new Map();

/**
 * Returns a MeshStandardMaterial with fog integration.
 */
function getFoggyMaterial(fogDepth, fogColor, color, side) {
  const key = `${fogDepth}_${fogColor}_${color}_${side}`;
  if (materialCache.has(key)) {
    return materialCache.get(key);
  }
  const material = new THREE.MeshStandardMaterial({
    color: color,
    side: side,
    metalness: 0.5,
    roughness: 0.75,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.fDepth = { value: fogDepth };
    shader.uniforms.fColor = { value: new THREE.Color(fogColor) };

    shader.fragmentShader =
      `uniform float fDepth;
uniform vec3 fColor;
` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <clipping_planes_fragment>`,
      `
  float planeFog = 1.0;
  #if NUM_CLIPPING_PLANES > 0
    vec4 plane;
    #pragma unroll_loop
    for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
      plane = clippingPlanes[ i ];
      planeFog = smoothstep(0.0, -fDepth, dot( vViewPosition, plane.xyz ) - plane.w);
    }
  #endif
`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <fog_fragment>`,
      `#include <fog_fragment>
gl_FragColor.rgb = mix( gl_FragColor.rgb, fColor, 1.0 - planeFog );
`
    );
  };
  materialCache.set(key, material);
  return material;
}

/**
 * Loads all models and returns a Promise that resolves when complete.
 */
function loadModels() {
  // Reuse a single OBJLoader instance for all models.
  const objLoader = new OBJLoader();
  const promises = models.map((model, index) => {
    return new Promise((resolve) => {
      objLoader.load(
        `hogwarts/hogwartsModel/${model}`,
        (object) => {
          object.traverse((child) => {
            if (child.isMesh) {
              const { color, opacity } =
                modelColors[index] || { color: 0x0077ff, opacity: 1.0 };
              child.material = getFoggyMaterial(
                params.fogHeight,
                params.fogColor,
                color,
                THREE.FrontSide
              );
              child.material.transparent = true;
              child.material.opacity = opacity;
              child.material.polygonOffset = true;
              child.material.polygonOffsetFactor = 1;
              child.material.polygonOffsetUnits = 1;
              child.material.depthWrite = true;
              child.material.depthTest = true;

              // Removed hitbox creation from here (it’s done once separately).

              // Slightly offset overlapping meshes.
              child.renderOrder = index;

              // Add emissive glow for windows.
              if ([7, 8, 9, 12, 13, 14].includes(index)) {
                child.material.emissive = new THREE.Color(0xffbb00);
                child.material.emissiveIntensity = 10;
              }
            }
          });

          object.scale.set(1.4, 1.4, 1.4);
          object.rotation.x = -Math.PI / 2;
          object.position.y -= 4;
          scene.add(object);

          // Special scaling for model with index 15.
          if (index === 15) {
            object.scale.x = 10;
            object.scale.y = 10;
          }
          resolve();
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        },
        (error) => {
          console.error(error);
          resolve();
        }
      );
    });
  });
  return Promise.all(promises);
}

// ---------------------------------------------------------------------------
// Additional Scene Setup Functions
// ---------------------------------------------------------------------------
function loadSkyboxSphere() {
  const segments = isPhone() ? 8 : 15;
  const material = getFoggyMaterial(
    params.fogHeight,
    params.fogColor,
    params.skyColor,
    THREE.BackSide
  );
  const skyboxGeometry = new THREE.SphereGeometry(17, segments, segments);
  const skybox = new THREE.Mesh(skyboxGeometry, material);
  scene.add(skybox);
}

function setupStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      sizeAttenuation: true,
    });
    const starVertices = [];
    const radius = 15;
    
    // Define the allowed y range.
    const yMin = 0;  // minimum y value for stars
    const yMax = 150; // maximum y value for stars
    
    // Use a loop with rejection sampling so that we get exactly params.noOfStars stars.
    let count = 0;
    while (count < params.noOfStars) {
      // Generate a random point in spherical coordinates.
      const u = Math.random();
      const v = Math.random();
      const theta = Math.acos(2 * u - 1);
      const phi = 2 * Math.PI * v;
      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = Math.abs(radius * Math.sin(theta) * Math.sin(phi));
      const z = radius * Math.cos(theta);
      
      // Accept the star only if its y coordinate is within the allowed range.
      if (y >= yMin && y <= yMax) {
        starVertices.push(x, y, z);
        count++;
      }
    }
    
    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starVertices, 3)
    );
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}
  

function setupScene() {
  camera.fov = params.fov;
  camera.updateProjectionMatrix();
  camera.position.set(
    params.cameraInitialX,
    params.cameraInitialY,
    params.cameraInitialZ
  );
  camera.lookAt(params.lookAt);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  loadSkyboxSphere();

  // Add fog to the scene.
  scene.fog = new THREE.Fog(params.fogColor, 1, 3000);
}

function setupLights() {
  const directionalLight = new THREE.DirectionalLight(params.moonColor, 0.5);
  directionalLight.position.set(-2, 1, 1);
  const ambientLight = new THREE.AmbientLight(0xccdbdf, 0.9);

  // Moon light and its visual representation.
  const moonlight = new THREE.DirectionalLight(params.moonColor, 1);
  moonlight.position.set(-10, 3, -10);
  const moonGeometry = new THREE.SphereGeometry(0.9, 16, 16);
  const moonMaterial = new THREE.MeshStandardMaterial({
    color: params.moonColor,
    emissive: params.moonColor,
    emissiveIntensity: 1,
  });
  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  moonMesh.position.copy(moonlight.position);
  scene.add(moonMesh);

  scene.add(ambientLight, moonlight, directionalLight);
}

function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  if (params.fxaa) {
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.enabled = true;
    composer.addPass(fxaaPass);
  }

  if (params.taa) {
    taaRenderPass = new TAARenderPass(scene, camera);
    taaRenderPass.unbiased = false;
    taaRenderPass.sampleLevel = params.taaSampleLevel;
    renderPass.enabled = false;
    composer.addPass(taaRenderPass);
  }

  if (params.bloomPass) {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      params.bloomStrength,
      params.bloomRadius,
      params.bloomThreshold
    );
    composer.addPass(bloomPass);
  }
}

// Create hitboxes only once.
function createHitboxes() {
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  document.body.appendChild(labelRenderer.domElement);

  for (let i = 0; i < hitboxPositions.length; i++) {
    const hitboxGeometry = new THREE.BoxGeometry(
      hitboxSizes[i].x,
      hitboxSizes[i].y,
      hitboxSizes[i].z
    );
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.set(
      hitboxPositions[i][0],
      hitboxPositions[i][1],
      hitboxPositions[i][2]
    );
    scene.add(hitbox);
    hitboxes.push(hitbox);

    const labelDiv = document.createElement('div');
    labelDiv.className = `label${i + 1}`;
    // labelDiv.textContent = `Label ${i + 1}`;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, hitboxSizes[i].y / 2 + 0.1, 0); 
    label.scale.setScalar(100);
    hitbox.add(label);
  }
  return labelRenderer
}

// ---------------------------------------------------------------------------
// Event Handling & User Interaction
// ---------------------------------------------------------------------------
// Variables for drag & spin.
let initialRadius = Math.sqrt(
  camera.position.x * camera.position.x + camera.position.z * camera.position.z
);
let isDragging = false;
let prevMouseX = null;
let userAngle = Math.atan2(camera.position.z, camera.position.x);
let userSpun = false; // Tracks if the user has manually spun the view.

function onClick(event) {
  const mouse = {
    x: (event.clientX / window.innerWidth) * 2 - 1,
    y: -(event.clientY / window.innerHeight) * 2 + 1,
  };

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hitboxes);

  if (intersects.length > 0) {
    const index = hitboxes.indexOf(intersects[0].object);
    setTimeout(() => {
      window.location.href = sites[index];
    }, 500);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = params.fov;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function setupEventListeners() {
  const autoSpinCooldown = 1000;
  let interactionTimeout;

  function resetUserSpunWithCooldown() {
    if (interactionTimeout) clearTimeout(interactionTimeout);
    interactionTimeout = setTimeout(() => {
      userSpun = false;
    }, autoSpinCooldown);
  }

  window.addEventListener("resize", onWindowResize, false);

  function onPointerDown(event) {
    if (params.enableHorizontalSpin) {
      isDragging = true;
      prevMouseX = event.clientX || event.touches[0].clientX;
      initialRadius = Math.sqrt(
        camera.position.x * camera.position.x +
          camera.position.z * camera.position.z
      );
      userAngle = Math.atan2(camera.position.z, camera.position.x);
      userSpun = true;
      resetUserSpunWithCooldown();
    }
    params.userInteracting = false;
  }

  function onPointerMove(event) {
    if (isDragging && params.enableHorizontalSpin) {
      const clientX = event.clientX || event.touches[0].clientX;
      const delta = clientX - prevMouseX;
      userAngle = Math.atan2(camera.position.z, camera.position.x);
      if (delta !== 0) {
        userSpun = true;
      }
      userAngle += delta * 0.05;
      prevMouseX = clientX;
      resetUserSpunWithCooldown();
    }
  }

  function onPointerUp() {
    isDragging = false;
    params.userInteracting = false;
    resetUserSpunWithCooldown();
  }

  window.addEventListener("mousedown", onPointerDown, false);
  window.addEventListener("mousemove", onPointerMove, false);
  window.addEventListener("mouseup", onPointerUp, false);
  window.addEventListener("touchstart", onPointerDown, false);
  window.addEventListener("touchmove", onPointerMove, false);
  window.addEventListener("touchend", onPointerUp, false);
  window.addEventListener("click", onClick);
}

// ---------------------------------------------------------------------------
// Animation & Initialization
// ---------------------------------------------------------------------------
const stats = new Stats();
if (params.showStats){document.body.appendChild(stats.dom);}

function animate( ) {
  requestAnimationFrame(animate);

  // Lock FPS to 30 on smartphones.
  if (isPhone()) {
    const now = performance.now();
    if (!animate.lastFrameTime) animate.lastFrameTime = now;
    const deltaTime = now - animate.lastFrameTime;
    if (deltaTime < 33.33) return;
    animate.lastFrameTime = now;
  }

  stats.begin();
  const time = clock.getElapsedTime();

  if (params.enableHorizontalSpin && userSpun) {
    // Update camera position based on user input.
    camera.position.x = initialRadius * Math.cos(userAngle);
    camera.position.z = initialRadius * Math.sin(userAngle);
  } else {
    // Automatic horizontal spin.
    camera.position.x = params.cameraInitialX * Math.cos(time * 0.1);
    camera.position.z = params.cameraInitialZ * Math.sin(time * 0.1);
  }
  camera.position.y = params.cameraInitialY;
  camera.lookAt(params.lookAt);

  // Toggle TAARenderPass accumulation.
  if (taaRenderPass) {
    taaIndex++;
    taaRenderPass.accumulate = Math.round(taaIndex / 200) % 2 !== 0;
  }

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  composer.render();

  stats.end();
}

function init() {
  window.addEventListener("load", () => {
    // Load models and then set up the scene.
    loadModels().then(() => {
      setupScene();
      setupLights();
      setupStars();
      createHitboxes();
      setupPostProcessing();
      setupEventListeners();
      animate();
    });
  }).catch((error) => console.error("Error loading models:", error));
}

init();
