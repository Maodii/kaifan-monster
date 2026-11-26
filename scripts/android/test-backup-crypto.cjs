"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), assert = require("assert/strict");
const { spawnSync } = require("child_process");
const root = path.resolve(__dirname, "../.."), java = "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/";
const keys = ["format", "version", "algorithm", "kdf", "iterations", "salt", "iv", "ciphertext"];
const source = "android/app/src/main/java/com/kaifan/monster/BackupCrypto.java";
const classes = fs.mkdtempSync(path.join(root, "work/backup-crypto-test-")), checks = [];
const b64 = text => Buffer.from(text, "utf8").toString("base64");
function call(mode, password, value) {
  const input = [mode, b64(password), ...(mode === "encrypt" ? [b64(value)] : keys.map(k => b64(String(value[k]))))].join("\n") + "\n";
  const result = spawnSync(java + "java", ["-cp", classes, "BackupCryptoHarness"], { input, encoding: "utf8", timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const [status, ...values] = result.stdout.trim().split("\t");
  if (status === "ERROR") return { error: values.join("\t") };
  assert.equal(status, "OK");
  if (mode === "decrypt") return { content: Buffer.from(values[0], "base64").toString("utf8") };
  const envelope = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  envelope.version = Number(envelope.version); envelope.iterations = Number(envelope.iterations);
  return { envelope };
}
function nodeEncrypt(content, password, aad = "kaifan-backup:v1") {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 210000, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv); cipher.setAAD(Buffer.from(aad));
  const data = Buffer.concat([cipher.update(content, "utf8"), cipher.final(), cipher.getAuthTag()]);
  key.fill(0);
  return { format: "kaifan-backup", version: 1, algorithm: "AES-256-GCM", kdf: "PBKDF2-SHA256", iterations: 210000,
    salt: salt.toString("base64"), iv: iv.toString("base64"), ciphertext: data.toString("base64") };
}
function nodeDecrypt(envelope, password) {
  const key = crypto.pbkdf2Sync(password, Buffer.from(envelope.salt, "base64"), 210000, 32, "sha256");
  const data = Buffer.from(envelope.ciphertext, "base64");
  const cipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  cipher.setAAD(Buffer.from("kaifan-backup:v1")); cipher.setAuthTag(data.subarray(-16));
  try { return Buffer.concat([cipher.update(data.subarray(0, -16)), cipher.final()]).toString("utf8"); }
  finally { key.fill(0); }
}
function check(name, run) { run(); checks.push(name); console.log("PASS", name); }
let passed = false;
try {
  const compile = spawnSync(java + "javac", ["-encoding", "UTF-8", "-d", classes, path.join(root, source), path.join(__dirname, "BackupCryptoHarness.java")], { encoding: "utf8", timeout: 30000 });
  assert.equal(compile.status, 0, compile.stderr);
  for (const password of ["test-password-16", "本地备份密码🔑八个字", "密碼Passphrase_€_123"]) {
    check("Java JCA ↔ Node interoperability with " + (checks.length ? "Unicode password " + checks.length : "ASCII password"), () => {
      const content = JSON.stringify({ meals: [{ name: "番茄炒蛋🍅", notes: "换行\n、引号\"与UTF8" }], foods: [] });
      const { envelope, error } = call("encrypt", password, content); assert.equal(error, undefined);
      assert.equal(Buffer.from(envelope.salt, "base64").length, 16); assert.equal(Buffer.from(envelope.iv, "base64").length, 12);
      assert.equal(Buffer.from(envelope.ciphertext, "base64").length, Buffer.byteLength(content) + 16);
      assert.equal(nodeDecrypt(envelope, password), content);
      assert.equal(call("decrypt", password, nodeEncrypt(content, password)).content, content);
    });
  }
  const password = "protocol-test-password", content = '{"foods":[],"meals":[]}';
  const envelope = nodeEncrypt(content, password);
  check("Wrong password, changed ciphertext/tag/IV/salt and wrong AAD are authenticated failures", () => {
    assert(call("decrypt", "wrong-password", envelope).error);
    for (const field of ["ciphertext", "iv", "salt"]) {
      const bytes = Buffer.from(envelope[field], "base64"); bytes[0] ^= 1;
      assert(call("decrypt", password, { ...envelope, [field]: bytes.toString("base64") }).error);
    }
    const tag = Buffer.from(envelope.ciphertext, "base64"); tag[tag.length - 1] ^= 1;
    assert(call("decrypt", password, { ...envelope, ciphertext: tag.toString("base64") }).error);
    assert(call("decrypt", password, nodeEncrypt(content, password, "another-envelope")).error);
  });
  check("Unsupported headers, malformed base64 and invalid salt/IV/tag lengths rejected before import", () => {
    for (const patch of [{ format: "other" }, { version: 2 }, { algorithm: "AES-CBC" }, { kdf: "SHA1" }, { iterations: 1 },
      { salt: "@@@=" }, { iv: Buffer.alloc(11).toString("base64") }, { ciphertext: "AAAA" }])
      assert(call("decrypt", password, { ...envelope, ...patch }).error);
    for (const invalid of ["short", "x".repeat(129)]) assert(call("encrypt", invalid, content).error);
  });
  check("Encryption uses fresh random salt and IV; ciphertext is never plaintext", () => {
    const a = call("encrypt", password, content).envelope, b = call("encrypt", password, content).envelope;
    assert.notEqual(a.salt, b.salt); assert.notEqual(a.iv, b.iv); assert.notEqual(a.ciphertext, b.ciphertext);
    assert.equal(nodeDecrypt(a, password), content); assert.equal(nodeDecrypt(b, password), content);
  });
  passed = true;
} finally {
  fs.writeFileSync(path.join(root, "work/reports/android-backup-crypto-tests.json"), JSON.stringify({ passed, checks,
    native_source_sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, source))).digest("hex"),
    scope: "Actual production BackupCrypto.java executed with host JDK JCA against independent Node crypto. Android/Harmony providers and device file picker not executed." }, null, 2) + "\n");
  fs.rmSync(classes, { recursive: true, force: true });
}
