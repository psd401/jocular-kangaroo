#!/bin/bash
cd /Users/hagelk/non-ic-code/jockular-kangaroo

echo "=== Running ESLint ==="
npm run lint 2>&1 | head -50

echo -e "\n=== Running TypeScript Check ==="
npx tsc --noEmit --project tsconfig.json 2>&1 | head -50

echo -e "\n=== Checking specific files ==="
npx tsc --noEmit actions/db/settings-actions.ts actions/db/jobs-actions.ts actions/db/navigation-actions.ts actions/db/interventions-actions.ts actions/db/intervention-programs-actions.ts 2>&1