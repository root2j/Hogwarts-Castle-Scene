import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// Function to detect if the device is a phone
function isPhone() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Parameters
let params = {
    userInteracting: false,
    fov: 20,
    fxaa: true,
    nightAmount: 0,
    bloomStrength: 10,
    bloomRadius: 1,
    bloomThreshold: 1,
    fogDensity: 0.5,
    fogHeight: 2,
    fogColor: 0x334c51, 
    fogNear: 90,
    fogFar: 100,
    fogDepth: 200,
    groundFogDensity: 10,
    cameraInitialX: 20,
    cameraInitialY: 3,
    cameraInitialZ: 20,
    enableSpin: true, // Add a parameter to control spinning
    spinSpeed: 0.01, // Add a parameter to control spinning speed
};

// Adjust parameters if the device is a phone
if (isPhone()) {
    params = {
        userInteracting: false,
        fov: 30,
        fxaa: false,
        nightAmount: 0,
        bloomStrength: 5,
        bloomRadius: 0.5,
        bloomThreshold: 0.8,
        fogDensity: 0.3,
        fogHeight: 1.5,
        fogColor: 0x446677,
        fogNear: 80,
        fogFar: 90,
        fogDepth: 150,
        groundFogDensity: 8,
        cameraInitialX: 15,
        cameraInitialY: 5,
        cameraInitialZ: 15,
        enableSpin: true, // Add a parameter to control spinning
        spinSpeed: 0.01, // Add a parameter to control spinning speed
    };
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 1, 3000);

// Add this with other global declarations at the top
const rendererParams = {
    antialias: true,
    logarithmicDepthBuffer: true,
    precision: 'highp'
};

// Update renderer initialization to use these params
const renderer = new THREE.WebGLRenderer(rendererParams);
renderer.setClearColor(0x404040);

const clock = new THREE.Clock();

// Declare composer in a higher scope
let composer;

// Model definitions
const models = Array.from({ length: 17 }, (_, i) => `./model_${i}.obj`);

// Parameters

// Model colors dictionary
const modelColors = {
    0: { color: 0x754E1A, opacity: 1 }, //Ground
    1: { color: 0x754E1A, opacity: 1 }, //Ground
    2: { color: 0x754E1A, opacity: 1 }, //Ground
    3: { color: 0x2b4e2a, opacity: 1 }, //Grass
    4: { color: 0x66665c, opacity: 1 }, //Walls 1
    5: { color: 0x66665c, opacity: 1 }, //Walls 2
    6: { color: 0x3a504f, opacity: 1 }, //Roofs
    7: { color: 0x3D3D3D, opacity: 1, emissive: 0xffffff, emissiveIntensity: 10 }, //Windows 1
    8: { color: 0x3D3D3D, opacity: 1, emissive: 0xffffff, emissiveIntensity: 10 }, //Windows 2
    9: { color: 0x3D3D3D, opacity: 1, emissive: 0xffffff, emissiveIntensity: 10 }, //Windows 3
    10: { color: 0xB17457, opacity: 1 }, //Window Railings
    11: { color: 0xE8F9FF, opacity: 1 }, //Green Houses
    12: { color: 0x3E7B27, opacity: 1 }, //Green Houses railings
    13: { color: 0xffffff, opacity: 1, emissive: 0xffffff, emissiveIntensity: 10}, //Illuminated Windows
    14: { color: 0xFFFFFF, opacity: 0.5, emissive: 0xffffff, emissiveIntensity: 10 }, //Clock Window
    15: { color: 0x865110, opacity: 1 }, //UnderGround
    16: { color: 0xE8F9FF, opacity: 0.8 }, //Water
};


function getFoggyMaterial(fogDepth, fogColor, color, side){
    let material = new THREE.MeshStandardMaterial({color: color, side: side, metalness: 0.5, roughness: 0.75});
    material.onBeforeCompile = shader => {
      shader.uniforms.fDepth = {value: fogDepth};
      shader.uniforms.fColor = {value: new THREE.Color(fogColor)};
      shader.fragmentShader = `
        uniform float fDepth;
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
            //if ( dot( vViewPosition, plane.xyz ) > plane.w ) discard;
            planeFog = smoothstep(0.0, -fDepth, dot( vViewPosition, plane.xyz) - plane.w);

          }
        #endif
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <fog_fragment>`,
        `#include <fog_fragment>
         gl_FragColor.rgb = mix( gl_FragColor.rgb, fColor, planeFog );
        `
      )
    }
    return material;
  }

