// Minimal orbit camera (drag to rotate, wheel to zoom).
// ponytail: ~40 lines instead of pulling the OrbitControls addon, which is
// ESM-only in three r160 and would force a bundler/import-map.
window.DANCE = window.DANCE || {};

DANCE.attachOrbit = function attachOrbit(camera, dom, target) {
  const t = target || new window.THREE.Vector3(0, 1, 0);
  let radius = camera.position.distanceTo(t) || 4;
  let theta = Math.atan2(camera.position.x - t.x, camera.position.z - t.z);
  let phi = Math.acos(Math.min(1, Math.max(-1, (camera.position.y - t.y) / radius)));
  let dragging = false, lastX = 0, lastY = 0;

  const clampPhi = () => { phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi)); };

  dom.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointerup', (e) => {
    dragging = false;
    try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
  });
  dom.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    theta -= (e.clientX - lastX) * 0.008;
    phi -= (e.clientY - lastY) * 0.008;
    clampPhi();
    lastX = e.clientX; lastY = e.clientY;
  });
  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    radius = Math.max(1.6, Math.min(9, radius * (1 + Math.sign(e.deltaY) * 0.1)));
  }, { passive: false });

  function update() {
    const sp = Math.sin(phi);
    camera.position.set(
      t.x + radius * sp * Math.sin(theta),
      t.y + radius * Math.cos(phi),
      t.z + radius * sp * Math.cos(theta)
    );
    camera.lookAt(t);
  }
  update();
  return { update, target: t };
};
