@Entry
@Component
struct ExpiryCard {
 @LocalStorageProp('urgentText') urgentText: string = '打开开饭小怪整理新鲜';
 @LocalStorageProp('foodId') foodId: string = '';
 build() {
  Column({ space: 9 }) {
   Row() { Text('先吃这些').fontSize(17).fontWeight(FontWeight.Bold).fontColor('#53665A').layoutWeight(1); Text('开饭小怪').fontSize(11).fontColor('#A78D6D') }.width('100%')
   Text(this.urgentText).fontSize(12).fontColor('#8B8272').lineHeight(22).width('100%').maxLines(3).layoutWeight(1)
   Row() { Text('检查到期时间 →').fontSize(11).fontColor('#B18A62').layoutWeight(1); Image($r('app.media.food_tomato')).width(42).height(35).objectFit(ImageFit.Contain) }.width('100%')
  }.width('100%').height('100%').padding(16).alignItems(HorizontalAlign.Start).backgroundColor('#FFF3DD').borderRadius(22).onClick(() => { postCardAction(this, { action: 'router', abilityName: 'EntryAbility', params: { foodId: this.foodId } }); })
 }
}
