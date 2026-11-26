// Build-time imports only: the HarmonyOS sources remain the canonical business implementation.
const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");
const root = path.resolve(__dirname, "../.."),
  ts = require(root + "/backend/node_modules/typescript");
const src = root + "/client/entry/src/main/ets/model",
  out = root + "/android/app/build/generated/assets";
fs.mkdirSync(out, { recursive: true });
const names = [
  "Models",
  "AssistantCore",
  "ClientTelemetry",
  "AssistantExperience",
  "AssistantInteraction",
  "CompanionCore",
  "AssistantWorkflow",
  "AssistantIntelligence",
  "AssistantNative",
  "LobbyCore",
  "RecommendationCore",
  "PortionCore",
  "RecipeFilterCore",
  "RecipeDiscoveryCore",
  "RecipeSearchCore",
  "RecipeQueryIntent",
  "SearchPinyinData",
  "IngredientDiscoveryCore",
  "CookingGuide",
  "KitchenWorkflowCore",
  "UsabilityCore",
  "ExperienceCore",
  "DailyExperienceCore",
  "NutritionCore",
  "UtilityState",
  "MealRules",
  "MealPlan",
  "CardData",
  "AccountModels",
  "ProfileCore",
  "AuthInputCore",
  "SmsAuthCore",
  "ConflictMerge",
  "Community",
  "LocalStore",
  "ReleaseLegal",
  "Cloud",
  "CatalogUpdate",
  "WorkspaceCore",
  "DailyFlowCore",
  "WorkspaceMergeCore",
  "ConvenienceCore",
  "DailyLivingCore",
  "InteractionPolishCore",
  "PhotoLayoutCore",
];
let bundle =
  "window.__modules={};window.__cache={};function require(n){n=n.replace(/^\\.\\//,'');if(__cache[n])return __cache[n].exports;const m={exports:{}};__cache[n]=m;if(!__modules[n])throw Error(\"Missing module \"+n);__modules[n](m,m.exports,require);return m.exports;}\n";
const hashes = {};
for (const n of names) {
  let code = fs.readFileSync(src + "/" + n + ".ets", "utf8");
  hashes[n] = crypto.createHash("sha256").update(code).digest("hex");
  code = code.replace(/from '@kit\.[^']+'/g, "from './Platform'");
  if (n === "Cloud") {
    code = code.replace("configure('harmony'", "configure('android'");
    code = code.replace(
      "deviceName: string = '我的鸿蒙设备'",
      "deviceName: string = '我的Android设备'",
    );
    code = code.replace("deviceName:string='我的鸿蒙设备'", "deviceName:string='我的Android设备'");
    code = code.replace(
      /if \(!\/\^https:[\s\S]*?throw new Error\('请填写HTTPS服务地址；本机测试可使用localhost端口'\); \}/,
      "if (!platformEndpoint(this.endpoint)) { throw new Error('请填写HTTPS地址；调试可用localhost或10.0.2.2端口'); }",
    );
    code = code.replace(
      / private async putPhoto\(url: string, path: string\): Promise<void> \{[\s\S]*?\n \}\n async logout/,
      " private async putPhoto(url: string, path: string): Promise<void> { await nativeAsync('uploadPhoto',{url,path}); }\n async logout",
    );
    code =
      "import { platformEndpoint, nativeAsync } from './Platform';\n" + code;
  }
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length)
    throw Error(
      n +
        ": " +
        errors
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
          .join(";"),
    );
  bundle +=
    "__modules[" +
    JSON.stringify(n) +
    "]=function(module,exports,require){\n" +
    result.outputText +
    "\n};\n";
}
for (const n of ["Platform", "Vault", "EncryptedBackup"])
  bundle +=
    "__modules[" +
    JSON.stringify(n) +
    "]=function(module,exports,require){\n" +
    fs.readFileSync(root + "/android/web/" + n + ".js", "utf8") +
    "\n};\n";
