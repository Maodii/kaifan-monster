// Test adapter ONLY. Browser/Node tests use actual SQLite, but are not Android device evidence.
const { DatabaseSync } = require("node:sqlite"),
  fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");
const root = path.resolve(__dirname, "../..");
class HostAdapter {
  constructor() {
    this.dbs = new Map();
    this.prefs = new Map();
    this.vault = "";
    this.exports = [];
    this.alarms = new Map();
    this.forceSqlError = "";
  }
  checkPreferenceName(name) {
    if (!(name === "kaifan_privacy" || /^shiku_[a-zA-Z0-9_-]+$/.test(name))) throw Error("偏好名称无效");
  }
  db(name) {
    if (!this.dbs.has(name)) this.dbs.set(name, new DatabaseSync(":memory:"));
    return this.dbs.get(name);
  }
  operation(action, a = {}) {
    switch (action) {
      case "networkState":
        return { connected: true, wifi: true };
      case "clipboard":
        this.clipboard=a.text;return true;
      case "uuid":
        return crypto.randomUUID();
      case "asset":
        return fs.readFileSync(
          root + "/client/entry/src/main/resources/rawfile/" + a.path,
          "utf8",
        );
      case "db":
        if (this.forceSqlError && a.sql.includes(this.forceSqlError))
          throw Error("injected write failure");
        this.db(a.name)
          .prepare(a.sql)
          .run(...(a.params || []));
        return true;
      case "query": {
        const stmt = this.db(a.name).prepare(a.sql);
        stmt.setReturnArrays(true);
        return stmt.all(...(a.params || []));
      }
      case "begin":
        this.db(a.name).exec("BEGIN");
        return true;
      case "commit":
        this.db(a.name).exec("COMMIT");
        return true;
      case "rollback":
        this.db(a.name).exec("ROLLBACK");
        return true;
      case "close":
        return true;
      case "prefGet":
        this.checkPreferenceName(a.name);
        return this.prefs.get(a.name + ":" + a.key) ?? a.fallback;
      case "prefPut":
        this.checkPreferenceName(a.name);
        this.prefs.set(a.name + ":" + a.key, String(a.value));
        return true;
      case "vaultLoad":
        return this.vault;
      case "vaultSave":
        this.vault = a.text;
        return true;
      case "sha256":
        return [
          ...crypto.createHash("sha256").update(Buffer.from(a.bytes)).digest(),
        ];
      case "bytes":
        return Buffer.from(a.bytes).toString("base64");
      case "widget":
        this.widget = a.text;
        return true;
      case "keepAwake":
        this.awake = a.enabled;
        return true;
      case "cancelAllTimers":
        this.alarms.clear();
        return true;
      case "timer":
        this.alarms.set(a.id, a);
        return { exact: true, notifications: true };
      case "cancelTimer":
        this.alarms.delete(a.id);
        return true;
      case "deviceInfo":
        return { sdk: 0, model: "HOST TEST ADAPTER", version: "test" };
      default:
        throw Error("Host adapter has no synchronous " + action);
    }
  }
  invoke(action, json) {
    try {
      return JSON.stringify({
        value: this.operation(action, JSON.parse(json)),
      });
    } catch (e) {
      return JSON.stringify({ error: e.message });
    }
  }
  async asyncOp(action, a) {
    switch (action) {
      // Host substitute only; production BackupCrypto.java is independently tested via JCA.
      case "encryptBackup": {
        if (a.password.length < 8 || a.password.length > 128 || !a.content) throw Error("备份密码或内容无效");
        const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=crypto.pbkdf2Sync(a.password,salt,210000,32,"sha256");
        try {
          const cipher=crypto.createCipheriv("aes-256-gcm",key,iv);cipher.setAAD(Buffer.from("kaifan-backup:v1"));
          const ciphertext=Buffer.concat([cipher.update(a.content,"utf8"),cipher.final(),cipher.getAuthTag()]);
          return JSON.stringify({format:"kaifan-backup",version:1,algorithm:"AES-256-GCM",kdf:"PBKDF2-SHA256",iterations:210000,salt:salt.toString("base64"),iv:iv.toString("base64"),ciphertext:ciphertext.toString("base64")});
        } finally { key.fill(0); }
      }
      case "decryptBackup": {
        const e=JSON.parse(a.content);
        if(e.format!=="kaifan-backup"||e.version!==1||e.algorithm!=="AES-256-GCM"||e.kdf!=="PBKDF2-SHA256"||e.iterations!==210000||a.password.length<8||a.password.length>128)throw Error("备份密码或格式无效");
        const salt=Buffer.from(e.salt,"base64"),iv=Buffer.from(e.iv,"base64"),ciphertext=Buffer.from(e.ciphertext,"base64");
        if(salt.length!==16||iv.length!==12||ciphertext.length<17)throw Error("备份参数无效");
        const key=crypto.pbkdf2Sync(a.password,salt,210000,32,"sha256");
        try {
          const decipher=crypto.createDecipheriv("aes-256-gcm",key,iv);decipher.setAAD(Buffer.from("kaifan-backup:v1"));decipher.setAuthTag(ciphertext.subarray(-16));
          return Buffer.concat([decipher.update(ciphertext.subarray(0,-16)),decipher.final()]).toString("utf8");
        } finally { key.fill(0); }
      }
      case "http": {
        const url = new URL(a.url);
        if (url.hostname === "10.0.2.2") url.hostname = "127.0.0.1";
        const init = {
          method: a.method,
          headers: a.header,
          redirect: "manual",
        };
        if (a.extraData && a.method !== "GET")
          init.body =
            typeof a.extraData === "object"
              ? Buffer.from(a.extraData.base64, "base64")
              : a.extraData;
        const r = await fetch(url, init);
        return { responseCode: r.status, result: await r.text() };
      }
      case "export":
        this.exports.push(a);
        return true;
      case "permission":
        return true;
      case "alarmSettings":
        return true;
      case "import":
        return this.importText;
      default:
        return this.operation(action, a);
    }
  }
  close() {
    for (const d of this.dbs.values()) d.close();
  }
}
module.exports = { HostAdapter, root };
