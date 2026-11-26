# Discovery API contract requested for parallel backend implementation
GET /discovery/summary -> {favorites:[{recipeId,count}], hotSearches:[{term,count}], updatedAt}
PUT /discovery/favorites/:recipeId body {saved:boolean} idempotent authenticated explicit save/remove; count real unique accounts, known public/builtin recipes only. No fake samples.
POST /discovery/searches body {term:string} authenticated and client opt-in; aggregate only public exact recipe names/ingredient taxonomy labels, private/custom query not public. Deduplicate user+term+day, hot window7days, threshold3 users.
GET /discovery/rankings?kind=favorites|quick|budget -> ordered real catalogue recipes/counts; stable pagination. Local fallback clearly labelled.
Migration010 reserved discovery, 011 account agent. Parent modifies shared filter core, do not edit it or Index/Cloud/Models. Parent adds ingredient-discovery-core and expanded filter. Backend catalog search should consume shared RecipeSearchCore and filter full builtin+approved before pagination, no old 500/200 cap.
