from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=root/'backend/src/recommend-core.ts';target=root/'client/entry/src/main/ets/model/RecommendationCore.ets'
target.write_text(source.read_text())
print('Shared recommendation core synced to ArkTS')

portion=root/'backend/src/portion-core.ts'
(root/'client/entry/src/main/ets/model/PortionCore.ets').write_text(portion.read_text().replace("'./recommend-core'","'./RecommendationCore'"))
print('Shared portion core synced to ArkTS')

for stem, target in [('usability-core', 'UsabilityCore'), ('cooking-guide', 'CookingGuide'), ('recipe-filter-core', 'RecipeFilterCore'), ('recipe-discovery-core', 'RecipeDiscoveryCore'), ('recipe-search-core', 'RecipeSearchCore'), ('search-pinyin-data', 'SearchPinyinData'), ('recipe-query-intent', 'RecipeQueryIntent'), ('ingredient-discovery-core', 'IngredientDiscoveryCore'), ('nutrition-core', 'NutritionCore'), ('kitchen-workflow-core', 'KitchenWorkflowCore')]:
    text=(root/f'backend/src/{stem}.ts').read_text().replace("'./recommend-core'", "'./RecommendationCore'").replace("'./portion-core'", "'./PortionCore'").replace("'./kitchen-workflow-core'", "'./KitchenWorkflowCore'").replace("'./usability-core'", "'./UsabilityCore'").replace("'./recipe-discovery-core'", "'./RecipeDiscoveryCore'").replace("'./search-pinyin-data'", "'./SearchPinyinData'").replace("'./recipe-query-intent'", "'./RecipeQueryIntent'").replace("'./ingredient-discovery-core'", "'./IngredientDiscoveryCore'")
    (root/f'client/entry/src/main/ets/model/{target}.ets').write_text(text)
print('Shared menu draw and cooking guides synced to ArkTS')
