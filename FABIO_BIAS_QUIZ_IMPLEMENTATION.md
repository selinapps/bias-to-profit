# Fabio-Style Bias Quiz Implementation

## Overview

This implementation provides a deterministic, exhaustive, and developer-friendly bias selection system following Fabio's 3-step model: **Market State → Location → Aggression**.

## Key Features

### 1. Deterministic Logic
- **Hard guardrails** return `FLAT` immediately for no edge scenarios
- **Tie-breaker priority** resolves conflicts between OOB and MR setups
- **Session filters** provide quality warnings for different trading sessions

### 2. 7-Step Quiz Flow
1. **Market State** - Auto-hint with user confirmation
2. **Location vs Value/VWAP** - Price position relative to value
3. **Order Flow** - Multi-select aggression indicators
4. **Structure** - Current market structure
5. **Session** - Auto-detect with override option
6. **Direction Intent** - Long or Short
7. **Confidence** - Optional risk hint level

### 3. Bias Types
- `OOB_LONG` / `OOB_SHORT` - Out of Balance (Trend/Continuation)
- `MR_LONG` / `MR_SHORT` - Mean Reversion
- `FLAT` - No trade (guardrail/conflicting signals)

## Implementation Details

### Core Files

#### `src/types/bias.ts`
- Updated bias types to match Fabio specification
- Added new quiz state interface
- Enhanced result interface with entry checklists

#### `src/lib/biasMapping.ts`
- **`mapBias()`** - Deterministic bias mapping function
- **`getSessionWarning()`** - Session-based quality filters
- **`getOOBEntryChecklist()`** - OOB setup entry checklist
- **`getMREntryChecklist()`** - MR setup entry checklist
- **`getRiskHint()`** - Confidence-based risk hints

#### `src/components/BiasQuizModal.tsx`
- Complete rewrite with 7-step flow
- Auto-advance functionality for order flow step
- Session auto-detection with override
- Deterministic result mapping

### Database Schema

#### `supabase/migrations/20250131000000_update_bias_types.sql`
- Updates existing bias values to new format
- Adds validation functions for bias and market state
- Updates `set_bias_state` function with validation
- Adds check constraints for data integrity

## Logic Rules

### A. Hard Guardrails (return `FLAT`)
- Missing direction
- All of: `Location=Undecided` AND `OrderFlow=None/unclear` AND `Structure=Range rotation`

### B. OUT OF BALANCE → Trend Model (OOB)
Requires ALL:
1. **Market State** = `OUT_OF_BALANCE`
2. **Location** = `Outside value & holding` OR `Just reclaimed VWAP after stretch`
3. **Structure** = `Impulse + shallow pullback`
4. **Order Flow** includes aggression with move AND no dominant absorption

### C. IN BALANCE / FAILED BREAK → Mean Reversion (MR)
Triggered by ANY:
- **Failed Breakout & Reclaim**: Structure + Location + Order Flow shows failure
- **Range Rotation**: Structure + Location + no aggression support

### D. Tie-breaker Priority
1. If Market State = `OUT_OF_BALANCE` and clean aggression → prefer **OOB**
2. If price reclaimed inside value and failed breakout → prefer **MR**
3. Otherwise → `FLAT`

### E. Session Filters
- **Trend (OOB)**: Green in NY, Yellow in London open
- **Mean Reversion (MR)**: Green in London, Yellow in NY

## Entry Checklists

### OOB Setup Checklist
- POI = LVN in impulse leg profile
- Aggression at LVN confirmed
- Stop just beyond aggressive print (+1–2 ticks)
- Target = next balance/POC
- Move to BE on follow-through

### MR Setup Checklist
- Confirm reclaim inside value
- POI = LVN of reclaim leg
- Target = balance POC
- Invalidation immediate if reclaim fails
- Tight SL beyond aggression

## Risk Hints
- `HIGH` → A-setup risk (0.25–0.5% typical)
- `MEDIUM` → B-setup risk (0.25–0.5% typical)
- `LOW` → C-setup risk (0.25–0.5% typical)

## Usage

### Setting Bias
```typescript
const result = mapBias(quizState);
// Returns: 'OOB_LONG' | 'OOB_SHORT' | 'MR_LONG' | 'MR_SHORT' | 'FLAT'
```

### Session Warnings
```typescript
const warning = getSessionWarning(bias, session);
// Returns: 'green' | 'yellow' | 'red'
```

### Entry Checklists
```typescript
const checklist = bias.includes('OOB') ? getOOBEntryChecklist() : getMREntryChecklist();
```

## Testing

The implementation includes comprehensive test cases in `src/lib/biasMapping.test.ts` covering:
- Hard guardrails
- OOB setup detection
- MR setup detection
- Tie-breaker logic
- Session warnings
- Entry checklists

## Benefits

1. **Deterministic** - Same inputs always produce same outputs
2. **Exhaustive** - Covers all market scenarios with clear rules
3. **Developer-friendly** - Well-documented, typed, and tested
4. **Fabio-aligned** - Follows the 3-step model exactly
5. **Session-aware** - Provides quality hints based on trading session
6. **Entry-ready** - Generates actionable checklists for each setup type

This implementation provides a robust foundation for bias selection that aligns with professional trading methodologies while maintaining code quality and user experience standards.
