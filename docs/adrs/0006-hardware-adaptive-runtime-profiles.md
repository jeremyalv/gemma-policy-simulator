# ADR-0006: Hardware-Adaptive Runtime Profiles for Local Devices

## Status
Accepted

## Date
2026-04-18

## Context
Demo and user execution targets include Apple Silicon laptops (M1 Pro baseline) and potentially lower-spec devices. Fixed high sample sizes can degrade UX or fail under constrained memory/compute.

## Decision
Introduce runtime profiles (`interactive`, `balanced`, `thorough`, `auto`) and allow server-side sample-size clamping based on device capability. Expose effective runtime settings in API responses (`effective_sample_size`, `runtime_profile`, `device_profile`).

## Consequences
Benefits:
- Predictable UX across heterogeneous local hardware.
- Safer defaults for demos and field deployment.
- Transparent execution behavior for frontend and users.

Tradeoffs:
- Additional run-configuration complexity.
- Need to maintain capability probing heuristics over time.
