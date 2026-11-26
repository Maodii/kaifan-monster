import { asset } from '@kit.AssetStoreKit';
import { util } from '@kit.ArkTS';
export class Vault {
 static alias(): Uint8Array { return new util.TextEncoder().encodeInto('shiku-cloud-session'); }
 static async save(value: string): Promise<void> {
  await Vault.clear();
  const data: asset.AssetMap = new Map(); data.set(asset.Tag.ALIAS, Vault.alias()); data.set(asset.Tag.SECRET, new util.TextEncoder().encodeInto(value)); data.set(asset.Tag.ACCESSIBILITY, asset.Accessibility.DEVICE_FIRST_UNLOCKED);
  await asset.add(data);
 }
 static async load(): Promise<string> {
  const query: asset.AssetMap = new Map(); query.set(asset.Tag.ALIAS, Vault.alias()); query.set(asset.Tag.RETURN_TYPE, asset.ReturnType.ALL);
  try { const found: asset.AssetMap[] = await asset.query(query); if (found.length === 0) { return ''; } return new util.TextDecoder().decodeWithStream(found[0].get(asset.Tag.SECRET) as Uint8Array); } catch (_) { return ''; }
 }
 static async clear(): Promise<void> { const query: asset.AssetMap = new Map(); query.set(asset.Tag.ALIAS, Vault.alias()); try { await asset.remove(query); } catch (_) {} }
}
