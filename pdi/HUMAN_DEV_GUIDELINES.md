# Human Developer Guidelines

*This file is for human developers to read and follow. Keep it concise and actionable.*

## Core Principles

1. **Algebra First**: Start with mathematical laws, then implement
2. **Laws → Shapes → Rewrites**: Follow the systematic development approach
3. **Purity is Power**: Prefer pure functions and immutable data
4. **Witness-Based Testing**: Verify laws with property-based tests

## Quick Reference

*For a detailed checklist, see `REMINDERS.md`*

### Before Starting New Work
- [ ] Check `KNOWLEDGE_BASE.md` for existing patterns
- [ ] Review `AI_DEV_GUIDELINES.md` for systematic processes

### After Adding Features
- [ ] Run upgrade analysis (see AI guidelines for details)
- [ ] Update knowledge base with new patterns
- [ ] Document any deferred opportunities in `UPGRADE_BACKLOG.md`

### Regular Maintenance (Monthly)
- [ ] Review `UPGRADE_BACKLOG.md` for opportunities
- [ ] Run `npm run upgrade:stats` to see progress

### Before Major Releases
- [ ] Complete high-priority backlog items
- [ ] Run full test suite

## Key Files to Know

- **`AI_DEV_GUIDELINES.md`**: Detailed processes for AI-assisted development
- **`KNOWLEDGE_BASE.md`**: Patterns and utilities reference
- **`UPGRADE_BACKLOG.md`**: Deferred improvement opportunities
- **`LAWS.md`**: Mathematical laws and properties
- **`RECOVERY_STRATEGY.md`**: Recovering lost knowledge

## Quick Commands

```bash
# Check for upgrade opportunities
npm run upgrade:analyze "pattern"

# View current backlog
npm run upgrade:backlog

# See backlog statistics
npm run upgrade:stats

# Run law tests
npm run test:laws

# Check law coverage
npm run coverage
```

## When Working with AI

- Reference `AI_DEV_GUIDELINES.md` for systematic processes
- Use the "sandwiching" approach for upgrade analysis
- Leverage the knowledge base for pattern discovery
- Follow the token drift prevention strategy

## Success Metrics

- Law coverage percentage
- Upgrade backlog completion rate
- Code reuse through knowledge base
- Reduction in redundant implementations
