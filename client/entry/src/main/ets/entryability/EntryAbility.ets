import { UIAbility, Want, AbilityConstant } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
export default class EntryAbility extends UIAbility {
 onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
  if (want.parameters && want.parameters.shoppingId) { AppStorage.setOrCreate('openShoppingId', want.parameters.shoppingId.toString()); } if (want.parameters && want.parameters.foodId) { AppStorage.setOrCreate('openFoodId', want.parameters.foodId.toString()); } }
 onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void { if (want.parameters && want.parameters.shoppingId) { AppStorage.setOrCreate('openShoppingId', want.parameters.shoppingId.toString()); } if (want.parameters && want.parameters.foodId) { AppStorage.setOrCreate('openFoodId', want.parameters.foodId.toString()); } }
 onForeground(): void { AppStorage.setOrCreate('appForeground', true); }
 onBackground(): void { AppStorage.setOrCreate('appForeground', false); }
 onWindowStageCreate(stage: window.WindowStage): void { stage.getMainWindow().then(async(main:window.Window)=>{await main.setWindowLayoutFullScreen(false);await stage.loadContent('pages/Index');}).catch(() => { console.error('开饭小怪页面加载失败'); }); }
}
