// Simulation
export const MAX_SPEED = 70;            // m/s (~156 mph)
export const GRAVITY = 9.8;             // m/s²
export const DT = 0.05;                // simulation timestep (seconds)
export const MAX_SIM_STEPS = 200;       // max trajectory points per ball

// Physics — tuning knobs
export const SPIN_X_LATERAL_FACTOR = 0.3;   // lateral deviation per unit spin_x
export const SPIN_Z_FORWARD_FACTOR = 0.2;   // forward speed modifier per unit spin_z
export const WIND_FACTOR = 0.3;             // wind force multiplier
export const DRAG = 0.998;                  // per-step velocity damping
export const BOUNCE_VY_THRESHOLD = 1.0;     // min vy to bounce (m/s)
export const BOUNCE_VY_DAMPING = 0.3;       // vy multiplier on bounce
export const BOUNCE_VXZ_DAMPING = 0.7;      // vx/vz multiplier on bounce
export const ROLL_FRICTION = 0.85;          // per-step velocity damping during roll
export const ROLL_STOP_THRESHOLD = 0.01;    // min velocity to keep rolling (m/s)
export const MAX_ROLL_STEPS = 10;           // max roll simulation steps

// GP
export const MAX_TREE_DEPTH = 6;
export const DEFAULT_POP_SIZE = 12;
export const DEFAULT_MUTATION_RATE = 0.3;
export const DEFAULT_TOURNAMENT_SIZE = 3;
export const FITNESS_UNEVAL = -1;           // sentinel: unevaluated fitness
export const HOLE_RADIUS = 0.5;             // yards, win threshold
