// client/js/viewer3d.js

import * as THREE from '/node_modules/three/build/three.module.js';
import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from '/node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '/node_modules/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from '/node_modules/three/examples/jsm/postprocessing/OutlinePass.js';

(function () {
  // =======================
  // 1. Autenticação básica
  // =======================
  const authRaw = sessionStorage.getItem('authUser');
  if (!authRaw) {
    window.location.href = './login.html';
    return;
  }
  const authUser = JSON.parse(authRaw);
  const userPill = document.getElementById('user-pill');
  if (userPill) userPill.textContent = `logado como ${authUser.username}`;

  const panelMsg = document.getElementById('panel-message');
  const statusBar = document.getElementById('status-bar');

  function setPanelMessage(text) {
    if (panelMsg) panelMsg.textContent = text || '';
  }
  function setStatus(text) {
    if (statusBar) statusBar.textContent = text || '';
  }

  // =======================
  // 2. Cena Three.js básica
  // =======================

  const container = document.getElementById('three-container');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101217);

  // eixo de altura = Z
  scene.up.set(0, 0, 1);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );

  // garante que a câmera usa Z como eixo de "cima", igual ao GLB e à cena
  camera.up.set(0, 0, 1);

  camera.position.set(0, 150, 100);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  container.appendChild(renderer.domElement);

  // ---------- Luzes (ajustadas para melhor leitura do GLB + bloom) ----------
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1c25, 5);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 0.3);
  sun.position.set(0, -550, 200);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const sun2 = new THREE.DirectionalLight(0xffffff, 0.2);
  sun2.position.set(500, -520, 500);
  sun2.castShadow = true;
  sun2.shadow.mapSize.set(2048, 2048);
  scene.add(sun2);

  const sun3 = new THREE.DirectionalLight(0xffffff, 0.2);
  sun3.position.set(-100, -520, 100);
  sun3.castShadow = true;
  sun3.shadow.mapSize.set(2048, 2048);
  scene.add(sun3);

  // pequeno preenchimento geral para tirar preto total das sombras
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  // Controles de câmera (melhorados)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);

  // Suavização de movimento
  controls.enableDamping = true;

  // Limites de zoom
  controls.minDistance = 30;
  controls.maxDistance = 600;

  // Evita virar a câmera totalmente de cabeça para baixo
  controls.minPolarAngle = 0.1;
  controls.maxPolarAngle = Math.PI - 0.1;

  controls.update();

  // =======================
  // 3. Pós-processamento
  // =======================

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55, // strength
    0.1,  // radius
    1.0   // threshold
  );
  composer.addPass(bloomPass);

  const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
  outlinePass.edgeStrength = 1;
  outlinePass.edgeGlow = 10;
  outlinePass.edgeThickness = 1;
  outlinePass.visibleEdgeColor.set(0x97c1ff);
  outlinePass.hiddenEdgeColor.set(0x97c1ff);
  composer.addPass(outlinePass);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // =======================
  // 4. Dados do backend
  // =======================

  let clearance = 1.0;
  let modelos = [];
  let hangares = [];
  let prefixos = [];
  let placementsCurrent = []; // estado local espelhando placements_current_view

  // cache de GLBs por model_name
  const modelCache = new Map();

  // mapa idPlacement -> objeto aeronave
  const aircraftMap = new Map();

  // chão para raycast (plano XY, z=0)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z=0

  // root do aeroporto (para agrupar GLB do aeroporto)
  let airportRoot = null;

  // =======================
  // 4.x Helpers para hitboxes das partes do avião
  // =======================

  function findChildByNameCI(root, targetName) {
    const lower = targetName.toLowerCase();
    let found = null;
    root.traverse((o) => {
      if (found) return;
      if (typeof o.name === 'string' && o.name.toLowerCase() === lower) {
        found = o;
      }
    });
    return found;
  }

  function createOBBBoxForPart(root, partObject, color) {
    // Garante matrizes atualizadas
    root.updateWorldMatrix(true, true);
    partObject.updateWorldMatrix(true, true);

    const mat = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    // Se a parte tiver geometria, usamos o bounding box LOCAL da geometria
    // para preservar a orientação da parte.
    const geom = partObject.geometry;
    if (geom) {
      geom.computeBoundingBox();
      const bb = geom.boundingBox;

      const size = new THREE.Vector3();
      const centerLocalPart = new THREE.Vector3();
      bb.getSize(size);
      bb.getCenter(centerLocalPart);

      // Transformação da parte (local) para o root (local)
      const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
      const partMatrixRoot = new THREE.Matrix4().multiplyMatrices(
        rootInv,
        partObject.matrixWorld
      );

      // Centro em coordenadas locais do root
      const centerLocal = centerLocalPart.clone().applyMatrix4(partMatrixRoot);

      // Extrai yaw (rotação em Z) da parte em relação ao root
      const euler = new THREE.Euler().setFromRotationMatrix(partMatrixRoot, 'ZYX');
      const localYawRad = euler.z; // rotação em torno de Z

      // Box visual no espaço local do root, com a mesma orientação em Z da parte
      const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
      const boxMesh = new THREE.Mesh(boxGeom, mat);
      boxMesh.position.copy(centerLocal);
      boxMesh.rotation.set(0, 0, localYawRad);
      root.add(boxMesh);

      return {
        mesh: boxMesh,
        // Não usamos mais Box3 axis-alinhado para colisão, e sim estes campos:
        centerLocal,
        size,
        localYawRad,
      };
    }

    // Fallback: se não tiver geometry, usa o método antigo (AABB em root)
    const worldBox = new THREE.Box3().setFromObject(partObject);
    const invRootMatrixWorld = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const localBox = worldBox.clone().applyMatrix4(invRootMatrixWorld);

    const size = new THREE.Vector3();
    const centerLocal = new THREE.Vector3();
    localBox.getSize(size);
    localBox.getCenter(centerLocal);

    const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const boxMesh = new THREE.Mesh(boxGeom, mat);
    boxMesh.position.copy(centerLocal);
    root.add(boxMesh);

    return {
      mesh: boxMesh,
      centerLocal,
      size,
      localYawRad: 0,
    };
  }

  function buildHitboxesForAircraft(aircraftObj) {
    const { root } = aircraftObj;

    // Garante matrizes de mundo atualizadas
    root.updateWorldMatrix(true, true);

    const hitboxes = {};

    // Só criamos caixas para as partes que existirem no GLB
    const partDefs = [
      { key: 'fuselage',  name: 'fuselage',  color: 0x00ffff },
      { key: 'leftwing',  name: 'leftwing',  color: 0x00ff00 },
      { key: 'rightwing', name: 'rightwing', color: 0xffff00 },
      { key: 'winglet',   name: 'winglet',   color: 0xff00ff },
      { key: 'tail',      name: 'tail',      color: 0xff8800 },
    ];

    partDefs.forEach((def) => {
      const partObj = findChildByNameCI(root, def.name);
      if (partObj) {
        const hb = createOBBBoxForPart(root, partObj, def.color);
        hitboxes[def.key] = hb;
      } else {
        // Parte não existe nesse modelo → null e não entra no cálculo de colisão
        hitboxes[def.key] = null;
      }
    });

    aircraftObj.hitboxes = hitboxes;
  }

  // =======================
  // 5. Helpers de backend
  // =======================

  async function fetchJson(url, options = {}) {
    const resp = await fetch(url, options);
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || `Erro HTTP ${resp.status}`);
    }
    return data;
  }

  async function loadSettings() {
    try {
      const settings = await fetchJson('/api/settings');
      clearance = typeof settings.clearance_m === 'number' ? settings.clearance_m : 1.0;
      const clInput = document.getElementById('clearance-input');
      if (clInput) clInput.value = clearance;
    } catch (err) {
      console.error('Erro ao carregar settings:', err);
    }
  }

  async function updateSettingsClearance(newValue) {
    try {
      const settings = await fetchJson('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearance_m: newValue }),
      });
      clearance = settings.clearance_m;
      setPanelMessage(`Clearance atualizado para ${clearance.toFixed(2)} m.`);
    } catch (err) {
      console.error(err);
      setPanelMessage('Erro ao atualizar clearance.');
    }
  }

  async function loadModelos() {
    try {
      modelos = await fetchJson('/api/modelos');
    } catch (err) {
      console.error('Erro ao carregar modelos:', err);
    }
  }

  async function loadHangares() {
    try {
      hangares = await fetchJson('/api/hangars');
    } catch (err) {
      console.error('Erro ao carregar hangares:', err);
    }
  }

  async function loadPrefixos() {
    try {
      prefixos = await fetchJson('/api/prefixos');
    } catch (err) {
      console.error('Erro ao carregar prefixos:', err);
    }
  }

  async function loadPlacementsCurrent() {
    try {
      const syncResult = await fetchJson('/api/placements/current/sync-from-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      placementsCurrent = syncResult.placementsCurrent || [];
    } catch (err) {
      console.error('Erro ao carregar placements_current:', err);
      placementsCurrent = [];
    }
  }

  async function apiUpdatePlacementCurrent(p) {
    try {
      await fetchJson(`/api/placements/current/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
    } catch (err) {
      console.error('Erro ao atualizar placement_current:', err);
    }
  }

  async function apiAddPlacementCurrent(payload) {
    try {
      const created = await fetchJson('/api/placements/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      placementsCurrent.push(created);
      return created;
    } catch (err) {
      console.error('Erro ao criar placement_current:', err);
      return null;
    }
  }

  async function apiSavePositions(scope, hangarName) {
    try {
      const payload = { scope };
      if (scope === 'Hangar') {
        payload.hangar_name = hangarName;
      }
      const result = await fetchJson('/api/placements/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setPanelMessage('Posições salvas em placements_saved.json.');
      return result;
    } catch (err) {
      console.error(err);
      setPanelMessage('Erro ao salvar posições.');
    }
  }

  // =======================
  // 6. UI (selects, botões)
  // =======================

  const clearanceInput = document.getElementById('clearance-input');
  const btnClearance = document.getElementById('btn-clearance');
  const prefixoSelect = document.getElementById('prefixo-select');
  const modeloDisplay = document.getElementById('modelo-display');
  const hangarAddSelect = document.getElementById('hangar-add-select');
  const saveScopeSelect = document.getElementById('save-scope');
  const saveHangarSelect = document.getElementById('save-hangar-select');

  function populatePrefixoSelect() {
    if (!prefixoSelect) return;
    prefixoSelect.innerHTML = '';
    prefixos.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.prefixo;
      opt.textContent = p.prefixo;
      opt.dataset.modelName = p.model_name;
      prefixoSelect.appendChild(opt);
    });
    updateModeloDisplay();
  }

  function updateModeloDisplay() {
    if (!prefixoSelect || !modeloDisplay) return;
    const sel = prefixoSelect.options[prefixoSelect.selectedIndex];
    if (!sel) {
      modeloDisplay.value = '';
      return;
    }
    const modelName = sel.dataset.modelName || '';
    modeloDisplay.value = modelName;
  }

  function populateHangarSelects() {
    if (hangarAddSelect) {
      for (let i = hangarAddSelect.options.length - 1; i >= 1; i--) {
        hangarAddSelect.remove(i);
      }
      hangares.forEach((h) => {
        const opt = document.createElement('option');
        opt.value = h.hangar_name;
        opt.textContent = h.hangar_name;
        hangarAddSelect.appendChild(opt);
      });
    }
    if (saveHangarSelect) {
      saveHangarSelect.innerHTML = '<option value="">(selecione)</option>';
      hangares.forEach((h) => {
        const opt = document.createElement('option');
        opt.value = h.hangar_name;
        opt.textContent = h.hangar_name;
        saveHangarSelect.appendChild(opt);
      });
    }
  }

  if (prefixoSelect) {
    prefixoSelect.addEventListener('change', updateModeloDisplay);
  }

  if (btnClearance && clearanceInput) {
    btnClearance.addEventListener('click', () => {
      const v = Number(clearanceInput.value);
      if (Number.isNaN(v) || v < 0) {
        setPanelMessage('Clearance inválido.');
        return;
      }
      updateSettingsClearance(v);
    });
  }

  const btnAddAircraft = document.getElementById('btn-add-aircraft');
  if (btnAddAircraft) {
    btnAddAircraft.addEventListener('click', async () => {
      if (!prefixoSelect || !modeloDisplay) return;
      const prefixo = prefixoSelect.value;
      const modelName = modeloDisplay.value;
      if (!prefixo || !modelName) {
        setPanelMessage('Prefixo ou modelo inválido.');
        return;
      }
      const hangarName = hangarAddSelect ? hangarAddSelect.value : '';

      let x = 150;
      let y = 150;

      if (hangarName) {
        const h = hangares.find((hg) => hg.hangar_name === hangarName);
        if (h) {
          x = h.hangar_position.x;
          y = h.hangar_position.y;
        }
      }

      const payload = {
        prefixo,
        model_name: modelName,
        x,
        y,
        heading_deg: 0,
        hangar_name: hangarName || null,
      };

      const created = await apiAddPlacementCurrent(payload);
      if (!created) return;

      await spawnAircraftFromPlacement(created);
      setPanelMessage(`Aeronave ${prefixo} adicionada.`);
    });
  }

  const btnSavePositions = document.getElementById('btn-save-positions');
  if (btnSavePositions) {
    btnSavePositions.addEventListener('click', async () => {
      const scope = saveScopeSelect.value;
      if (scope === 'Hangar') {
        const hName = saveHangarSelect.value;
        if (!hName) {
          setPanelMessage('Selecione um hangar para salvar.');
          return;
        }
        await apiSavePositions('Hangar', hName);
      } else {
        await apiSavePositions('Todos', null);
      }
    });
  }

  const btnMenu = document.getElementById('btn-menu');
  const btnLogout = document.getElementById('btn-logout');
  const btnRefresh = document.getElementById('btn-refresh');

  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      window.location.href = './mainMenu.html';
    });
  }
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('authUser');
      window.location.href = './login.html';
    });
  }
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      const ok = window.confirm('Isso vai descartar posições não salvas. Deseja continuar?');
      if (!ok) return;
      setPanelMessage('Executando refresh do sistema...');
      try {
        const data = await fetchJson('/api/system/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!data.success) {
          setPanelMessage(data.error || 'Falha ao executar refresh.');
          return;
        }
        window.location.reload();
      } catch (err) {
        console.error(err);
        setPanelMessage('Erro ao conectar ao servidor para refresh.');
      }
    });
  }

  // =======================
  // 7. Carregar GLBs
  // =======================

  const gltfLoader = new GLTFLoader();

  async function loadAirport() {
    try {
      const gltf = await gltfLoader.loadAsync('/assets/airport.glb');
      const map = gltf.scene;

      // Cria um grupo root para o aeroporto
      airportRoot = new THREE.Group();
      airportRoot.name = 'AirportRoot';

      map.traverse((o) => {
        if (o.isMesh) {
          o.receiveShadow = true;
          o.castShadow = false; // aeroporto normalmente não projeta sombra "forte" em si mesmo
          if (o.material && o.material.isMeshStandardMaterial) {
            const currentRoughness = (o.material.roughness ?? 0.7);
            // dá uma suavizada para combinar melhor com o bloom
            o.material.roughness = Math.min(0.7, currentRoughness);
          }
        }
      });

      airportRoot.add(map);
      scene.add(airportRoot);

      // Caso no futuro queira usar um objeto "Ground" nomeado:
      const hasGround = map.getObjectByName('Ground');
      // se não tiver, poderíamos adicionar um plano receptor de sombra aqui
    } catch (err) {
      console.error('Erro ao carregar airport.glb:', err);
    }
  }

  async function loadModelGLB(modelName) {
    if (modelCache.has(modelName)) {
      return modelCache.get(modelName).clone(true);
    }

    const modelo = modelos.find((m) => m.model_name === modelName);
    if (!modelo) throw new Error(`Modelo não encontrado: ${modelName}`);

    const gltf = await gltfLoader.loadAsync(modelo.glb_path);
    const baseScene = gltf.scene;
    modelCache.set(modelName, baseScene);
    return baseScene.clone(true);
  }

  // =======================
  // 8. Hangares (retângulos a 0.5m)
  // =======================

  function addHangarOverlays() {
    hangares.forEach((h) => {
      const { width, depth } = h.size;
      const geom = new THREE.PlaneGeometry(width, depth);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x3c88ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(h.hangar_position.x, h.hangar_position.y, 0.5);
      const rotRad = (h.rotation_deg || 0) * Math.PI / 180;
      mesh.rotateZ(rotRad);
      scene.add(mesh);

      const edges = new THREE.EdgesGeometry(geom);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x4da3ff })
      );
      line.position.copy(mesh.position);
      line.rotation.copy(mesh.rotation);
      scene.add(line);
    });
  }

  // =======================
  // 9. Aeronaves em cena
  // =======================

  let selectedAircraft = null;
  let isDragging = false;
  let isRotating = false;
  let dragStartPoint = new THREE.Vector3();
  let dragOffset = new THREE.Vector3();
  let rotateStartX = 0;
  let rotateStartHeading = 0;

  function findPlacementById(id) {
    return placementsCurrent.find((p) => p.id === id);
  }

  function worldToHangarName(pos) {
    for (const h of hangares) {
      const rotDeg = h.rotation_deg || 0;
      const rotRad = -rotDeg * Math.PI / 180;
      const dx = pos.x - h.hangar_position.x;
      const dy = pos.y - h.hangar_position.y;
      const localX = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
      const localY = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);

      if (Math.abs(localX) <= h.size.width / 2 && Math.abs(localY) <= h.size.depth / 2) {
        return h.hangar_name;
      }
    }
    return null;
  }

  async function spawnAircraftFromPlacement(p) {
    const { id, prefixo, model_name, x, y, heading_deg } = p;

    // Guardamos o heading salvo para aplicar DEPOIS de montar hitboxes
    const savedHeadingDeg = typeof heading_deg === 'number' ? heading_deg : 0;

    let root;
    try {
      const glbRoot = await loadModelGLB(model_name);

      root = new THREE.Group();
      root.add(glbRoot);

      glbRoot.position.set(0, 0, 0);
    } catch (err) {
      console.error(`Erro ao carregar modelo ${model_name}:`, err);
      return;
    }

    // 1) POSIÇÃO neutra no chão
    root.position.set(x ?? 0, y ?? 0, 0);

    // 2) HEADING NEUTRO para construção de hitboxes
    root.rotation.set(0, 0, 0);

    // Label com o prefixo
    const label = createTextSprite(prefixo || '');
    label.position.set(0, 0, 4);
    root.add(label);

    scene.add(root);

    // Criamos o objeto de aeronave com heading neutro inicialmente
    const aircraftObj = {
      id,
      prefixo,
      model_name,
      root,
      label,
      heading_deg: 0,
      hitboxes: {},
    };

    // 3) Construir hitboxes com heading = 0 (caixas base "limpas")
    buildHitboxesForAircraft(aircraftObj);

    // 4) Agora aplicamos o heading SALVO, simulando o giro manual
    aircraftObj.heading_deg = savedHeadingDeg;
    const finalHeadingRad = savedHeadingDeg * Math.PI / 180;
    root.rotation.set(0, 0, finalHeadingRad);

    // (Importante: NÃO recalculamos as hitboxes depois disso)

    aircraftMap.set(id, aircraftObj);
  }

  function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '32px system-ui';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(12, 3, 1);
    return sprite;
  }

  function selectAircraft(aircraft) {
    selectedAircraft = aircraft;
    if (aircraft) {
      outlinePass.selectedObjects = [aircraft.root];
      setStatus(
        `Selecionado: ${aircraft.prefixo} (modelo ${aircraft.model_name}). ` +
        'Clique e arraste para mover, Shift + arraste para girar.'
      );
    } else {
      outlinePass.selectedObjects = [];
      setStatus('Nenhuma aeronave selecionada. Clique em uma aeronave para selecionar.');
    }
  }

  // =======================
  // 9.x Helpers para OBB 2D/3D entre aeronaves
  // =======================

  // Constrói um OBB 2D (no plano XY) + faixa em Z a partir de um hitbox de parte da aeronave
  function buildObb2DFromHitbox(aircraft, hitbox) {
    if (!hitbox) return null;

    const size = hitbox.size;
    const centerLocal = hitbox.centerLocal;
    const localYawRad = hitbox.localYawRad || 0;

    if (!size || !centerLocal) return null;

    // Heading global da aeronave (rotação em torno de Z)
    const headingRad = (aircraft.heading_deg || 0) * Math.PI / 180;
    const cosRoot = Math.cos(headingRad);
    const sinRoot = Math.sin(headingRad);

    // Centro em coordenadas de mundo (XY) – rotacionando o centro local pelo heading da aeronave
    const worldPos = aircraft.root.position;
    const centerWorldX = worldPos.x + (centerLocal.x * cosRoot - centerLocal.y * sinRoot);
    const centerWorldY = worldPos.y + (centerLocal.x * sinRoot + centerLocal.y * cosRoot);
    const centerWorldZ = worldPos.z + centerLocal.z;

    // Half-extents com clearance aplicado
    const halfX = size.x / 2 + clearance;
    const halfY = size.y / 2 + clearance;
    const halfZ = size.z / 2 + clearance;

    // Orientação final da caixa = heading da aeronave + yaw local da parte
    const totalYaw = headingRad + localYawRad;
    const cosTot = Math.cos(totalYaw);
    const sinTot = Math.sin(totalYaw);

    const axisU = new THREE.Vector2(cosTot, sinTot);      // eixo "frente" da caixa
    const axisV = new THREE.Vector2(-sinTot, cosTot);     // eixo "lado" da caixa

    const center = new THREE.Vector2(centerWorldX, centerWorldY);

    return {
      center,
      axisU,
      axisV,
      halfX,
      halfY,
      centerZ: centerWorldZ,
      halfZ,
    };
  }

  function projectionRadiusOnAxis(obb, axisNorm) {
    // axisNorm: Vector2 normalizado
    const uDot = Math.abs(axisNorm.dot(obb.axisU));
    const vDot = Math.abs(axisNorm.dot(obb.axisV));
    return obb.halfX * uDot + obb.halfY * vDot;
  }

  function overlapsOnAxis(obbA, obbB, axis) {
    const axisNorm = axis.clone().normalize();
    const centerDelta = obbB.center.clone().sub(obbA.center);
    const dist = Math.abs(centerDelta.dot(axisNorm));
    const rA = projectionRadiusOnAxis(obbA, axisNorm);
    const rB = projectionRadiusOnAxis(obbB, axisNorm);
    return dist <= (rA + rB);
  }

  // SAT 2D no plano XY usando os eixos dos dois OBBs
  function obb2DIntersects(obbA, obbB) {
    const axes = [
      obbA.axisU,
      obbA.axisV,
      obbB.axisU,
      obbB.axisV,
    ];
    for (const axis of axes) {
      if (!overlapsOnAxis(obbA, obbB, axis)) {
        return false;
      }
    }
    return true;
  }

  function obb3DIntersects(obbA, obbB) {
    // Primeiro checa interseção 2D no plano
    if (!obb2DIntersects(obbA, obbB)) return false;

    // Depois checa sobreposição em Z
    const dz = Math.abs(obbA.centerZ - obbB.centerZ);
    if (dz > (obbA.halfZ + obbB.halfZ)) return false;

    return true;
  }

  // =======================
  // 10. Colisão OBB entre aeronaves
  // =======================

  function checkCollisionsForAircraft(aircraft) {
    const result = {
      hasCollision: false,
      details: [],
    };
    if (!aircraft) return result;

    const partKeys = ['fuselage', 'leftwing', 'rightwing', 'winglet', 'tail'];

    for (const other of aircraftMap.values()) {
      if (other.id === aircraft.id) continue; // não compara com ela mesma

      for (const keyA of partKeys) {
        const hbA = aircraft.hitboxes && aircraft.hitboxes[keyA];
        if (!hbA || !hbA.centerLocal || !hbA.size) continue;
        const obbA = buildObb2DFromHitbox(aircraft, hbA);
        if (!obbA) continue;

        for (const keyB of partKeys) {
          const hbB = other.hitboxes && other.hitboxes[keyB];
          if (!hbB || !hbB.centerLocal || !hbB.size) continue;
          const obbB = buildObb2DFromHitbox(other, hbB);
          if (!obbB) continue;

          if (obb3DIntersects(obbA, obbB)) {
            result.hasCollision = true;
            result.details.push(
              `Colisão entre ${aircraft.prefixo} (${keyA}) e ${other.prefixo} (${keyB}).`
            );
            // Podemos sair cedo ao detectar a primeira colisão
            return result;
          }
        }
      }
    }

    // TODO (próximo passo): colisão com paredes / porta dos hangares usando hangares[] e clearance

    return result;
  }

  function applyCollisionVisualFeedback(aircraft, collisionResult) {
    if (!aircraft) return;
    if (!collisionResult.hasCollision) {
      outlinePass.visibleEdgeColor.set(0x97c1ff);
      outlinePass.hiddenEdgeColor.set(0x97c1ff);
      setPanelMessage('');
    } else {
      outlinePass.visibleEdgeColor.set(0xff4d4d);
      outlinePass.hiddenEdgeColor.set(0xff4d4d);

      const msg =
        collisionResult.details && collisionResult.details.length > 0
          ? collisionResult.details[0]
          : 'Colisão detectada! Ajuste a posição/rotação da aeronave.';

      setPanelMessage(msg);
    }
  }

  // =======================
  // 11. Interação (mouse)
  // =======================

  function updatePointerFromEvent(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onPointerDown(event) {
    updatePointerFromEvent(event);

    raycaster.setFromCamera(pointer, camera);
    const allRoots = Array.from(aircraftMap.values()).map((a) => a.root);
    const intersects = raycaster.intersectObjects(allRoots, true);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const clickedRoot = allRoots.find(
        (r) => r === intersect.object || (r.children && r.children.includes(intersect.object))
      );
      const clickedAircraft = Array.from(aircraftMap.values()).find((a) => a.root === clickedRoot);

      if (clickedAircraft) {
        selectAircraft(clickedAircraft);

        if (event.shiftKey) {
          isRotating = true;
          isDragging = false;
          rotateStartX = event.clientX;
          rotateStartHeading = clickedAircraft.heading_deg || 0;
          controls.enabled = false;
        } else {
          isDragging = true;
          isRotating = false;
          controls.enabled = false;

          const planeIntersect = new THREE.Vector3();
          raycaster.ray.intersectPlane(groundPlane, planeIntersect);

          dragStartPoint.copy(planeIntersect);
          dragOffset.subVectors(clickedAircraft.root.position, planeIntersect);
        }

        return;
      }
    }

    selectAircraft(null);
  }

  function onPointerMove(event) {
    if (!selectedAircraft) return;
    updatePointerFromEvent(event);

    if (isDragging) {
      raycaster.setFromCamera(pointer, camera);
      const planeIntersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, planeIntersect);

      const newPos = new THREE.Vector3().addVectors(planeIntersect, dragOffset);
      selectedAircraft.root.position.set(newPos.x, newPos.y, 0);

      setStatus(
        `Movendo ${selectedAircraft.prefixo} para ` +
        `(${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)})`
      );
    } else if (isRotating) {
      const deltaX = event.clientX - rotateStartX;
      const deltaDeg = deltaX * 0.3;
      const newHeading = rotateStartHeading + deltaDeg;
      selectedAircraft.heading_deg = newHeading;
      const rad = newHeading * Math.PI / 180;
      selectedAircraft.root.rotation.set(0, 0, rad);
      setStatus(
        `Rotacionando ${selectedAircraft.prefixo}: ` +
        `heading ${newHeading.toFixed(1)}°`
      );
    }
  }

  function onPointerUp() {
    if (!selectedAircraft) return;

    const wasDragging = isDragging || isRotating;
    isDragging = false;
    isRotating = false;
    controls.enabled = true;

    if (!wasDragging) return;

    const placement = findPlacementById(selectedAircraft.id);
    if (placement) {
      placement.x = selectedAircraft.root.position.x;
      placement.y = selectedAircraft.root.position.y;
      placement.heading_deg = selectedAircraft.heading_deg || 0;

      const hName = worldToHangarName(selectedAircraft.root.position);
      placement.hangar_name = hName;

      apiUpdatePlacementCurrent(placement);

      if (hName) {
        setPanelMessage(`Aeronave ${selectedAircraft.prefixo} dentro do hangar ${hName}.`);
      } else {
        setPanelMessage(
          `Aeronave ${selectedAircraft.prefixo} fora de qualquer hangar ` +
          '(o que é permitido).'
        );
      }
    }

    const collRes = checkCollisionsForAircraft(selectedAircraft);
    applyCollisionVisualFeedback(selectedAircraft, collRes);
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // =======================
  // 12. Loop de render
  // =======================

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    composer.render();
  }

  // =======================
  // 13. Inicialização geral
  // =======================

  async function init() {
    setStatus('Carregando dados do servidor...');
    await Promise.all([
      loadSettings(),
      loadModelos(),
      loadHangares(),
      loadPrefixos(),
      loadPlacementsCurrent(),
      loadAirport(),
    ]);

    populatePrefixoSelect();
    populateHangarSelects();
    addHangarOverlays();

    for (const p of placementsCurrent) {
      await spawnAircraftFromPlacement(p);
    }

    setStatus(
      'Pronto. Clique em uma aeronave para selecionar. ' +
      'Arraste para mover, Shift + arraste para rotacionar.'
    );
    animate();
  }

  init().catch((err) => {
    console.error('Falha na inicialização da Interface 3D:', err);
    setPanelMessage('Erro ao inicializar a Interface 3D. Veja o console.');
  });
})();