// 1. Define Shaders First
const NightShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "amount": { value: params.nightAmount }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            color.rgb = mix(color.rgb, vec3(0.0, 0.0, 0.2), amount);
            gl_FragColor = color;
        }
    `
};

const BlurShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "resolution": { value: new THREE.Vector2(1, 1) },
        "radius": { value: params.blurRadius }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float radius;
        varying vec2 vUv;

        void main() {
            vec4 sum = vec4(0.0);
            vec2 texelSize = vec2(1.0 / resolution.x, 1.0 / resolution.y);
            
            // 9-tap Gaussian blur
            sum += texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * texelSize * radius) * 0.0625;
            sum += texture2D(tDiffuse, vUv + vec2(-1.0,  0.0) * texelSize * radius) * 0.125;
            sum += texture2D(tDiffuse, vUv + vec2(-1.0,  1.0) * texelSize * radius) * 0.0625;
            sum += texture2D(tDiffuse, vUv + vec2( 0.0, -1.0) * texelSize * radius) * 0.125;
            sum += texture2D(tDiffuse, vUv + vec2( 0.0,  0.0) * texelSize * radius) * 0.25;
            sum += texture2D(tDiffuse, vUv + vec2( 0.0,  1.0) * texelSize * radius) * 0.125;
            sum += texture2D(tDiffuse, vUv + vec2( 1.0, -1.0) * texelSize * radius) * 0.0625;
            sum += texture2D(tDiffuse, vUv + vec2( 1.0,  0.0) * texelSize * radius) * 0.125;
            sum += texture2D(tDiffuse, vUv + vec2( 1.0,  1.0) * texelSize * radius) * 0.0625;
            
            gl_FragColor = sum;
        }
    `
};

// 2. Define all utility functions first
function loadSkyboxCube() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        'hogwarts/skybox_texture_px.jpg',
        'hogwarts/skybox_texture_nx.jpg',
        'hogwarts/skybox_texture_py.jpg',
        'hogwarts/skybox_texture_ny.jpg',
        'hogwarts/skybox_texture_pz.jpg',
        'hogwarts/skybox_texture_nz.jpg'
    ]);
    scene.background = texture;
}

function loadSkyboxSphere() {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('hogwarts/sky hd.png');

    const geometry = new THREE.SphereGeometry(300, 50, 50);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
    });
    const skybox = new THREE.Mesh(geometry, material);
    scene.add(skybox);
}

function setupStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });

    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(1000); // Adjusted range to fit inside the skybox
        const y = THREE.MathUtils.randFloatSpread(1000); // Adjusted range to fit inside the skybox
        const z = THREE.MathUtils.randFloatSpread(1000); // Adjusted range to fit inside the skybox
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

