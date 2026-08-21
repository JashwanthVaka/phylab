const g=9.81,c=299792458,h=6.62607015e-34,k=8.9875517923e9,R=8.314462618;
const finite=(...n)=>n.every(Number.isFinite); export const physics={projectile({v,angle,gravity=g,height=0}){const a=angle*Math.PI/180;if(!finite(v,a,gravity,height)||gravity<=0)return null;const vy=v*Math.sin(a),vx=v*Math.cos(a),t=(vy+Math.sqrt(vy**2+2*gravity*height))/gravity;return {time:t,range:vx*t,maxHeight:height+vy**2/(2*gravity),vx,vy}},newton:({force,mass})=>finite(force,mass)&&mass>0?{acceleration:force/mass}:null,energy:({mass,height,velocity,gravity=g})=>finite(mass,height,velocity,gravity)?{ke:.5*mass*velocity**2,gpe:mass*gravity*height,total:.5*mass*velocity**2+mass*gravity*height}:null,shm:({mass,k,amplitude=1})=>finite(mass,k,amplitude)&&mass>0&&k>0?{period:2*Math.PI*Math.sqrt(mass/k),frequency:Math.sqrt(k/mass)/(2*Math.PI),omega:Math.sqrt(k/mass)}:null,coulomb:({q1,q2,r})=>finite(q1,q2,r)&&r>0?{force:k*q1*q2/r**2}:null,magnetic:({B,q,v,angle=90})=>finite(B,q,v,angle)?{force:B*q*v*Math.sin(angle*Math.PI/180)}:null,gas:({n,T,V})=>finite(n,T,V)&&T>0&&V>0?{pressure:n*R*T/V}:null,photon:({f})=>finite(f)&&f>=0?{energy:h*f}:null,decay:({N0,halfLife,time})=>finite(N0,halfLife,time)&&halfLife>0?{remaining:N0*.5**(time/halfLife)}:null,relativity:({v})=>finite(v)&&Math.abs(v)<c?{gamma:1/Math.sqrt(1-v**2/c**2)}:null};

/* ─────────────────────────────────────────────────────────────────────────
   Additional engines, written out rather than minified so the physics can be
   read and checked. Each returns null on input it cannot model, which is what
   the studio uses to report a problem instead of silently clamping a value.
   ───────────────────────────────────────────────────────────────────────── */
const K_B = 1.380649e-23;
const SIGMA = 5.670374419e-8;
const G_CONST = 6.6743e-11;
const E_CHARGE = 1.602176634e-19;
const U_MEV = 931.494;
const WIEN = 2.897771955e-3;