const manifest = fs.readFileSync(root + "/android/app/src/main/AndroidManifest.xml", "utf8");
const buildInfo = {
  versionName: manifest.match(/android:versionName="([^"]+)"/)[1],
  versionCode: Number(manifest.match(/android:versionCode="(\d+)"/)[1]),
  uiReferenceSha256: crypto.createHash("sha256").update(fs.readFileSync(root + "/client/entry/src/main/ets/pages/Index.ets")).digest("hex"),
};
bundle += "\nwindow.kaifanBuild=" + JSON.stringify(buildInfo) + ";\n";
bundle += "window.kaifanLegal=" + fs.readFileSync(root + "/client/entry/src/main/resources/rawfile/release-legal.json", "utf8") + ";\n";
fs.writeFileSync(out + "/core.js", bundle);
// These adapters execute only inside core.js; discard obsolete standalone generated copies.
for(const name of ["Platform", "Vault", "EncryptedBackup"]) fs.rmSync(out+"/"+name+".js",{force:true});
// Resolve artwork through the authoritative Harmony resource map, never ID guessing.
const coverSource = fs.readFileSync(src + "/RecipeCoverMap.ets", "utf8");
const covers = Object.fromEntries(
  [
    ...coverSource.matchAll(
      /case '([^']+)': return \$r\('app.media.([^']+)'\)/g,
    ),
  ].map((m) => [m[1], "media/" + m[2] + ".webp"]),
);
if (Object.keys(covers).length !== 454)
  throw Error("Unexpected canonical cover map size");
for (const file of Object.values(covers))
  if (!fs.existsSync(root + "/client/entry/src/main/resources/base/" + file))
    throw Error("Missing cover: " + file);
fs.writeFileSync(
  out + "/cover-map.js",
  "window.recipeCovers=" + JSON.stringify(covers) + ";\n",
);
for (const f of ["index.html", "app.js", "parity.js", "experience.js", "daily.js", "convenience.js", "living.js", "search.js", "polish.js", "lobby.js", "assistant.js", "assistant-interaction.js", "companion.js", "release-privacy.js", "surfaces.js", "sms-auth.js", "style.css"])
  fs.copyFileSync(root + "/android/web/" + f, out + "/" + f);
// 3D bundle intentionally excluded while the module is suspended.
// Include assets at packaging time through links; do not retain a second source-art tree.
const link = (source, target) => {
  if (fs.existsSync(target)) return;
  fs.symlinkSync(source, target);
};
link(root + "/client/entry/src/main/resources/base/media", out + "/media");
const retiredLobby=out+'/lobby';
if(fs.readdirSync(out).includes('lobby')){
 if(!fs.lstatSync(retiredLobby).isSymbolicLink())throw Error('Unexpected lobby directory: preserve and inspect before packaging');
 fs.unlinkSync(retiredLobby);
}
// Generated license directory includes both bundled third-party dependencies.
const licenseDir = out + "/licenses";
if (fs.existsSync(licenseDir) && fs.lstatSync(licenseDir).isSymbolicLink())
  fs.unlinkSync(licenseDir);
fs.mkdirSync(licenseDir, { recursive: true });
fs.copyFileSync(
  root + "/android/licenses/zxing-LICENSE.txt",
  licenseDir + "/zxing-LICENSE.txt",
);
fs.copyFileSync(
  root + "/art-source/fonts/OFL.txt",
  licenseDir + "/font-OFL.txt",
);
fs.copyFileSync(
  root + "/art-source/fonts/SOURCE.txt",
  licenseDir + "/font-SOURCE.txt",
);
link(root + "/client/entry/src/main/resources/rawfile/fonts", out + "/fonts");
const iconDir = root + "/android/app/build/generated/res/drawable";
fs.mkdirSync(iconDir, { recursive: true });
link(
  root + "/client/AppScope/resources/base/media/app_icon.png",
  iconDir + "/app_icon.png",
);
link(
  root + "/client/entry/src/main/resources/rawfile/recipes.json",
  out + "/recipes.json",
);
fs.mkdirSync(root + "/work/reports", { recursive: true });
fs.writeFileSync(
  root + "/work/reports/android-shared-core.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceHashes: hashes,
      adaptations: [
        "@kit imports redirected to Android platform adapters",
        "Cloud deviceName Android and debug localhost/10.0.2.2 endpoint policy",
        "Cloud putPhoto uses streaming native private-file uploader; strips device paths using unchanged canonical sync",
      ],
      modules: names,
    },
    null,
    2,
  ),
);
console.log("Built " + names.length + " canonical modules");
