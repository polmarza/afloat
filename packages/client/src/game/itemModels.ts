// Low-poly models of the items, used to render their pictures.

import * as THREE from 'three';
import type { ItemId } from '@afloat/shared/content/items';
import type { Materials } from './materials';

const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
};

export function buildItemModel(id: ItemId, m: Materials): THREE.Group {
  const g = new THREE.Group();
  const red = m.color(0xd22b2b);
  switch (id) {
    case 'bandage': {
      const roll = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.32, 16), m.white);
      roll.rotation.z = Math.PI / 2;
      g.add(roll);
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.33, 10), m.color(0xb8b2a4)).rotateZ(Math.PI / 2));
      const tail = mesh(new THREE.BoxGeometry(0.3, 0.02, 0.4), m.white, 0, -0.27, 0.3);
      g.add(tail);
      break;
    }
    case 'medkit': {
      g.add(mesh(new THREE.BoxGeometry(0.7, 0.45, 0.28), m.white));
      g.add(mesh(new THREE.BoxGeometry(0.3, 0.08, 0.02), red, 0, 0, 0.15));
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.3, 0.02), red, 0, 0, 0.15));
      g.add(mesh(new THREE.BoxGeometry(0.3, 0.06, 0.08), m.darkMetal, 0, 0.27, 0));
      break;
    }
    case 'wrench': {
      g.add(mesh(new THREE.BoxGeometry(0.12, 0.8, 0.05), m.metal));
      const head = mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 12, Math.PI * 1.5), m.metal, 0, 0.45, 0);
      head.rotation.z = -Math.PI / 4;
      g.add(head);
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.3, 0.06), red, 0, -0.25, 0));
      g.rotation.z = -0.6;
      break;
    }
    case 'crowbar': {
      g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8), red));
      const hook = mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 10, Math.PI), red, 0.1, 0.47, 0);
      g.add(hook);
      const tip = mesh(new THREE.BoxGeometry(0.12, 0.03, 0.05), m.metal, 0.06, -0.48, 0);
      tip.rotation.z = 0.4;
      g.add(tip);
      g.rotation.z = -0.7;
      break;
    }
    case 'laptop': {
      g.add(mesh(new THREE.BoxGeometry(0.75, 0.04, 0.5), m.darkMetal));
      const lid = new THREE.Group();
      lid.position.set(0, 0.02, -0.25);
      lid.rotation.x = -1.2;
      lid.add(mesh(new THREE.BoxGeometry(0.75, 0.5, 0.03), m.darkMetal, 0, 0.25, 0));
      lid.add(mesh(new THREE.PlaneGeometry(0.66, 0.4), m.emissive(0x5dffb0, 1.4), 0, 0.25, 0.02));
      g.add(lid);
      g.rotation.x = 0.35;
      break;
    }
    case 'access_card': {
      g.add(mesh(new THREE.BoxGeometry(0.62, 0.4, 0.02), m.color(0xe0b030)));
      g.add(mesh(new THREE.BoxGeometry(0.62, 0.07, 0.025), m.darkMetal, 0, 0.1, 0));
      g.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 0.03), m.color(0xc9a24a), -0.18, -0.06, 0));
      g.rotation.set(0.2, -0.3, 0.15);
      break;
    }
    case 'oxygen_tank': {
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 14), m.color(0x2f8fc0)));
      g.add(mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.color(0x2f8fc0), 0, 0.4, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), m.metal, 0, 0.64, 0));
      g.add(mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 10), m.rust, 0, 0.71, 0).rotateX(Math.PI / 2));
      g.add(mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.08, 14), m.white, 0, 0.1, 0));
      break;
    }
    case 'diving_suit': {
      const brass = m.color(0xb8863a);
      g.add(mesh(new THREE.SphereGeometry(0.38, 16, 12), brass));
      g.add(mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.18, 16), brass, 0, -0.38, 0));
      const port = mesh(new THREE.CircleGeometry(0.17, 16), m.emissive(0x7fd4ff, 0.6), 0, 0.02, 0.37);
      g.add(port);
      g.add(mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 16), brass, 0, 0.02, 0.36));
      break;
    }
    case 'cigarettes': {
      g.add(mesh(new THREE.BoxGeometry(0.34, 0.5, 0.14), red));
      g.add(mesh(new THREE.BoxGeometry(0.35, 0.16, 0.145), m.white, 0, 0.17, 0));
      for (const x of [-0.08, 0.04]) {
        g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), m.white, x, 0.32 + (x > 0 ? 0.04 : 0), 0));
        g.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.05, 8), m.color(0xd98a3a), x, 0.42 + (x > 0 ? 0.04 : 0), 0));
      }
      g.rotation.z = 0.15;
      break;
    }
  }
  return g;
}
