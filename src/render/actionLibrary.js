// Reusable full-body action primitives for ActionScript choreography plans.
// frequency is cycles per beat; duration is repetitions / frequency beats.
window.DANCE = window.DANCE || {};

DANCE.actionLibrary = (function () {
  const TAU = Math.PI * 2;
  const CORE_GROUPS = ['hands', 'legs', 'waist', 'neck', 'arms'];
  const GROUPS = ['fullBody', ...CORE_GROUPS];
  const round3 = (value) => Math.round(value * 1000) / 1000;
  const pulse = (phase) => (1 - Math.cos(TAU * phase)) * 0.5;
  const wave = (phase) => Math.sin(TAU * phase);
  const accent = (phase, center, width) => {
    const distance = Math.min(Math.abs(phase - center), 1 - Math.abs(phase - center));
    const linear = Math.max(0, 1 - distance / (width || 0.2));
    return linear * linear * (3 - 2 * linear);
  };
  const cycle = (phase, values) => {
    const scaled = ((phase % 1) + 1) % 1 * values.length;
    const index = Math.floor(scaled) % values.length;
    const progress = scaled - Math.floor(scaled);
    const smooth = progress * progress * (3 - 2 * progress);
    return values[index] + (values[(index + 1) % values.length] - values[index]) * smooth;
  };

  function rotations(values) {
    return { rotations: values };
  }

  const DEFINITIONS = {
    wristFlick: {
      group: 'hands', label: 'alternating wrist flicks',
      sample: (phase, intensity) => rotations({
        handL: [0, 0, 0.28 * wave(phase) * intensity],
        handR: [0, 0, -0.28 * wave(phase) * intensity]
      })
    },
    fistPulse: {
      group: 'hands', label: 'close and release both hands',
      sample: (phase, intensity) => {
        const values = {};
        const curl = 1.05 * pulse(phase) * intensity;
        for (const side of DANCE.motionScript.SIDES) {
          for (const finger of DANCE.motionScript.FINGERS) {
            const name = finger.toLowerCase();
            values[name + 'Proximal' + side] = [curl, 0, 0];
            values[name + 'Intermediate' + side] = [curl * 0.9, 0, 0];
            values[name + 'Distal' + side] = [curl * 0.65, 0, 0];
          }
        }
        return rotations(values);
      }
    },
    fingerRipple: {
      group: 'hands', label: 'ripple through the fingers',
      sample: (phase, intensity) => {
        const values = {};
        for (const side of DANCE.motionScript.SIDES) {
          DANCE.motionScript.FINGERS.forEach((finger, index) => {
            const name = finger.toLowerCase();
            const curl = 0.75 * pulse((phase + index * 0.12) % 1) * intensity;
            values[name + 'Proximal' + side] = [curl, 0, 0];
            values[name + 'Intermediate' + side] = [curl, 0, 0];
            values[name + 'Distal' + side] = [curl * 0.6, 0, 0];
          });
        }
        return rotations(values);
      }
    },
    stepTouch: {
      group: 'legs', label: 'alternating grounded step-touch',
      sample: (phase, intensity) => {
        const swing = wave(phase);
        const left = Math.max(0, swing) * intensity;
        const right = Math.max(0, -swing) * intensity;
        return rotations({
          upperLegL: [0.42 * left, 0, 0.1 * swing * intensity],
          lowerLegL: [0.5 * left, 0, 0], footL: [0.18 * left, 0, 0],
          upperLegR: [0.42 * right, 0, 0.1 * swing * intensity],
          lowerLegR: [0.5 * right, 0, 0], footR: [0.18 * right, 0, 0]
        });
      }
    },
    kneeLift: {
      group: 'legs', label: 'alternating knee lifts',
      sample: (phase, intensity) => {
        const swing = wave(phase);
        const left = Math.max(0, swing) * intensity;
        const right = Math.max(0, -swing) * intensity;
        return rotations({
          upperLegL: [0.9 * left, 0, 0], lowerLegL: [1.0 * left, 0, 0],
          upperLegR: [0.9 * right, 0, 0], lowerLegR: [1.0 * right, 0, 0]
        });
      }
    },
    squatPulse: {
      group: 'legs', label: 'grounded squat pulses',
      sample: (phase, intensity) => {
        const bend = pulse(phase) * intensity;
        return rotations({
          upperLegL: [0.48 * bend, 0, 0.08 * bend], lowerLegL: [0.62 * bend, 0, 0],
          upperLegR: [0.48 * bend, 0, -0.08 * bend], lowerLegR: [0.62 * bend, 0, 0]
        });
      }
    },
    kickStep: {
      group: 'legs', label: 'alternating compact kicks',
      sample: (phase, intensity) => {
        const swing = wave(phase);
        const left = Math.max(0, swing) * intensity;
        const right = Math.max(0, -swing) * intensity;
        return rotations({
          upperLegL: [0.62 * left, 0, 0], lowerLegL: [0.25 * left, 0, 0], footL: [-0.35 * left, 0, 0],
          upperLegR: [0.62 * right, 0, 0], lowerLegR: [0.25 * right, 0, 0], footR: [-0.35 * right, 0, 0]
        });
      }
    },
    hipSway: {
      group: 'waist', label: 'side-to-side hip sway',
      sample: (phase, intensity) => {
        const sway = wave(phase) * intensity;
        return {
          rotations: { hips: [0, 0.3 * sway, 0.16 * sway], spine: [0, -0.15 * sway, -0.08 * sway] },
          position: [0.08 * sway, 0, 0]
        };
      }
    },
    hipRoll: {
      group: 'waist', label: 'circular hip roll',
      sample: (phase, intensity) => {
        const side = wave(phase) * intensity;
        const depth = (Math.cos(TAU * phase) - 1) * intensity;
        return {
          rotations: { hips: [0.1 * depth, 0.28 * side, 0.16 * side], spine: [-0.06 * depth, -0.12 * side, 0] },
          position: [0.06 * side, 0, 0.035 * depth]
        };
      }
    },
    bodyBounce: {
      group: 'waist', label: 'vertical body bounce',
      sample: (phase, intensity) => {
        const bend = pulse(phase) * intensity;
        return {
          rotations: { hips: [0.16 * bend, 0, 0], spine: [-0.08 * bend, 0, 0], spine2: [-0.06 * bend, 0, 0] },
          position: [0, -0.1 * bend, 0]
        };
      }
    },
    torsoTwist: {
      group: 'waist', label: 'opposed waist and torso twist',
      sample: (phase, intensity) => {
        const twist = wave(phase) * intensity;
        return rotations({ hips: [0, 0.2 * twist, 0], spine: [0, -0.2 * twist, 0], spine2: [0, -0.18 * twist, 0] });
      }
    },
    headNod: {
      group: 'neck', label: 'head nod accents',
      sample: (phase, intensity) => rotations({ neck: [0.16 * wave(phase) * intensity, 0, 0], head: [0.12 * wave(phase) * intensity, 0, 0] })
    },
    headLook: {
      group: 'neck', label: 'look left and right',
      sample: (phase, intensity) => rotations({ neck: [0, 0.28 * wave(phase) * intensity, 0], head: [0, 0.2 * wave(phase) * intensity, 0] })
    },
    neckRoll: {
      group: 'neck', label: 'small controlled neck circle',
      sample: (phase, intensity) => rotations({
        neck: [0.1 * wave(phase) * intensity, 0, 0.1 * (Math.cos(TAU * phase) - 1) * intensity],
        head: [0.08 * wave(phase) * intensity, 0, 0.08 * (Math.cos(TAU * phase) - 1) * intensity]
      })
    },
    headAccent: {
      group: 'neck', label: 'short head-and-chest accent',
      sample: (phase, intensity) => {
        const hit = pulse(phase) * intensity;
        return rotations({ neck: [-0.15 * hit, 0, 0], head: [0.18 * hit, 0, 0] });
      }
    },
    armSwing: {
      group: 'arms', label: 'alternating arm swings',
      sample: (phase, intensity) => {
        const swing = wave(phase) * intensity;
        return rotations({
          upperArmL: [0.95 * swing, 0, 0.22], lowerArmL: [0.45 * pulse(phase), 0, 0],
          upperArmR: [-0.95 * swing, 0, -0.22], lowerArmR: [0.45 * pulse(phase), 0, 0]
        });
      }
    },
    armWave: {
      group: 'arms', label: 'two-arm wave',
      sample: (phase, intensity) => {
        const lift = pulse(phase) * intensity;
        const ripple = pulse((phase + 0.2) % 1) * intensity;
        return rotations({
          upperArmL: [1.15 * lift, 0, 0.55 * lift], lowerArmL: [0.9 * ripple, 0, 0],
          upperArmR: [-1.15 * lift, 0, -0.55 * lift], lowerArmR: [0.9 * ripple, 0, 0]
        });
      }
    },
    reachUp: {
      group: 'arms', label: 'both arms reach overhead',
      sample: (phase, intensity) => {
        const lift = pulse(phase) * intensity;
        return rotations({
          upperArmL: [1.5 * lift, 0, 0.38 * lift], lowerArmL: [0.28 * lift, 0, 0],
          upperArmR: [-1.5 * lift, 0, -0.38 * lift], lowerArmR: [0.28 * lift, 0, 0]
        });
      }
    },
    openClose: {
      group: 'arms', label: 'open and close the arms',
      sample: (phase, intensity) => {
        const open = pulse(phase) * intensity;
        return rotations({
          upperArmL: [0.35 * open, 0, 1.15 * open], lowerArmL: [0.2 * open, 0, 0],
          upperArmR: [-0.35 * open, 0, -1.15 * open], lowerArmR: [0.2 * open, 0, 0]
        });
      }
    },
    crossPunch: {
      group: 'arms', label: 'alternating cross-body punches',
      sample: (phase, intensity) => {
        const swing = wave(phase);
        const left = Math.max(0, swing) * intensity;
        const right = Math.max(0, -swing) * intensity;
        return rotations({
          upperArmL: [1.25 * left, 0.35 * left, 0], lowerArmL: [0.15 * left, 0, 0],
          upperArmR: [-1.25 * right, -0.35 * right, 0], lowerArmR: [0.15 * right, 0, 0]
        });
      }
    },
    twoStepGroove: {
      group: 'fullBody', label: 'side-to-side two-step groove',
      mechanics: 'Travel side to side with a grounded weight shift, soft knee bounce, counter-swinging arms, and torso opposition.',
      styles: ['street_hiphop', 'commercial_kpop', 'reggae_dance', 'folk_dance', 'freestyle'],
      sample: (phase, intensity) => {
        const side = wave(phase) * intensity;
        const left = Math.max(0, side);
        const right = Math.max(0, -side);
        const bounce = pulse(phase * 2) * intensity;
        return {
          rotations: {
            hips: [0.08 * bounce, 0.12 * side, 0.12 * side], spine: [-0.05 * bounce, -0.1 * side, -0.08 * side],
            upperLegL: [0.18 * left + 0.1 * bounce, 0, 0.16 * left], lowerLegL: [0.24 * left + 0.16 * bounce, 0, 0],
            upperLegR: [0.18 * right + 0.1 * bounce, 0, 0.16 * side], lowerLegR: [0.24 * right + 0.16 * bounce, 0, 0],
            upperArmL: [-0.5 * side, 0, 0.28], lowerArmL: [0.4 * right, 0, 0],
            upperArmR: [-0.5 * side, 0, -0.28], lowerArmR: [0.4 * left, 0, 0]
          },
          position: [0.14 * side, -0.04 * bounce, 0]
        };
      }
    },
    runningMan: {
      group: 'fullBody', label: 'running man with arm drive',
      mechanics: 'Alternate lifted knees with a backward sliding support foot while the arms pump opposite the legs.',
      styles: ['street_hiphop', 'shuffle', 'commercial_kpop', 'freestyle'],
      sample: (phase, intensity) => {
        const left = accent(phase, 0.25, 0.24) * intensity;
        const right = accent(phase, 0.75, 0.24) * intensity;
        const drive = left - right;
        return {
          rotations: {
            hips: [0.12 * (left + right), 0, 0], spine: [-0.08 * (left + right), 0, 0],
            upperLegL: [0.9 * left - 0.28 * right, 0, 0], lowerLegL: [1.05 * left + 0.18 * right, 0, 0], footL: [-0.28 * left, 0, 0],
            upperLegR: [0.9 * right - 0.28 * left, 0, 0], lowerLegR: [1.05 * right + 0.18 * left, 0, 0], footR: [-0.28 * right, 0, 0],
            upperArmL: [-0.75 * drive, 0, 0.18], lowerArmL: [0.8 * right, 0, 0],
            upperArmR: [-0.75 * drive, 0, -0.18], lowerArmR: [0.8 * left, 0, 0]
          },
          position: [0, -0.05 * (left + right), -0.1 * pulse(phase * 2) * intensity]
        };
      }
    },
    charlestonBasic: {
      group: 'fullBody', label: 'solo Charleston kick-step',
      mechanics: 'Use walking-like forward and back kick-steps with opposite shoulder-driven arm swings and buoyant weight changes.',
      styles: ['jazz_funk', 'folk_dance', 'freestyle'],
      sample: (phase, intensity) => {
        const leftLeg = cycle(phase, [0, 0.72, 0, -0.38]) * intensity;
        const rightLeg = cycle(phase, [0, -0.38, 0, 0.72]) * intensity;
        const bounce = pulse(phase * 2) * intensity;
        return {
          rotations: {
            hips: [0.05 * bounce, 0, 0], spine: [-0.06 * bounce, 0, 0],
            upperLegL: [leftLeg, 0, 0], lowerLegL: [Math.max(0, leftLeg) * 0.58, 0, 0], footL: [-0.3 * leftLeg, 0, 0],
            upperLegR: [rightLeg, 0, 0], lowerLegR: [Math.max(0, rightLeg) * 0.58, 0, 0], footR: [-0.3 * rightLeg, 0, 0],
            upperArmL: [-0.85 * rightLeg, 0, 0.22], lowerArmL: [0.35 * Math.abs(rightLeg), 0, 0],
            upperArmR: [0.85 * leftLeg, 0, -0.22], lowerArmR: [0.35 * Math.abs(leftLeg), 0, 0]
          },
          position: [0, -0.035 * bounce, 0.06 * wave(phase) * intensity]
        };
      }
    },
    grapevine: {
      group: 'fullBody', label: 'traveling grapevine cross-step',
      mechanics: 'Step sideways, cross behind, step sideways, and tap; mirror the pathway back with a slight dip on each cross.',
      styles: ['house_dance', 'jazz_funk', 'folk_dance', 'commercial_kpop', 'freestyle'],
      sample: (phase, intensity) => {
        const side = cycle(phase, [0, 1, 0, -1]) * intensity;
        const crossL = accent(phase, 0.38, 0.15) * intensity;
        const crossR = accent(phase, 0.88, 0.15) * intensity;
        const dip = (crossL + crossR) * 0.7;
        return {
          rotations: {
            hips: [0.08 * dip, 0.15 * side, 0.1 * side], spine: [-0.05 * dip, -0.12 * side, -0.06 * side],
            upperLegL: [0.2 * crossL, -0.5 * crossL, 0.32 * side], lowerLegL: [0.38 * crossL, 0, 0],
            upperLegR: [0.2 * crossR, 0.5 * crossR, 0.32 * side], lowerLegR: [0.38 * crossR, 0, 0],
            upperArmL: [-0.38 * side, 0, 0.5], upperArmR: [-0.38 * side, 0, -0.5]
          },
          position: [0.28 * side, -0.055 * dip, 0]
        };
      }
    },
    jazzSquare: {
      group: 'fullBody', label: 'four-corner jazz square',
      mechanics: 'Cross one foot over, step back, open sideways, and close forward while the torso presents each corner.',
      styles: ['jazz_funk', 'commercial_kpop', 'ballet', 'lyrical', 'freestyle'],
      sample: (phase, intensity) => {
        const cornerX = cycle(phase, [0, -0.12, 0.12, 0.12]) * intensity;
        const cornerZ = cycle(phase, [0, 0.12, 0.16, 0]) * intensity;
        const crossL = accent(phase, 0.18, 0.16) * intensity;
        const crossR = accent(phase, 0.68, 0.16) * intensity;
        const present = cycle(phase, [0.3, -0.3, -0.2, 0.2]) * intensity;
        return {
          rotations: {
            hips: [0, 0.18 * present, 0.1 * present], spine: [0, -0.12 * present, -0.07 * present],
            upperLegL: [0.32 * crossL, -0.42 * crossL, 0.18 * present], lowerLegL: [0.45 * crossL, 0, 0],
            upperLegR: [0.32 * crossR, 0.42 * crossR, 0.18 * present], lowerLegR: [0.45 * crossR, 0, 0],
            upperArmL: [0.22 * present, 0, 0.5], upperArmR: [0.22 * present, 0, -0.5]
          },
          position: [cornerX, -0.025 * pulse(phase * 4) * intensity, cornerZ]
        };
      }
    },
    bodyRoll: {
      group: 'fullBody', label: 'head-to-hips body roll',
      mechanics: 'Send a continuous wave from the chest through the spine and pelvis, supported by a knee bend and recovery.',
      styles: ['popping', 'jazz_funk', 'commercial_kpop', 'reggae_dance', 'contemporary', 'lyrical', 'freestyle'],
      sample: (phase, intensity) => {
        const chest = wave(phase) * intensity;
        const middle = wave((phase + 0.16) % 1) * intensity;
        const pelvis = wave((phase + 0.32) % 1) * intensity;
        const bend = pulse((phase + 0.32) % 1) * intensity;
        return {
          rotations: {
            head: [-0.14 * chest, 0, 0], neck: [-0.13 * chest, 0, 0],
            spine2: [-0.28 * chest, 0, 0], spine1: [-0.25 * middle, 0, 0], spine: [-0.22 * pelvis, 0, 0],
            hips: [0.2 * pelvis, 0, 0], upperLegL: [0.2 * bend, 0, 0], lowerLegL: [0.34 * bend, 0, 0],
            upperLegR: [0.2 * bend, 0, 0], lowerLegR: [0.34 * bend, 0, 0],
            upperArmL: [0.12 * middle, 0, 0.38], upperArmR: [-0.12 * middle, 0, -0.38]
          },
          position: [0, -0.055 * bend, 0.055 * pelvis]
        };
      }
    },
    salsaBasic: {
      group: 'fullBody', label: 'forward-back salsa basic',
      mechanics: 'Transfer weight forward and back with alternating knee release, responsive hips, lifted torso, and a compact dance frame.',
      styles: ['reggae_dance', 'jazz_funk', 'commercial_kpop', 'folk_dance', 'freestyle'],
      sample: (phase, intensity) => {
        const transfer = wave(phase) * intensity;
        const left = Math.max(0, transfer);
        const right = Math.max(0, -transfer);
        return {
          rotations: {
            hips: [0, 0.2 * transfer, 0.2 * transfer], spine: [0, -0.12 * transfer, -0.1 * transfer],
            upperLegL: [0.32 * left, 0, 0.08 * transfer], lowerLegL: [0.32 * left, 0, 0],
            upperLegR: [0.32 * right, 0, 0.08 * transfer], lowerLegR: [0.32 * right, 0, 0],
            upperArmL: [0.18 * transfer, 0, 0.55], lowerArmL: [0.72, 0, 0],
            upperArmR: [0.18 * transfer, 0, -0.55], lowerArmR: [0.72, 0, 0]
          },
          position: [0.045 * transfer, -0.025 * pulse(phase * 2) * intensity, 0.13 * transfer]
        };
      }
    },
    pivotQuarterTurn: {
      group: 'fullBody', label: 'quarter-turn pivot and return',
      mechanics: 'Plant the supporting foot, rotate the whole body to a side profile, spot the head, then unwind to face front.',
      styles: ['house_dance', 'jazz_funk', 'commercial_kpop', 'ballet', 'contemporary', 'lyrical', 'freestyle'],
      sample: (phase, intensity) => {
        const turn = Math.PI * 0.5 * pulse(phase) * Math.min(1, intensity);
        const bend = pulse(phase * 2) * intensity;
        return {
          rotations: {
            hips: [0.05 * bend, 0, 0], spine: [-0.04 * bend, 0, 0], head: [0, -0.38 * wave(phase) * intensity, 0],
            upperLegL: [0.16 * bend, 0.35 * pulse(phase) * intensity, 0], lowerLegL: [0.28 * bend, 0, 0], footL: [0, 0.22 * pulse(phase) * intensity, 0],
            upperLegR: [0.16 * bend, -0.35 * pulse(phase) * intensity, 0], lowerLegR: [0.28 * bend, 0, 0], footR: [0, -0.22 * pulse(phase) * intensity, 0],
            upperArmL: [0.25 * pulse(phase) * intensity, 0, 0.75], upperArmR: [-0.25 * pulse(phase) * intensity, 0, -0.75]
          },
          position: [0.07 * wave(phase) * intensity, -0.025 * bend, 0],
          facing: turn
        };
      }
    },
    halfTurnStep: {
      group: 'fullBody', label: 'half-turn step and unwind',
      mechanics: 'Step through a supported 180-degree whole-body turn, open the arms for balance, then unwind through the opposite foot.',
      styles: ['street_hiphop', 'house_dance', 'jazz_funk', 'commercial_kpop', 'ballet', 'contemporary', 'lyrical', 'folk_dance', 'freestyle'],
      sample: (phase, intensity) => {
        const turn = Math.PI * pulse(phase) * Math.min(1, intensity);
        const step = pulse(phase * 2) * intensity;
        return {
          rotations: {
            hips: [0.07 * step, 0, 0], spine: [-0.05 * step, 0, 0], neck: [0, -0.32 * wave(phase) * intensity, 0],
            upperLegL: [0.32 * accent(phase, 0.2, 0.18) * intensity, 0.25 * pulse(phase) * intensity, 0],
            lowerLegL: [0.45 * accent(phase, 0.2, 0.18) * intensity, 0, 0],
            upperLegR: [0.32 * accent(phase, 0.7, 0.18) * intensity, -0.25 * pulse(phase) * intensity, 0],
            lowerLegR: [0.45 * accent(phase, 0.7, 0.18) * intensity, 0, 0],
            upperArmL: [0, 0, 1.05 * pulse(phase) * intensity], upperArmR: [0, 0, -1.05 * pulse(phase) * intensity]
          },
          position: [0, -0.035 * step, 0.1 * wave(phase) * intensity],
          facing: turn
        };
      }
    },
    sideFacingGroove: {
      group: 'fullBody', label: 'alternating side-facing groove',
      mechanics: 'Rotate the whole stance between left and right profiles while stepping wide, leaning into the pathway, and framing the torso.',
      styles: ['street_hiphop', 'popping', 'house_dance', 'shuffle', 'jazz_funk', 'commercial_kpop', 'reggae_dance', 'freestyle'],
      sample: (phase, intensity) => {
        const side = wave(phase);
        const turn = Math.PI * 0.5 * side * Math.min(1, intensity);
        const bend = pulse(phase * 2) * intensity;
        return {
          rotations: {
            hips: [0.08 * bend, 0, 0.12 * side * intensity], spine: [-0.06 * bend, 0, -0.1 * side * intensity],
            upperLegL: [0.18 * bend, 0, 0.3 * side * intensity], lowerLegL: [0.3 * bend, 0, 0],
            upperLegR: [0.18 * bend, 0, 0.3 * side * intensity], lowerLegR: [0.3 * bend, 0, 0],
            upperArmL: [-0.45 * side * intensity, 0, 0.72], lowerArmL: [0.42, 0, 0],
            upperArmR: [-0.45 * side * intensity, 0, -0.72], lowerArmR: [0.42, 0, 0]
          },
          position: [0.12 * side * intensity, -0.045 * bend, 0],
          facing: turn
        };
      }
    }
  };

  function limitKey(joint) {
    const finger = joint.match(/^(thumb|index|middle|ring|little)(Proximal|Intermediate|Distal)/);
    if (finger) return (finger[1] === 'thumb' ? 'thumb' : 'finger') + finger[2];
    if (joint.startsWith('toe')) return 'toe';
    return joint.replace(/[LR]$/, '');
  }

  function clampRotation(joint, value) {
    const limits = DANCE.motionScript.JOINT_LIMITS[limitKey(joint)];
    return value.map((axis, index) => round3(limits
      ? Math.max(limits[index][0], Math.min(limits[index][1], axis))
      : axis));
  }

  function durationOf(action) {
    return action.repetitions / action.frequency;
  }

  function coverageError(actions, totalBeats, group) {
    const intervals = actions
      .filter((action) => DEFINITIONS[action.action].group === group)
      .map((action) => [action.startBeat, action.startBeat + durationOf(action)])
      .sort((a, b) => a[0] - b[0]);
    let coveredUntil = 0;
    for (const interval of intervals) {
      if (interval[0] > coveredUntil + 0.001) return group + ' actions leave a gap at beat ' + round3(coveredUntil);
      coveredUntil = Math.max(coveredUntil, interval[1]);
    }
    return coveredUntil + 0.001 < totalBeats ? group + ' actions end at beat ' + round3(coveredUntil) : null;
  }

  function validate(actions, totalBeats, requireFullCoverage) {
    if (!Array.isArray(actions) || !actions.length) return 'actions must be a non-empty array';
    if (!(totalBeats > 0)) return 'totalBeats must be positive';
    if (actions.length > 1000) return 'too many actions';
    for (const action of actions) {
      if (!action || !DEFINITIONS[action.action]) return 'unknown action "' + (action && action.action) + '"';
      if (!Number.isFinite(action.startBeat) || action.startBeat < 0 || action.startBeat >= totalBeats) {
        return 'each action needs startBeat within the song';
      }
      if (!Number.isFinite(action.frequency) || action.frequency <= 0 || action.frequency > 4) {
        return 'frequency must be within (0, 4] cycles per beat';
      }
      if (!Number.isFinite(action.repetitions) || action.repetitions <= 0 || action.repetitions > 4096) {
        return 'repetitions must be within (0, 4096]';
      }
      if (action.intensity != null && (!Number.isFinite(action.intensity) || action.intensity < 0.5 || action.intensity > 1.5)) {
        return 'intensity must be within [0.5, 1.5]';
      }
      if (action.startBeat + durationOf(action) > totalBeats + 0.001) return action.action + ' extends past the song';
    }
    if (requireFullCoverage) {
      const coverageGroups = GROUPS.filter((group) => group !== 'fullBody' ||
        actions.some((action) => DEFINITIONS[action.action].group === group));
      for (const group of coverageGroups) {
        const error = coverageError(actions, totalBeats, group);
        if (error) return error;
      }
    }
    return null;
  }

  function compile(actions, totalBeats, samplePoints) {
    const error = validate(actions, totalBeats, true);
    if (error) throw new Error('Invalid ActionScript: ' + error);
    const beats = samplePoints || Array.from({ length: Math.floor(totalBeats) + 1 }, (_, beat) => beat);
    if (!beats.length || beats[beats.length - 1] < totalBeats) beats.push(totalBeats);
    const tracks = {};
    for (const joint of DANCE.motionScript.JOINTS) tracks[joint] = { rotation: [] };
    tracks.hips.position = [];
    tracks.hips.facing = [];

    for (const beat of beats) {
      const pose = {};
      for (const joint of DANCE.motionScript.JOINTS) pose[joint] = [0, 0, 0];
      const position = [0, 0, 0];
      let facing = 0;
      for (const action of actions) {
        const duration = durationOf(action);
        if (beat + 0.000001 < action.startBeat || beat >= action.startBeat + duration - 0.000001) continue;
        const localCycles = Math.max(0, beat - action.startBeat) * action.frequency;
        const phase = localCycles - Math.floor(localCycles);
        const sample = DEFINITIONS[action.action].sample(phase, action.intensity == null ? 1 : action.intensity);
        for (const joint in sample.rotations) {
          for (let axis = 0; axis < 3; axis++) pose[joint][axis] += sample.rotations[joint][axis];
        }
        if (sample.position) for (let axis = 0; axis < 3; axis++) position[axis] += sample.position[axis];
        if (sample.facing) facing += sample.facing;
      }
      for (const joint of DANCE.motionScript.JOINTS) {
        tracks[joint].rotation.push({ beat, value: clampRotation(joint, pose[joint]), easing: 'smooth' });
      }
      tracks.hips.position.push({ beat, value: position.map(round3), easing: 'smooth' });
      tracks.hips.facing.push({ beat, value: [round3(facing)], easing: 'smooth' });
    }
    return tracks;
  }

  function list() {
    return Object.keys(DEFINITIONS).map((name) => ({
      name,
      group: DEFINITIONS[name].group,
      label: DEFINITIONS[name].label,
      mechanics: DEFINITIONS[name].mechanics || DEFINITIONS[name].label,
      styles: (DEFINITIONS[name].styles || []).slice()
    }));
  }

  // ---- Section-based ActionScript v3 (compact input the agent ships) ------
  // routines are keyed by section label so repeated sections (e.g. every verse)
  // reuse one dance; each routine action LOOPS across the section duration.

  function expandToActions(script) {
    const actions = [];
    for (const section of script.sections) {
      const routine = script.routines[section.label];
      if (!routine) continue;
      const duration = section.endBeat - section.startBeat;
      for (const action of routine.actions) {
        actions.push({
          startBeat: section.startBeat,
          action: action.action,
          group: action.group,
          frequency: action.frequency,
          repetitions: duration * action.frequency,
          intensity: action.intensity
        });
      }
    }
    return actions;
  }

  function validateScript(script) {
    const errors = [];
    if (!script || script.version !== 3) errors.push('version must be 3');
    if (!script || !(script.bpm > 0)) errors.push('bpm must be positive');
    if (!script || !(script.totalBeats > 0)) errors.push('totalBeats must be positive');
    if (!script || !Array.isArray(script.sections) || !script.sections.length) {
      errors.push('sections must be a non-empty array');
      return { ok: false, errors };
    }
    if (!script.routines || typeof script.routines !== 'object') {
      errors.push('routines must be an object');
      return { ok: false, errors };
    }
    let expected = 0;
    for (const section of script.sections) {
      if (!section || typeof section.label !== 'string' || !section.label.trim()) {
        errors.push('each section needs a label'); break;
      }
      if (!Number.isFinite(section.startBeat) || !Number.isFinite(section.endBeat) ||
          Math.abs(section.startBeat - expected) > 0.001 || section.endBeat <= section.startBeat ||
          section.endBeat > script.totalBeats + 0.001) {
        errors.push('sections must be contiguous, ordered, and within the song'); break;
      }
      if (!script.routines[section.label]) {
        errors.push('missing routine for section "' + section.label + '"'); break;
      }
      expected = section.endBeat;
    }
    if (!errors.length && Math.abs(expected - script.totalBeats) > 0.001) {
      errors.push('sections must cover the whole song');
    }
    for (const label in script.routines) {
      const routine = script.routines[label];
      if (!routine || typeof routine.description !== 'string' || !routine.description.trim()) {
        errors.push('routine "' + label + '" needs a description');
      }
      const actionGroups = routine && Array.isArray(routine.actions)
        ? routine.actions.map((action) => action && action.group) : [];
      const expectedGroups = actionGroups.includes('fullBody') ? GROUPS : CORE_GROUPS;
      if (!routine || !Array.isArray(routine.actions) || routine.actions.length !== expectedGroups.length) {
        errors.push('routine "' + label + '" needs one action per required body group'); continue;
      }
      const seen = new Set();
      for (const action of routine.actions) {
        const definition = action && DEFINITIONS[action.action];
        if (!definition || action.group !== definition.group || seen.has(action.group)) {
          errors.push('routine "' + label + '" has an invalid or duplicate action'); continue;
        }
        if (!Number.isFinite(action.frequency) || action.frequency <= 0 || action.frequency > 4) {
          errors.push('routine "' + label + '" action frequency must be within (0, 4]');
        }
        if (!Number.isFinite(action.intensity) || action.intensity < 0.5 || action.intensity > 1.5) {
          errors.push('routine "' + label + '" action intensity must be within [0.5, 1.5]');
        }
        seen.add(action.group);
      }
      if (expectedGroups.some((group) => !seen.has(group))) {
        errors.push('routine "' + label + '" is missing a required body group');
      }
    }
    return { ok: errors.length === 0, errors };
  }

  // Compile a compact ActionScript v3 into an executable MotionScript v2. The
  // dense per-joint keyframes live only in memory; the shipped v3 stays small.
  function compileScript(script) {
    const check = validateScript(script);
    if (!check.ok) throw new Error('Invalid ActionScript v3: ' + check.errors.join('; '));
    const totalBeats = script.totalBeats;
    const stepBeat = Math.max(1e-3, round3(0.1 * script.bpm / 60)); // ~100ms sampling for smooth playback
    const samples = [];
    for (let beat = 0; beat < totalBeats - 1e-6; beat = round3(beat + stepBeat)) samples.push(beat);
    const compiled = {
      version: 2,
      bpm: script.bpm,
      beatsPerBar: script.beatsPerBar,
      totalBeats,
      markers: script.sections.map((section) => ({ beat: section.startBeat, label: section.label })),
      sections: script.sections,
      tracks: compile(expandToActions(script), totalBeats, samples)
    };
    for (const key of ['seed', 'brief', 'title', 'emotion', 'source']) {
      if (script[key] != null) compiled[key] = script[key];
    }
    return compiled;
  }

  return { GROUPS, list, validate, compile, durationOf, expandToActions, validateScript, compileScript };
})();
