/** Synthetic v3 genesis only; all lifecycle/rules transitions must run normally. */
import fs from'node:fs';import{expiryPredecessorWorld}from'../tests/scenarios/boundary-deflector.mjs';import{encodeWorld}from'../packages/kernels/b2z/world.mjs';fs.writeFileSync(process.argv[2],encodeWorld(expiryPredecessorWorld()));
