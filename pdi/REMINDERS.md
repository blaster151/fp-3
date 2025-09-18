# Development Reminders

*Quick checklist for human developers - update this file as needed*

## Before Starting New Work
- [ ] Check `KNOWLEDGE_BASE.md` for existing patterns
- [ ] Review `AI_DEV_GUIDELINES.md` for systematic processes

## After Adding Features
- [ ] Run upgrade analysis (see AI guidelines)
- [ ] Update knowledge base with new patterns
- [ ] Document deferred opportunities in `UPGRADE_BACKLOG.md`

## Regular Maintenance (Monthly)
- [ ] Review `UPGRADE_BACKLOG.md` for opportunities
- [ ] Run `npm run upgrade:stats` to see progress
- [ ] Consider batching similar upgrades

## Before Major Releases
- [ ] Complete high-priority backlog items
- [ ] Run full test suite
- [ ] Update documentation

## Quick Commands
```bash
npm run upgrade:backlog    # View current backlog
npm run upgrade:stats      # See backlog statistics
npm run test:laws         # Run law tests
npm run coverage          # Check law coverage
```

## Key Files
- `HUMAN_DEV_GUIDELINES.md` - Concise human reference
- `AI_DEV_GUIDELINES.md` - Detailed AI processes
- `KNOWLEDGE_BASE.md` - Patterns and utilities
- `UPGRADE_BACKLOG.md` - Deferred improvements
- `LAWS.md` - Mathematical laws
