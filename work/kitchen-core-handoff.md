# Kitchen / recommendation core handoff

## UI APIs

- `import { cookTimeline, KitchenTimeline, KitchenTask } from '../model/KitchenWorkflowCore'`
- `cookTimeline(recipes: CoreRecipe[]): KitchenTimeline`
  - `tasks`: slow/passive dishes first, each `recipeId/name/order/prepMinutes/activeMinutes/waitMinutes/totalMinutes/timingKnown/splitKnown/passive/instruction`.
  - `prepMinutes`, `activeMinutes`, `elapsedMinutes` (= conservative serial), `conservativeMinutes`, `parallelMinutes` (separate TWO POT estimate), `complete`, `estimated`, `assumption`, `warnings`.
  - Show `parallelMinutes` explicitly as 双灶参考, never feed it silently into hard menu time gates. Unknown times produce incomplete/warnings, not invented timings. Only explicit simmer/steam/bake timing plus consistent prep/cook split creates possible overlap. `activeMinutes` includes prep.
- `import { buildCookingChecklist, CookingChecklist } from '../model/CookingGuide'`
  - `buildCookingChecklist(recipe)` → `preparation[]`, `checkpoints[]`, `pitfalls[]`, `unknownIngredients[]`.
  - Useful collapsed checklist above step cards; does not alter source tutorial or stored editorialGuide snapshots.
- `import { feedbackAction, seasonalIngredientNames } from '../model/RecommendationCore'`
  - `feedbackAction('最近吃过')='recently_eaten'`; `太麻烦='too_complex'`; `不合口味='not_my_taste'`.
  - Root needs add these 3 values to LocalStore.recordFeedback allowlist and catalog.ts EventDto @IsIn + type (catalog_delivery owns catalog.ts). DB migration 018 already added here.
  - Context actions too_complex/recently_eaten do not teach taste dislike. Too_complex applies in cook mode only. not_my_taste acts as taste dislike. Learning off ignores all feedback. Scope/date validation preserved.
  - `RankingOptions.seasonal` defaults true. North-hemisphere broad seasonal ingredient soft +2 score; UI reasons explicitly say regional variation. Does not override hard filters. Dish-group duplicates penalized in top12, mild region variety unless explicit/home region chosen.

## New knowledge

Six cards: 藕脆糯、椰奶/椰浆、有盐/无盐黄油、酵母/泡打粉/小苏打、高汤/浓缩汤、冷冻生熟处理. Existing guide snapshots byte-equivalent since only supplementary knowledge and checklist added.

## Tests

Passed: `node --import tsx test/kitchen-workflow.test.ts`, `personalization.test.ts`, `rules.test.ts`, `usability.test.ts`, `recipe-expansion.test.ts`, `npm run typecheck` from backend.
Evidence: work/reports/kitchen-workflow-core.json.
Native compile/root integration remains root's responsibility.

## Files

backend/src/kitchen-workflow-core.ts + client KitchenWorkflowCore.ets; backend/src/recommend-core.ts + client RecommendationCore.ets; backend/src/cooking-guide.ts + client CookingGuide.ets; backend/migrations/018_recommendation_reasons.sql; backend/test/kitchen-workflow.test.ts; scripts/sync-recommendation-core.py (adds kitchen core parity copy).
