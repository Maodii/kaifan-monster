const { invoke } = require("./Platform");
exports.Vault = {
  save: async (text) => invoke("vaultSave", { text }),
  load: async () => invoke("vaultLoad"),
  clear: async () => invoke("vaultSave", { text: "" }),
};
