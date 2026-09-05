// Random seeds -> deterministic CreativeBrief (feasibility S4).
// crypto RNG for the seed strings; deterministic hash PRNG for the brief so the
// same seed always yields the same choreography.
window.DANCE = window.DANCE || {};

DANCE.seeds = (function () {
  // Cryptographically-random short strings.
  function randomStrings(n) {
    const out = [];
    const buf = new Uint32Array(2);
    for (let i = 0; i < n; i++) {
      crypto.getRandomValues(buf);
      out.push((buf[0].toString(36) + buf[1].toString(36)).slice(0, 10));
    }
    return out;
  }

  // xmur3 string hash -> 32-bit seed generator.
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  // mulberry32 PRNG -> floats in [0,1).
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  // Deterministic seed string -> CreativeBrief.
  function seedToBrief(seed) {
    const C = DANCE.constants;
    const seeder = xmur3(seed);
    const rng = mulberry32(seeder());
    const energyLevels = ['calm', 'medium', 'hype'];
    const spatials = ['centered', 'traveling', 'expansive'];
    const complexities = ['simple', 'moderate', 'busy'];

    const dance_genre = pick(rng, C.DANCE_GENRES);
    const energy_bias = pick(rng, energyLevels);
    const spatial_style = pick(rng, spatials);
    const complexity = pick(rng, complexities);
    // 0 = mostly standing, 1 = frequent sit/floor/jump excursions.
    const body_state_bias = Math.round(rng() * 100) / 100;

    return {
      seed,
      dance_genre,
      energy_bias,
      complexity,
      spatial_style,
      body_state_bias,
      signature_moves: [],
      rngSeed: seeder() // stable int seed for the choreographer's PRNG
    };
  }

  return { randomStrings, xmur3, mulberry32, seedToBrief };
})();
