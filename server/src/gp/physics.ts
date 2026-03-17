import { type SwingParams, type Vec3 } from './types.js';
import { MAX_SPEED, GRAVITY, DT, MAX_SIM_STEPS } from '../constants.js';

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

  // spin_x affects lateral deviation factor
  const spinXFactor = 1.0 + params.spin_x * 0.3;

  // Initial velocity components
  let vx = speed * Math.sin(angleRad) * spinXFactor * params.spin_x;
  let vy = speed * Math.sin(angleRad);
  let vz = speed * Math.cos(angleRad);

  // spin_z affects forward/backward spin (topspin adds forward speed, backspin reduces)
  vz *= (1.0 + params.spin_z * 0.2);

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
    vx += windX * DT * 0.3;
    vz += windZ * DT * 0.3;

    // Apply drag
    vx *= 0.998;
    vy *= 0.998;
    vz *= 0.998;

    // Update position
    x += vx * DT;
    y += vy * DT;
    z += vz * DT;

    // Ground collision
    if (y <= 0) {
      y = 0;

      // First bounce — check if we have enough velocity to bounce
      if (Math.abs(vy) > 1.0) {
        // Bounce with damping
        vy = -vy * 0.3;
        vx *= 0.7;
        vz *= 0.7;
        points.push({ x, y, z });
      } else {
        // Too slow to bounce — start rolling
        vy = 0;
        points.push({ x, y, z });

        // Roll for a few more steps with heavy friction
        for (let rollStep = 0; rollStep < 10 && step + rollStep < MAX_SIM_STEPS; rollStep++) {
          vx *= 0.85;
          vz *= 0.85;

          // Stop if barely moving
          if (Math.abs(vx) < 0.01 && Math.abs(vz) < 0.01) break;

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
