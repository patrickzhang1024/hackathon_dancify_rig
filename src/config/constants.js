// Song and choreography taxonomies.
// Pure JS, no THREE dependency, so it can run in a browser or Node.
window.DANCE = window.DANCE || {};

DANCE.constants = (function () {
  // genre -> dance_genre subset (from feasibility.md).
  const GENRE_TO_DANCE = {
    pop: ['commercial_kpop', 'jazz_funk'],
    kpop: ['commercial_kpop', 'jazz_funk'],
    hiphop: ['street_hiphop', 'popping'],
    rap: ['street_hiphop', 'popping'],
    trap: ['street_hiphop', 'popping'],
    edm: ['shuffle', 'house_dance'],
    house: ['shuffle', 'house_dance'],
    rnb: ['contemporary', 'lyrical'],
    ballad: ['contemporary', 'lyrical'],
    latin: ['freestyle'],
    rock: ['freestyle'],
    classical: ['contemporary']
  };

  // Demo song structure. Stands in for Theme 1's CriteriaReport output so the
  // release test runs without audio analysis. bpm + labelled sections.
  const DEMO_SONG = {
    title: 'Demo Track (120 BPM)',
    bpm: 120,
    beatsPerBar: 4,
    sections: [
      { label: 'intro', bars: 4, energy: 'low' },
      { label: 'verse', bars: 8, energy: 'medium' },
      { label: 'chorus', bars: 8, energy: 'high' },
      { label: 'verse', bars: 8, energy: 'medium' },
      { label: 'chorus', bars: 8, energy: 'high' },
      { label: 'bridge', bars: 4, energy: 'medium' },
      { label: 'chorus', bars: 8, energy: 'high' },
      { label: 'outro', bars: 4, energy: 'low' }
    ]
  };

  const DANCE_GENRES = [
    'street_hiphop', 'popping', 'house_dance', 'shuffle',
    'jazz_funk', 'commercial_kpop', 'contemporary', 'lyrical', 'freestyle'
  ];

  return { GENRE_TO_DANCE, DEMO_SONG, DANCE_GENRES };
})();
