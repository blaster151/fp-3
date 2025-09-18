# Development File Structure

*Understanding the different types of documentation and their purposes*

## For Human Developers

### Quick Start
- **`HUMAN_DEV_GUIDELINES.md`** - Concise overview of development practices
- **`REMINDERS.md`** - Checklist for regular maintenance tasks

### Regular Commands
```bash
npm run maintenance:check    # Check if maintenance is needed
npm run maintenance:remind   # Show development reminders
npm run upgrade:backlog      # View upgrade opportunities
npm run upgrade:stats        # See upgrade statistics
```

## For AI-Assisted Development

### Detailed Processes
- **`AI_DEV_GUIDELINES.md`** - Comprehensive development processes
- **`KNOWLEDGE_BASE.md`** - Patterns, utilities, and LLM hints
- **`UPGRADE_BACKLOG.md`** - Tracked improvement opportunities

### Systematic Analysis
- **`RECOVERY_STRATEGY.md`** - Recovering lost knowledge
- **`LAWS.md`** - Mathematical laws and properties

## File Purposes

| File | Purpose | Audience | When to Use |
|------|---------|----------|-------------|
| `HUMAN_DEV_GUIDELINES.md` | Quick reference | Humans | Before starting work |
| `REMINDERS.md` | Maintenance checklist | Humans | Regular maintenance |
| `AI_DEV_GUIDELINES.md` | Detailed processes | AI + Humans | Systematic development |
| `KNOWLEDGE_BASE.md` | Pattern reference | AI + Humans | Finding existing solutions |
| `UPGRADE_BACKLOG.md` | Opportunity tracking | AI + Humans | Managing improvements |
| `RECOVERY_STRATEGY.md` | Knowledge recovery | AI + Humans | Recovering lost insights |
| `LAWS.md` | Mathematical foundation | AI + Humans | Law verification |

## Workflow Integration

### Human Workflow
1. Check `HUMAN_DEV_GUIDELINES.md` for overview
2. Use `REMINDERS.md` for regular maintenance
3. Reference `AI_DEV_GUIDELINES.md` for detailed processes when needed

### AI Workflow
1. Follow `AI_DEV_GUIDELINES.md` for systematic processes
2. Use `KNOWLEDGE_BASE.md` for pattern discovery
3. Update `UPGRADE_BACKLOG.md` for deferred opportunities
4. Apply token drift prevention strategies

### Shared Workflow
- Both humans and AI contribute to `KNOWLEDGE_BASE.md`
- Both track opportunities in `UPGRADE_BACKLOG.md`
- Both follow the same core principles in `LAWS.md`

## Maintenance Schedule

### Daily (AI)
- Apply systematic processes from `AI_DEV_GUIDELINES.md`
- Use knowledge base for pattern discovery
- Update backlog as opportunities arise

### Weekly (Human)
- Run `npm run maintenance:check`
- Review any flagged items

### Monthly (Human)
- Run `npm run upgrade:backlog`
- Complete high-priority backlog items
- Update `REMINDERS.md` with progress

### Before Releases (Human)
- Complete all high-priority backlog items
- Run full test suite
- Update documentation
