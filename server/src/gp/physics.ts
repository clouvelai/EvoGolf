import { type SwingParams, type Vec3 } from './types.js';
import {
  MAX_SPEED, GRAVITY, DT, MAX_SIM_STEPS,
  SPIN_X_LATERAL_FACTOR, SPIN_Z_FORWARD_FACTOR,
  WIND_FACTOR, DRAG, BOUNCE_VY_THRESHOLD,
  BOUNCE_VY_DAMPING, BOUNCE_VXZ_DAMPING,
  ROLL_FRICTION, ROLL_STOP_THRESHOLD, MAX_ROLL_STEPS,
} from '../constants.js';

/**
 * Simulate a golf ball given swing parameters, tee position, and wind.
 * Returns an array of {x, y, z} points representing the trajectory.
 */
export function simulateBall(
  params: SwingParams,
  teeX: number,
  teeZ: number,
  windX: number,
  windZ: number,
): Vec3[] {
  const points: Vec3[] = [];

  // Convert launch angle to radians
  const angleRad = (params.launch_angle * Math.PI) / 180;

  // Initial speed
  const speed = params.power * MAX_SPEED;

  // Initial velocity components
  // spin_x controls lateral deviation: 0 = straight, ±1 = max side curve
  let vx = speed * Math.sin(angleRad) * params.spin_x * SPIN_X_LATERAL_FACTOR;
  let vy = speed * Math.sin(angleRad);
  let vz = speed * Math.cos(angleRad);

  // spin_z affects forward/backward spin (topspin adds forward speed, backspin reduces)
  vz *= (1.0 + params.spin_z * SPIN_Z_FORWARD_FACTOR);

  // Position
  let x = teeX;
  let y = 0;
  let z = teeZ;

  // Record initial position
  points.push({ x, y, z });

  let landed = false;

  for (let step = 1; step < MAX_SIM_STEPS; step++) {
    if (landed) break;

    // Apply gravity
    vy -= GRAVITY * DT;

    // Apply wind
    vx += windX * DT * WIND_FACTOR;
    vz += windZ * DT * WIND_FACTOR;

    // Apply drag
    vx *= DRAG;
    vy *= DRAG;
    vz *= DRAG;

    // Update position
    x += vx * DT;
    y += vy * DT;
    z += vz * DT;

    // Ground collision
    if (y <= 0) {
      y = 0;

      // First bounce — check if we have enough velocity to bounce
      if (Math.abs(vy) > BOUNCE_VY_THRESHOLD) {
        // Bounce with damping
        vy = -vy * BOUNCE_VY_DAMPING;
        vx *= BOUNCE_VXZ_DAMPING;
        vz *= BOUNCE_VXZ_DAMPING;
        points.push({ x, y, z });
      } else {
        // Too slow to bounce — start rolling
        vy = 0;
        points.push({ x, y, z });

        // Roll for a few more steps with heavy friction
        for (let rollStep = 0; rollStep < MAX_ROLL_STEPS && step + rollStep < MAX_SIM_STEPS; rollStep++) {
          vx *= ROLL_FRICTION;
          vz *= ROLL_FRICTION;

          // Stop if barely moving
          if (Math.abs(vx) < ROLL_STOP_THRESHOLD && Math.abs(vz) < ROLL_STOP_THRESHOLD) break;

          x += vx * DT;
          z += vz * DT;
          points.push({ x, y: 0, z });
        }
        landed = true;
      }
    } else {
      points.push({ x, y, z });
    }
  }

  // Ensure final point is on the ground
  if (points.length > 0 && points[points.length - 1].y > 0) {
    const last = points[points.length - 1];
    points.push({ x: last.x, y: 0, z: last.z });
  }

  return points;
}
