@Entry
@Component
struct ShoppingCard {
 @LocalStorageProp('shoppingText') shoppingText: string = '采购清单空空';
 @LocalStorageProp('shoppingId') shoppingId: string = '';
 @LocalStorageProp('count') count: string = '0';
 build() {
  Column({ space: 9 }) {
   Row() { Text('下一趟，带回家').fontSize(16).fontWeight(FontWeight.Bold).fontColor('#5A7490').layoutWeight(1); Text(this.count).fontSize(18).fontColor('#839DB5') }.width('100%')
   Text(this.shoppingText).fontSize(12).fontColor('#7E91A2').lineHeight(22).width('100%').layoutWeight(1).maxLines(3)
   Text('✓ 确认已购买').fontSize(12).fontColor('#698EA9').padding(8).backgroundColor('#FFFFFF').borderRadius(10).onClick(() => { postCardAction(this, { action: 'router', abilityName: 'EntryAbility', params: { shoppingId: this.shoppingId } }); })
  }.width('100%').height('100%').padding(16).alignItems(HorizontalAlign.Start).backgroundColor('#E7F0F8').borderRadius(22)
 }
}