function loadModels() {
    const globalPlane = new THREE.Plane( new THREE.Vector3( 0, -1, 0 ), 0.0 );
    renderer.clippingPlanes = [globalPlane];
    models.forEach((model, index) => {
        const objLoader = new OBJLoader();
        objLoader.load(
            `hogwarts/hogwartsModel/${model}`,
            (object) => {
                object.traverse((child) => {
                    if (child.isMesh) {
                        const color = modelColors[index].color || 0x0077ff; // Default to blue if not specified
                        const opacity = modelColors[index].opacity || 1.0; // Default to fully opaque if not specified
                        child.material = getFoggyMaterial(params.fogHeight, params.fogColor, color, THREE.FrontSide);
                        child.material.transparent = true;
                        child.material.opacity = opacity;
                        child.material.polygonOffset = true;
                        child.material.polygonOffsetFactor = 1;
                        child.material.polygonOffsetUnits = 1;
                        child.material.depthWrite = true;
                        child.material.depthTest = true;
                        
                        // Slightly offset overlapping meshes
                        child.renderOrder = index; // Set render order based on model index
                        
                        // Add a small position offset if needed
                        const offset = 0.0001 * index;
                        child.position.z += offset;
                    }
                });
                object.scale.set(1.4, 1.4, 1.4); // Increase the scale of the model
                object.rotation.x = -Math.PI / 2; // Rotate the model 90 degrees around the X axis
                object.position.y -= 4; // Decrease the y position of the model
                scene.add(object);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error) => {
                console.log(error);
            }
        );
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = params.fov; // Update FOV on resize
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// 3. Define all setup functions
function setupScene() {
    // Camera
    camera.fov = params.fov; // Set initial FOV
    camera.updateProjectionMatrix();
    camera.position.set(params.cameraInitialX,params.cameraInitialY,params.cameraInitialZ);
    camera.lookAt(0, 1, 0);

    // Renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Add fog to the scene
    scene.fog = new THREE.Fog(params.fogColor, params.fogNear, params.fogFar);
    loadSkyboxCube();

    return controls;
}

function setupLights() {
    const directionalLight = new THREE.DirectionalLight(0x2f4eae, 1);
    directionalLight.position.setScalar(100);
    const ambientLight = new THREE.AmbientLight(0xccdbdf, 0.9);

    // Add a moonlight
    const moonlight = new THREE.DirectionalLight(0x99ccff, 0.5); // White-blue color, moderate intensity
    moonlight.position.set(-100, 50, 50); // Position the moonlight
    scene.add(ambientLight, moonlight, directionalLight);
    return { light: directionalLight, moonlight };
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    
    // Add render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Add other effects
    const nightPass = new ShaderPass(NightShader);
    nightPass.uniforms.amount.value = params.nightAmount;

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.enabled = params.fxaa;

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        params.bloomStrength,
        params.bloomRadius,
        params.bloomThreshold
    );

    const blurPass = new ShaderPass(BlurShader);
    blurPass.uniforms.radius.value = params.blurRadius;
    blurPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);

    composer.addPass(nightPass);    
    composer.addPass(fxaaPass);
    composer.addPass(bloomPass);
    composer.addPass(blurPass);

    return {
        composer,
        passes: { nightPass, fxaaPass, bloomPass, blurPass }
    };
}

function setupEventListeners() {
    // Window resize handling
    window.addEventListener('resize', onWindowResize, false);

    // User interaction handling
    window.addEventListener('mousedown', () => {
        params.userInteracting = false;
    });

    window.addEventListener('mouseup', () => {
        params.userInteracting = false;    
    });

    window.addEventListener('wheel', (event) => {
        params.userInteracting = false;
    });

    // Add keyboard controls
    window.addEventListener('keydown', (event) => {
        switch(event.key) {
            case 'r':
                // Reset camera position
                camera.position.set(5, 5, 5);
                camera.lookAt(0, 0, 0);
                break;
            case 'f':
                // Toggle fullscreen
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
                break;
            case 's':
                // Toggle spinning
                params.enableSpin = !params.enableSpin;
                break;
            case 'ArrowLeft':
                // Spin left
                params.userInteracting = true;
                camera.position.x -= params.spinSpeed;
                camera.position.z += params.spinSpeed;
                break;
            case 'ArrowRight':
                // Spin right
                params.userInteracting = true;
                camera.position.x += params.spinSpeed;
                camera.position.z -= params.spinSpeed;
                break;
        }
    });
}

const stats = new Stats();
document.body.appendChild(stats.dom);

// 4. Define animation function
function animate(controls, lights, composer) {
    requestAnimationFrame(() => animate(controls, lights, composer));

    stats.begin(); // Start measuring frame time

    controls.update();

    //if (!params.userInteracting && params.enableSpin) {
    //    const time = clock.getElapsedTime();
    //    camera.position.x = params.cameraInitialX * Math.cos(time * 0.1);
    //    camera.position.z = params.cameraInitialZ * Math.sin(time * 0.1);
    //    camera.position.y = params.cameraInitialY;
    //    camera.lookAt(scene.position);
    //}
    camera.lookAt(scene.position);

    // Render
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    composer.render();

    stats.end(); // Stop measuring frame time and update the panel
}

// 5. Define initialization function
function init() {
    const controls = setupScene();
    const lights = setupLights();
    setupStars();
    const { composer } = setupPostProcessing();
    
    loadModels();
    setupEventListeners();
    
    animate(controls, lights, composer);
}

// 6. Start the application
init();

// 7. Add event listeners
window.addEventListener('resize', onWindowResize, false);
