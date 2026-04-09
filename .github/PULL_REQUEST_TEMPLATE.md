## What does this PR do?

<!-- Short description of the change and its purpose -->

Closes #<!-- issue number -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Documentation
- [ ] Chore / dependency update

## Testing checklist

- [ ] `npm run lint` passes with no new errors
- [ ] `npm run build` completes without errors
- [ ] Manually tested on local dev server (`npm run dev`)
- [ ] Ran `scripts/test-scenarios.sh` against local server — all checks pass
- [ ] If DB schema changed: `npx prisma migrate dev --name <name>` run locally and migration file committed
- [ ] If new environment variable added: documented in `CLAUDE.md` and `README.md`
- [ ] If new API route added: auth check present, or explicitly documented as intentionally public

## Screenshots

<!-- For UI changes, attach before/after screenshots -->

## Breaking changes?

- [ ] Yes — describe migration path below
- [ ] No

<!-- If yes, describe what breaks and how consumers should migrate -->
