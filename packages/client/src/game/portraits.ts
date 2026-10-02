// Character "photos" and item pictures: the low-poly models rendered once to
// images, so sheets and HUD show the same things as the game.

import * as THREE from 'three';
import { ITEM_ORDER, type ItemId } from '@afloat/shared/content/items';
import { ROLE_ORDER, type RoleId } from '@afloat/shared/content/roles';
import { CrewFigure } from './crew';
import { buildItemModel } from './itemModels';
import type { Materials } from './materials';
import { STYLE } from './styles';

/** `full`: half body for the character sheet. `face`: close-up for small thumbnails. */
export type Portraits = Record<RoleId, { full: string; face: string }>;
export type ItemImages = Record<ItemId, string>;

function studio(size: number) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xc8d4e0, 0x202428, 1.4));
  const key = new THREE.DirectionalLight(0xffe2c0, 2.6);
  key.position.set(1.5, 2.5, 2.5);
  const rim = new THREE.DirectionalLight(0xff5a40, 2.2);
  rim.position.set(-2, 1.5, -1.5);
  scene.add(key, rim);
  return { renderer, scene };
}

export function renderPortraits(materials: Materials, size = 256): Portraits {
  const { renderer, scene } = studio(size);
  const full = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  full.position.set(0.55, 1.15, 2.1);
  full.lookAt(0, 0.82, 0);
  const face = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  face.position.set(0.35, 1.12, 1.2);
  face.lookAt(0, 0.95, 0);

  const out = {} as Portraits;
  for (const role of ROLE_ORDER) {
    const fig = new CrewFigure(role, materials, STYLE);
    fig.hideTorch();
    // The studio lights the figure; its own lights would wash out the face.
    fig.root.traverse((o) => ((o as THREE.Light).isLight ? ((o as THREE.Light).intensity = 0) : null));
    fig.update(0, 0);
    fig.root.rotation.y = 0.25;
    scene.add(fig.root);
    renderer.render(scene, full);
    const fullUrl = renderer.domElement.toDataURL('image/png');
    renderer.render(scene, face);
    out[role] = { full: fullUrl, face: renderer.domElement.toDataURL('image/png') };
    scene.remove(fig.root);
  }
  renderer.dispose();
  return out;
}

export function renderItemImages(materials: Materials, size = 256): ItemImages {
  const { renderer, scene } = studio(size);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  const out = {} as ItemImages;
  for (const id of ITEM_ORDER) {
    const model = buildItemModel(id, materials);
    // Frame each model: centre it and pull the camera back to fit its size.
    const box = new THREE.Box3().setFromObject(model);
    const centre = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    model.position.sub(centre);
    const dist = radius / Math.tan(THREE.MathUtils.degToRad(15)) * 1.1;
    camera.position.set(dist * 0.45, dist * 0.45, dist * 0.77);
    camera.lookAt(0, 0, 0);
    scene.add(model);
    renderer.render(scene, camera);
    out[id] = renderer.domElement.toDataURL('image/png');
    scene.remove(model);
  }
  renderer.dispose();
  return out;
}
