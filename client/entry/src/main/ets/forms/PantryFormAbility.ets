import { FormExtensionAbility, formBindingData, formInfo, formProvider } from '@kit.FormKit';
import { Want } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { CardData } from '../model/CardData';
export default class PantryFormAbility extends FormExtensionAbility {
 onAddForm(want: Want): formBindingData.FormBindingData {
  const prefs: preferences.Preferences = preferences.getPreferencesSync(this.context, { name: 'shiku_settings' });
  return formBindingData.createFormBindingData(prefs.getSync('cardData', JSON.stringify(new CardData())).toString());
 }
 onUpdateForm(formId: string): void {
  preferences.getPreferences(this.context, { name: 'shiku_settings' }).then(async (prefs: preferences.Preferences) => { const value: string = (await prefs.get('cardData', JSON.stringify(new CardData()))).toString(); await formProvider.updateForm(formId, formBindingData.createFormBindingData(value)); }).catch(() => { console.error('卡片刷新失败，保留上次快照'); });
 }
 onAcquireFormState(want: Want): formInfo.FormState { return formInfo.FormState.READY; }
}