Object.assign(physics, {
  /** Series/parallel pair driven by a real cell: V = ε − Ir. */
  circuit: ({ emf, r, R1, R2, mode = 0 }) => {
    if (!finite(emf, r, R1, R2) || R1 <= 0 || R2 <= 0 || r < 0) return null;
    const external = mode < 0.5 ? R1 + R2 : (R1 * R2) / (R1 + R2);
    const total = external + r;
    if (total <= 0) return null;
    const current = emf / total;
    return {
      externalR: external,
      current,
      terminalV: emf - current * r,
      power: current * current * external,
      lostVolts: current * r,
    };
  },

  /** Calorimetry with an optional phase change: Q = mcΔT and Q = mL. */
  calorimetry: ({ mass, c, dT, L = 0 }) => {
    if (!finite(mass, c, dT, L) || mass <= 0 || c <= 0) return null;
    const heating = mass * c * dT;
    const phase = mass * L;
    return { heating, phase, energy: heating + phase };
  },

  /** Planetary energy balance: S(1−α)/4 = eσT⁴. */
  greenhouse: ({ S, albedo, emissivity }) => {
    if (!finite(S, albedo, emissivity) || S <= 0 || emissivity <= 0 || albedo < 0 || albedo >= 1) return null;
    const absorbed = (S * (1 - albedo)) / 4;
    return { absorbed, equilibriumT: Math.pow(absorbed / (emissivity * SIGMA), 0.25) };
  },

  /** First law for an ideal gas at constant pressure. W is work done BY the gas. */
  firstLaw: ({ Q, p, dV }) => {
    if (!finite(Q, p, dV)) return null;
    const work = p * dV;
    return { work, deltaU: Q - work };
  },

  /** The wave equation, plus the period it implies. */
  wave: ({ f, wavelength }) => {
    if (!finite(f, wavelength) || f <= 0 || wavelength <= 0) return null;
    return { speed: f * wavelength, period: 1 / f, waveNumber: (2 * Math.PI) / wavelength };
  },

  /** Photon energy from frequency, with the wavelength it corresponds to. */
  emSpectrum: ({ f }) => {
    if (!finite(f) || f <= 0) return null;
    return { wavelength: c / f, energy: h * f, energyEv: (h * f) / E_CHARGE };
  },

  /** Snell's law, and the critical angle when one exists. */
  refraction: ({ n1, n2, angle }) => {
    if (!finite(n1, n2, angle) || n1 <= 0 || n2 <= 0) return null;
    const sinR = (n1 * Math.sin((angle * Math.PI) / 180)) / n2;
    // Beyond the critical angle the ray is totally internally reflected, so
    // there is no refracted angle to report.
    const refracted = Math.abs(sinR) <= 1 ? (Math.asin(sinR) * 180) / Math.PI : null;
    const critical = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;
    return { refracted, critical, speed2: c / n2 };
  },

  /** Harmonics on a string or in a pipe. mode: 0 both-ends, 1 one end closed. */
  standingWave: ({ length, speed, harmonic, mode = 0 }) => {
    if (!finite(length, speed, harmonic) || length <= 0 || speed <= 0 || harmonic < 1) return null;
    const closed = mode >= 0.5;
    // A closed pipe supports odd harmonics only, so an even request is lifted
    // to the next odd one rather than returning a frequency that cannot exist.
    const n = closed ? 2 * Math.round((harmonic - 1) / 2) + 1 : Math.round(harmonic);
    const wavelength = closed ? (4 * length) / n : (2 * length) / n;
    return { harmonicUsed: n, wavelength, frequency: speed / wavelength };
  },

  /** Doppler effect for sound. Positive speeds approach. */
  doppler: ({ f, vSource, vObserver, vSound = 340 }) => {
    if (!finite(f, vSource, vObserver, vSound) || f <= 0 || vSound <= 0) return null;
    if (vSource >= vSound) return null; // at or above the sound speed the model breaks down
    const observed = (f * (vSound + vObserver)) / (vSound - vSource);
    return { observed, shift: observed - f, wavelength: vSound / observed };
  },

  /** Circular orbit under gravity, and the escape speed from the same radius. */
  orbit: ({ mass, radius }) => {
    if (!finite(mass, radius) || mass <= 0 || radius <= 0) return null;
    const speed = Math.sqrt((G_CONST * mass) / radius);
    return {
      orbitalSpeed: speed,
      period: (2 * Math.PI * radius) / speed,
      escapeSpeed: Math.sqrt((2 * G_CONST * mass) / radius),
      fieldStrength: (G_CONST * mass) / (radius * radius),
    };
  },

  /** A charged particle circling in a uniform magnetic field. */
  chargedPath: ({ mass, charge, speed, B }) => {
    if (!finite(mass, charge, speed, B) || mass <= 0 || charge === 0 || B === 0) return null;
    const q = Math.abs(charge);
    return {
      radius: (mass * speed) / (q * B),
      period: (2 * Math.PI * mass) / (q * B),
      force: q * speed * B,
    };
  },

  /** Hydrogen-like transition: the photon a level change emits. */
  atomicTransition: ({ nHigh, nLow, Z = 1 }) => {
    if (!finite(nHigh, nLow, Z) || nHigh <= nLow || nLow < 1) return null;
    const hi = Math.round(nHigh);
    const lo = Math.round(nLow);
    if (hi <= lo) return null;
    const energyEv = 13.6 * Z * Z * (1 / (lo * lo) - 1 / (hi * hi));
    const joules = energyEv * E_CHARGE;
    return { energyEv, energy: joules, frequency: joules / h, wavelength: (h * c) / joules };
  },

  /** Mass defect converted to binding energy. */
  binding: ({ deltaM, nucleons }) => {
    if (!finite(deltaM, nucleons) || nucleons <= 0) return null;
    const mev = deltaM * U_MEV;
    return { energyMeV: mev, perNucleon: mev / nucleons, energy: mev * 1e6 * E_CHARGE };
  },

  /** Stellar luminosity and the wavelength it peaks at. */
  star: ({ radius, temperature }) => {
    if (!finite(radius, temperature) || radius <= 0 || temperature <= 0) return null;
    return {
      luminosity: 4 * Math.PI * radius * radius * SIGMA * Math.pow(temperature, 4),
      peakWavelength: WIEN / temperature,
    };
  },
});

Object.assign(physics, {
  /** Rotational dynamics: the rotational analogue of F = ma. */
  rotation: ({ inertia, torque, omega }) => {
    if (!finite(inertia, torque, omega) || inertia <= 0) return null;
    return {
      angularAcceleration: torque / inertia,
      angularMomentum: inertia * omega,
      rotationalKE: 0.5 * inertia * omega * omega,
    };
  },

  /** Faraday's law, and the peak emf a rotating coil produces. */
  induction: ({ turns, B, area, dt, omega }) => {
    if (!finite(turns, B, area, dt, omega) || turns <= 0 || area <= 0 || dt <= 0) return null;
    // Flux swept as the coil turns from fully linked to zero linkage.
    const flux = B * area;
    return {
      flux,
      fluxLinkage: turns * flux,
      averageEmf: (turns * flux) / dt,
      peakEmf: turns * B * area * omega,
    };
  },
});
