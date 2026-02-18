"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeTokyoCity = ThreeTokyoCity;
var fiber_1 = require("@react-three/fiber");
var GLTFLoader_1 = require("three/examples/jsm/loaders/GLTFLoader");
var react_1 = require("react");
var THREE = require("three");
var WORLD_RADIUS = 90;
var CELL_SIZE = 10;
var ROAD_WIDTH = 4;
var BASE_Y = 0;
var SKY_BANDS = ['#1a2434', '#22324a', '#2b425d', '#384b64'];
var NEON_BANDS = ['#4bf3ff', '#ff5fd6', '#ffd36a', '#79ff80'];
var TokyoAssetCatalog = [
    {
        id: 'skytree',
        fileName: 'tokyo_tower.glb',
        x: -24,
        z: 2,
        w: 8,
        d: 8,
        h: 62,
        color: '#b6c8e8',
        emissive: '#21345a',
        scale: 0.7,
    },
    {
        id: 'crossing',
        fileName: 'shibuya_crossing.glb',
        x: 10,
        z: -20,
        w: 9,
        d: 9,
        h: 48,
        color: '#d8d3f7',
        emissive: '#5c4d84',
        scale: 0.8,
    },
    {
        id: 'train-station',
        fileName: 'tokyo_station.glb',
        x: 32,
        z: 14,
        w: 10,
        d: 10,
        h: 35,
        color: '#d8ddd5',
        emissive: '#454949',
        scale: 0.72,
    },
    {
        id: 'tower',
        fileName: 'tokyo_tower_small.glb',
        x: 20,
        z: 30,
        w: 7,
        d: 7,
        h: 36,
        color: '#ddd2f1',
        emissive: '#5c4d84',
        scale: 0.7,
    },
];
var CityPlacementPath = '/assets/tokyo';
function buildDistrict() {
    var buildings = [];
    var signs = [];
    var maxCell = Math.floor(WORLD_RADIUS / CELL_SIZE);
    for (var gx = -maxCell; gx <= maxCell; gx += 1) {
        for (var gz = -maxCell; gz <= maxCell; gz += 1) {
            var wx = gx * CELL_SIZE;
            var wz = gz * CELL_SIZE;
            var roadX = gx % 4 === 0;
            var roadZ = gz % 4 === 0;
            if (roadX || roadZ) {
                continue;
            }
            var jitter = ((gx * 31 + gz * 17) % 7) - 3;
            if (Math.abs(jitter) > 2) {
                continue;
            }
            var seed = gx * 31 + gz * 17;
            var w = 5 + ((seed * 13) % 6) + 1;
            var d = 5 + ((seed * 11) % 5);
            var h = 8 + ((seed * 19) % 28) + 6;
            buildings.push({
                id: "".concat(gx, "-").concat(gz),
                x: wx,
                z: wz,
                w: w,
                d: d,
                h: h,
                color: SKY_BANDS[Math.abs(seed) % SKY_BANDS.length],
                emissive: '#0c1425',
            });
            if ((gx + gz) % 5 === 0 && seed % 4 === 0) {
                signs.push({
                    x: wx + w * 0.2,
                    y: h + 1,
                    z: wz + d * 0.2,
                    text: "".concat(['夜景', '渋谷', '新橋', '丸の内', '銀座'][Math.abs(seed) % 5]),
                    color: NEON_BANDS[Math.abs(seed) % NEON_BANDS.length],
                });
            }
        }
    }
    for (var _i = 0, TokyoAssetCatalog_1 = TokyoAssetCatalog; _i < TokyoAssetCatalog_1.length; _i++) {
        var asset = TokyoAssetCatalog_1[_i];
        buildings.push({
            id: asset.id,
            x: asset.x,
            z: asset.z,
            w: asset.w,
            d: asset.d,
            h: asset.h,
            color: asset.color,
            emissive: asset.emissive,
            modelUrl: "".concat(CityPlacementPath, "/").concat(asset.fileName),
            modelScale: asset.scale,
        });
    }
    return { buildings: buildings, signs: signs };
}
function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
}
function nearestTarget(buildings, playerX, playerZ) {
    var nearest = null;
    var best = 1e9;
    var landmarks = buildings
        .filter(function (building) { return building.h > 25; })
        .map(function (building) { return ({
        x: building.x,
        y: building.h + 3,
        z: building.z,
        text: '高層ビル',
        color: '#9ad7ff',
    }); });
    for (var _i = 0, landmarks_1 = landmarks; _i < landmarks_1.length; _i++) {
        var sign = landmarks_1[_i];
        var dx = sign.x - playerX;
        var dz = sign.z - playerZ;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < best) {
            best = dist;
            nearest = sign;
        }
    }
    return nearest;
}
function makeSkyMesh() {
    return (<>
      <fog attach="fog" args={[0x050915, 25, 240]}/>
      <mesh position={[0, 170, 0]}>
        <sphereGeometry args={[240, 24, 16]}/>
        <meshBasicMaterial color="#090f20" side={2}/>
      </mesh>
      <mesh position={[0, 100, 0]}>
        <sphereGeometry args={[230, 18, 10]}/>
        <meshStandardMaterial color="#0e1728"/>
      </mesh>
    </>);
}
function useSafeGltf(url) {
    var _a = (0, react_1.useState)(null), scene = _a[0], setScene = _a[1];
    var _b = (0, react_1.useState)('idle'), status = _b[0], setStatus = _b[1];
    (0, react_1.useEffect)(function () {
        if (!url) {
            setScene(null);
            setStatus('idle');
            return;
        }
        setStatus('loading');
        var canceled = false;
        var loader = new GLTFLoader_1.GLTFLoader();
        loader.load(url, function (gltf) {
            if (!canceled) {
                setScene(gltf.scene);
                setStatus('ready');
            }
        }, undefined, function () {
            if (!canceled) {
                setScene(null);
                setStatus('missing');
            }
        });
        return function () {
            canceled = true;
        };
    }, [url]);
    return { scene: scene, status: status };
}
function LandmarkBuilding(_a) {
    var _b;
    var building = _a.building, useAssets = _a.useAssets;
    var _c = useSafeGltf(useAssets ? ((_b = building.modelUrl) !== null && _b !== void 0 ? _b : null) : null), scene = _c.scene, status = _c.status;
    var loadedModel = (0, react_1.useMemo)(function () {
        var _a;
        if (!scene) {
            return null;
        }
        var copy = scene.clone(true);
        var scale = (_a = building.modelScale) !== null && _a !== void 0 ? _a : 1;
        copy.scale.setScalar(scale);
        return copy;
    }, [scene, building.modelScale]);
    if (scene && loadedModel && useAssets) {
        return (<group key={building.id} position={[building.x, 0, building.z]}>
        <primitive object={loadedModel}/>
      </group>);
    }
    return (<mesh key={building.id} position={[building.x, building.h / 2, building.z]}>
      <boxGeometry args={[building.w, building.h, building.d]}/>
      <meshStandardMaterial color={status === 'missing' ? '#a64c5a' : building.color} roughness={0.22} metalness={0.12} emissive={building.emissive} emissiveIntensity={0.2}/>
    </mesh>);
}
function ThreeTokyoCity() {
    var _a;
    var _b = (0, react_1.useState)(true), running = _b[0], setRunning = _b[1];
    var runningRef = (0, react_1.useRef)(true);
    var _c = (0, react_1.useState)(false), flyMode = _c[0], setFlyMode = _c[1];
    var _d = (0, react_1.useState)({ x: 0, y: 8, z: 0 }), hudPos = _d[0], setHudPos = _d[1];
    var hudTickRef = (0, react_1.useRef)(0);
    var _e = (0, react_1.useState)(function () { return new URLSearchParams(window.location.search).get('asset') === '1'; }), assetMode = _e[0], setAssetMode = _e[1];
    var playerPos = (0, react_1.useRef)(new THREE.Vector3(0, 8, 0));
    var playerVel = (0, react_1.useRef)(new THREE.Vector3(0, 0, 0));
    var playerMeshRef = (0, react_1.useRef)(null);
    var playerRingRef = (0, react_1.useRef)(null);
    var targetMarkerRef = (0, react_1.useRef)(null);
    var nearestMarkerRef = (0, react_1.useRef)(new THREE.Vector3(6, 28, 0));
    var query = (0, react_1.useMemo)(function () { return new URLSearchParams(window.location.search); }, []);
    var demoMode = query.get('demo') === '1';
    var demoFrame = Number((_a = query.get('t')) !== null && _a !== void 0 ? _a : '0');
    var keys = (0, react_1.useRef)({
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        fly: false,
    });
    var city = (0, react_1.useMemo)(function () { return buildDistrict(); }, []);
    var onKeyDown = (0, react_1.useCallback)(function (event) {
        if (demoMode) {
            return;
        }
        if (event.code === 'KeyW')
            keys.current.forward = true;
        if (event.code === 'KeyS')
            keys.current.backward = true;
        if (event.code === 'KeyA')
            keys.current.left = true;
        if (event.code === 'KeyD')
            keys.current.right = true;
        if (event.code === 'Space')
            keys.current.up = true;
        if (event.code === 'ShiftLeft')
            keys.current.down = true;
        if (event.code === 'KeyF' && !event.repeat) {
            keys.current.fly = !keys.current.fly;
            setFlyMode(function (value) { return !value; });
            event.preventDefault();
        }
        if (event.code === 'KeyM' && !event.repeat) {
            setAssetMode(function (value) { return !value; });
            event.preventDefault();
        }
        if (event.code === 'KeyP' && !event.repeat) {
            runningRef.current = !runningRef.current;
            setRunning(runningRef.current);
            event.preventDefault();
        }
    }, []);
    var onKeyUp = (0, react_1.useCallback)(function (event) {
        if (demoMode) {
            return;
        }
        if (event.code === 'KeyW')
            keys.current.forward = false;
        if (event.code === 'KeyS')
            keys.current.backward = false;
        if (event.code === 'KeyA')
            keys.current.left = false;
        if (event.code === 'KeyD')
            keys.current.right = false;
        if (event.code === 'Space')
            keys.current.up = false;
        if (event.code === 'ShiftLeft')
            keys.current.down = false;
    }, []);
    (0, react_1.useEffect)(function () {
        runningRef.current = true;
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return function () {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [onKeyDown, onKeyUp]);
    (0, fiber_1.useFrame)(function (state, delta) {
        if (!runningRef.current) {
            return;
        }
        if (demoMode) {
            var t = demoFrame;
            playerPos.current.x = Math.sin(t * 0.32) * 42;
            playerPos.current.z = Math.cos(t * 0.29) * 38;
            playerPos.current.y = 10 + Math.sin(t * 0.86) * 8;
            playerPos.current.x = clamp(playerPos.current.x, -WORLD_RADIUS, WORLD_RADIUS);
            playerPos.current.z = clamp(playerPos.current.z, -WORLD_RADIUS, WORLD_RADIUS);
            var nearest_1 = nearestTarget(city.buildings, playerPos.current.x, playerPos.current.z);
            if (nearest_1) {
                nearestMarkerRef.current.set(nearest_1.x, nearest_1.y, nearest_1.z);
            }
            else {
                nearestMarkerRef.current.set(playerPos.current.x + 6, 28, playerPos.current.z);
            }
            var cameraOffset_1 = new THREE.Vector3(Math.sin(t * 0.2) * 3, 20, 28 + Math.cos(t * 0.18) * 5);
            var targetCam_1 = playerPos.current.clone().add(cameraOffset_1);
            state.camera.position.lerp(targetCam_1, 0.55);
            state.camera.lookAt(playerPos.current.x, playerPos.current.y + 3, playerPos.current.z);
            if (playerMeshRef.current) {
                playerMeshRef.current.position.copy(playerPos.current);
            }
            if (playerRingRef.current) {
                playerRingRef.current.position.copy(new THREE.Vector3(playerPos.current.x, playerPos.current.y + 0.8, playerPos.current.z));
            }
            if (targetMarkerRef.current) {
                targetMarkerRef.current.position.copy(nearestMarkerRef.current);
            }
            hudTickRef.current += delta;
            if (hudTickRef.current > 0.1) {
                hudTickRef.current = 0;
                setHudPos({
                    x: playerPos.current.x,
                    y: playerPos.current.y,
                    z: playerPos.current.z,
                });
            }
            return;
        }
        var input = new THREE.Vector3(0, 0, 0);
        var forward = new THREE.Vector3();
        var right = new THREE.Vector3();
        state.camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() > 0) {
            forward.normalize();
        }
        right.copy(forward).cross(new THREE.Vector3(0, 1, 0)).normalize();
        if (keys.current.forward)
            input.add(forward);
        if (keys.current.backward)
            input.addScaledVector(forward, -1);
        if (keys.current.right)
            input.add(right);
        if (keys.current.left)
            input.addScaledVector(right, -1);
        if (input.lengthSq() > 0.001) {
            input.normalize().multiplyScalar(keys.current.fly ? 22 : 14);
            playerVel.current.x = THREE.MathUtils.lerp(playerVel.current.x, input.x, 0.14);
            playerVel.current.z = THREE.MathUtils.lerp(playerVel.current.z, input.z, 0.14);
        }
        else {
            playerVel.current.x = THREE.MathUtils.lerp(playerVel.current.x, 0, 0.08);
            playerVel.current.z = THREE.MathUtils.lerp(playerVel.current.z, 0, 0.08);
        }
        if (keys.current.fly) {
            playerVel.current.y = 0;
            if (keys.current.up)
                playerPos.current.y += delta * 18;
            if (keys.current.down)
                playerPos.current.y -= delta * 18;
            playerPos.current.y = clamp(playerPos.current.y, 3, 120);
            playerPos.current.set(clamp(playerPos.current.x + playerVel.current.x * delta, -WORLD_RADIUS, WORLD_RADIUS), playerPos.current.y, clamp(playerPos.current.z + playerVel.current.z * delta, -WORLD_RADIUS, WORLD_RADIUS));
        }
        else {
            playerVel.current.y += -20 * delta;
            if (keys.current.up) {
                playerVel.current.y = Math.max(playerVel.current.y, 11);
            }
            if (keys.current.down) {
                playerVel.current.y = Math.min(playerVel.current.y, -8);
            }
            playerPos.current.addScaledVector(playerVel.current, delta);
            if (playerPos.current.y < BASE_Y + 2.8) {
                playerPos.current.y = BASE_Y + 2.8;
                playerVel.current.y = 0;
            }
        }
        playerPos.current.x = clamp(playerPos.current.x, -WORLD_RADIUS, WORLD_RADIUS);
        playerPos.current.z = clamp(playerPos.current.z, -WORLD_RADIUS, WORLD_RADIUS);
        var cameraOffset = new THREE.Vector3(0, 18, 30);
        var targetCam = playerPos.current.clone().add(cameraOffset);
        state.camera.position.lerp(targetCam, 0.1);
        state.camera.lookAt(playerPos.current.x, playerPos.current.y + 3, playerPos.current.z);
        var nearest = nearestTarget(city.buildings, playerPos.current.x, playerPos.current.z);
        if (nearest) {
            nearestMarkerRef.current.set(nearest.x, nearest.y, nearest.z);
        }
        else {
            nearestMarkerRef.current.set(playerPos.current.x + 6, 28, playerPos.current.z);
        }
        if (playerMeshRef.current) {
            playerMeshRef.current.position.copy(playerPos.current);
        }
        if (playerRingRef.current) {
            playerRingRef.current.position.copy(new THREE.Vector3(playerPos.current.x, playerPos.current.y + 0.8, playerPos.current.z));
        }
        if (targetMarkerRef.current) {
            targetMarkerRef.current.position.copy(nearestMarkerRef.current);
        }
        hudTickRef.current += delta;
        if (hudTickRef.current > 0.1) {
            hudTickRef.current = 0;
            setHudPos({
                x: playerPos.current.x,
                y: playerPos.current.y,
                z: playerPos.current.z,
            });
        }
    });
    var speedLabel = flyMode ? '高速' : '通常';
    var assetModeLabel = assetMode ? '東京アセット（準備中）' : '軽量プロシージャル';
    return (<div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(1200px 900px at 60% 40%, #1a2740, #060d19)',
        }}>
      <Canvas camera={{ fov: 65, position: [0, 20, 35] }} onCreated={function (state) {
            state.gl.setPixelRatio(window.devicePixelRatio);
        }}>
        <ambientLight intensity={0.42}/>
        <directionalLight position={[22, 48, 12]} intensity={1.2}/>
        <pointLight position={[0, 60, 0]} intensity={0.45} color="#6ad7ff"/>
        <pointLight position={[-22, 30, 18]} intensity={0.65} color="#ffe67b"/>
        <pointLight position={[28, 28, -28]} intensity={0.6} color="#ff79ad"/>

        {makeSkyMesh()}

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BASE_Y - 0.5, 0]}>
          <planeGeometry args={[WORLD_RADIUS * 2, WORLD_RADIUS * 2]}/>
          <meshStandardMaterial color="#0b111e" roughness={1} metalness={0}/>
        </mesh>

        {city.buildings.map(function (building) { return (<LandmarkBuilding key={building.id} building={building} useAssets={assetMode}/>); })}

        {Array.from({ length: Math.floor((WORLD_RADIUS * 2) / (CELL_SIZE * 0.5)) }).map(function (_, idx) {
            var p = -WORLD_RADIUS + idx * CELL_SIZE * 0.5;
            return (<mesh key={"road-x-".concat(idx)} position={[p, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[WORLD_RADIUS * 2, ROAD_WIDTH]}/>
              <meshStandardMaterial color="#1f2d3f"/>
            </mesh>);
        })}

        {Array.from({ length: Math.floor((WORLD_RADIUS * 2) / (CELL_SIZE * 0.5)) }).map(function (_, idx) {
            var p = -WORLD_RADIUS + idx * CELL_SIZE * 0.5;
            return (<mesh key={"road-z-".concat(idx)} position={[0, 0.01, p]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
              <planeGeometry args={[WORLD_RADIUS * 2, ROAD_WIDTH]}/>
              <meshStandardMaterial color="#1f2d3f"/>
            </mesh>);
        })}

        {city.signs.map(function (sign, index) { return (<mesh key={"".concat(sign.text, "-").concat(index)} position={[sign.x, sign.y, sign.z]}>
            <planeGeometry args={[2.8, 1]}/>
            <meshStandardMaterial color={sign.color} emissive={sign.color} emissiveIntensity={0.8} side={2} transparent opacity={0.9}/>
          </mesh>); })}

        <mesh ref={playerMeshRef} position={[0, 8, 0]}>
          <sphereGeometry args={[0.9, 18, 18]}/>
          <meshStandardMaterial color="#f15f3a" emissive="#6b1f09" emissiveIntensity={0.45}/>
        </mesh>

        <mesh ref={targetMarkerRef} position={[6, 28, 0]}>
          <boxGeometry args={[0.35, 0.35, 0.35]}/>
          <meshStandardMaterial color="#5ce1ff" emissive="#3fc5ff" emissiveIntensity={0.8}/>
        </mesh>

        <mesh ref={playerRingRef} position={[0, 8.8, 0]}>
          <ringGeometry args={[0.7, 1.05, 24]}/>
          <meshBasicMaterial color="#9ff4ff" transparent opacity={0.45}/>
        </mesh>
      </Canvas>

      <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            padding: 12,
            color: 'white',
            fontFamily: 'monospace',
            background: 'linear-gradient(180deg, rgba(3,6,13,0), rgba(3,6,13,0.32))',
        }}>
        <div style={{ marginBottom: 4 }}>東京サンドボックス（City Play）</div>
        <div>移動モード: {speedLabel}</div>
        <div>アセット: {assetModeLabel}</div>
        <div>
          座標: x {hudPos.x.toFixed(1)} z {hudPos.z.toFixed(1)} y {hudPos.y.toFixed(1)}
        </div>
        <div style={{ opacity: 0.82 }}>
          操作: WASD 移動 / F フライ切替 / Space 上昇 / Shift 下降 / M アセット切替 / P ポーズ
        </div>
        <div style={{ opacity: 0.72 }}>
          東京モデルを入れるなら <span style={{ color: '#7de0ff' }}>/public/assets/tokyo/</span> に glb を置いて
          ?mode=tokyo&asset=1 でON
        </div>
      </div>

      {!running && (<div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: 12,
                padding: 16,
                color: '#fff',
                textAlign: 'center',
                fontFamily: 'monospace',
            }}>
          <div style={{ marginBottom: 10 }}>PAUSED</div>
          <button type="button" onClick={function () {
                setRunning(true);
                runningRef.current = true;
            }} style={{ borderRadius: 999, padding: '10px 14px', border: 0, fontWeight: 700 }}>
            再開
          </button>
        </div>)}
    </div>);
}
