  onload = setTimeout(main, 250);

  function main() {
    let numberOfBlocks = 36,
      progress = 0,
      total = 93,
      stats, text = 'Normal interaction';

    const canvas = document.getElementById('c');
    const physicsSelectionContainer = document.getElementById('physics-selection-container');
    const restartBtn = document.getElementById('restart');
    const progressElem = document.getElementById('progress');
    const mainContainer = document.getElementById('main-container');
    const selectElem = document.querySelector('select');

    const meshes = [];
    const bodies = [];
    const fixedTimeStep = 1 / 60;

    stats = new Stats();

    const PI = Math.PI;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const fov = 75;
    const aspect = w / h;
    const near = 0.1;
    const far = 100;

    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();

    const color = 0xFFFFFF;
    const intensity = 50;

    const light = new THREE.SpotLight(color, intensity);
    light.position.set(-20, 25, 15);
    light.target.position.set(0, 0, 0);
    light.shadow.mapSize.x = light.shadow.mapSize.y = 2048;
    light.castShadow = light.receiveShadow = true;
    light.penumbra = 1;
    light.angle = 1;

    const updateCamera = () => {
      light.target.updateMatrixWorld();
      light.shadow.camera.updateProjectionMatrix();
    }

    updateCamera();

    scene.add(light, new THREE.AmbientLight(0xFFFFFF, .3));

    const addMesh = (geo, mat, rX, rY, rZ, x, y, z, receiveShadow = true, castShadow = true) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.set(rX, rY, rZ);
      mesh.position.set(x, y, z);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      scene.add(mesh);
      progress++;
      return mesh;
    };

    const radiusTop = 10;
    const radiusBottom = 10;
    const height = 1;
    const radialSegments = 48;

    const tableTex = new THREE.TextureLoader().load('https://dl.dropbox.com/s/o08jctfuo1u7fx7/marble.jpg', t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(15, 1);
      progress++;
    });

    const floorTex = new THREE.TextureLoader().load('https://dl.dropbox.com/s/6uci00nf83wgsb5/floor.jpg', t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(5, 5);
      progress++;
    });

    const tableMaterials = [new THREE.MeshPhongMaterial({
      map: tableTex
    })];

    const wallTex = new THREE.TextureLoader().load('https://dl.dropbox.com/s/bo59g6p4h6l9j5r/wall.jpg', t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(4, 4);
      progress++;
    });

    const cubeMaterials = [
      new THREE.MeshPhongMaterial({
        map: wallTex,
        side: THREE.BackSide,
        shininess: 60
      }),
      new THREE.MeshPhongMaterial({
        map: wallTex,
        side: THREE.BackSide,
        shininess: 60
      }),
      new THREE.MeshPhongMaterial({
        color: 0xF2F2F2,
        side: THREE.BackSide,
        shininess: 60
      }),
      new THREE.MeshBasicMaterial({
        visible: false
      }),
      new THREE.MeshPhongMaterial({
        map: wallTex,
        side: THREE.BackSide,
        shininess: 60
      }),
      new THREE.MeshPhongMaterial({
        map: wallTex,
        side: THREE.BackSide,
        shininess: 60
      }),
    ];

    const plane = addMesh(new THREE.PlaneBufferGeometry(100, 100), new THREE.MeshStandardMaterial({
      map: floorTex,
      side: THREE.FrontSide,
      roughness: .03,
      metalness: .2
    }), 0, 0, 0, 0, -10, 0, true, false);
    plane.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -PI / 2);

    const addReflector = (geometry, x, y, z, rX, rY, rZ) => {
      const mirror = new THREE.Reflector(geometry, {
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: 0x777777,
      });

      mirror.getRenderTarget().texture.anisotropy = 8;
      mirror.position.set(x, y, z);
      mirror.rotation.set(rX, rY, rZ);
      mirror.castShadow = true;
      scene.add(mirror);
      progress++;
      return mirror;
    };

    addReflector(new THREE.CircleBufferGeometry(radiusTop, radialSegments), 0, 0.5, 0, -PI / 2, 0, 0);

    const blockTextures = [
      new THREE.TextureLoader().load('https://dl.dropbox.com/s/vw2k1q29xykghwd/block_texture_1.jpg'),
      new THREE.TextureLoader().load('https://dl.dropbox.com/s/kzbtypch9ecgpdm/block_texture_2.jpg'),
      new THREE.TextureLoader().load('https://dl.dropbox.com/s/96sgj3s3nv7hw0v/block_texture_3.jpg'),
      new THREE.TextureLoader().load('https://dl.dropbox.com/s/bgiic34gup89r9b/block_texture_4.jpg'),
    ];

    const onWindowResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', onWindowResize);

    const world = new CANNON.World();
    world.doProfiling = true;
    world.allowSleep = true;
    world.solver.iterations = 50;
    world.defaultContactMaterial.contactEquationStiffness = 5e6;
    world.defaultContactMaterial.contactEquationRelaxation = 4;
    world.gravity.set(0, -10, 0);
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;
    world.broadphase = new CANNON.NaiveBroadphase();

    const addBody = (mass, position, shape) => {
      const body = new CANNON.Body({
        mass,
        position,
        shape
      });
      body.allowSleep = true;
      world.add(body);
      progress++;
      return body;
    };

    const groundBody = addBody(0, new CANNON.Vec3(0, -9.97, 0), new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -PI / 2);

    const tableBody = addBody(0, new CANNON.Vec3(0, -.5, 0), new CANNON.Cylinder(radiusTop, radiusBottom, 2 * height, radialSegments));
    tableBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -PI / 2);

    addMesh(new THREE.BoxBufferGeometry(100, 100, 100), cubeMaterials, 0, 0, 0, 0, 40, 0);
    addMesh(new THREE.CylinderBufferGeometry(radiusTop, radiusBottom, height, radialSegments), tableMaterials, 0, 0, 0, 0, 0, 0);

    addMesh(new THREE.BoxBufferGeometry(.2, 9.5, .2), new THREE.MeshStandardMaterial({
      color: 0x272727,
      roughness: 0,
      metalness: .25
    }), 0, 0, 0, -9.9, -5.25, 0);
    addBody(0, new CANNON.Vec3(-9.9, -5.25, 0), new CANNON.Box(new CANNON.Vec3(.1, 4.75, .1)));

    addMesh(new THREE.BoxBufferGeometry(.2, 9.5, .2), new THREE.MeshStandardMaterial({
      color: 0x272727,
      roughness: 0,
      metalness: .25
    }), 0, 0, 0, 9.9, -5.25, 0);
    addBody(0, new CANNON.Vec3(9.9, -5.25, 0), new CANNON.Box(new CANNON.Vec3(.1, 4.75, .1)));

    addMesh(new THREE.BoxBufferGeometry(19.6, .2, .2), new THREE.MeshStandardMaterial({
      color: 0x272727,
      roughness: 0,
      metalness: .25
    }), 0, 0, 0, 0, -9.9, 0);
    addBody(0, new CANNON.Vec3(0, -9.9, 0), new CANNON.Box(new CANNON.Vec3(9.8, .1, .1)));

    addMesh(new THREE.BoxBufferGeometry(.2, 9.5, .2), new THREE.MeshStandardMaterial({
      color: 0x272727,
      roughness: 0,
      metalness: .25
    }), 0, 0, 0, 0, -5.25, -9.9);
    addBody(0, new CANNON.Vec3(0, -5.25, -9.9), new CANNON.Box(new CANNON.Vec3(.1, 4.75, .1)));

    addMesh(new THREE.BoxBufferGeometry(.2, 9.5, .2), new THREE.MeshStandardMaterial({
      color: 0x272727,
      roughness: 0,
      metalness: .25
    }), 0, 0, 0, 0, -5.25, 9.9);
    addBody(0, new CANNON.Vec3(0, -5.25, 9.9), new CANNON.Box(new CANNON.Vec3(.1, 4.75, .1)));

    addMesh(new THREE.BoxBufferGeometry(.2, .2, 19.6), new THREE.MeshStandardMaterial({
      color: 0x272727,
      roughness: 0,
      metalness: .25
    }), 0, 0, 0, 0, -9.9, 0);
    addBody(0, new CANNON.Vec3(0, -9.9, 0), new CANNON.Box(new CANNON.Vec3(.1, .1, 9.8)));

    const render = () => {
      stats.update();
      renderer.render(scene, camera);
    };

    const addJengaBlocks = () => {
      let x = -1.01;
      let y = .7;
      let z = 0;

      for (let i = 0; i < numberOfBlocks / 2; i++) {
        if (i % 3 === 0 && i) {
          y += .81;
          x = -1.01;
        }

        meshes.push(addMesh(new THREE.BoxBufferGeometry(1, .4, 3), new THREE.MeshPhongMaterial({
          map: blockTextures[Math.floor(blockTextures.length * Math.random())],
          shininess: 45
        }), 0, 0, 0, x, y, z));
        const body = addBody(1, new CANNON.Vec3(x, y, z), new CANNON.Box(new CANNON.Vec3(.5, .2, 1.5)));
        bodies.push(body);
        x += 1.01;
      }

      x = 0;
      y = 1.11;
      z = 1.01;

      for (let i = 0; i < numberOfBlocks / 2; i++) {
        if (i % 3 === 0 && i) {
          y += .81;
          z = 1.01;
        }

        meshes.push(addMesh(new THREE.BoxBufferGeometry(1, .4, 3), new THREE.MeshPhongMaterial({
          map: blockTextures[Math.floor(blockTextures.length * Math.random())],
          shininess: 45
        }), 0, PI / 2, 0, x, y, z));
        const body = addBody(1, new CANNON.Vec3(x, y, z), new CANNON.Box(new CANNON.Vec3(.5, .2, 1.5)));
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -PI / 2);
        bodies.push(body);
        z -= 1.01;
      }
    };

    addJengaBlocks();

    let pickedUUID = null;

    const updatePhysics = () => {
      world.step(fixedTimeStep);
      for (let i = 0; i < meshes.length; i++) {
        if (text.includes('High') && picked && dragStart) {
          world.defaultContactMaterial.contactEquationRelaxation = 1;
        } else {
          world.defaultContactMaterial.contactEquationRelaxation = text.includes('Low') ? 16 : 4;
        }
        if (dragStart) bodies[i].wakeUp();
        if (pickedUUID === meshes[i].uuid && dragStart) {
          bodies[i].quaternion.copy(meshes[i].quaternion);
          bodies[i].position.copy(meshes[i].position);
        }

        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
      }
    };

    const cameraPole = new THREE.Object3D();
    scene.add(cameraPole);
    cameraPole.add(camera);

    const raycaster = new THREE.Raycaster();
    let pickedObject = null;
    let pickedObjectSavedColor = 0;
    let picked = false;

    const pick = (normalizedPosition, scene, camera, time) => {
      if (dragStart) return;

      if (pickedObject) {
        picked = true;
        pickedObject.material.emissive.setHex(pickedObjectSavedColor);
        pickedObject = undefined;
      }

      raycaster.setFromCamera(normalizedPosition, camera);
      const intersectedObjects = raycaster.intersectObjects([...meshes]);
      if (intersectedObjects.length) {
        pickedObject = intersectedObjects[0].object;
        pickedObjectSavedColor = pickedObject.material.emissive.getHex();
        pickedObject.material.emissive.setHex((time * 8) % 2 > 1 ? 0xFFFF00 : 0xFF0000);
      }
    };

    const clearPickPosition = () => {
      pickPosition.x = -Infinity;
      pickPosition.y = -Infinity;
    };

    const pickPosition = {
      x: 0,
      y: 0
    };
    clearPickPosition();

    const touchScreen = 'ontouchmove' in document;

    const getCanvasRelativePosition = e => {
      const rect = canvas.getBoundingClientRect();

      if (touchScreen) {
        return {
          x: (e.targetTouches[0].clientX - rect.left) * canvas.width / rect.width,
          y: (e.targetTouches[0].clientY - rect.top) * canvas.height / rect.height,
        }
      }

      return {
        x: (e.clientX - rect.left) * canvas.width / rect.width,
        y: (e.clientY - rect.top) * canvas.height / rect.height,
      };
    }

    const setPickPosition = e => {
      const pos = getCanvasRelativePosition(e);
      if (pickedObject) pickedUUID = pickedObject.uuid;
      pickPosition.x = (pos.x / canvas.width) * 2 - 1;
      pickPosition.y = (pos.y / canvas.height) * -2 + 1;
    };

    let dragStart = false;
    let dragControls = new THREE.DragControls(meshes, camera, canvas);

    if (touchScreen) {
      window.addEventListener('touchstart', setPickPosition);
      window.addEventListener('touchmove', setPickPosition);
      window.addEventListener('touchend', clearPickPosition);
      window.addEventListener('touchcancel', clearPickPosition);
      dragControls.addEventListener('drag', () => dragStart = true);
    } else {
      window.addEventListener('click', setPickPosition);
      window.addEventListener('mousemove', setPickPosition);
      window.addEventListener('mouseover', setPickPosition);
      window.addEventListener('mouseout', clearPickPosition);
      window.addEventListener('mouseleave', clearPickPosition);
      dragControls.addEventListener('dragstart', () => dragStart = true);
    }

    dragControls.addEventListener('dragend', () => {
      dragStart = false;
      clearPickPosition();
    });

    const update = time => {
      render();
      if (picked) updatePhysics();
      time *= 0.001;
      cameraPole.rotation.y = time * .1;
      pick(pickPosition, scene, camera, time);

      requestAnimationFrame(update);
    };

    update();

    const onIncorrectRendererSize = () => {
      const incorrectSize = canvas.width !== window.innerWidth || canvas.height !== window.innerHeight;
      if (incorrectSize) onWindowResize();
    };

    physicsSelectionContainer.addEventListener('click', onPhysicsSelectionContainerClicked);
    restartBtn.addEventListener('click', onRestartBtnClicked);
    selectElem.addEventListener('change', onSelectElemChanged);

    function onPhysicsSelectionContainerClicked(e) {
      text = e.target.textContent;

      Array.from(e.target.parentNode.children).forEach(child => child.classList.remove('selected'));
      e.target.classList.add('selected');

      world.defaultContactMaterial.contactEquationStiffness = text.includes('Low') ? 1e3 : text.includes('Normal') ? 5e6 : 1e5;
      world.defaultContactMaterial.contactEquationRelaxation = text.includes('Low') ? 16 : 4;
    }

    function onRestartBtnClicked(e) {
      meshes.forEach(mesh => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        mesh = undefined;
      });

      bodies.forEach(body => {
        world.remove(body);
        body.shapes = [];
        body = undefined;
      });

      meshes.splice(0, meshes.length);
      bodies.splice(0, bodies.length);

      addJengaBlocks();
      dragControls = new THREE.DragControls(meshes, camera, canvas);

      picked = false;
    }

    function onSelectElemChanged(e) {
      numberOfBlocks = +e.target.value;
    }

    const timer = setInterval(() => {
      onIncorrectRendererSize();
      progressElem.style.transform = 'scaleX(' + progress / total + ')';
      if (total === 93 && progress === 93) {
        clearInterval(timer);
        setTimeout(() => mainContainer.classList.add('run-hide-animation'), 250);
        setTimeout(() => mainContainer.remove(), 710);
        setTimeout(() => {
          stats = new Stats();
          document.body.append(stats.dom);
        }, 1000);
      }
    }, 0);
  }