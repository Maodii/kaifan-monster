// Platform replacement for Harmony crypto. Encryption runs on the native worker queue.
const { nativeAsync } = require("Platform");
exports.encryptBackup = (content, password) => nativeAsync("encryptBackup", { content, password });
exports.decryptBackup = (content, password) => nativeAsync("decryptBackup", { content, password });
