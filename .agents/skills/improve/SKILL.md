---
name: improve
description: >-
  Iteratively audit, refine, and optimize custom agent skills (SKILL.md), system prompts,
  workspace rules (GEMINI.md / AGENTS.md), and workflow guidelines based on execution feedback and transcripts.
---

# Agent Skill & Prompt Improvement Guide

Use this skill when you need to audit, enhance, or create high-performance `SKILL.md` files, workspace rules, or agent instructions.

---

## 1. Core Principles of Skill Improvement

1. **Progressive Disclosure First**:
   - Keep the YAML frontmatter (`name` and `description`) concise and precise.
   - Offload large reference documents, schemas, or extensive examples to the `references/` directory.
2. **Actionable & Procedural**:
   - Replace generic guidelines with deterministic, numbered steps and explicit guardrails.
3. **Empirical Validation**:
   - Test skill instructions against realistic user prompts and inspect execution logs (`transcript.jsonl`) to ensure accuracy.

---

## 2. Step-by-Step Skill Refinement Workflow

### Step 1: Audit Current Skill / Instruction
- Locate the target file (`.agents/skills/<skill-name>/SKILL.md` or workspace `GEMINI.md`).
- Identify common failure modes:
  - **Trigger failure**: Description is too vague for progressive disclosure.
  - **Context bloat**: Instructions are too long or contain heavy static content.
  - **Execution drift**: Missing guardrails allowing unwanted assumptions.

### Step 2: Optimize Description & Frontmatter
Ensure the frontmatter follows this structure:
```yaml
---
name: skill-name
description: >-
  Use this skill when [specific trigger conditions and user intent].
  Provides [key capability summary].
---
```

### Step 3: Refine the Instructions Body
- **Job Statement**: 1-2 sentence high-level goal.
- **Prerequisites / Verification**: Required files, CLI tools, or dependencies.
- **Execution Steps**: Clean, numbered steps using imperative language.
- **Guardrails**: Explicit "DO NOT" rules to prevent regressions.

### Step 4: De-clutter via References
If the skill contains multi-page docs, API tables, or template snippets:
- Move them to `.agents/skills/<skill-name>/references/` or `assets/`.
- Cross-link them in `SKILL.md` using Markdown file links (e.g. `[Reference Doc](references/guide.md)`).

---

## 3. Verification & Testing

After updating a skill:
1. Verify YAML frontmatter syntax.
2. Trigger the skill with a sample prompt to ensure progressive disclosure succeeds.
3. Run verification checks or build commands to confirm output quality.
