const bridge = window.Android;
function invoke(action, args = {}) {
  const r = JSON.parse(bridge.invoke(action, JSON.stringify(args)));
  if (r.error) throw Error(r.error);
  return r.value;
}
let next = 0;
const pending = new Map();
window.nativeResult = (id, result) => {
  const cb = pending.get(id);
  if (!cb) return;
  pending.delete(id);
  result.error ? cb.reject(Error(result.error)) : cb.resolve(result.value);
};
function nativeAsync(action, args = {}) {
  if (["http","uploadPhoto"].includes(action)) { try { require("ReleaseLegal").PrivacyAccess.require(); } catch(e) { return Promise.reject(e); } }
  return new Promise((resolve, reject) => {
    const id = String(++next);
    pending.set(id, { resolve, reject });
    bridge.async(id, action, JSON.stringify(args));
  });
}
exports.invoke = invoke;
exports.nativeAsync = nativeAsync;
exports.platformEndpoint = (value) =>
  /^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(value) ||
  /^http:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2):\d+$/.test(value);
class ResultSet {
  constructor(rows) {
    this.rows = rows;
    this.i = -1;
  }
  goToFirstRow() {
    this.i = 0;
    return this.rows.length > 0;
  }
  goToNextRow() {
    return ++this.i < this.rows.length;
  }
  getString(i) {
    return String(this.rows[this.i][i] ?? "");
  }
  getLong(i) {
    return Number(this.rows[this.i][i]);
  }
  getDouble(i) {
    return Number(this.rows[this.i][i]);
  }
  get rowCount() {
    return this.rows.length;
  }
  close() {}
}
class DB {
  constructor(name) {
    this.name = name;
  }
  async executeSql(sql, params = []) {
    invoke("db", { name: this.name, sql, params });
  }
  async querySql(sql, params = []) {
    return new ResultSet(invoke("query", { name: this.name, sql, params }));
  }
  async beginTransaction() {
    invoke("begin", { name: this.name });
  }
  async commit() {
    invoke("commit", { name: this.name });
  }
  async rollBack() {
    invoke("rollback", { name: this.name });
  }
  async close() {
    invoke("close", { name: this.name });
  }
}
exports.relationalStore = {
  SecurityLevel: { S1: 1 },
  getRdbStore: async (_, options) => new DB(options.name),
};
exports.preferences = {
  getPreferences: async (_, options) => ({
    get: async (key, fallback) =>
      invoke("prefGet", { name: options.name, key, fallback }),
    put: async (key, value) =>
      invoke("prefPut", { name: options.name, key, value }),
    flush: async () => {},
  }),
};
exports.util = {
  generateRandomUUID: () => invoke("uuid"),
  TextDecoder: {
    create: () => ({
      decodeToString: (bytes) => new TextDecoder().decode(bytes),
    }),
  },
  TextEncoder: {
    create: () => ({ encodeInto: (v) => new TextEncoder().encode(v) }),
  },
};
exports.formInfo = { FormType: { JS: 1 } };
exports.formBindingData = { createFormBindingData: (v) => v };
exports.formProvider = {
  getFormsInfo: async () => [],
  updateForm: async () => {},
};
exports.http = {
  RequestMethod: {
    GET: "GET",
    POST: "POST",
    PATCH: "PATCH",
    PUT: "PUT",
    DELETE: "DELETE",
  },
  HttpDataType: { STRING: 0 },
  createHttp: () => ({
    request: async (url, options) =>
      nativeAsync("http", {
        url,
        ...options,
        extraData:
          options.extraData instanceof ArrayBuffer
            ? {
                base64: invoke("bytes", {
                  bytes: Array.from(new Uint8Array(options.extraData)),
                }),
              }
            : options.extraData,
      }),
    destroy: () => {},
  }),
};
exports.cryptoFramework = {
  createMd: () => {
    let value = [];
    return {
      update: async (blob) => {
        value.push(...blob.data);
      },
      digest: async () => ({ data: invoke("sha256", { bytes: value }) }),
    };
  },
};
exports.fileIo = {
  OpenMode: { READ_ONLY: 0 },
  openSync: (path) => ({ fd: path }),
  statSync: (path) => ({ size: invoke("fileSize", { path }) }),
  readSync: (path, buffer) => {
    new Uint8Array(buffer).set(invoke("fileRead", { path }));
  },
  closeSync: () => {},
};
exports.context = {
  resourceManager: {
    getRawFileContent: async (path) =>
      new TextEncoder().encode(invoke("asset", { path })),
  },
};
