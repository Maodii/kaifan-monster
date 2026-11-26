import { util } from '@kit.ArkTS';
import { SmsAuthDraft, smsPhone, smsPhoneError, smsWaitSeconds, smsCanSend, smsRemainingSeconds, passwordLengthOk, passwordLetterOk, passwordDigitOk } from '../model/SmsAuthCore';
import { SmsChallenge, SmsStatus } from '../model/Cloud';
import { intelligenceMeal, intelligenceRecipe, intelligenceEstimateLabel } from '../model/AssistantIntelligence';
import { AssistantWebSource, AssistantGeneratedIngredient } from '../model/AssistantCore';
import { ClientTelemetry, telemetryPage } from '../model/ClientTelemetry';
import { AssistantFeedback } from '../model/AssistantCore';
import { LegalStore, PrivacyAccess, legalTitle, legalParagraphs } from '../model/ReleaseLegal';
import { AssistantNativeDraft, assistantNativeDraft, assistantNativeBatch, assistantPrivateRecipe, assistantLocalStockHint } from '../model/AssistantNative';
import { companionAnchor, companionReflow, companionCanShow, companionShouldDismiss, companionDragTilt, companionPullDistance } from '../model/CompanionCore';
import { AnswerBlock, ComparisonRow, AssistantDraftBank, answerBlocks, answerPreview, answerPlainText, refineQuestion, assistantFault, assistantDraftKey, referenceOrder, compareDishes, assistantWaitLabel } from '../model/AssistantInteraction';
import { ExperienceSection, ExperienceSwap, experienceSections, experienceSwaps, experienceSwapDraft, experienceAdjustMenu, experienceAdjustmentOptions, experiencePrompts } from '../model/AssistantExperience';
import { experienceQuestion } from '../model/AssistantExperience';
import { pasteboard } from '@kit.BasicServicesKit';
import { assistantPlanKey, assistantPlanSnapshot, assistantDraftPlans, assistantMealForEditor, assistantMealCommand } from '../model/AssistantWorkflow';
import { COMMUNITY_ENABLED, socialRoute, AssistantLive, AssistantDish, assistantDishPrompt, assistantDishQuestion, AssistantRequest, AssistantRetry, AssistantResult, AssistantReference, AssistantPlan, AssistantTurn, ASSISTANT_TASKS, ASSISTANT_TASK_LABELS, assistantPrompts, assistantUsesWeb } from '../model/AssistantCore';
import { FilterToken, filterTokens, removeFilterToken, filterConflicts, TASTE_FEELINGS, QUICK_AMOUNTS } from '../model/InteractionPolishCore';
import { LobbySnapshot, LobbyRequest, parseLobbyRequest, lobbyScene, lobbyQuality } from '../model/LobbyCore';
import { encryptBackup, decryptBackup } from '../model/EncryptedBackup';
import { LeftoverBatch, LeftoverEvent, TrashEntry, NutritionDay, NutritionWeek, nutritionWeek, DiningPlace, diningPlaces, WeeklyProposal, suggestWeek } from '../model/DailyLivingCore';
import { techniqueAdvice } from '../model/CookingGuide';
import { WorkspaceMergeRow, workspaceMergeRows, mergedWorkspace, workspaceMergeSummary } from '../model/WorkspaceMergeCore';
import { EnergyPortion, ENERGY_SOURCES, consumedEnergy, purchaseInsight, TemporarySkip, activeSkips, auditRecipe } from '../model/ConvenienceCore';
import { WorkspacePayload, WorkspaceCheck, workspaceSignature } from '../model/WorkspaceCore';
import { HouseholdState, HouseholdMember, householdExclusions, householdPeople, DeductionPreview, DeductionLine, previewDeduction, effectiveExpiry, recipeQuality, SubstituteOption, substituteOptions, substitutedRecipe, MealFinance, FinanceTotal, mealFinance, TrialNotes, trialText, UndoAction } from '../model/DailyFlowCore';
import { cookTimeline, KitchenTimeline, KitchenTask } from '../model/KitchenWorkflowCore';
import { CatalogUpdatePackage, CatalogRecord, downloadCatalogUpdate } from '../model/CatalogUpdate';
import { ExperienceState, RecipeCollection, SavedRecipeFilter, ProcurementPreview, ProcurementLine, previewProcurement, normalizeExperience, spendingSummary, SpendingSummary, duplicatePurchase } from '../model/ExperienceCore';
import { estimateNutrition, NutritionEstimate } from '../model/NutritionCore';
import { DiscoverySummary, FavoriteCount, FavoriteSnapshot, HotSearch, FavoriteUpdate, SearchHeatEvent } from '../model/DiscoveryModels';
import { INGREDIENT_GROUPS, IngredientGroup, ingredientGroupFor, ingredientLabel, recipeHasIngredient } from '../model/IngredientDiscoveryCore';
import { RecipeSearchIndex, RecipeSearchResult, searchRecipeCatalog } from '../model/RecipeSearchCore';
import { searchRecipe, compareRecipeOrder, recipeGroupKey, recipeCuisineGroup, CUISINE_GROUPS, CuisineGroup } from '../model/RecipeDiscoveryCore';
import { displayCost, DisplayCost, dailySlogan, weekDates, shiftDay } from '../model/DailyExperienceCore';
import { newPasswordError, credentialError, normalizeEmail, normalizeEndpoint, DEFAULT_SERVICE_ENDPOINT, automaticServiceEndpoint, serviceOriginChanged } from '../model/AuthInputCore';
import { MealPlan } from '../model/MealPlan';
import { UtilityState, CookProgress, KitchenTimer, rememberValue, countdownText, missingShopping, cookingSignature, repeatMealDraft } from '../model/UtilityState';
import { occasionImage } from '../model/ResourceMap';
import { RecipeFilterOptions, normalizeRecipeFilter, MEAL_OCCASIONS, MealOccasion, matchesRecipeFilter, recipeFilterSummary } from '../model/RecipeFilterCore';
import { uiIcon } from '../model/UiIconMap';
import { DrawOptions, MenuResult, MenuAmount, drawMenu, mergeMenuIngredients, purchaseCost, estimateRecipeCost, DrawPreset, DRAW_PRESETS, menuTitle } from '../model/UsabilityCore';
import { CookingGuide, GuideStep, IngredientKnowledge, COOKING_KNOWLEDGE, buildCookingGuide, knowledgeFor, buildCookingChecklist, CookingChecklist } from '../model/CookingGuide';
import { UserProfile, ProfilePatch, ProfileRegion, PROFILE_REGIONS, cuisineForRegion } from '../model/AccountModels';
import { PortionOptions, PortionAmount, recommendPortions } from '../model/PortionCore';
import { categoryImage, recipeCover, avatarImage } from '../model/ResourceMap';
import { RankingOptions, PreferenceEvent, trainTasteModel, feedbackAction, canonicalName, compatibleUnit, recipeMinutes, matchesRankingConstraints } from '../model/RecommendationCore';
import { mealItems, totalMealCost, summarizeDishes, DishSummary, inMealPeriod } from '../model/MealRules';
import { MergeField, mergeFields, mergedPayload } from '../model/ConflictMerge';
import { Reminders } from '../model/Reminders';
import { NativeMedia, LocalPhoto } from '../model/NativeMedia';
import { http } from '@kit.NetworkKit';
import { common, bundleManager } from '@kit.AbilityKit';
import { LengthMetrics, font, window } from '@kit.ArkUI';
import { promptAction, curves } from '@kit.ArkUI';
import { fileIo, picker } from '@kit.CoreFileKit';
import { CommunityPost, CommunityPage, ShoppingClaim, ShoppingClaims, CommunityRelationship, CommunityNotification, CommunityInbox, CommunityComment, PublishRequest, CommentRequest, ReportRequest, PhotoRead } from '../model/Community';
import { Vault } from '../model/Vault';
import { connection } from '@kit.NetworkKit';
import { Cloud, SyncReport, Conflict, Session, Device, Family, FamilyName, InviteCode } from '../model/Cloud';
import { LocalStore, Snapshot } from '../model/LocalStore';
import { Food, FoodMovement, Shopping, Meal, MealItem, Recipe, Favorite, Template, Recommendation, Ingredient, RecipeSource, TEMPLATES, CATEGORIES, UNITS, dateString, daysLeft, offlineRecipes, recommend, unitFactor } from '../model/Models';

class MealEditorDraft {base:Meal=new Meal();items:MealItem[]=[];text:string[]=[];rating:number=0;fraction:number=1;photo:LocalPhoto=new LocalPhoto();photos:string[]=[];cover:boolean=true;updatedAt:number=0;}
class TrialEvidence {participants:number=0;success:number=0;needs_improvement:number=0;average_minutes:number=0;}
class BackupEnvelopeView {format:string='';}
class PublicPublishRequest { sourceId: string; kind: string = 'meal'; visibility: string = 'public'; showPrice: boolean; confirmed: boolean = true; constructor(id: string, showPrice: boolean) { this.sourceId = id; this.showPrice = showPrice; } }

class GalleryPhoto { id:string='';photoId:string='';own:boolean=false;constructor(id:string,photoId:string,own:boolean=false){this.id=id;this.photoId=photoId;this.own=own;} }
class PublicRecipe { id: string = ''; payload: Recipe = new Recipe(); }

class AccountEmail { email:string='';constructor(email:string){this.email=email;} }
class AccountToken { email:string='';token:string='';newPassword:string='';constructor(email:string,token:string,password:string){this.email=email;this.token=token;this.newPassword=password;} }
class AccountSecurity { email:string='';emailVerified:boolean=false;mailDelivery:string=''; }
class AccountMailResult { message:string=''; }
class AccountDeletion { password:string='';confirmation:string='';constructor(password:string,confirmation:string){this.password=password;this.confirmation=confirmation;} }
class PasswordRequest { currentPassword: string = ''; newPassword: string = ''; }

class FamilyMember { user_id: string = ''; email: string = ''; role: string = ''; }
class CatalogSubmission { kind: string = ''; sourceId: string = ''; confirmed: boolean = true; }
class RecommendationEvent { intent: string = 'cook'; recipeId: string = ''; action: string = ''; }

class SavedMenu { date:string='';result:MenuResult=new MenuResult();options:DrawOptions=new DrawOptions();attempt:number=0;constructor(date:string,result:MenuResult,options:DrawOptions,attempt:number){this.date=date;this.result=result;this.options=options;this.attempt=attempt;} }

@Extend(Button)
function touchFeedback() {
 .constraintSize({ minWidth: 44, minHeight: 44 })
 .stateStyles({ pressed: { .opacity(0.65) } })
}

@Component
struct LegalLinkCard {
 @Prop label:string='';@Prop detail:string='';@Prop icon:Resource=$r('app.media.legal_privacy');
 onOpen:()=>void=()=>{};
 @State pressed:boolean=false;@State focused:boolean=false;
 private readonly reduceLegalMotion:boolean=false;
 build(){
  Column(){
  Button({type:ButtonType.Normal}){
   Row({space:12}){
    Image(this.icon).width(46).height(46).objectFit(ImageFit.Contain).flexShrink(0).accessibilityLevel('no')
    Column({space:3}){Text(this.label).fontSize(16).fontWeight(FontWeight.Medium).fontColor('#3E514B').width('100%');if(this.detail){Text(this.detail).fontSize(11).lineHeight(17).fontColor('#7A8177').width('100%')}}.layoutWeight(1).alignItems(HorizontalAlign.Start)
    Text('›').fontSize(25).fontColor('#9B96A0').width(20).textAlign(TextAlign.Center).flexShrink(0)
   }.width('100%')
  }.width('100%').padding({left:14,right:14,top:12,bottom:12}).constraintSize({minHeight:64}).backgroundColor(this.pressed?'#F1EAF4':'#F5FFFFFF').borderRadius(23).border({width:this.focused?2:0.7,color:this.focused?'#8D769D':'#F8FFFFFF'}).shadow({radius:this.pressed?3:12,color:'#0C635972',offsetY:4}).scale({x:this.pressed&&!this.reduceLegalMotion?0.98:1,y:this.pressed&&!this.reduceLegalMotion?0.98:1}).animation({duration:this.reduceLegalMotion?0:160,curve:Curve.EaseOut}).onTouch((e:TouchEvent)=>{this.pressed=e.type===TouchType.Down;}).onFocus(()=>{this.focused=true;}).onBlur(()=>{this.focused=false;this.pressed=false;}).onClick(()=>{this.pressed=false;this.onOpen();}).accessibilityText(this.label+'，'+this.detail).focusable(true)
  }.width('100%').borderRadius(23).clip(true)
 }
}

@Component
struct ChoiceChip {
 private readonly reduceChipMotion:boolean=false;
 @State chipPressed:boolean=false;
 @Prop compact:boolean=false; @Prop label:string=''; @Prop selected:boolean=false; @Prop tint:string='#EDF1ED'; @Prop ink:string='#38584D';
 private linearInkChannel(value:number):number { const c:number=value/255; return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4); }
 private readableInk():string {
  if(!/^#[0-9A-Fa-f]{6}$/.test(this.ink)){return this.ink;}
  let red:number=Number.parseInt(this.ink.slice(1,3),16);let green:number=Number.parseInt(this.ink.slice(3,5),16);let blue:number=Number.parseInt(this.ink.slice(5,7),16);
  for(let step:number=0;step<12;step++){
   if(this.linearInkChannel(red)*0.2126+this.linearInkChannel(green)*0.7152+this.linearInkChannel(blue)*0.0722<=0.055){break;}
   red=Math.round(red*0.9);green=Math.round(green*0.9);blue=Math.round(blue*0.9);
  }
  return '#'+red.toString(16).padStart(2,'0')+green.toString(16).padStart(2,'0')+blue.toString(16).padStart(2,'0');
 }
 private brush():Resource {
  const red:number=Number.parseInt(this.ink.slice(1,3),16);const green:number=Number.parseInt(this.ink.slice(3,5),16);const blue:number=Number.parseInt(this.ink.slice(5,7),16);
  if(blue>red*0.9&&red>green*1.05){return $r('app.media.crayon_ribbon_lilac');}
  if(this.ink.startsWith('#A')||this.ink.startsWith('#B')){return $r('app.media.crayon_swatch_clay');}
  if(this.ink.startsWith('#9')||this.tint==='#EDDEB6'){return $r('app.media.crayon_swatch_wheat');}
  return $r('app.media.crayon_swatch_sage');
 }
 aboutToDisappear():void{this.chipPressed=false;}
 build(){
  Row(){Text(this.label).fontSize(14).lineHeight(22).maxLines(2).textOverflow({overflow:TextOverflow.Ellipsis}).fontWeight(this.selected?FontWeight.Medium:FontWeight.Normal).fontColor(this.selected?this.readableInk():'#576762').textAlign(TextAlign.Center)}.justifyContent(FlexAlign.Center).accessibilityText(this.label+(this.selected?'，已选中':'，未选中')).focusable(true).padding({left:this.compact?8:14,right:this.compact?8:14,top:8,bottom:8}).constraintSize({minHeight:44,minWidth:this.compact?44:64,maxWidth:'100%'}).flexShrink(0).backgroundColor(this.chipPressed?'#D9E4D7':Color.Transparent).backgroundImage(this.selected?this.brush():'').backgroundImageSize({width:'100%',height:'100%'}).backgroundImagePosition(Alignment.Center).borderRadius({topLeft:9,topRight:19,bottomLeft:16,bottomRight:10}).scale({x:this.chipPressed&&!this.reduceChipMotion?0.98:1,y:this.chipPressed&&!this.reduceChipMotion?0.98:1}).onTouch((event:TouchEvent)=>{this.chipPressed=event.type===TouchType.Down;}).animation({duration:this.reduceChipMotion?0:180,curve:Curve.EaseOut})
 }
}
@Component
struct FilterChip {
 @Prop label:string=''; @Prop selected:boolean=false;
 build(){ChoiceChip({label:this.label,selected:this.selected,tint:'#F2E4BB',ink:'#946C32'})}
}

@Component
struct AuthFloatingField {
 @Prop value:string='';label:string='';fieldId:string='';secret:boolean=false;numeric:boolean=false;phone:boolean=false;maxChars:number=128;
 @Prop valid:boolean=false;@Prop invalid:boolean=false;@Prop reduceMotion:boolean=false;
 onValue:(value:string)=>void=(_value:string)=>{};
 @State focused:boolean=false;@State reveal:boolean=false;
 build(){
  Stack({alignContent:Alignment.Start}){
   TextInput({text:this.value,placeholder:''}).id(this.fieldId).type(this.secret&&!this.reveal?InputType.Password:this.phone?InputType.PhoneNumber:this.numeric?InputType.Number:InputType.Normal).maxLength(this.maxChars).height(64).fontSize(16).fontColor('#354F46').padding({left:16,right:this.secret?60:44,top:23,bottom:8}).backgroundColor(Color.Transparent).borderRadius(14).onFocus(()=>{this.focused=true;}).onBlur(()=>{this.focused=false;}).onChange((v:string)=>this.onValue(v)).accessibilityText(this.label+(this.valid?'，格式正确':''))
   Text(this.label).fontSize(16).fontColor(this.focused?'#72547F':'#7B7E70').scale({x:this.focused||this.value?0.75:1,y:this.focused||this.value?0.75:1,centerX:0,centerY:0}).translate({x:16,y:this.focused||this.value?-13:0}).hitTestBehavior(HitTestMode.None).animation({duration:this.reduceMotion?0:180,curve:curves.cubicBezierCurve(0.2,0.75,0.2,1)})
   if(this.valid&&!this.secret){Row(){Blank();Text('✓').fontSize(21).fontColor('#477657').width(42).textAlign(TextAlign.Center)}.width('100%').hitTestBehavior(HitTestMode.None)}
   if(this.secret){Row(){Blank();Button(this.reveal?'隐藏':'显示',{type:ButtonType.Normal}).width(56).height(44).fontSize(13).fontColor('#72547F').backgroundColor(Color.Transparent).accessibilityText(this.reveal?'隐藏密码':'显示密码').onClick(()=>{this.reveal=!this.reveal;})}.width('100%')}
  }.width('100%').height(64).backgroundColor('#FFFCF5').border({width:this.focused?1.5:1,color:this.invalid?'#B77462':this.focused?'#80608A':this.valid?'#77997B':'#D8CBB6'}).borderRadius(14).shadow({radius:this.focused?5:0,color:'#1680608A'}).margin({top:4,bottom:4})
 }
}

@CustomDialog
struct ConfirmSheet {
 controller?:CustomDialogController;
 heading:string='';detail:string='';yes:string='确认';no:string='取消';bodyHeight:number=280;
 resolved:(answer:boolean)=>void=(_answer:boolean)=>{};
 private finished:boolean=false;
 private finish(answer:boolean):void{if(this.finished){return;}this.finished=true;this.resolved(answer);}
 build(){
  Column({space:16}){
   Row({space:12}){Text(this.heading).fontSize(22).lineHeight(29).fontWeight(FontWeight.Medium).fontColor('#354F46').layoutWeight(1);Image($r('app.media.experience_assistant')).width(38).height(38).objectFit(ImageFit.Contain).accessibilityLevel('no')}.width('100%').alignItems(VerticalAlign.Top)
   if(this.detail){Scroll(){Text(this.detail).fontSize(15).lineHeight(25).fontColor('#747768').width('100%')}.width('100%').constraintSize({maxHeight:this.bodyHeight}).scrollBar(BarState.Auto).edgeEffect(EdgeEffect.Spring)}
   Row({space:12}){
    if(this.no){Button(this.no,{type:ButtonType.Normal}).layoutWeight(1).constraintSize({minHeight:48}).fontSize(15).fontColor('#637563').backgroundColor('#EAEADD').borderRadius(14).onClick(()=>this.finish(false))}
    Button(this.yes,{type:ButtonType.Normal}).layoutWeight(1).constraintSize({minHeight:48}).fontSize(15).fontColor('#FFFDF6').backgroundColor('#56745E').borderRadius(14).onClick(()=>this.finish(true))
   }.width('100%').margin({top:4})
  }.padding(22).width('92%').constraintSize({maxWidth:440}).backgroundColor('#FFFAF0').backgroundImage($r('app.media.crayon_paper_tile'),ImageRepeat.XY).backgroundImageSize({width:360,height:360}).border({width:0.7,color:'#DDD3C1'}).borderRadius({topLeft:24,topRight:30,bottomLeft:28,bottomRight:22}).shadow({radius:24,color:'#2243364A',offsetY:8})
 }
}
@CustomDialog
struct OptionSheet {
 controller?:CustomDialogController;
 heading:string='选择';options:string[]=[];selected:string='';bodyHeight:number=320;
 resolved:(index:number)=>void=(_index:number)=>{};
 @State query:string='';private finished:boolean=false;
 private finish(index:number):void{if(this.finished){return;}this.finished=true;this.resolved(index);}
 build(){
  Column({space:12}){
   Row({space:10}){Text(this.heading).fontSize(22).lineHeight(29).fontWeight(FontWeight.Medium).fontColor('#354F46').layoutWeight(1);Button('×',{type:ButtonType.Normal}).width(44).height(44).fontSize(24).padding(0).fontColor('#747768').backgroundColor(Color.Transparent).accessibilityText('取消选择').onClick(()=>this.finish(-1))}.width('100%')
   if(this.options.length>8){TextInput({text:this.query,placeholder:'查找选项'}).height(46).fontSize(15).backgroundColor('#F0EADF').borderRadius(12).onChange((value:string)=>{this.query=value.trim();})}
   Scroll(){Column({space:6}){ForEach(this.options,(value:string,index:number)=>{if(!this.query||value.includes(this.query)){Button({type:ButtonType.Normal}){Text(value).fontSize(15).lineHeight(23).fontWeight(value===this.selected?FontWeight.Medium:FontWeight.Normal).fontColor('#354F46').textAlign(TextAlign.Center).width('100%')}.width('100%').constraintSize({minHeight:48}).padding({left:12,right:12,top:10,bottom:10}).backgroundColor(value===this.selected?'#E2EADA':'#70FFFFFF').border({width:value===this.selected?1.2:0.6,color:value===this.selected?'#789169':'#DDD3C1'}).borderRadius(12).accessibilityText(value+(value===this.selected?'，当前选中':'')).onClick(()=>this.finish(index))}},(value:string,index:number)=>String(index)+':'+value);if(this.query&&!this.options.some((value:string)=>value.includes(this.query))){Text('没有匹配的选项').fontSize(14).fontColor('#747768').padding(18)}}.width('100%')}.width('100%').constraintSize({maxHeight:this.bodyHeight}).scrollBar(BarState.Auto).edgeEffect(EdgeEffect.Spring)
  }.padding(22).width('92%').constraintSize({maxWidth:440}).backgroundColor('#FFFAF0').backgroundImage($r('app.media.crayon_paper_tile'),ImageRepeat.XY).backgroundImageSize({width:360,height:360}).border({width:0.7,color:'#DDD3C1'}).borderRadius({topLeft:24,topRight:30,bottomLeft:28,bottomRight:22}).shadow({radius:24,color:'#2243364A',offsetY:8})
 }
}

class AssistantChatLine {role:string='user';text:string='';constructor(role:string,text:string){this.role=role;this.text=text;}}
@Component
struct AssistantMascot {
 private readonly reduceMotion:boolean=false;
 @Prop @Watch('restartMotion') reactionId:number=0; @Prop mascotSize:number=144; @Prop @Watch('restartMotion') active:boolean=true; @Prop @Watch('restartMotion') thinking:boolean=false; @Prop @Watch('restartMotion') mood:string='idle';
 @State lifted:boolean=false;@State pose:number=0;@State previousPose:number=0;@State poseBlend:number=1;
 private poseTimer:number=-1;private poseRevision:number=0;private visible:boolean=false;
 aboutToAppear():void{this.visible=true;this.lifted=true;this.restartMotion();}
 aboutToDisappear():void{this.visible=false;this.stopMotion();}
 private stopMotion():void{this.poseRevision++;if(this.poseTimer>=0){clearTimeout(this.poseTimer);this.poseTimer=-1;}}
 private restartMotion():void{
  this.stopMotion();if(!this.visible){return;}if(this.reduceMotion||!this.active){this.pose=this.thinking?3:this.mood==='joy'?4:this.mood==='wave'?2:this.mood==='eat'?5:this.mood==='sleep'?7:this.mood==='stretch'?8:0;this.previousPose=this.pose;this.poseBlend=1;return;}
  const revision:number=this.poseRevision;
  if(this.thinking){this.playPoses([3,3,1,3],[950,900,140,900],0,revision);}
  else if(this.mood==='wave'){this.playPoses([2,4,2,4],[220,170,220,450],0,revision);}
  else if(this.mood==='eat'){this.playPoses([5,4,5,4],[500,280,500,450],0,revision);}
  else if(this.mood==='joy'){this.playPoses([4,0],[650,1200],0,revision);}
  else if(this.mood==='stretch'){this.playPoses([8,8,0],[750,650,400],0,revision);}
  else if(this.mood==='sleep'){this.playPoses([7,7,1],[5000,2500,180],0,revision);}
  else{this.playPoses([0,1,6,8,2,9,5,7],[5000,160,8000,1400,1400,1200,1800,10000],0,revision);}
 }
 private playPoses(frames:number[],delays:number[],index:number,revision:number):void{
  if(!this.visible||!this.active||this.reduceMotion||revision!==this.poseRevision){return;}
  this.previousPose=this.pose;this.pose=frames[index];this.poseBlend=0;animateTo({duration:120,curve:Curve.EaseInOut},()=>{this.poseBlend=1;});this.poseTimer=setTimeout(()=>{this.poseTimer=-1;if(index+1<frames.length){this.playPoses(frames,delays,index+1,revision);}else{this.playPoses(this.thinking?[3,1,3]:[0,1,6,8,2,9,5,7],this.thinking?[1400,140,1400]:[5000,160,8000,1400,1400,1200,1800,10000],0,revision);}},delays[index]);
 }
 private poseArt(pose:number):Resource{if(pose===1){return $r('app.media.ai_mascot_blink');}if(pose===2){return $r('app.media.ai_mascot_wave');}if(pose===3){return $r('app.media.ai_mascot_think');}if(pose===4){return $r('app.media.ai_mascot_joy');}if(pose===5){return $r('app.media.ai_mascot_eat');}if(pose===6){return $r('app.media.ai_mascot_peek');}if(pose===7){return $r('app.media.ai_mascot_sleep');}if(pose===8){return $r('app.media.ai_mascot_stretch');}if(pose===9){return $r('app.media.ai_mascot_surprise');}return $r('app.media.ai_mascot_idle');}
 build(){
  Stack({alignContent:Alignment.Center}){
   Ellipse().width(this.mascotSize*0.65).height(this.mascotSize*0.08).fill('#189B7E9E').blur(4).translate({y:this.mascotSize*0.39})
   Stack(){Image(this.poseArt(this.previousPose)).width(this.mascotSize).height(this.mascotSize).objectFit(ImageFit.Contain).opacity(1-this.poseBlend);Image(this.poseArt(this.pose)).width(this.mascotSize).height(this.mascotSize).objectFit(ImageFit.Contain).opacity(this.poseBlend)}.width(this.mascotSize).height(this.mascotSize).translate({y:this.lifted&&this.active&&!this.reduceMotion?-4:0}).rotate({angle:this.lifted&&this.active&&!this.reduceMotion?(this.thinking?-4:2):-1}).animation({duration:this.reduceMotion||!this.active?0:this.thinking?850:1900,iterations:this.reduceMotion||!this.active?1:-1,playMode:PlayMode.Alternate,curve:Curve.EaseInOut})
   if(this.mascotSize>60){Text('✦').fontSize(21).fontColor('#DBAD58').translate({x:-this.mascotSize*0.43,y:-this.mascotSize*0.19});Text('✧').fontSize(16).fontColor('#AB8DB9').translate({x:this.mascotSize*0.43,y:this.mascotSize*0.13})}
  }.width(this.mascotSize+12).height(this.mascotSize+8).accessibilityLevel('no')
 }
}
class RecipeCorrection {recipeId:string='';category:string='做法';detail:string='';}
@Entry
@Component
struct Index {
 @State assistantChoicePeople:number=0;@State assistantChoiceMinutes:number=0;@State assistantChoiceTaste:string='';@State assistantChoiceOpen:boolean=false;
 @State assistantStreamText:string='';@State assistantCardMenu:string='';@State assistantContextOpen:boolean=false;@State assistantLauncherOpen:boolean=false;@State assistantLauncherScene:string='today';@State assistantSection:string='';@State assistantSwapOpen:boolean=false;@State assistantSwapDraft:Recipe|null=null;@State assistantHasMenu:boolean=false;@State assistantMenuPreview:MenuResult|null=null;@State assistantFollowLatest:boolean=true;private assistantLive:AssistantLive=new AssistantLive();private assistantMenuOptions:DrawOptions=new DrawOptions();private assistantPreviewOptions:DrawOptions=new DrawOptions();private assistantReadingY:number=0;
 @State assistantContextIds:string[]=[];private assistantOrigin:string='';private assistantOriginRecipe:string='';private assistantOriginRecipeReturn:string='';
 @State assistantWave:boolean=false;@State assistantTools:boolean=false;@State assistantQuestion:string='';@State assistantMessages:AssistantChatLine[]=[];private assistantRetry:AssistantRetry=new AssistantRetry();
 @State intelligenceExpanded:boolean=false;@State assistantPrompt:string=''; @State assistantConsent:boolean=false;private aiConsentPending:boolean=false; @State assistantInventory:boolean=false;
 @State assistantBusy:boolean=false; @State assistantError:string=''; @State assistantResult:AssistantResult=new AssistantResult();
 @State assistantTask:string='ask';@State assistantPeople:number=2;@State assistantMinutes:number=30;@State assistantBudget:number=0;@State assistantExcluded:string='';@State assistantRegion:string='';@State assistantDate:string=dateString(new Date());@State assistantDays:number=7;@State assistantOptions:boolean=false;@State assistantFollowup:boolean=false;@State assistantSelected:string[]=[];@State assistantApplied:boolean=false;@State assistantApplying:boolean=false;
 private assistantSeq:number=0;private assistantOwner:string='';private assistantLastQuestion:string='';private assistantLastAnswer:string='';private assistantPlanBase:string='';
 @State recommendationsOpen:boolean=false;
 @State historyOpen:boolean=false;
 @State aiExpanded:boolean=false;@State aiStopped:string='';@State aiElapsed:number=0;@State aiReferenceOrder:string='rank';@State aiCompareIds:string[]=[];@State aiPrivacy:boolean=false;@State aiClearedDraft:string='';
 private aiDraftBank:AssistantDraftBank=new AssistantDraftBank();
 private aiSlot():string{return assistantDraftKey(this.assistantTask,this.assistantContextIds);}
 private stopAssistantReply():void{if(!this.assistantBusy){return;}this.assistantLive.cancel().catch(()=>{});this.assistantSeq++;this.aiStopped=this.assistantStreamText;this.assistantStreamText='';this.assistantBusy=false;this.assistantPrompt=this.assistantQuestion;this.assistantFollowup=false;this.assistantError='';}
 private aiRefine(kind:string):void{if(this.assistantBusy||this.assistantApplying){return;}this.assistantPrompt=refineQuestion(kind);this.assistantFollowup=!!this.assistantLastAnswer;}
 private aiRegenerate():void{if(this.assistantBusy||this.assistantApplying||!this.assistantQuestion){return;}if(this.assistantPrompt.trim()&&this.assistantPrompt!==this.assistantQuestion){this.confirm('替换输入？','使用上一问替换尚未发送的输入。',async()=>{this.assistantPrompt=this.assistantQuestion;ClientTelemetry.record('ai_retry','assistant',this.assistantTask);this.assistantRetry.clear();await this.askAssistant();});return;}this.assistantPrompt=this.assistantQuestion;ClientTelemetry.record('ai_retry','assistant',this.assistantTask);this.assistantRetry.clear();this.askAssistant();}
 private aiReferences():Recipe[]{return referenceOrder(this.assistantResult.references.map((ref:AssistantReference)=>this.experienceRecipe(ref.id)).filter((r:Recipe)=>!!r.id),this.aiReferenceOrder,this.assistantPeople);}
 private aiCompare(id:string):void{if(this.aiCompareIds.includes(id)){this.aiCompareIds=this.aiCompareIds.filter((value:string)=>value!==id);}else if(this.aiCompareIds.length<2){this.aiCompareIds=this.aiCompareIds.concat([id]);}else{this.toast('先取消一道，再选择');}}
 private aiSelectablePlans():string[]{return this.assistantResult.plans.filter((p:AssistantPlan)=>!this.store.state.plans.some((old:MealPlan)=>old.date===p.date&&old.occasion===p.occasion)).map((p:AssistantPlan)=>assistantPlanKey(p));}
 private async aiCopyStopped():Promise<void>{try{await pasteboard.getSystemPasteboard().setData(pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN,answerPlainText(this.aiStopped)+'\n\n[AI生成，未完成，仅供参考]'));this.toast('已复制未完成内容');}catch(_){this.toast('复制未完成，可长按选择');}}
 @Builder aiAnswer(text:string,live:boolean=false){
  Column({space:9}){
   Text('AI生成或本机辅助内容 · 请核实后使用').fontSize(12).fontColor('#806789').width('100%')
   ForEach(answerBlocks(answerPreview(text,live||this.aiExpanded)),(block:AnswerBlock)=>{
    Text((block.kind==='list'?'• ':'')+block.text).fontFamily('HarmonyOS Sans SC').fontSize(block.kind==='heading'?17:16).fontWeight(block.kind==='heading'?FontWeight.Medium:FontWeight.Normal).lineHeight(29).fontColor(block.kind==='heading'?'#6B5376':'#514C4F').width('100%').copyOption(CopyOptions.InApp)
   })
   if(!live&&text.length>700){Button(this.aiExpanded?'收起回答':'展开完整回答',{type:ButtonType.Normal}).height(44).fontSize(14).backgroundColor(Color.Transparent).fontColor('#76577D').onClick(()=>{this.aiExpanded=!this.aiExpanded;})}
  }.width('100%').alignItems(HorizontalAlign.Start)
 }
 @Builder aiStoppedReply(){
  if(this.aiStopped){Column({space:8}){Text('AI生成 · 回答已中断 · 内容未完成').fontSize(12).fontColor('#967652');this.aiAnswer(this.aiStopped);Row({space:7}){Button('复制已收到内容',{type:ButtonType.Normal}).height(44).fontSize(13).backgroundColor(Color.Transparent).fontColor('#806789').onClick(()=>this.aiCopyStopped());Button('编辑问题',{type:ButtonType.Normal}).height(44).fontSize(13).backgroundColor(Color.Transparent).fontColor('#806789').onClick(()=>{this.assistantPrompt=this.assistantQuestion;})}.width('100%')}.padding(12).width('100%').alignItems(HorizontalAlign.Start).backgroundColor('#F5EEE0').borderRadius({topLeft:3,topRight:14,bottomLeft:3,bottomRight:9}).margin({bottom:12})}
 }
 @Builder aiError(){
  Column({space:6}){
   Text(assistantFault(this.assistantError).title).fontSize(16).fontColor('#A76455');Text(assistantFault(this.assistantError).hint).fontSize(13).lineHeight(23).fontColor('#92735F')
   Flex({wrap:FlexWrap.Wrap}){
    if(assistantFault(this.assistantError).action==='login'){Button('去登录',{type:ButtonType.Normal}).height(44).fontSize(14).backgroundColor(Color.Transparent).fontColor('#A76455').onClick(()=>{this.authReturn='ai-assistant';this.page='auth';})}
    else{Button(assistantFault(this.assistantError).action==='wait'?'稍后重试':'重试',{type:ButtonType.Normal}).height(44).fontSize(14).backgroundColor(Color.Transparent).fontColor('#A76455').onClick(()=>this.askAssistant())}
    Button(this.assistantContextIds.length?'查看本地做法':'看看本地菜谱',{type:ButtonType.Normal}).height(44).fontSize(14).backgroundColor(Color.Transparent).fontColor('#547763').onClick(()=>{if(this.assistantContextIds.length){this.openAssistantRecipe(this.assistantContextIds[0]);}else{this.page='';this.tab=3;}})
   }.width('100%')
  }.width('100%').padding(12).alignItems(HorizontalAlign.Start).backgroundColor('#F9ECE4').borderRadius(12)
 }
 @Builder aiReplyToolbar(){
  if(this.assistantResult.source==='model'||this.aiReferences().length>1){
   Stack(){
    Row({space:2}){
     if(this.assistantResult.source==='model'){
     Button('⧉',{type:ButtonType.Normal}).width(44).height(44).touchFeedback().padding(0).fontSize(21).fontColor('#796582').backgroundColor(Color.Transparent).accessibilityText('复制回答').onClick(()=>this.copyAssistantReply())
     Button('✎',{type:ButtonType.Normal}).width(44).height(44).touchFeedback().padding(0).fontSize(21).fontColor('#537568').backgroundColor(Color.Transparent).accessibilityText('编辑问题').onClick(()=>{this.assistantPrompt=this.assistantQuestion;})
     Button('↻',{type:ButtonType.Normal}).width(44).height(44).touchFeedback().padding(0).fontSize(23).fontColor('#A0784D').backgroundColor(Color.Transparent).accessibilityText('重新生成').onClick(()=>this.aiRegenerate())
     if(this.assistantTask==='ask'){
      Button('⋯',{type:ButtonType.Normal}).width(44).height(44).touchFeedback().padding(0).fontSize(23).fontColor('#796582').backgroundColor(Color.Transparent).accessibilityText('更多追问').bindMenu([
       {value:'分步讲讲',action:()=>{this.assistantPrompt='把上一条建议分成简单、具体的操作步骤。';this.assistantFollowup=true;}},
       {value:'换个做法',action:()=>{this.assistantPrompt='根据上一条建议，换一种做法或搭配。';this.assistantFollowup=true;}},
       {value:'简短点',action:()=>this.aiRefine('short')},{value:'讲细点',action:()=>this.aiRefine('detail')},{value:'省钱点',action:()=>this.aiRefine('cheap')},{value:'清淡点',action:()=>this.aiRefine('light')}
      ])
     }
     }
     if(this.aiReferences().length>1){
      Button((this.aiReferenceOrder==='time'?'更快':this.aiReferenceOrder==='cost'?'更省':'推荐')+' ⌄',{type:ButtonType.Normal}).width(66).height(44).padding(0).fontSize(13).fontColor('#665471').backgroundColor(Color.Transparent).accessibilityText('推荐菜排序').bindMenu([{value:'原推荐',action:()=>{this.aiReferenceOrder='rank';}},{value:'用时更短',action:()=>{this.aiReferenceOrder='time';}},{value:'费用更低',action:()=>{this.aiReferenceOrder='cost';}}])
     }
    }.width('100%')
   }.width('100%').height(44)
  }
 }
 @Builder aiReferenceTools(){
  if(this.aiCompareIds.length===1){Text('再选一道，就能比较用时、费用和食材。').fontSize(13).lineHeight(24).fontColor('#89745F')}
  if(this.aiCompareIds.length===2){Column({space:8}){Row(){Text('这两道怎么选').fontSize(17).fontColor('#76577D').layoutWeight(1);Button('关闭对比',{type:ButtonType.Normal}).height(44).fontSize(12).fontColor('#89745F').backgroundColor(Color.Transparent).onClick(()=>{this.aiCompareIds=[];})}.width('100%');ForEach(compareDishes(this.experienceRecipe(this.aiCompareIds[0]),this.experienceRecipe(this.aiCompareIds[1]),this.assistantPeople),(row:ComparisonRow)=>{Column({space:4}){Text(row.label).fontSize(12).fontColor('#8A7358');Row({space:10}){Text(row.left).fontSize(14).lineHeight(24).layoutWeight(1);Text(row.right).fontSize(14).lineHeight(24).layoutWeight(1)}.width('100%')}.width('100%').padding({bottom:6}).border({width:{bottom:0.5},color:'#DDD0B9'})});Text('仅比较目录信息；费用为估算。').fontSize(12).fontColor('#927C62')}.padding(10).width('100%').alignItems(HorizontalAlign.Start).backgroundColor('#F2EAD9').borderRadius({topLeft:9,topRight:19,bottomLeft:14,bottomRight:8})}
 }
 @Builder aiPlanSelection(){
  Row(){Text('已选 '+this.assistantSelected.length+'/'+this.aiSelectablePlans().length).fontSize(13).fontColor('#6E5A76').layoutWeight(1);Button(this.aiSelectablePlans().every((key:string)=>this.assistantSelected.includes(key))?'清空选择':'全选可安排',{type:ButtonType.Normal}).height(44).fontSize(13).fontColor('#76577D').backgroundColor(Color.Transparent).enabled(!this.assistantApplied&&!this.assistantApplying).onClick(()=>{const keys:string[]=this.aiSelectablePlans();this.assistantSelected=keys.every((key:string)=>this.assistantSelected.includes(key))?[]:keys;})}.width('100%')
 }
 @Builder aiPrivacyPreview(){
  if(this.aiPrivacy){Scroll(){Column({space:5}){Text('本次发送').fontSize(14).fontWeight(FontWeight.Medium);Text('当前问题与本次条件'+(this.assistantContextIds.length?'、所选'+this.assistantContextIds.length+'道菜的摘要':'')+(this.assistantFollowup&&this.assistantTask==='ask'&&this.assistantLastAnswer?'、上一轮问答':'')+(this.assistantInventory&&this.assistantTask!=='meal'?'、示例主体库存食材名称':'')+'；需要时自动通过百炼联网检索'+'。').fontSize(12).lineHeight(21);Text('不会自动附带照片、位置、密码或完整历史；聊天保留在内存中。').fontSize(12).lineHeight(21)}.padding(10).width('100%').alignItems(HorizontalAlign.Start)}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).width('100%').constraintSize({maxHeight:this.viewportHeight<500?76:130}).backgroundColor('#EEE8F0').borderRadius(12)}
 }
 @Builder aiDraftControls(){
  Row({space:6}){
   if(this.assistantPrompt.trim()||this.aiClearedDraft){Text(this.assistantPrompt.length+'/1500').fontSize(11).fontColor(this.assistantPrompt.length>=1350?'#AA644C':'#897C87').layoutWeight(1)
   Button('清空输入',{type:ButtonType.Normal}).height(44).touchFeedback().fontSize(11).padding(3).backgroundColor(Color.Transparent).fontColor('#806789').enabled(!this.assistantBusy).onClick(()=>{if(this.assistantPrompt){this.aiClearedDraft=this.assistantPrompt;this.assistantPrompt='';}})
   if(this.aiClearedDraft){Button('恢复',{type:ButtonType.Normal}).height(44).touchFeedback().fontSize(11).padding(3).backgroundColor(Color.Transparent).fontColor('#806789').enabled(!this.assistantBusy).onClick(()=>{this.assistantPrompt=this.aiClearedDraft;this.aiClearedDraft='';})}
   }else{Blank()}
   Button('发送范围',{type:ButtonType.Normal}).height(44).touchFeedback().fontSize(11).padding(3).backgroundColor(Color.Transparent).fontColor('#806789').onClick(()=>{this.aiPrivacy=!this.aiPrivacy;})
  }.width('100%')
 }

 @State companionReaction:number=0;@State companionTilt:number=0;@State companionHidden:boolean=false;@State companionKeyboardHeight:number=0;@State companionSheetY:number=0;@State companionChatOpen:boolean=false;@State companionSide:string='right';@State companionFraction:number=0.54;@State companionDragging:boolean=false;@State companionDragX:number=0;@State companionDragY:number=0;@State companionMood:string='idle';
 private companionKeyboardWindow:window.Window|undefined=undefined;private companionAlive:boolean=false;private companionKeyboardListener:(height:number)=>void=(height:number)=>{this.companionKeyboardHeight=height;};
 private async watchCompanionKeyboard():Promise<void>{try{const win=await window.getLastWindow(this.getUIContext().getHostContext() as common.UIAbilityContext);if(!this.companionAlive){return;}this.companionKeyboardWindow=win;win.on('keyboardHeightChange',this.companionKeyboardListener);}catch(_){}}
 private companionScroller:Scroller=new Scroller();private companionOriginPage:string='';private companionOriginTab:number=0;private companionOriginRecipe:string='';private companionOriginReturn:string='';private companionReturnOpen:boolean=false;
 private assistantIsVisible():boolean{return this.page==='ai-assistant'||this.companionChatOpen;}
 private chatScroller():Scroller{return this.companionChatOpen?this.companionScroller:this.pageScroller;}
 private closeCompanion():void{if(this.assistantBusy){this.stopAssistantReply();}this.assistantReadingY=(this.companionScroller.currentOffset()?.yOffset || 0);this.getUIContext().animateTo({duration:this.reducedMotion?0:200,curve:Curve.EaseInOut},()=>{this.companionChatOpen=false;});}
 private openCompanion():void{ClientTelemetry.record('page_view','assistant');this.companionHidden=false;this.companionSheetY=0;if(this.assistantOwner!==this.cloud.session.userId){this.clearAssistant();}this.assistantOwner=this.cloud.session.userId;this.companionReturnOpen=false;this.companionOriginPage=this.page;this.companionOriginTab=this.tab;this.companionOriginRecipe=this.page==='recipe'?this.selectedRecipe.id:'';this.companionOriginReturn=this.recipeReturn;if(this.page==='recipe'&&!this.assistantResult.text&&!this.assistantQuestion&&!this.assistantPrompt&&!this.assistantMessages.length){this.assistantContextIds=[this.selectedRecipe.id];}this.getUIContext().animateTo({duration:this.reducedMotion?0:260,curve:Curve.EaseOut},()=>{this.companionChatOpen=true;});setTimeout(()=>{if(this.companionChatOpen){this.companionScroller.scrollTo({xOffset:0,yOffset:this.assistantReadingY});}},32);}
 @Builder companionPet(){
  if(this.ready&&this.page!=='account'&&!this.launchVisible&&!this.companionHidden&&companionCanShow(this.page,this.companionKeyboardHeight>0,this.companionChatOpen,this.lobbyVisible)){
   Stack(){AssistantMascot({mascotSize:56,active:this.foreground,mood:this.companionMood,reactionId:this.companionReaction})}.width(68).height(68).rotate({angle:this.reducedMotion?0:this.companionTilt}).scale({x:this.companionDragging&&!this.reducedMotion?1.035:1,y:this.companionDragging&&!this.reducedMotion?1.035:1}).accessibilityText('和小怪聊聊，可拖动到侧边').position({x:this.companionDragging?this.companionDragX:companionReflow(this.viewportWidth,this.viewportHeight,this.companionSide,this.companionFraction,68).x,y:this.companionDragging?this.companionDragY:companionReflow(this.viewportWidth,this.viewportHeight,this.companionSide,this.companionFraction,68).y}).onClick(()=>this.openCompanion()).gesture(PanGesture({direction:PanDirection.All,distance:10}).onActionStart(()=>{const a=companionReflow(this.viewportWidth,this.viewportHeight,this.companionSide,this.companionFraction,68);this.companionDragX=a.x;this.companionDragY=a.y;this.companionDragging=true;}).onActionUpdate((e:GestureEvent)=>{this.companionTilt=companionDragTilt(e.offsetX);const a=companionReflow(this.viewportWidth,this.viewportHeight,this.companionSide,this.companionFraction,68);this.companionDragX=Math.max(0,Math.min(this.viewportWidth-68,a.x+e.offsetX));this.companionDragY=Math.max(80,Math.min(this.viewportHeight-172,a.y+e.offsetY));}).onActionEnd(()=>{const a=companionAnchor(this.viewportWidth,this.viewportHeight,this.companionDragX,this.companionDragY,68);this.companionSide=a.side;this.companionFraction=a.fraction;this.getUIContext().animateTo({duration:this.reducedMotion?0:240,curve:Curve.EaseOut},()=>{this.companionDragging=false;this.companionTilt=0;});}).onActionCancel(()=>{this.companionDragging=false;this.companionTilt=0;})).bindContextMenu(this.companionPetMenu(),ResponseType.LongPress)
  }
 }
 @Builder companionPetMenu(){Menu(){MenuItem({content:'打个招呼'}).onClick(()=>{this.companionMood='wave';this.companionReaction++;});MenuItem({content:'吃一口'}).onClick(()=>{this.companionMood='eat';this.companionReaction++;});MenuItem({content:'伸伸腰'}).onClick(()=>{this.companionMood='stretch';this.companionReaction++;});MenuItem({content:'打个盹'}).onClick(()=>{this.companionMood='sleep';this.companionReaction++;});MenuItem({content:'暂时收起'}).onClick(()=>{this.companionHidden=true;this.toast('已收起，点击首页小怪可唤回');})}}
 @State companionFull:boolean=false;
 @Builder companionDialog(){
  Stack({alignContent:Alignment.Bottom}){
   Column().width('100%').height('100%').backgroundColor('#4665546D').onClick(()=>this.closeCompanion()).transition(TransitionEffect.OPACITY.animation({duration:this.reducedMotion?0:200}))
   Column(){
    if(!this.companionFull){Row(){Blank().width(34).height(4).backgroundColor('#88B59CBA').borderRadius(4)}.width('100%').height(this.viewportHeight<500?18:24).justifyContent(FlexAlign.Center).accessibilityText('收起对话，也可向下拖动').onClick(()=>this.closeCompanion()).gesture(PanGesture({direction:PanDirection.All,distance:10}).onActionUpdate((e:GestureEvent)=>{this.companionSheetY=this.reducedMotion?0:companionPullDistance(e.offsetY);}).onActionEnd((e:GestureEvent)=>{if(companionShouldDismiss(e.offsetX,e.offsetY)){this.closeCompanion();}else{this.getUIContext().animateTo({duration:this.reducedMotion?0:180,curve:Curve.EaseOut},()=>{this.companionSheetY=0;});}}).onActionCancel(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:180,curve:Curve.EaseOut},()=>{this.companionSheetY=0;});}))
    }
    this.assistantHeader()
    Scroll(this.companionScroller){Column(){this.assistantPage()}.width('100%').padding({left:14,right:14,top:8,bottom:18}).alignItems(HorizontalAlign.Start).onAreaChange(()=>{if(this.assistantBusy&&this.assistantFollowLatest){this.companionScroller.scrollEdge(Edge.Bottom);}})}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).width('100%').layoutWeight(1).scrollBar(BarState.Off).onWillScroll((x:number,y:number,state:ScrollState,source:ScrollSource)=>{if(source===ScrollSource.DRAG||source===ScrollSource.FLING||source===ScrollSource.OTHER_USER_INPUT){if(y<0){this.assistantFollowLatest=false;}this.assistantContextOpen=false;}}).onReachEnd(()=>{this.assistantFollowLatest=true;})
    this.assistantComposer()
   }.width(this.companionFull?'100%':'96%').constraintSize({maxWidth:this.companionFull?this.viewportWidth:620}).height(this.companionFull?'100%':'91%').backgroundColor('#FBF8F1').backgroundImage($r('app.media.crayon_paper_tile'),ImageRepeat.XY).backgroundImageSize({width:420,height:420}).borderRadius(this.companionFull?0:24).clip(true).translate({y:this.companionSheetY}).margin({bottom:this.companionFull?0:8}).transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({y:24})).animation({duration:this.reducedMotion?0:260,curve:Curve.EaseOut}))
  }.width('100%').height('100%')
 }
 private openAssistant():void{this.openCompanion();}
 private assistantDishes():AssistantDish[]{return this.assistantContextIds.map((id:string)=>this.recipes.find((r:Recipe)=>r.id===id)).filter((r:Recipe|undefined)=>!!r).map((item:Recipe|undefined)=>{const r:Recipe=item as Recipe;const dish:AssistantDish=new AssistantDish();dish.id=r.id;dish.name=r.name;dish.people=r.people;dish.minutes=r.minutes;dish.ingredients=r.ingredients.map((i:Ingredient)=>i.name);dish.steps=r.steps;return dish;});}
 private openContextAssistant(ids:string[],kind:string='recipe',people:number=2):void{if(this.assistantBusy||this.assistantApplying){this.toast('请先结束当前助手操作');return;}this.assistantReadingY=0;this.assistantFollowLatest=true;this.aiDraftBank.remember(this.aiSlot(),this.assistantPrompt);this.aiCompareIds=[];this.aiReferenceOrder='rank';this.assistantSection='';this.aiStopped='';this.assistantChoicePeople=0;this.assistantChoiceMinutes=0;this.assistantChoiceTaste='';this.assistantCardMenu='';this.openAssistant();this.assistantContextOpen=false;this.assistantSwapDraft=null;this.assistantMenuPreview=null;this.assistantHasMenu=kind==='menu';if(this.assistantResult.text){this.assistantMessages=this.assistantMessages.concat([new AssistantChatLine('user',this.assistantQuestion),new AssistantChatLine('assistant',this.assistantResult.text)]).slice(-10);}this.assistantResult=new AssistantResult();this.assistantQuestion='';this.assistantError='';this.assistantContextIds=ids.filter((id:string)=>this.recipes.some((r:Recipe)=>r.id===id)).slice(0,3);this.assistantTask=['week','rescue','meal','create','estimate'].includes(kind)?kind:'ask';this.assistantPeople=people;this.assistantInventory=false;this.assistantFollowup=false;this.assistantRetry.clear();this.assistantPrompt=this.assistantTask==='ask'?(ids.length?assistantDishQuestion(kind):''):assistantPrompts(kind)[0];this.assistantPrompt=this.aiDraftBank.read(this.aiSlot())||this.assistantPrompt;}
 private openAssistantRecipe(id:string):void{const recipe:Recipe|undefined=this.recipes.find((r:Recipe)=>r.id===id);if(recipe){this.assistantReadingY=(this.chatScroller().currentOffset()?.yOffset || 0);const modal:boolean=this.companionChatOpen;if(this.assistantBusy){this.stopAssistantReply();}this.companionChatOpen=false;this.openRecipe(recipe);this.recipeReturn=modal?'assistant-overlay':'ai-assistant';}}
 @State nativeDraft:AssistantNativeDraft=new AssistantNativeDraft();@State nativeApplied:boolean=false;private nativeRecipeBase:string='';
 private clearAssistant(preserveDrafts:boolean=false):void{this.nativeDraft=new AssistantNativeDraft();this.nativeApplied=false;if(!preserveDrafts){this.aiDraftBank.clear();}this.aiExpanded=false;this.historyOpen=false;this.recommendationsOpen=false;this.aiStopped='';this.aiElapsed=0;this.aiReferenceOrder='rank';this.aiCompareIds=[];this.aiPrivacy=false;this.aiClearedDraft='';this.assistantChoicePeople=0;this.assistantChoiceMinutes=0;this.assistantChoiceTaste='';this.assistantChoiceOpen=false;this.assistantLive.cancel().catch(()=>{});this.assistantStreamText='';this.assistantContextOpen=false;this.assistantHasMenu=false;this.assistantMenuPreview=null;this.assistantSwapDraft=null;this.assistantSection='';this.assistantReadingY=0;this.assistantContextIds=[];this.assistantRetry.clear();if(this.assistantOwner!==this.cloud.session.userId){this.assistantTask='ask';this.assistantPeople=2;this.assistantMinutes=30;this.assistantBudget=0;this.assistantExcluded='';this.assistantRegion='';this.assistantDate=dateString(new Date());this.assistantDays=7;}this.assistantOwner=this.cloud.session.userId;this.assistantSeq++;this.assistantBusy=false;this.assistantStreamText='';this.assistantQuestion='';this.assistantMessages=[];this.assistantTools=false;this.assistantOptions=false;this.assistantPrompt='';this.assistantError='';this.assistantConsent=false;this.intelligenceExpanded=false;this.assistantInventory=false;this.assistantFollowup=false;this.assistantLastQuestion='';this.assistantLastAnswer='';this.assistantSelected=[];this.assistantApplied=false;this.assistantResult=new AssistantResult();}
 private chooseAssistantTask(task:string):void{if(this.assistantApplying){return;}this.aiDraftBank.remember(this.aiSlot(),this.assistantPrompt);const consent:boolean=this.assistantConsent;this.clearAssistant(true);this.assistantConsent=consent;this.assistantTask=task;this.assistantPrompt=this.aiDraftBank.read(this.aiSlot());this.assistantTools=true;}
 private assistantHasNativeIntent():boolean{return (['ask','meal'].includes(this.assistantTask)&&!!assistantMealCommand(this.assistantPrompt))||this.assistantTask!=='meal'&&!!assistantNativeDraft(this.assistantPrompt,this.store.state.foods,this.recipes,this.assistantContextIds).kind;}
 private async rateAssistant(vote:string,reason:string):Promise<void>{
  const id:string=this.assistantResult.analyticsId||'';const owner:string=this.cloud.session.userId;
  if(!id||this.assistantOwner!==owner||this.assistantBusy){return;}
  const feedback:AssistantFeedback=new AssistantFeedback();feedback.eventId=id;feedback.vote=vote;feedback.reason=reason;
  try{await this.cloud.request('/telemetry/feedback',http.RequestMethod.POST,feedback);if(owner===this.cloud.session.userId){this.toast('反馈已保存，感谢帮助小怪改进');}}catch(_){if(owner===this.cloud.session.userId){this.toast('反馈未保存，请稍后重试');}}
 }
 private async askAssistant():Promise<void>{
  if(this.assistantBusy||this.assistantApplying||!this.assistantPrompt.trim()){return;}
  const mealCommand:AssistantResult|null=['ask','meal'].includes(this.assistantTask)?assistantMealCommand(this.assistantPrompt):null;
  if(mealCommand){if(this.assistantResult.text){this.assistantMessages=this.assistantMessages.concat([new AssistantChatLine('user',this.assistantQuestion),new AssistantChatLine('assistant',this.assistantResult.text)]).slice(-10);}this.assistantSeq++;this.assistantOwner=this.cloud.session.userId;this.assistantQuestion=this.assistantPrompt;this.assistantPrompt='';this.assistantError='';this.nativeDraft=new AssistantNativeDraft();this.nativeApplied=false;this.assistantLastAnswer='';this.assistantFollowup=false;this.assistantResult=mealCommand;return;}
  const native:AssistantNativeDraft=this.assistantTask==='meal'?new AssistantNativeDraft():assistantNativeDraft(this.assistantPrompt,this.store.state.foods,this.recipes,this.assistantContextIds);
  if(native.kind){this.assistantSeq++;this.nativeDraft=native;this.nativeApplied=false;this.nativeRecipeBase=JSON.stringify(this.store.state.recipes);this.assistantOwner=this.cloud.session.userId;this.assistantQuestion=this.assistantPrompt;this.assistantPrompt='';this.assistantError='';const result:AssistantResult=new AssistantResult();result.source='native';result.text=native.message;this.assistantResult=result;return;}
  this.nativeDraft=new AssistantNativeDraft();this.nativeApplied=false;
  if(!this.cloudAllowed){this.assistantError='请到我的 → 关于与支持中阅读并开启云功能';return;}

  if(this.assistantTask==='rescue'&&!this.assistantInventory){this.assistantError='请勾选附带示例主体库存食材名称';return;}
  if(!this.loggedIn){this.authReturn='ai-assistant';this.page='auth';return;}
  if(this.aiConsentPending){return;}this.aiConsentPending=true;const permissionOwner:string=this.cloud.session.userId;
  try{if(!await this.legalStore.aiGranted(permissionOwner)){if(!await this.ask('允许小怪联网回答？','问题及所选上下文将发送给阿里云百炼，按需联网检索。此设备会记住当前账号的选择，可在助手设置撤回。','同意并发送','取消')){return;}if(permissionOwner!==this.cloud.session.userId||!this.cloudAllowed){return;}await this.legalStore.setAiGranted(permissionOwner,true);}if(permissionOwner!==this.cloud.session.userId||!this.cloudAllowed){return;}this.assistantConsent=true;}catch(_){this.toast('授权未保存，请重试');return;}finally{this.aiConsentPending=false;}
  if(this.aiStopped){this.assistantMessages=this.assistantMessages.concat([new AssistantChatLine('user',this.assistantQuestion),new AssistantChatLine('assistant','未完成回复：'+this.aiStopped)]).slice(-10);}const seq:number=++this.assistantSeq;const owner:string=this.cloud.session.userId;const question:string=this.assistantPrompt.trim().slice(0,1500);this.assistantOwner=owner;if(this.assistantResult.text){this.assistantMessages=this.assistantMessages.concat([new AssistantChatLine('user',this.assistantQuestion),new AssistantChatLine('assistant',this.assistantResult.text)]).slice(-10);}this.assistantQuestion=question;this.assistantPrompt='';this.assistantTools=false;this.assistantBusy=true;this.aiExpanded=false;this.historyOpen=false;this.recommendationsOpen=false;this.aiStopped='';this.aiElapsed=0;this.assistantFollowLatest=true;this.assistantStreamText='';this.assistantError='';this.assistantResult=new AssistantResult();this.assistantSelected=[];this.assistantApplied=false;
  const body:AssistantRequest=new AssistantRequest();body.prompt=this.assistantTask==='ask'?assistantDishPrompt(experienceQuestion(question,this.assistantChoicePeople,this.assistantChoiceMinutes,this.assistantChoiceTaste),this.assistantDishes(),this.assistantChoicePeople||this.assistantPeople):question;body.consent=this.assistantConsent;body.task=this.assistantTask;body.includeInventory=this.assistantTask!=='meal'&&this.assistantInventory;body.webSearch=assistantUsesWeb(this.assistantTask,question);body.inventoryNames=body.includeInventory?this.store.state.foods.filter((f:Food)=>!f.archived&&!f.familyId&&f.quantity>0&&(!f.expiryDate||f.expiryDate>=dateString(new Date()))&&(!f.openedExpiry||f.openedExpiry>=dateString(new Date()))).slice(0,20).map((f:Food)=>f.name.slice(0,30)):[];
  if(this.assistantTask==='week'||this.assistantTask==='rescue'||this.assistantTask==='create'){body.people=this.assistantPeople;body.maxMinutes=this.assistantMinutes;body.maxCost=this.assistantBudget;body.excluded=this.assistantExcluded.split(/[,，、]/).map((v:string)=>v.trim()).filter((v:string)=>!!v);body.region=this.assistantRegion.trim();body.startDate=this.assistantDate;body.days=this.assistantDays;}
  if(this.assistantFollowup&&this.assistantTask==='ask'&&this.assistantLastAnswer){body.history=[new AssistantTurn('user',this.assistantLastQuestion),new AssistantTurn('assistant',this.assistantLastAnswer)];}
  body.excluded=Array.from(new Set(body.excluded.concat(this.excluded.split(/[,，、]/),householdExclusions(this.household)).map((v:string)=>v.trim()).filter((v:string)=>!!v)));if(body.excluded.length>12){this.assistantBusy=false;this.assistantPrompt=question;this.assistantError='忌口较多，请合并同类食材后再试';return;}
  this.assistantRetry.bind(body);const planBase:string=assistantPlanSnapshot(this.store.state.plans);
  try{const result:AssistantResult=await this.assistantLive.run(body,async(path:string,method:string,payload:Object|null)=>{if(owner!==this.cloud.session.userId){throw new Error('账号已变化');}return this.cloud.request(path,method as http.RequestMethod,payload);},(text:string)=>{if(seq===this.assistantSeq&&owner===this.cloud.session.userId&&this.assistantIsVisible()){this.assistantStreamText=text;}},(elapsed:number)=>{if(seq===this.assistantSeq){this.aiElapsed=Math.floor(elapsed/1000);}});if(seq===this.assistantSeq&&owner===this.cloud.session.userId&&this.assistantIsVisible()){this.assistantRetry.clear();const localHint:string=assistantLocalStockHint(question,this.store.state.foods);if(localHint){result.text=localHint+'\n\n'+result.text;}this.assistantResult=result;this.assistantPlanBase=planBase;this.assistantSelected=(result.plans||[]).filter((p:AssistantPlan)=>!this.store.state.plans.some((old:MealPlan)=>old.date===p.date&&old.occasion===p.occasion)).map((p:AssistantPlan)=>assistantPlanKey(p));if((result.source==='model'||result.reason==='truncated')&&this.assistantTask==='ask'){this.assistantLastQuestion=question;this.assistantLastAnswer=result.text;}this.assistantFollowup=this.assistantTask==='ask'&&(result.source==='model'||result.reason==='truncated');}}
  catch(e){if(seq===this.assistantSeq&&owner===this.cloud.session.userId&&this.assistantIsVisible()){this.assistantError=(e as Error).message||'连接失败，请重试';if(assistantFault(this.assistantError).fresh){this.assistantRetry.clear();}this.aiStopped=this.assistantStreamText;this.assistantPrompt=question;}}
  finally{if(seq===this.assistantSeq){this.assistantBusy=false;this.assistantStreamText='';}}
 }
 private async applyAssistantPlan():Promise<void>{
  if(this.assistantApplying||this.assistantApplied||this.assistantOwner!==this.cloud.session.userId){return;}
  const owner:string=this.cloud.session.userId;const seq:number=this.assistantSeq;const expected:string=this.assistantPlanBase;
  try{if(assistantPlanSnapshot(this.store.state.plans)!==expected){throw new Error('计划已变化，请重新生成草案');}const plans:MealPlan[]=assistantDraftPlans(this.assistantResult,this.recipes,this.store.state.plans,this.assistantSelected);if(!plans.length){throw new Error('请选择尚未安排的日期');}this.assistantApplying=true;
   if(!await this.ask('加入'+plans.length+'天晚餐主菜？','仅添加所选日期，不覆盖已有安排；不会记餐或扣库存。')){return;}
   if(owner!==this.cloud.session.userId||seq!==this.assistantSeq){throw new Error('账号或草案已变化');}const beforeIds:string[]=this.store.state.plans.map((p:MealPlan)=>p.id);await this.store.saveAssistantPlans(plans,expected);if(owner===this.cloud.session.userId&&seq===this.assistantSeq){this.refresh();this.assistantApplied=true;const ids:string[]=this.store.state.plans.filter((p:MealPlan)=>!beforeIds.includes(p.id)).map((p:MealPlan)=>p.id);const snapshot:string=JSON.stringify(this.store.state.plans);this.offerUndo('已加入'+plans.length+'天计划',async()=>{await this.store.undoAddedRows('meal_plans',ids,snapshot);if(seq===this.assistantSeq){this.assistantApplied=false;this.assistantPlanBase=assistantPlanSnapshot(this.store.state.plans);}this.refresh();});}
  }catch(e){this.assistantError=(e as Error).message;}finally{this.assistantApplying=false;}
 }
 private openIntelligence(kind:string):void{const q:string=kind==='inventory'?'优先用我的库存设计一道家常菜；缺少什么食材也说明。':this.searchDraft.trim()||'推荐一道家常晚餐';this.openContextAssistant([],'create');this.assistantPrompt=q;this.assistantInventory=kind==='inventory';this.assistantTools=true;}
 private editIntelligence(kind:string):void{if(this.assistantOwner!==this.cloud.session.userId){return;}try{if(kind==='recipe'&&this.assistantResult.generatedRecipe){if(this.page==='recipe-edit'){this.toast('请先完成当前菜谱编辑');return;}const r:Recipe=intelligenceRecipe(this.assistantResult.generatedRecipe,this.assistantResult.retrieval?.sources||[]);this.page='recipe-edit';if(this.page!=='recipe-edit'){return;}this.recipeDraft=r;}else if(kind==='meal'&&this.assistantResult.estimate){if(this.page==='meal'){this.toast('请先完成当前记餐');return;}const m:Meal=intelligenceMeal(this.assistantResult.estimate);this.startMeal(m);this.editingMeal.protein=m.protein;this.editingMeal.proteinSource=m.proteinSource;this.editingMeal.aiEstimateRange=m.aiEstimateRange;this.mealInitial=this.mealFingerprint();}}catch(e){this.toast((e as Error).message);}}
 @Builder assistantIntelligencePanel(){
  if(this.assistantResult.generatedRecipe){Column({space:10}){Text(this.assistantResult.generatedRecipe!.name).fontSize(21).fontWeight(FontWeight.Medium).fontColor('#426352');Text(this.assistantResult.generatedRecipe!.people+'人 · 约'+this.assistantResult.generatedRecipe!.minutes+'分钟 · 整道约¥'+this.assistantResult.generatedRecipe!.costMin+'–'+this.assistantResult.generatedRecipe!.costMax).fontSize(14).fontColor('#827560');Text('每人 '+this.assistantResult.generatedRecipe!.kcalMin+'–'+this.assistantResult.generatedRecipe!.kcalMax+'大卡 · 蛋白质'+this.assistantResult.generatedRecipe!.proteinMin+'–'+this.assistantResult.generatedRecipe!.proteinMax+'g').fontSize(14).fontColor('#827560');Button(this.intelligenceExpanded?'收起做法':'用料与做法 ︾',{type:ButtonType.Normal}).height(44).fontColor('#76577D').backgroundColor(Color.Transparent).onClick(()=>{this.intelligenceExpanded=!this.intelligenceExpanded;});if(this.intelligenceExpanded){Text(this.assistantResult.generatedRecipe!.ingredients.map((i:AssistantGeneratedIngredient)=>i.name+' '+i.quantity+i.unit).join('、')).fontSize(15).lineHeight(25);ForEach(this.assistantResult.generatedRecipe!.steps,(v:string,i:number)=>{Text((i+1)+'. '+v).fontSize(15).lineHeight(26)});Text(this.assistantResult.generatedRecipe!.assumptions.join('；')).fontSize(13).lineHeight(23).fontColor('#827560')}Button('核对并保存为私房菜').width('100%').height(48).backgroundColor('#527764').onClick(()=>this.editIntelligence('recipe'))}.width('100%').padding(12).backgroundColor('#F6F2E8').borderRadius(16).alignItems(HorizontalAlign.Start)}
  if(this.assistantResult.estimate){Column({space:10}){Text(this.assistantResult.estimate!.name).fontSize(21).fontColor('#426352');Text(this.assistantResult.estimate!.portion).fontSize(15);Text(intelligenceEstimateLabel(this.assistantResult.estimate!)).fontSize(15).lineHeight(25);Text(this.assistantResult.estimate!.assumptions.join('；')).fontSize(13).lineHeight(23).fontColor('#827560');Button('作为新记餐草稿核对').width('100%').height(48).backgroundColor('#527764').onClick(()=>this.editIntelligence('meal'))}.width('100%').padding(12).backgroundColor('#F6F2E8').borderRadius(16).alignItems(HorizontalAlign.Start)}
  if(this.assistantResult.source==='model'){if(this.assistantResult.retrieval?.status==='searched'){Column({space:8}){Text('已联网 · 百炼参考来源').fontSize(14).fontColor('#527764');ForEach(this.assistantResult.retrieval.sources,(v:AssistantWebSource)=>{Text(v.title+'\n'+v.url).fontSize(13).lineHeight(21).fontColor('#667E8B').copyOption(CopyOptions.InApp)});Text('网页仅供参考，营养与价格仍为估算').fontSize(12).fontColor('#827560')}.width('100%').alignItems(HorizontalAlign.Start)}else{Text('未联网 · 基于模型知识').fontSize(12).fontColor('#827560')}}
 }
 @Builder assistantNativePanel(){
  if(this.nativeDraft.choices.length){Column({space:8}){ForEach(this.nativeDraft.choices.slice(0,12),(id:string)=>{Button(this.nativeFoodLabel(id),{type:ButtonType.Normal}).width('100%').constraintSize({minHeight:44}).fontSize(14).fontColor('#526650').backgroundColor('#E9EBDD').onClick(()=>{const f:Food|undefined=this.store.state.foods.find((v:Food)=>v.id===id);if(f){const selected:AssistantNativeDraft=assistantNativeBatch(this.nativeDraft,f);if(!selected.ready){this.assistantError=selected.message;}else{this.assistantError='';this.nativeDraft=selected;this.assistantResult.text=selected.message;}}})})}.width('100%')}
  if(this.nativeDraft.ready){Button(this.nativeApplied?'已完成':this.nativeDraft.kind==='consume'?'确认扣减':'确认保存为私房菜',{type:ButtonType.Normal}).width('100%').height(46).fontSize(15).fontColor('#FFFFFF').backgroundColor('#527764').enabled(!this.nativeApplied&&!this.assistantApplying).onClick(()=>this.applyNativeAssistant())}
 }
 private nativeFoodLabel(id:string):string{const f:Food|undefined=this.store.state.foods.find((v:Food)=>v.id===id);return f?f.name+' · '+f.quantity+f.unit+' · '+f.location+' · '+(f.purchasedAt||'购入日期未记'):'';}
 private async applyNativeAssistant():Promise<void>{
  if(this.assistantApplying||this.nativeApplied||!this.nativeDraft.ready||this.assistantOwner!==this.cloud.session.userId){return;}
  const owner:string=this.cloud.session.userId;const seq:number=this.assistantSeq;const d:AssistantNativeDraft=this.nativeDraft;this.assistantApplying=true;
  try{
   if(!await this.ask(d.kind==='consume'?'确认扣减这批库存？':'保存为你的私房菜？',d.message)){return;}
   if(owner!==this.cloud.session.userId||seq!==this.assistantSeq||d!==this.nativeDraft){throw new Error('账号或操作已变化，请重新确认');}
   if(d.kind==='consume'){
    const f:Food|undefined=this.store.state.foods.find((v:Food)=>v.id===d.targetId);if(!f||JSON.stringify(f)!==d.expected){throw new Error('库存已变化，请重新提出扣减');}
    await this.store.consume(f,d.quantity);const undo:UndoAction|null=await this.store.lastUndo();this.offerUndo('已扣减'+d.quantity+d.unit,async()=>{if(owner!==this.cloud.session.userId||!undo||(await this.store.lastUndo())?.id!==undo.id){throw new Error('账号或最近操作已变化');}await this.store.undoLast();this.refresh();});
   }else{
    const source:Recipe|undefined=this.recipes.find((r:Recipe)=>r.id===d.targetId);if(!source||JSON.stringify(source)!==d.expected){throw new Error('菜谱已变化，请重新选择');}
    const r:Recipe=assistantPrivateRecipe(source);await this.store.saveAssistantRecipe(r,this.nativeRecipeBase);const expected:string=JSON.stringify(this.store.state.recipes.find((v:Recipe)=>v.id===r.id));this.offerUndo('已保存为私房菜',async()=>{if(owner!==this.cloud.session.userId){throw new Error('账号已变化');}await this.store.undoAssistantRecipe(r.id,expected);this.refresh();});
   }
   this.refresh();this.nativeApplied=true;this.assistantResult.text=d.kind==='consume'?'已扣减'+d.quantity+d.unit+'，库存和消耗流水已更新。':'已保存到你的私房菜，做法和来源一并保留。';this.toast('操作已完成，可撤销');
  }catch(e){this.assistantError=(e as Error).message;}finally{this.assistantApplying=false;}
 }
 private editAssistantMeal():void{if(this.page==='meal'){this.toast('请先保存或离开当前记餐，再打开新草稿');return;}if(!this.assistantResult.mealDraft||this.assistantOwner!==this.cloud.session.userId){return;}const draft:Meal=assistantMealForEditor(this.assistantResult.mealDraft);this.startMeal(draft);this.editingMeal=new Meal();this.mealInitial=this.mealFingerprint();}
 @Builder assistantConstraints(){
  Button(this.assistantOptions?'收起条件 ↑':this.assistantPeople+'人 · '+this.assistantMinutes+'分钟内 · '+(this.assistantBudget?'单菜约'+this.assistantBudget+'元内':'预算不限'),{type:ButtonType.Normal}).width('100%').height(46).fontColor('#617254').backgroundColor('#E8E8D4').onClick(()=>{this.assistantOptions=!this.assistantOptions;})
  if(this.assistantOptions){Column({space:10}){
   Flex({wrap:FlexWrap.Wrap}){ForEach([1,2,3,4,6],(n:number)=>{Button(n+'人').height(44).backgroundColor(this.assistantPeople===n?'#527764':'#E3E6D7').fontColor(this.assistantPeople===n?'#FFFFFF':'#53664E').onClick(()=>{this.assistantPeople=n;})})}
   Flex({wrap:FlexWrap.Wrap}){ForEach([20,30,45,60,90],(n:number)=>{Button(n+'分钟').height(44).backgroundColor(this.assistantMinutes===n?'#527764':'#E3E6D7').fontColor(this.assistantMinutes===n?'#FFFFFF':'#53664E').onClick(()=>{this.assistantMinutes=n;})})}
   Flex({wrap:FlexWrap.Wrap}){ForEach([0,15,30,50,100],(n:number)=>{Button(n?n+'元内':'不限预算').height(44).backgroundColor(this.assistantBudget===n?'#527764':'#E3E6D7').fontColor(this.assistantBudget===n?'#FFFFFF':'#53664E').onClick(()=>{this.assistantBudget=n;})})}
   TextInput({text:this.assistantExcluded,placeholder:'不吃的食材，用逗号分隔'}).maxLength(120).onChange((v:string)=>{this.assistantExcluded=v;})
   TextInput({text:this.assistantRegion,placeholder:'地区口味（可选，如四川）'}).maxLength(40).onChange((v:string)=>{this.assistantRegion=v;})
   if(this.assistantTask==='week'){Row({space:8}){ForEach([3,7],(n:number)=>{Button(n+'天').height(44).backgroundColor(this.assistantDays===n?'#527764':'#E3E6D7').onClick(()=>{this.assistantDays=n;})});Button(this.assistantDate).height(44).fontColor('#52664F').backgroundColor('#E3E6D7').onClick(()=>{this.dateDialog({selected:new Date(this.assistantDate+'T12:00:00'),onAccept:(v:DatePickerResult)=>{this.assistantDate=dateString(new Date(v.year||2026,v.month||0,v.day||1));}});})}}
   Text('预算按人数估算整道菜；时间为单菜备菜与制作时间。忌口筛选不能保证过敏安全。').fontSize(13).fontColor('#827560')
  }.enabled(!this.assistantBusy&&!this.assistantApplying).width('100%').margin({bottom:12})}
 }
 private async copyAssistantReply():Promise<void>{try{await pasteboard.getSystemPasteboard().setData(pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN,answerPlainText(this.assistantResult.text)+(this.assistantResult.source==='model'?'\n\n[AI生成，仅供参考]':'')));this.toast('已复制回答');}catch(e){this.toast('复制未完成，可长按回答选择文字');}}
 @Builder assistantHeader(){
  Row({space:8}){
   Button(this.companionChatOpen?'收起':'返回',{type:ButtonType.Normal}).width(60).height(42).padding({left:8,right:8}).flexShrink(0).fontSize(14).fontColor('#73547D').backgroundColor('#EEE6EF').borderRadius({topLeft:14,topRight:12,bottomLeft:11,bottomRight:15}).accessibilityText(this.companionChatOpen?'收起对话':'返回').onClick(()=>{if(this.companionChatOpen){this.closeCompanion();}else{this.run(async()=>{await this.navigateBack();});}})
   Text('小怪').fontFamily('ShikuHand').fontSize(24).fontColor('#68516F').maxLines(1).layoutWeight(1)
   if(!this.assistantFollowLatest&&!!this.assistantQuestion){Button('最新',{type:ButtonType.Normal}).height(44).touchFeedback().fontSize(13).padding({left:9,right:9}).fontColor('#73547D').backgroundColor('#EEE6EF').borderRadius(12).onClick(()=>{this.assistantFollowLatest=true;this.chatScroller().scrollEdge(Edge.Bottom);})}
   if(this.companionChatOpen){Button(this.companionFull?'小窗':'全屏',{type:ButtonType.Normal}).height(44).fontSize(13).fontColor('#65556A').backgroundColor(Color.Transparent).onClick(()=>{this.companionFull=!this.companionFull;})}
   Button('⋯',{type:ButtonType.Normal}).width(44).height(44).padding(0).backgroundColor(Color.Transparent).fontColor('#73547D').accessibilityText('助手设置').onClick(()=>{this.assistantTools=!this.assistantTools;})
   Button('新对话',{type:ButtonType.Normal}).width(70).height(42).padding({left:8,right:8}).flexShrink(0).fontSize(14).fontColor('#4E6E5B').backgroundColor('#E4ECE4').borderRadius({topLeft:12,topRight:15,bottomLeft:14,bottomRight:11}).accessibilityText('新对话').enabled(!this.assistantBusy&&!this.assistantApplying).onClick(()=>this.clearAssistant())
  }.width('100%').padding({left:12,right:12,top:6,bottom:6}).border({width:{bottom:0.5},color:'#D9CDD9'})
 }
 @Builder experienceChoices(){
  if(this.assistantTask==='ask'&&!this.assistantContextIds.length&&!this.assistantQuestion&&(!!this.assistantPrompt.trim()||this.assistantChoiceOpen)){Column({space:6}){Button('补充这次条件 · 可跳过',{type:ButtonType.Normal}).height(44).fontSize(14).fontColor('#76577D').backgroundColor(Color.Transparent).onClick(()=>{this.assistantChoiceOpen=!this.assistantChoiceOpen;});if(this.assistantChoiceOpen){Text('人数').fontSize(13).fontColor('#89745F');Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([0,1,2,4],(n:number)=>{ChoiceChip({label:n?n+'人':'不指定',selected:this.assistantChoicePeople===n}).onClick(()=>{this.assistantChoicePeople=n;})})}
Text('空余时间').fontSize(13).fontColor('#89745F');Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([0,20,40,60],(n:number)=>{ChoiceChip({label:n?n+'分钟':'不指定',selected:this.assistantChoiceMinutes===n}).onClick(()=>{this.assistantChoiceMinutes=n;})})}
Text('口味').fontSize(13).fontColor('#89745F');Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['','清淡','正常'],(v:string)=>{ChoiceChip({label:v||'不指定',selected:this.assistantChoiceTaste===v}).onClick(()=>{this.assistantChoiceTaste=v;})})}}}.width('100%').alignItems(HorizontalAlign.Start).margin({bottom:8})}
 }
 @Builder assistantPage(){
  this.experienceChoices()
  if(this.assistantContextIds.length){Column({space:0}){Row({space:2}){Scroll(){Row({space:4}){ForEach(this.assistantDishes(),(dish:AssistantDish)=>{Button(dish.name+' ↗',{type:ButtonType.Normal}).height(44).touchFeedback().fontSize(14).fontColor('#796180').backgroundColor(Color.Transparent).onClick(()=>this.openAssistantRecipe(dish.id))})}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).layoutWeight(1).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off);Button('⋯',{type:ButtonType.Normal}).width(44).height(44).touchFeedback().fontColor('#796180').backgroundColor(Color.Transparent).accessibilityText('选菜操作').onClick(()=>{this.assistantContextOpen=!this.assistantContextOpen;});Button('×',{type:ButtonType.Normal}).width(44).height(44).touchFeedback().backgroundColor(Color.Transparent).fontColor('#796180').enabled(!this.assistantBusy).accessibilityText('移除选菜上下文').onClick(()=>{this.assistantContextIds=[];this.assistantHasMenu=false;this.assistantMenuPreview=null;this.assistantSwapDraft=null;this.assistantFollowup=false;this.assistantRetry.clear();})}.width('100%');if(this.assistantContextOpen){Scroll(){Row({space:4}){ForEach(this.assistantContextIds.length>1?['shopping','prep','recipe','swap','menu']:['shopping','prep','recipe','swap'],(kind:string)=>{Button(kind==='shopping'?'采购清单':kind==='prep'?'备菜顺序':kind==='menu'?'制作顺序':kind==='swap'?'换食材':'做法要点',{type:ButtonType.Normal}).height(44).touchFeedback().fontSize(13).fontColor('#796180').backgroundColor(Color.Transparent).enabled(!this.assistantBusy).onClick(()=>{this.assistantPrompt=kind==='shopping'?'这道菜采购清单':kind==='prep'?'这道菜备菜顺序':assistantDishQuestion(kind);})})}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).width('100%').scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off)}}.width('100%').padding(4).backgroundColor('#EEE6ED').borderRadius({topLeft:9,topRight:18,bottomLeft:13,bottomRight:6}).margin({bottom:10})}
  if(this.assistantHasMenu){this.experienceMenuPanel()}

  if(!this.assistantQuestion&&!this.assistantMessages.length){
   Column({space:10}){
    AssistantMascot({mascotSize:this.assistantContextIds.length?84:184,active:this.foreground,mood:this.assistantWave?'wave':'eat'}).rotate({angle:this.assistantWave&&!this.reducedMotion?7:0}).animation({duration:this.reducedMotion?0:280,iterations:2,playMode:PlayMode.Alternate,curve:Curve.EaseInOut}).onClick(()=>{this.assistantWave=!this.assistantWave;})
    Text(this.assistantContextIds.length?'这道菜，一起做好':this.assistantTask==='meal'?'这一餐，轻松记下':this.assistantTask==='rescue'?'先把现有的吃好':'今天，也要好好吃饭').fontFamily('ShikuHand').fontSize(this.viewportWidth<360?24:28).fontColor('#67516C').textAlign(TextAlign.Center).width('100%')
    Text(this.assistantContextIds.length?'火候、替换、备菜，挑一个问。':'想吃什么？和我聊聊。').fontSize(14).fontColor('#9A7E70')
    Flex({wrap:FlexWrap.Wrap,justifyContent:FlexAlign.Center,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(8)}}){ForEach(experiencePrompts(this.assistantTask,this.assistantContextIds.length>0).slice(0,2),(prompt:string)=>{Button(prompt,{type:ButtonType.Normal}).constraintSize({minHeight:44}).fontSize(13).padding({left:13,right:13}).fontColor('#6F6573').backgroundColor('#B3FFFFFF').border({width:0.5,color:'#D5C7D0'}).borderRadius({topLeft:17,topRight:12,bottomLeft:10,bottomRight:18}).onClick(()=>{this.assistantPrompt=prompt;})})}.width('100%').margin({top:14})
   }.width('100%').padding({top:24,bottom:20})
  }
  if(this.assistantMessages.length){
   Button(this.historyOpen?'收起之前的对话':'展开之前的对话',{type:ButtonType.Normal}).height(44).fontSize(14).fontColor('#66516D').backgroundColor(Color.Transparent).onClick(()=>{this.historyOpen=!this.historyOpen;})
   if(this.historyOpen){ForEach(this.assistantMessages,(line:AssistantChatLine)=>{
   Row({space:8}){if(line.role==='assistant'){AssistantMascot({mascotSize:30,active:false})}if(line.role==='user'){Blank().width(32)}if(line.role==='assistant'){Column(){this.aiAnswer(line.text,true)}.layoutWeight(1)}else{Text(line.text).fontSize(16).lineHeight(28).fontColor('#634E6D').padding(12).backgroundColor('#E9DFEF').borderRadius({topLeft:18,topRight:18,bottomLeft:18,bottomRight:5}).layoutWeight(1)}}.width('100%').alignItems(VerticalAlign.Top).margin({bottom:18})
  })}
  }
  if(this.assistantQuestion){Row(){Blank().width(36);Text(this.assistantQuestion).fontSize(16).lineHeight(28).fontColor('#634E6D').padding(12).backgroundColor('#E9DFEF').borderRadius({topLeft:18,topRight:18,bottomLeft:18,bottomRight:5}).layoutWeight(1)}.justifyContent(FlexAlign.End).width('100%').margin({top:8,bottom:20})}
  if(this.assistantBusy){Column({space:8}){Row({space:9}){AssistantMascot({mascotSize:34,active:this.foreground,thinking:true});Text('AI生成 · '+assistantWaitLabel(this.aiElapsed,!!this.assistantStreamText)).fontSize(13).layoutWeight(1).fontColor('#8A768F')}.width('100%');if(this.assistantStreamText){this.aiAnswer(this.assistantStreamText,true)}}.width('100%').alignItems(HorizontalAlign.Start).margin({bottom:14})}
  if(this.assistantError){this.aiError()}
  this.aiStoppedReply()
  if(this.assistantResult.source==='model'&&this.assistantResult.text){Text('AI 生成 · 仅供参考').fontSize(13).fontColor('#806789').width('100%')}
  if(this.assistantResult.text){Row({space:8}){AssistantMascot({mascotSize:38,active:this.foreground,mood:'joy'});Column({space:12}){
   this.aiAnswer(this.assistantResult.text,true)
   this.assistantNativePanel()
   this.assistantIntelligencePanel()
   if(this.assistantResult.source!=='model'&&this.assistantResult.source!=='native'){Text(this.assistantResult.plans?.length?'菜谱规则草案':this.assistantResult.reason==='no_matches'?'换组条件试试':'服务暂不可用').fontSize(12).fontColor('#987753')}
   if(this.assistantResult.task==='rescue'){Text('匹配'+this.assistantResult.inventoryUsed+'项示例主体库存 · 跳过'+this.assistantResult.expiredExcluded+'项过期记录').fontSize(14).fontColor('#826A4F');if(!this.assistantResult.inventoryUsed){Text('可先补充或同步食材，也可以按下方菜谱准备采购。').fontSize(15).fontColor('#826A4F')}}
   if(this.assistantResult.plans&&this.assistantResult.plans.length){Text('晚餐主菜草案 · 自行补充蔬菜主食').fontSize(15).fontColor('#826A4F');this.aiPlanSelection();ForEach(this.assistantResult.plans,(p:AssistantPlan)=>{Row({space:8}){Checkbox({name:assistantPlanKey(p)}).select(this.assistantSelected.includes(assistantPlanKey(p))).enabled(!this.assistantApplied&&!this.assistantApplying&&!this.store.state.plans.some((old:MealPlan)=>old.date===p.date&&old.occasion===p.occasion)).onChange((v:boolean)=>{this.assistantSelected=v?this.assistantSelected.concat([assistantPlanKey(p)]):this.assistantSelected.filter((key:string)=>key!==assistantPlanKey(p));});Column({space:3}){Text(p.date.slice(5)+' · '+p.name).fontSize(16);Text(p.minutes+'分钟 · '+(p.estimatedCost>=0?'约'+p.estimatedCost+'元':'花费待核对')).fontSize(13).fontColor('#827560')}.alignItems(HorizontalAlign.Start).layoutWeight(1)}});Button(this.assistantApplied?'已加入计划':'确认加入所选计划').height(48).width('100%').backgroundColor('#527764').enabled(!this.assistantApplied&&!this.assistantApplying&&this.assistantSelected.length>0).onClick(()=>this.applyAssistantPlan());if(this.assistantApplied){Button('查看计划').height(44).onClick(()=>{this.planDate=this.assistantDate;this.page='meal-plan';})}}
   if(this.assistantResult.mealDraft){Text(this.assistantResult.mealDraft.name+' · '+this.assistantResult.mealDraft.mealType).fontSize(18);Text((this.assistantResult.mealDraft.estimatedCost>=0?'实付'+this.assistantResult.mealDraft.estimatedCost+'元':'花费未提供')+' · '+(this.assistantResult.mealDraft.calories>=0?this.assistantResult.mealDraft.calories+'大卡':'热量未提供')).fontSize(14).fontColor('#827560');Button('核对记录 / 添加照片').height(48).width('100%').backgroundColor('#527764').onClick(()=>this.editAssistantMeal())}
   if(this.assistantResult.source==='model'&&this.assistantResult.analyticsId){Button('评价回答',{type:ButtonType.Normal}).height(44).fontSize(13).fontColor('#65556A').backgroundColor(Color.Transparent).bindMenu([{value:'有帮助',action:()=>this.rateAssistant('up','helpful')},{value:'不准确',action:()=>this.rateAssistant('down','inaccurate')},{value:'不相关',action:()=>this.rateAssistant('down','irrelevant')},{value:'太慢了',action:()=>this.rateAssistant('down','too_slow')}])}
   this.aiReplyToolbar()
   this.aiReferenceTools()
   if(this.aiReferences().length){
    Button({type:ButtonType.Normal}){
     Row({space:10}){Text('推荐菜 · '+this.aiReferences().length+' 道').fontSize(15).fontWeight(FontWeight.Medium).fontColor('#36584A');Text(this.aiReferences().slice(0,2).map((r:Recipe)=>r.name).join('、')).layoutWeight(1).fontSize(12).fontColor('#6D7068').maxLines(1).textOverflow({overflow:TextOverflow.Ellipsis});Text(this.recommendationsOpen?'⌃':'⌄').fontSize(16).fontColor('#67756A')}.width('100%')
    }.width('100%').constraintSize({minHeight:48}).padding({left:12,right:12}).borderRadius(14).backgroundColor('#FFFDF7').border({width:1,color:'#DED8CA'}).accessibilityText((this.recommendationsOpen?'收起':'展开')+'推荐菜，共'+this.aiReferences().length+'道').onClick(()=>{this.recommendationsOpen=!this.recommendationsOpen;})
    if(this.recommendationsOpen){Scroll(){Row({space:8}){ForEach(this.aiReferences(),(recipe:Recipe)=>{Column(){this.experienceRecipeCard(recipe.id)}.width(Math.min(280,Math.max(160,this.viewportWidth-126)))})}.alignItems(VerticalAlign.Top)}.width('100%').scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Auto)}
   }
   if(this.assistantContextIds.length&&this.assistantTask==='ask'){this.experienceRecipeSections()}

  }.width('100%').layoutWeight(1).alignItems(HorizontalAlign.Start)}.width('100%').alignItems(VerticalAlign.Top).transition(TransitionEffect.OPACITY.animation({duration:this.reducedMotion?0:240}))}
 }
 @State assistantGuideOpen:boolean=false;private assistantActionRecipeId:string='';
 private experienceRecipe(id:string):Recipe{return this.recipes.find((r:Recipe)=>r.id===id)||new Recipe();}
 private experienceCost(id:string):string{const r:Recipe=this.experienceRecipe(id);const cost=estimateRecipeCost(r,this.assistantPeople);return cost.usable?'约¥'+cost.total:'费用待估算';}
 private experienceIcon(task:string):Resource{if(task==='week'){return $r('app.media.experience_plan');}if(task==='rescue'){return $r('app.media.experience_ingredients');}if(task==='timer'){return $r('app.media.experience_timer');}return $r('app.media.experience_assistant');}
 private experienceTasks():string[]{if(this.assistantLauncherScene==='recipe'){return ['recipe','swap'];}return this.assistantLauncherScene==='inventory'?['rescue','ask']:this.assistantLauncherScene==='meals'?['meal','ask']:['week','rescue','meal','ask'];}
 private experienceTaskLabel(task:string):string{if(task==='recipe'){return '讲讲做法';}if(task==='swap'){return '换食材参考';}return task==='week'?'安排几天吃什么':task==='rescue'?'库存先吃什么':task==='meal'?'一句话记下这一餐':'和小怪聊聊';}
 @Builder experienceLauncher(){
  Column({space:9}){Text('小怪帮你').fontFamily('ShikuHand').fontSize(27).fontColor('#76577D').width('100%').margin({bottom:8});if(this.assistantLauncherScene==='meals'){Row({space:8}){Button('在家做饭').layoutWeight(1).height(48).fontColor('#547763').backgroundColor('#E8EEE4').onClick(()=>{this.assistantLauncherOpen=false;this.recommendScene='做饭';this.page='';this.tab=3;});Button('外食 / 外卖记餐').layoutWeight(1).height(48).fontColor('#76577D').backgroundColor('#F0E7EE').onClick(()=>{this.assistantLauncherOpen=false;this.startMeal();this.mealDining='餐馆';this.mealInitial=this.mealFingerprint();})}.width('100%')}
ForEach(this.experienceTasks(),(task:string)=>{Row({space:12}){Image(this.experienceIcon(task)).width(42).height(42).objectFit(ImageFit.Contain);Text(this.experienceTaskLabel(task)).fontSize(17).fontColor('#65516B').layoutWeight(1);Text('↗').fontSize(21).fontColor('#92759A')}.width('100%').constraintSize({minHeight:64}).padding(8).border({width:{bottom:0.5},color:'#DACFC2'}).onClick(()=>{this.assistantLauncherOpen=false;if(task==='recipe'||task==='swap'){this.openContextAssistant([this.selectedRecipe.id],task);}else{this.openContextAssistant([],task);}})})}.width('100%').padding({left:24,right:24,top:12,bottom:24}).alignItems(HorizontalAlign.Start)
 }
 @Builder experienceRecipeCard(id:string){
  if(this.experienceRecipe(id).id){Column({space:0}){Row({space:10}){Image(this.recipeImage(id)).sourceSize({width:256,height:256}).width(82).height(82).objectFit(ImageFit.Contain).geometryTransition('experience-recipe-'+id);Column({space:6}){Text(this.experienceRecipe(id).name).fontFamily('HarmonyOS Sans SC').fontSize(18).fontWeight(FontWeight.Medium).fontColor('#504B4E').maxLines(2);Text((this.experienceRecipe(id).minutes>0?'约'+this.experienceRecipe(id).minutes+'分钟':'耗时待核')+' · '+this.experienceCost(id)).fontSize(13).fontColor('#89745F')}.layoutWeight(1).alignItems(HorizontalAlign.Start);Text('↗').fontSize(20).fontColor('#76577D')}.width('100%').padding(8).onClick(()=>this.openAssistantRecipe(id));Row({space:6}){Button({type:ButtonType.Normal}){this.paperHeart(this.favorites.some((f:Favorite)=>f.recipeId===id),id)}.width(44).height(44).padding(0).backgroundColor(Color.Transparent).clip(false).accessibilityText('收藏'+this.experienceRecipe(id).name).onClick(()=>this.toggleRecipeFavorite(id));Button(this.aiCompareIds.includes(id)?'已选对比':'对比',{type:ButtonType.Normal}).height(44).fontSize(13).fontColor('#76577D').backgroundColor(Color.Transparent).onClick(()=>this.aiCompare(id))}.width('100%');Row({space:6}){Button('看做法',{type:ButtonType.Normal}).height(44).fontSize(13).layoutWeight(1).fontColor('#76577D').backgroundColor(Color.Transparent).onClick(()=>this.openAssistantRecipe(id));Button('安排 ⋯',{type:ButtonType.Normal}).height(44).fontSize(13).layoutWeight(1).fontColor('#76577D').backgroundColor(Color.Transparent).onClick(()=>{this.assistantCardMenu=this.assistantCardMenu===id?'':id;})}.width('100%');if(this.assistantCardMenu===id){Row({space:6}){Button('加入计划').layoutWeight(1).height(44).fontSize(13).fontColor('#76577D').backgroundColor('#F0E8EE').onClick(()=>this.experienceAddPlan(id));Button('采购预览').layoutWeight(1).height(44).fontSize(13).fontColor('#547763').backgroundColor('#E8EEE4').onClick(()=>{this.assistantActionRecipeId=id;this.page='assistant-shopping';})}.width('100%').padding(8);Button('保存为私房菜',{type:ButtonType.Normal}).width('100%').height(44).padding({left:8,right:8}).fontSize(13).fontColor('#76577D').backgroundColor('#F0E8EE').onClick(()=>{this.assistantContextIds=[id];this.assistantTask='ask';this.assistantPrompt='把这道菜加入我的菜谱';this.askAssistant();})}}.width('100%').backgroundColor('#FFFDF8').border({width:0.5,color:'#DED5C7'}).borderRadius({topLeft:10,topRight:20,bottomLeft:14,bottomRight:9}).margin({top:10})}
 }
 private experienceAddPlan(id:string):void{this.confirm('安排这道菜？',this.assistantDate+' 晚餐 · '+this.assistantPeople+'人份；不会记餐或扣库存。',async()=>{if(this.store.state.plans.some((p:MealPlan)=>p.recipeId===id&&p.date===this.assistantDate&&p.occasion==='晚餐')){this.toast('这一餐已安排这道菜');return;}const p:MealPlan=new MealPlan();p.date=this.assistantDate;p.people=this.assistantPeople;p.recipeId=id;await this.store.saveMealPlan(p);const expected:string=JSON.stringify(this.store.state.plans);this.refresh();this.offerUndo('已加入计划',async()=>{await this.store.undoAddedRows('meal_plans',[p.id],expected);this.refresh();});});}
 @Builder experienceShoppingPreview(){
  Image($r('app.media.experience_shopping')).width(42).height(42).objectFit(ImageFit.Contain);Text('补齐这一餐').fontFamily('ShikuHand').fontSize(26).fontColor('#547763').margin({bottom:12});ForEach(missingShopping(this.experienceRecipe(this.assistantActionRecipeId),this.foods,this.store.state.shopping,dateString(new Date())),(item:Shopping)=>{Row(){Text(item.name).fontSize(17).layoutWeight(1);Text(item.quantity+item.unit).fontSize(15).fontColor('#89745F')}.width('100%').padding(12)});Button('确认加入采购').height(48).width('100%').backgroundColor('#547763').onClick(()=>this.run(async()=>{await this.addMissing(this.experienceRecipe(this.assistantActionRecipeId));this.page='ai-assistant';}))
 }
 private experienceCurrentRecipe():Recipe{return this.assistantSwapDraft||this.experienceRecipe(this.assistantContextIds[0]||'');}
 @Builder experienceRecipeSections(){
  Column({space:3}){Button(this.assistantSwapDraft?'本次替换草稿 ↓':'菜谱步骤 ↓',{type:ButtonType.Normal}).width('100%').height(44).fontSize(15).fontColor('#76577D').backgroundColor(Color.Transparent).onClick(()=>{this.assistantGuideOpen=!this.assistantGuideOpen;});if(this.assistantGuideOpen){if(this.assistantSwapDraft){Text(this.assistantSwapDraft.methodNotes).fontSize(14).lineHeight(24).fontColor('#89745F')}ForEach(experienceSections(this.experienceCurrentRecipe()),(section:ExperienceSection)=>{Column(){Row(){Text(section.title).fontSize(16).fontColor('#715575').layoutWeight(1);Text(this.assistantSection===section.key?'−':'+').fontSize(20).fontColor('#89745F')}.width('100%').constraintSize({minHeight:44}).onClick(()=>{this.assistantSection=this.assistantSection===section.key?'':section.key;});if(this.assistantSection===section.key){ForEach(section.lines,(line:string)=>{Text(line).fontFamily('HarmonyOS Sans SC').fontSize(15).lineHeight(26).fontColor('#514C4F').width('100%').margin({bottom:8})})}}.width('100%').border({width:{bottom:0.5},color:'#DACFC0'})});Row({space:6}){if(!this.assistantSwapDraft){Button('进入做菜').layoutWeight(1).height(44).fontSize(14).fontColor('#547763').backgroundColor('#E8EEE4').onClick(()=>{this.openAssistantRecipe(this.assistantContextIds[0]);this.page='cook-guide';})}Button('开计时器').layoutWeight(1).height(44).fontSize(14).fontColor('#9A7833').backgroundColor('#F3E6C9').onClick(()=>this.run(async()=>{this.selectedRecipe=this.experienceCurrentRecipe();await this.beginKitchenTimer(10);}))}.width('100%')}if(!this.assistantSwapDraft&&experienceSwaps(this.experienceCurrentRecipe()).length){Button('食材替换对照 ↓',{type:ButtonType.Normal}).width('100%').height(44).fontSize(15).fontColor('#76577D').backgroundColor(Color.Transparent).onClick(()=>{this.assistantSwapOpen=!this.assistantSwapOpen;});if(this.assistantSwapOpen){ForEach(experienceSwaps(this.experienceCurrentRecipe()),(swap:ExperienceSwap)=>{Column({space:7}){Text(swap.from+' → '+swap.to).fontSize(17).fontWeight(FontWeight.Medium);Text('参考起点 '+swap.ratio+'倍 · '+swap.texture).fontSize(14).lineHeight(24);Text(swap.operation).fontSize(14).lineHeight(24);Text(swap.caution).fontSize(13).lineHeight(23).fontColor('#8A684E');Button('形成这次草稿').height(44).fontSize(14).onClick(()=>this.confirm('采用参考替换？','原菜谱保持不变，仅形成这次制作草稿。',async()=>{this.assistantSwapDraft=experienceSwapDraft(this.experienceCurrentRecipe(),swap);this.assistantGuideOpen=true;this.assistantSection='ingredients';}))}.width('100%').alignItems(HorizontalAlign.Start).padding(10).backgroundColor('#FAF0DD').borderRadius(12)})}}}.width('100%').alignItems(HorizontalAlign.Start).margin({top:12})
 }
 private experienceAdjust(kind:string):void{try{const recipes:Recipe[]=this.drawCandidates();this.assistantPreviewOptions=experienceAdjustmentOptions(recipes,this.assistantContextIds,this.assistantMenuOptions,kind);this.assistantMenuPreview=experienceAdjustMenu(recipes,this.assistantContextIds,this.assistantMenuOptions,kind);}catch(e){this.toast((e as Error).message);}}
 private experienceApplyMenu():void{if(!this.assistantMenuPreview){return;}const before:string[]=this.assistantContextIds.slice();const old:DrawOptions=JSON.parse(JSON.stringify(this.assistantMenuOptions)) as DrawOptions;const after:string[]=this.assistantMenuPreview.ids.slice();this.assistantContextIds=after;this.assistantMenuOptions=this.assistantPreviewOptions;this.assistantMenuPreview=null;this.assistantFollowup=false;this.assistantPrompt='按调整后的菜品安排备菜与制作顺序。';this.offerUndo('餐单草案已调整',async()=>{if(JSON.stringify(this.assistantContextIds)!==JSON.stringify(after)){throw new Error('餐单已变化');}this.assistantContextIds=before;this.assistantMenuOptions=old;});}
 @Builder experienceMenuPanel(){
  Column({space:8}){Row({space:4}){ForEach(['cheaper','faster','mild','replace'],(kind:string,index:number)=>{Button(['便宜点','快一点','少辣','换一道'][index],{type:ButtonType.Normal}).height(40).layoutWeight(1).fontSize(13).padding({left:3,right:3}).fontColor('#89704A').backgroundColor('#F3E6D1').onClick(()=>this.experienceAdjust(kind))})}.width('100%');if(this.assistantMenuPreview){Column({space:8}){Text('替换后').fontSize(16).fontWeight(FontWeight.Medium);Text(this.assistantMenuPreview.ids.map((id:string)=>this.experienceRecipe(id).name).join('、')).fontSize(15).lineHeight(25);Text('约'+this.assistantMenuPreview.minutes+'分钟 · '+(this.assistantMenuPreview.costComplete===false?'费用待核':'约¥'+this.assistantMenuPreview.cost)).fontSize(13).fontColor('#89745F');Row({space:6}){Button('采用草案').layoutWeight(1).height(44).fontSize(14).onClick(()=>this.experienceApplyMenu());Button('保留原餐单').layoutWeight(1).height(44).fontSize(14).fontColor('#89745F').backgroundColor('#F5EBDD').onClick(()=>{this.assistantMenuPreview=null;})}}.width('100%').alignItems(HorizontalAlign.Start).padding(12).backgroundColor('#F9EFD9').borderRadius({topLeft:8,topRight:17,bottomLeft:12,bottomRight:7})}}.width('100%').margin({bottom:10})
 }

 @Builder assistantComposer(){
  Column({space:4}){

   if(this.assistantTools){Scroll(){Column({space:10}){
    Button('撤回联网授权',{type:ButtonType.Normal}).height(44).enabled(this.loggedIn&&!this.assistantBusy).onClick(()=>this.run(async()=>{await this.legalStore.setAiGranted(this.cloud.session.userId,false);this.assistantConsent=false;this.assistantInventory=false;this.assistantTools=false;this.toast('已撤回联网授权');}))
    Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(ASSISTANT_TASKS,(task:string,index:number)=>{Button(ASSISTANT_TASK_LABELS[index],{type:ButtonType.Normal}).height(44).fontSize(14).backgroundColor(this.assistantTask===task?'#8B7191':'#F0EAF1').fontColor(this.assistantTask===task?'#FFFFFF':'#7A6481').enabled(!this.assistantBusy&&!this.assistantApplying).onClick(()=>this.chooseAssistantTask(task))})}
    if(this.assistantTask==='ask'){Button('库存体检',{type:ButtonType.Normal}).height(44).touchFeedback().fontSize(14).backgroundColor('#E9EBDD').fontColor('#526650').onClick(()=>{this.assistantPrompt='库存体检';this.assistantTools=false;})}
    if(this.assistantTask==='week'||this.assistantTask==='rescue'||this.assistantTask==='create'){this.assistantConstraints()}
    if(this.assistantTask!=='meal'){Row({space:6}){Checkbox({name:'ai-inventory'}).select(this.assistantInventory).enabled(!this.assistantBusy).onChange((v:boolean)=>{this.assistantInventory=v;});Text('附带示例主体库存食材名称').fontSize(13).fontColor('#85758A').layoutWeight(1)}.width('100%')}
    if(this.assistantTask==='ask'&&this.assistantLastAnswer){Row({space:6}){Checkbox({name:'ai-context'}).select(this.assistantFollowup).enabled(!this.assistantBusy).onChange((v:boolean)=>{this.assistantFollowup=v;});Text('附带上一轮问答').fontSize(13).fontColor('#85758A').layoutWeight(1)}.width('100%')}
   }.width('100%').alignItems(HorizontalAlign.Start).padding(12)}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).width('100%').constraintSize({maxHeight:Math.max(90,Math.min(280,this.viewportHeight*0.36))}).backgroundColor('#FFFDFA').border({width:0.5,color:'#DDCFDC'}).borderRadius(18).scrollBar(BarState.Off).transition(TransitionEffect.OPACITY.animation({duration:this.reducedMotion?0:180}))}
   Row({space:8}){
    TextArea({text:this.assistantPrompt,placeholder:this.assistantTask==='meal'?'说说这一餐吃了什么…':'想吃什么，问问小怪…'}).maxLength(1500).enterKeyType(EnterKeyType.Send).onSubmit((key:EnterKeyType,event:SubmitEvent)=>{event.keepEditableState();this.askAssistant();}).height(44).fontSize(16).fontColor('#5A4C5F').backgroundColor(Color.Transparent).layoutWeight(1).enabled(!this.assistantBusy&&!this.assistantApplying).onChange((v:string)=>{this.assistantPrompt=v;})
    Button(this.assistantBusy?'暂停':'发送',{type:ButtonType.Normal}).width(60).height(44).fontSize(14).fontWeight(FontWeight.Medium).fontColor(!!this.assistantPrompt.trim()?'#FFFDFA':'#86748D').backgroundColor(!!this.assistantPrompt.trim()?'#89708F':'#E5DFE8').borderRadius(15).accessibilityText(this.assistantBusy?'停止回答':'发送消息').enabled(this.assistantBusy||(!this.assistantApplying&&!!this.assistantPrompt.trim())).onClick(()=>{if(this.assistantBusy){this.stopAssistantReply();}else{this.askAssistant();}})
   }.width('100%').padding({left:3,right:7,top:3,bottom:3}).backgroundColor('#FFFEFA').border({width:0.8,color:'#D8C9D6'}).borderRadius({topLeft:21,topRight:23,bottomLeft:20,bottomRight:19})
   if(!this.loggedIn){Button('登录后就能聊',{type:ButtonType.Normal}).height(44).touchFeedback().fontSize(13).backgroundColor(Color.Transparent).fontColor('#87638E').onClick(()=>{this.authReturn='ai-assistant';this.page='auth';})}
  }.width('100%').padding({left:this.pageGutter(),right:this.pageGutter(),top:6,bottom:8}).backgroundColor('#FBF8F1').border({width:{top:0.5},color:'#DDCFDC'})
 }

 @State appVersion:string='';
 private legalStore:LegalStore=new LegalStore(); @State policyLoaded:boolean=false; @State policyChosen:boolean=false; @State cloudAllowed:boolean=false;@State analyticsEnabled:boolean=false; @State legalKey:string=''; @State legalError:string=''; @State privacyDetailsOpen:boolean=false; @State privacyPrimaryPressed:boolean=false; @State privacyLocalPressed:boolean=false; private legalScroller:Scroller=new Scroller();

 @State mealPortion:string='normal';
 @State composePhotos:string[]=[];@State composeCover:boolean=true;private composeKey:string='';private composeTemps:string[]=[];
 @State recoverMealDraft:boolean=false;private mealDraftSignature:string='';private mealDraftWriting:boolean=false;private mealDraftCache:string='';
 @State undoNotice:string='';private undoTimer:number=-1;private undoTask:()=>Promise<void>=async()=>{};
 private offerUndo(label:string,task:()=>Promise<void>,duration:number=6000):void{if(this.undoTimer>=0){clearTimeout(this.undoTimer);}const owner:string=this.cloud.session.userId;this.undoNotice=label;this.undoTask=async()=>{if(owner!==this.cloud.session.userId){throw new Error('账号已切换');}if(this.undoTimer>=0){clearTimeout(this.undoTimer);this.undoTimer=-1;}this.undoNotice='';this.undoTask=async()=>{};await task();};this.undoTimer=setTimeout(()=>{this.undoNotice='';this.undoTask=async()=>{};this.undoTimer=-1;},duration);}

 @State viewportHeight:number=800;@State viewportWidth:number=366;
 private pageGutter():number{return this.viewportWidth<360?16:22;}
 private contentWidth():number{return Math.max(200,Math.min(760,this.viewportWidth)-this.pageGutter()*2);}
 private recipeThumbSize():number{return Math.max(80,Math.min(124,this.contentWidth()*0.30));}
 private searchFieldWidth():number{return Math.min(480,this.contentWidth()*0.88);}
 @State mergeRows:WorkspaceMergeRow[]=[];@State workspaceMergeOpen:boolean=false;@State energySource:string='手动估算';@State energyFraction:number=1;@State energyOpen:boolean=false;@State partialPurchase:boolean=false;private partialModified:string='';@State drawParallel:boolean=false;@State drawBalanced:boolean=false;@State temporarySkips:TemporarySkip[]=[];@State exclusionOpen:boolean=false;@State correctionCategory:string='做法';@State correctionText:string='';
 @State flowSection:string='';@State workspaceCheck:WorkspaceCheck|null=null;private workspaceOwner:string='';@State bulkFoods:Food[]=[];@State household:HouseholdState=new HouseholdState();@State memberName:string='';@State memberAppetite:number=1;@State memberExcluded:string='';@State lastAction:UndoAction|null=null;@State deduction:DeductionPreview=new DeductionPreview();@State openedDate:string=dateString(new Date());@State openedExpiry:string='';@State supermarket:boolean=false;@State shoppingBoughtOpen:boolean=false;@State purchaseRecordId:string='';@State packageCount:string='1';@State packageNet:string='';@State packageOpen:boolean=false;@State mealFinanceOpen:boolean=false;@State mealDelivery:string='0';@State mealDiscount:string='0';@State mealSplit:string='1';@State mealShares:string='1';@State trialOutcome:string='未评价';@State trialMinutes:string='0';@State trialReplacement:string='';@State trialFailure:string='';@State leftoverDate:string=shiftDay(dateString(new Date()),1);@State leftoverCount:string='1';@State leftoverOpen:boolean=false;
 @State catalogPackage:CatalogUpdatePackage|null=null; @State catalogCheckedAt:string='';
 @State experience:ExperienceState=new ExperienceState(); @State collectionName:string=''; @State activeCollection:string=''; @State collectionReturn:string=''; @State presetName:string=''; @State planDayTools:boolean=false; @State foreground:boolean=true; @State planMode:string='在家做'; @State planNote:string=''; @State planEditId:string=''; @State planTargetDate:string=''; @State procurementWeek:boolean=false; @State procurementSeasoning:boolean=false; @State cookKeepOn:boolean=false; @State feedCursor:string=''; @State feedMore:boolean=false; private worksRequest:number=0; @State ownWorksPage:number=0; @State worksCursor:string=''; @State worksMore:boolean=false; @State claims:ShoppingClaim[]=[]; @State claimsLoaded:boolean=false; @State claimsError:string='';

 @StorageLink('openFoodId') @Watch('handleFoodLink') openFoodId: string = '';
 @StorageLink('openShoppingId') @Watch('handleShoppingLink') openShoppingId: string = '';
 private cloud: Cloud = new Cloud();
 @State discovery:DiscoverySummary=new DiscoverySummary(); @State discoveryLoaded:boolean=false; @State discoveryLoading:boolean=false; @State discoveryError:string=''; private discoveryOwner:string=''; @State searchDraft:string=''; @State shareSearchHeat:boolean=false; @State searchReturn:string=''; @State searchReturnTab:number=3; @State ingredientSearch:string=''; @State filterIngredientTarget:string='ingredients'; @State selectedIngredient:string=''; @State ingredientReturn:string=''; @State draftFavorites:boolean=false; @State draftOrder:string='综合排序';
 @State leftoverBatches:LeftoverBatch[]=[]; @State trashEntries:TrashEntry[]=[];
 @State leftoverContainer:string=''; @State leftoverStorage:string='冷藏'; @State leftoverExpiry:string=dateString(new Date());
 @State leftoverAmount:string='1'; @State cookLarge:boolean=true;
 @State weeklyDraft:WeeklyProposal=new WeeklyProposal(); private weeklySnapshot:string=''; @State weeklyOpen:boolean=false;
 @State backupPassword:string=''; @State backupConfirm:string=''; @State backupEncrypted:boolean=true;
 @State trialEvidence:TrialEvidence=new TrialEvidence(); @State trialEvidenceLoaded:boolean=false; @State communityData:string='all'; private communityApplied:string='';
 @State communitySearchDraft:string=''; @State communityQuery:string=''; @State communityResults:CommunityPost[]=[]; @State communitySearchMore:boolean=false; @State communitySearchBusy:boolean=false; @State communitySearchError:string=''; @State communitySearchDone:boolean=false;private communitySearchCursor:string='';private communitySearchRequest:number=0;private communitySearchContext:string='';
 @State communityRecipe:string=''; @State communityRegion:string=''; @State communityOutcome:string=''; @State communityFiltersOpen:boolean=false;
 @State utility:UtilityState=new UtilityState(); @State plans:MealPlan[]=[]; @State planDate:string=dateString(new Date()); @State planOccasion:string='晚餐'; @State planPeople:number=2; @State planSearch:string=''; @State planChoosing:boolean=false; @State planReturn:string=''; @State clockNow:number=Date.now(); private clockTicker:number=-1; @State feedbackScale:number=1; @State stepFade:number=1; @State stepShift:number=0; @State routeScale:number=1; @State routeX:number=0; @State actionFlash:boolean=false; @State steamLift:number=0; @State steamOpacity:number=0.6; @State successBurst:number=0; @State repeatAngle:number=0; private steamActive:boolean=false; private successTimer:number=-1; private routeTimer:number=-1; private scrollTimer:number=-1; private utilityWrite:Promise<void>=Promise.resolve();
 @State drawAdvanced:string=''; @State drawCustom:boolean=false; @State drawResultTab:string='菜品'; @State recipeFiltersOpen:boolean=false; @State recipeCategoriesOpen:boolean=false; @State recipeMoreOpen:boolean=false;
 @State lobbyDrawerOpen:boolean=false; @State lobbyBackTick:number=0; @State displayMode:string='simple'; @State lobbyVisible:boolean=false; @State lobbySceneName:string='meals'; @State lobbyQualityName:string='balanced';
 @State settingsGroup:string=''; @State pageFade:number=1; @State pageShift:number=0; @State spinning:boolean=false; @State wheelAngle:number=0; @State revealScale:number=1; @State dailyRecipeId:string=''; @State dailyDate:string=''; @State drawDetails:boolean=false; private readonly reducedMotion:boolean=false; private drawTimer:number=-1;
 @State ownPhotoUrls:Map<string,string>=new Map();
 @State works:CommunityPost[]=[]; @State worksPhotos:Map<string,string>=new Map(); @State worksLoading:boolean=false; @State worksError:string=''; @State photoReturnRecipe:string=''; @State postReturn:string='community'; @State mealAfterSave:string='';
 @State accountSecurity:AccountSecurity=new AccountSecurity(); @State accountToken:string=''; @State accountDeleteConfirm:string='';
 @State smsDraft:SmsAuthDraft=new SmsAuthDraft(); @State smsMode:string='sms'; @State smsConsent:boolean=false; @State smsStatusValue:SmsStatus=new SmsStatus(); @State smsClosing:boolean=false; @State smsPassword:string='';
 @State authReturn:string=''; @State feedLoading:boolean=false; @State feedError:string=''; @State feedPhotos:Map<string,string>=new Map(); @State postLiked:boolean=false; @State likeCount:number=0; @State publishPicker:boolean=false;
 @State quickstartDone:boolean=false; @State historyFilter:string='全部批次'; @State historySearch:string=''; @State historyFood:Food=new Food();
 @State drawLocked:string[]=[];
 @State drawMode:string='做饭'; @State drawPeople:number=2; @State drawDishes:number=1; @State drawSoup:boolean=false; @State drawMinutes:string='0'; @State drawBudget:string='0'; @State drawOutside:string='45'; @State drawPerPerson:string='30'; @State drawDisliked:string[]=[]; @State drawAttempt:number=0; @State drawDay:string=''; @State drawResult:MenuResult=new MenuResult(); @State drawApplied:DrawOptions=new DrawOptions(); @State drawChecked:number[]=[]; @State dislikeSearch:string=''; @State dislikesOnly:boolean=false; @State dislikeLimit:number=60;
 @State homeDate:string=dateString(new Date()); @State homeMonth:string=dateString(new Date()).slice(0,7); @State homeCalendarOpen:boolean=false; @State prepGroup:string=''; @State prepIngredient:string=''; @State authError:string=''; @State authConfirm:string=''; @State authShowPassword:boolean=false; @State drawPhase:string=''; @State spinCardScale:number=1; @State spinCardTilt:number=0; private spinTicker:number=-1;
 @State nutritionOpen:boolean=false; @State checklistOpen:boolean=false; @State nutritionOil:string=''; @State menuTimelineOpen:boolean=false; @State feedbackRecipeId:string='';
 @State toolsOpen:boolean=false; @State recipeReturn:string=''; @State knowledgeName:string=''; @State knowledgeReturn:string='recipe'; @State completedSteps:number[]=[]; @State preparedIngredients:string[]=[];
 @State merging: Conflict = new Conflict();
 @State cloudFields: string[] = [];
 @State recipeFilterSection: string = '餐次';
 @State recipeFilter: RecipeFilterOptions = new RecipeFilterOptions(); @State recipeFilterDraft: RecipeFilterOptions = new RecipeFilterOptions();
 @State recipeSearch: string = ''; @State recipeRegion: string = ''; @State recipeCategory: string = ''; @State dietGoal: string = '均衡饮食'; @State homeRegion: string = ''; @State learningEnabled: boolean = true; @State libraryMode: boolean = true; @State recipeLimit: number = 24;
 private readonly regions: string[] = ['通用家常','四川','湖南','广东','山东','江苏','浙江','福建','安徽','湖北','江西','东北','西北','云贵','广西','华北','港台','异国风味'];
 private readonly recipeCategories: string[] = ['家常菜','快手菜','汤类','粥类','大菜','主食','早餐','凉菜','甜点','减脂餐','高蛋白'];
 @State recommendScene: string = '做饭'; @State preferenceScene: string = '做饭'; @State outsideRegion: string = ''; @State outsideGoal: string = '均衡饮食'; @State outsideLearning: boolean = true; @State recipeBudget: number = 0; @State recipeOrder: string = '推荐'; @State portionOpen: boolean = false; @State recipeSourcesOpen: boolean = false; @State mealDetailsOpen: boolean = false; @State diaryDining: string = ''; @State mealRecipePicker: boolean = false; private mealInitial: string = '';
 @State renameLocationFrom: string = '';
 @State renameLocationTo: string = '';
 @State familyInvite: string = '';
 @State replyTo: string = '';
 @State replyLabel: string = '';
 @State profilePosts: CommunityPost[] = [];
 @State manualCode: string = '';
 @State showCodeEntry: boolean = false;
 @State selectedFamily: Family = new Family();
 @State familyMembers: FamilyMember[] = [];
 @State batchExpiry: string = dateString(new Date());
 @State calendarMonth: string = dateString(new Date()).slice(0, 7);
 @State showCalendar: boolean = false;
 @State diaryDate: string = '';
 @State mealDate: string = dateString(new Date());
 @State mealTags: string = '';
 @State editingMeal: Meal = new Meal();
 @State purchaseUnit: string = '个';
 @State purchaseCategory: string = '其他';
 @State purchaseFamily: string = '';
 @State preferenceCategory: string = '蔬菜';
 @State shelfDays: string = '7';
 @State warningDays: string = '3';
 @State categoryMuted: boolean = false;
 @State defaultUnit: string = '个';
 @State formMuted: boolean = false;
 @State passwordCurrent: string = '';
 @State passwordNew: string = '';
 @State renameDeviceId: string = '';
 @State renameDeviceName: string = '';
 @State formFamily: string = '';
 @State publicRecipes: PublicRecipe[] = [];
 @State recipeDraft: Recipe = new Recipe();
 @State ingredientName: string = '';
 @State ingredientQuantity: string = '1';
 @State ingredientUnit: string = '个';
 @State recipeStep: string = '';
 @State favorites: Favorite[] = [];
 @State favoritesOnly: boolean = false;
 @State selectedFoods: string[] = [];
 @State batchMode: boolean = false;
 @State batchLocation: string = '冷藏室';
 @State reportRange: string = '月';
 @State posts: CommunityPost[] = [];
 @State inbox:CommunityInbox=new CommunityInbox(); @State relationship:CommunityRelationship=new CommunityRelationship(); @State inboxUnread:boolean=false; @State inboxError:string='';private feedRequest:number=0;
 @State feedScope: string = 'public';
 @State selectedPost: CommunityPost = new CommunityPost();
 @State comments: CommunityComment[] = [];
 @State commentText: string = '';
 @State postPhoto: string = '';
 @State publishSource: string = '';
 @State publishFamily: string = '';
 @State publishScope: string = 'public';
 @State publishPrice: boolean = false;
 @State devices: Device[] = [];
 @State families: Family[] = [];
 @State familyName: string = '';
 @State inviteCode: string = '';
 private loginSyncOwner:string='';
 @State autoSync: boolean = false;
 @State wifiOnly: boolean = true;
 @State lastSync: string = '';
 private autoTimer: number = -1;
 @State formStep: number = 0;
 @State moreDetails: boolean = false;
 @State barcode: string = '';
 @State saveBarcode: boolean = false;
 @State formPurchased: string = '';
 @State formBatch: string = '';
 @State consumeAmount: string = '1';
 @State mealPhoto: LocalPhoto = new LocalPhoto();
 @State notifications: boolean = false;
 @State reminderHour: string = '20';
 @State timerMinutes: string = '10';
 @State endpoint: string = '';
 @State email: string = '';
 @State password: string = '';
 @State loggedIn: boolean = false;
 @State syncMessage: string = '未连接云端，本地功能完整可用';
 @State conflicts: Conflict[] = [];
 private store: LocalStore = new LocalStore();
 @State recipeActionsOpen:boolean=false;
 private heartRevision:number=0; @State favoriteScale:number=1; @State favoriteRecipeId:string='';
 @State favoriteAngle:number=0;
 @State ready: boolean = false;
 @State launchEntered:boolean=false;
 @State launchVisible:boolean=true;
 @State launchOpacity:number=1;
 @State launchExitScale:number=1;
 private launchEntryTimer:number=-1;
 private launchExitTimer:number=-1;
 private stepTimer:number=-1;
 private routeRevision:number=0;
 private motionRoute:string='';
 private clearMotionTimers():void{
  if(this.launchEntryTimer>=0){clearTimeout(this.launchEntryTimer);this.launchEntryTimer=-1;}
  if(this.launchExitTimer>=0){clearTimeout(this.launchExitTimer);this.launchExitTimer=-1;}
  if(this.routeTimer>=0){clearTimeout(this.routeTimer);this.routeTimer=-1;}
  if(this.scrollTimer>=0){clearTimeout(this.scrollTimer);this.scrollTimer=-1;}
  if(this.stepTimer>=0){clearTimeout(this.stepTimer);this.stepTimer=-1;}
  if(this.calendarTimer>=0){clearTimeout(this.calendarTimer);this.calendarTimer=-1;}
  this.routeRevision++;this.heartRevision++;this.favoriteScale=1;this.favoriteAngle=0;
 }
 private beginLaunch():void{
  if(this.launchEntryTimer>=0){clearTimeout(this.launchEntryTimer);}
  this.launchEntryTimer=setTimeout(()=>{this.launchEntryTimer=-1;if(!this.foreground){return;}this.launchEntered=true;},16);
 }
 private revealHome():void{
  this.ready=true;
  if(this.launchEntryTimer>=0){clearTimeout(this.launchEntryTimer);this.launchEntryTimer=-1;}
  this.launchEntered=true;
  if(this.reducedMotion||!this.foreground){this.launchVisible=false;this.launchOpacity=0;return;}
  this.getUIContext().animateTo({duration:240,curve:Curve.EaseOut},()=>{this.launchOpacity=0;this.launchExitScale=1.035;});
  if(this.launchExitTimer>=0){clearTimeout(this.launchExitTimer);}
  this.launchExitTimer=setTimeout(()=>{this.launchExitTimer=-1;this.launchVisible=false;},250);
 }
 private foldContent(update:()=>void):void{this.getUIContext().animateTo({duration:this.reducedMotion?0:200,curve:Curve.EaseOut},update);}

 @State error: string = '';
 private pageScroller: Scroller = new Scroller();
 private recipeListY:number=0; private restoreRecipeList:boolean=false; private recipeOriginList:boolean=false;
 private recipeResumeRows:Recommendation[]=[]; private recipeResumeKey:string='';
 @State filterReturn:string=''; @State drawFilter:RecipeFilterOptions=new RecipeFilterOptions();
 private recipeViewKey():string{return JSON.stringify([dateString(new Date()),this.recipeFilter,this.recipeSearch,this.favoritesOnly,this.discovery,this.libraryMode,this.recipeOrder,this.recommendScene,this.batch,this.temporarySkips,this.excluded,this.homeRegion,this.dietGoal,this.outsideRegion,this.outsideGoal,this.store.revision,this.recipes.length]);}
 private recipeBrowseEnd():void{}
 private chooseRecipeMode(library:boolean):void{this.libraryMode=library;this.recipeLimit=24;this.recipeResumeRows=[];this.pageScroller.scrollTo({xOffset:0,yOffset:0});}

 private mainTabOffsets:number[]=[0,0,0,0,0,0];
 private navigationOffset:number=-1;
 private navigationDirection:number=0;
 private swipeStartX:number=999;
 @State navPressed:number=-1;
 @State calendarShift:number=0;
 @State calendarFade:number=1;
 private calendarTimer:number=-1;
 private switchMainTab(next:number):void{
  if(this.busy||this.spinning||!this.ready){return;}
  if(!this.page&&this.tab===next){this.pageScroller.scrollTo({xOffset:0,yOffset:0,animation:{duration:this.reducedMotion?0:280,curve:Curve.EaseOut}});return;}
  const order:number[]=[0,3,4,1,5];this.mainTabOffsets[this.tab]=(this.pageScroller.currentOffset()?.yOffset || 0);
  this.navigationDirection=order.indexOf(next)>order.indexOf(this.tab)?1:-1;
  this.navigationOffset=this.mainTabOffsets[next]||0;this.page='';this.tab=next;
 }
 private settleSwipe():void{this.getUIContext().animateTo({duration:this.reducedMotion?0:180,curve:Curve.EaseOut},()=>{this.routeX=0;});}
 private handlePageSwipe(x:number,y:number):void{
  const backEdge:boolean=this.swipeStartX<28;this.swipeStartX=999;
  if(this.busy||this.spinning||Math.abs(x)<64||Math.abs(x)<Math.abs(y)*1.4){this.settleSwipe();return;}
  if(this.page){
   if(backEdge&&x>0){this.navigationDirection=-1;this.run(async()=>{await this.navigateBack();this.settleSwipe();});}
   else if(this.page==='cook-guide'){this.moveCookStep(x<0?1:-1);this.settleSwipe();}
   else{this.settleSwipe();}
   return;
  }
  const order:number[]=[0,3,4,1,5];const index:number=order.indexOf(this.tab)+(x<0?1:-1);
  if(index>=0&&index<order.length){this.switchMainTab(order[index]);}else{this.settleSwipe();}
 }
 private swipeCalendar(direction:number,month:boolean=false):void{
  if(this.calendarTimer>=0){clearTimeout(this.calendarTimer);}
  if(month){this.homeMonthMove(direction);}else{this.selectHomeDate(shiftDay(this.homeDate,direction*7));}
  this.calendarShift=this.reducedMotion?0:direction*24;this.calendarFade=this.reducedMotion?1:0.55;
  this.calendarTimer=setTimeout(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:240,curve:Curve.EaseOut},()=>{this.calendarShift=0;this.calendarFade=1;});this.calendarTimer=-1;},16);
 }
 private resetScroll(): void {
  if(this.companionChatOpen&&this.page!==this.companionOriginPage){this.companionReturnOpen=true;this.closeCompanion();}
  if(this.ready&&(this.page==='shopping'||!this.page&&this.tab===2)){this.reloadClaims();}
  if(this.page!=='cook-guide'&&this.cookKeepOn){this.cookScreen(false).catch(()=>{});}
  if(this.spinTicker>=0){clearInterval(this.spinTicker);this.spinTicker=-1;}
  if(this.drawTimer>=0){clearTimeout(this.drawTimer);this.drawTimer=-1;this.spinning=false;}
  if(this.routeTimer>=0){clearTimeout(this.routeTimer);}
  if(this.scrollTimer>=0){clearTimeout(this.scrollTimer);}
  const revision:number=++this.routeRevision;
  // Coalesce page + tab watchers before rendering the final destination.
  this.routeTimer=setTimeout(()=>{
   this.routeTimer=-1;if(revision!==this.routeRevision||!this.foreground){return;}
   const key:string=this.page||'tab:'+this.tab;
   if(key===this.motionRoute){this.navigationDirection=0;return;}
   this.motionRoute=key;ClientTelemetry.record('page_view',telemetryPage(key));
   const restore:boolean=this.restoreRecipeList&&!this.page&&this.tab===3;
   const offset:number=restore?this.recipeListY:this.navigationOffset>=0?this.navigationOffset:0;
   this.navigationOffset=-1;this.restoreRecipeList=false;
   this.pageScroller.scrollTo({xOffset:0,yOffset:offset});
   this.steamActive=false;this.steamLift=0;this.steamOpacity=0.6;
   if(this.successTimer>=0){clearTimeout(this.successTimer);this.successTimer=-1;}this.actionFlash=false;
   const motion:boolean=!this.reducedMotion;
   this.pageFade=motion?0.86:1;this.pageShift=motion&&this.page?6:0;
   this.routeX=motion?(this.navigationDirection||1)*(this.page?16:12):0;
   this.routeScale=motion&&this.page==='draw-result'?0.985:1;this.navigationDirection=0;
   if(!motion){if(this.page==='cook-guide'){this.startSteam();}return;}
   this.routeTimer=setTimeout(()=>{
    this.routeTimer=-1;if(revision!==this.routeRevision||!this.foreground){return;}
    this.getUIContext().animateTo({duration:220,curve:Curve.EaseOut},()=>{this.pageFade=1;this.pageShift=0;this.routeX=0;this.routeScale=1;});
    if(this.page==='cook-guide'){this.startSteam();}
   },16);
  },0);
 }
 @State @Watch('resetScroll') tab: number = 0;
 @State foods: Food[] = [];
 @State shopping: Shopping[] = [];
 @State meals: Meal[] = [];
 @State locations: string[] = ['冷藏室', '冷冻室', '橱柜', '阳台'];
 @State search: string = '';
 @State filter: string = '全部';
 @State sortBy: string = '到期时间';
 @State @Watch('resetScroll') page: string = '';
 @State editing: Food = new Food();
 @State formName: string = '';
 @State formQuantity: string = '1';
 @State formUnit: string = '个';
 @State formCategory: string = '蔬菜';
 @State formLocation: string = '冷藏室';
 @State formExpiry: string = '';
 @State formPrice: string = '0';
 @State formNotes: string = '';
 @State formTags: string = '';
 @State portionEvidence: boolean = false;
 @State profile: UserProfile = new UserProfile(); @State profileAvatarUrl: string = ''; @State profileDirty: boolean = false; @State profileAvatarMode: string = 'keep'; @State profileRegionSearch: string = ''; @State regionReturn: string = 'my-profile'; @State authRegister: boolean = false; @State authFocus:string='';
 @State selectedRecipe: Recipe = new Recipe();
 @State portionBase: Recipe = new Recipe();
 @State portionPeople: number = 2;
 @State portionAppetite: number = 1;
 @State portionSeasoning: string = '标准';
 @State portionSpice: string = '原方';
 private openRecipe(recipe: Recipe): void { this.cookClockOpen=false; this.refreshDiscovery(); const inDetail:boolean=this.page==='recipe';const returnPage:string=inDetail?this.recipeReturn:this.page==='ingredient-recipes'?'ingredient-recipes':'';if(!inDetail){this.recipeOriginList=!this.page&&this.tab===3;if(this.recipeOriginList){this.recipeListY=(this.pageScroller.currentOffset()?.yOffset || 0);this.recipeResumeRows=this.recommendations().slice();this.recipeResumeKey=this.recipeViewKey();}}this.toolsOpen=false;this.recipeActionsOpen=false;this.heartRevision++;this.favoriteScale=1;this.favoriteAngle=0;this.prepGroup='';this.prepIngredient='';this.nutritionOpen=false;this.nutritionOil='';this.checklistOpen=false;this.recipeReturn=returnPage; this.completedSteps=[]; this.preparedIngredients=[]; this.selectedRecipe = JSON.parse(JSON.stringify(recipe)) as Recipe; this.portionBase = JSON.parse(JSON.stringify(recipe)) as Recipe; this.portionEvidence = false; this.portionOpen = false; this.recipeSourcesOpen = false; this.portionPeople = Math.min(20, Math.max(1,recipe.people || 2)); this.portionAppetite = 1; this.portionSeasoning = '标准'; this.portionSpice = '原方'; this.logRecommendation(recipe.id,'open'); this.cookStep = 0; const saved:CookProgress|undefined=this.utility.progress.find((p:CookProgress)=>p.recipeId===recipe.id); if(saved&&saved.signature===cookingSignature(recipe)){this.cookStep=Math.min(Math.max(0,saved.step),Math.max(0,buildCookingGuide(recipe).steps.length-1));this.completedSteps=saved.completed.filter((n:number)=>n>=0&&n<buildCookingGuide(recipe).steps.length);this.preparedIngredients=saved.prepared.filter((n:string)=>recipe.ingredients.some((i:Ingredient)=>i.name===n));} this.utility.recent=rememberValue(this.utility.recent,recipe.id,12);this.saveUtility(); this.page = 'recipe';this.loadTrialEvidence(recipe.id);this.works=[];this.ownWorksPage=0;this.worksMore=false;this.worksCursor='';this.worksPhotos=new Map();this.ownPhotoUrls=new Map();this.worksError=''; }
 private useHouseholdPortions():void{const members:HouseholdMember[]=this.household.members.filter((m:HouseholdMember)=>m.enabled);if(!members.length){this.toast('先在生活工具中添加参与成员');return;}this.portionPeople=members.length;this.portionAppetite=Math.min(1.5,Math.max(0.5,householdPeople(this.household)/members.length));this.toast('已带入家庭人数与食量，请预览后应用');}
 private portionPreview(): PortionAmount[] { const options: PortionOptions = new PortionOptions(); options.people = this.portionPeople; options.basePeople = this.portionBase.people || 2; options.appetite = this.portionAppetite; options.seasoning = this.portionSeasoning; options.spice = this.portionSpice; return recommendPortions(this.portionBase.ingredients,options); }
 private applyPortions(): void { const recipe: Recipe = JSON.parse(JSON.stringify(this.selectedRecipe)) as Recipe; recipe.ingredients = this.portionPreview().map((amount: PortionAmount) => { const item: Ingredient = new Ingredient(amount.name,amount.quantity,amount.unit); item.optional = amount.optional; item.amountText = amount.amountText; item.quantitySource = amount.quantitySource; item.quantityBasis = amount.quantityBasis; return item; }); recipe.people = this.portionPeople; this.selectedRecipe = recipe; this.toast('已应用到本次制作，请核对实际用量'); }

 @State ingredientShelf: string = '';
 @State cookClockOpen: boolean = false;
 @State cookStep: number = 0;
 @State excluded: string = '';
 @State taste: string = '';
 @State recentDays: string = '7';
 @State batch: number = 0;
 @State purchaseName: string = '';
 @State purchaseQuantity: string = '1';
 @State mealDishes: MealItem[] = [];
 @State dishName: string = '';
 @State dishCost: string = '0';
 @State dishCategory: string = '家常';
 @State editingDish: number = -1;
 @State mealTime: string = '12:00';
 @State recipeStepIndex: number = -1;
 @State ingredientIndex: number = -1;
 @State mealDining: string = '在家做'; @State mealPlace: string = ''; @State mealRating: number = 0; @State mealCalories: string = ''; @State mealCostType: string = '估算';
 @State mealName: string = '';
 @State mealCost: string = '0';
 @State mealNotes: string = '';
 @State mealType: string = '晚餐';
 @State newLocation: string = '';
 @State threshold: string = '3';
 @State busy: boolean = false;
 @State operationPending: boolean = false;
 @State backupText: string = '';
 @State recipes: Recipe[] = [];

 onPageHide():void{ClientTelemetry.background();this.companionTilt=0;this.companionSheetY=0;this.companionDragging=false;if(this.assistantBusy){this.stopAssistantReply();}if(this.page==='meal'){this.persistMealEditorDraft().catch(()=>{});}this.clearMotionTimers();this.pageFade=1;this.pageShift=0;this.routeX=0;this.routeScale=1;this.stepFade=1;this.stepShift=0;this.calendarShift=0;this.calendarFade=1;this.navPressed=-1;if(this.ready){this.launchVisible=false;}if(this.spinTicker>=0){clearInterval(this.spinTicker);this.spinTicker=-1;}if(this.drawTimer>=0){clearTimeout(this.drawTimer);this.drawTimer=-1;}this.spinning=false;this.foreground=false;this.steamActive=false;if(this.cookKeepOn){this.cookScreen(false).catch(()=>{});}}
 onPageShow():void{ClientTelemetry.foreground();ClientTelemetry.record('page_view',telemetryPage(this.page||'tab:'+this.tab));this.foreground=true;if(!this.ready){this.beginLaunch();}this.clockNow=Date.now();if(this.page==='cook-guide'){this.startSteam();}}
 aboutToAppear(): void { this.companionAlive=true;this.watchCompanionKeyboard();try{font.registerFont({familyName:'ShikuHand',familySrc:$rawfile('fonts/shiku_hand.ttf')});}catch(_){} this.loadPrivacy(); this.clockTicker=setInterval(()=>{if(this.foreground&&(this.page==='auth'||this.page==='account-security')){this.clockNow=Date.now();}if(this.foreground&&this.page==='meal'){this.persistMealEditorDraft().catch(()=>{});}if(this.foreground&&this.kitchenTimers().some((t:KitchenTimer)=>t.deadline>0)&&(this.page==='cook-guide'||!this.page&&this.tab===0)){this.clockNow=Date.now();}},1000); this.autoTimer = setInterval(() => { if (this.foreground && this.cloudAllowed && (this.autoSync||this.loginSyncOwner===this.cloud.session.userId) && this.loggedIn && !this.busy && !this.page) { this.run(async () => { if(this.loginSyncOwner){await this.flushLoginSync();return;} if (this.wifiOnly) { const net: connection.NetHandle = await connection.getDefaultNet(); const caps: connection.NetCapabilities = await connection.getNetCapabilities(net); if (!caps.bearerTypes.includes(connection.NetBearType.BEARER_WIFI)) { return; } } await this.synchronize(); }); } }, 60000); }
 aboutToDisappear(): void {ClientTelemetry.background(); this.companionAlive=false;if(this.companionKeyboardWindow){try{this.companionKeyboardWindow.off('keyboardHeightChange',this.companionKeyboardListener);}catch(_){}this.companionKeyboardWindow=undefined;}if(this.undoTimer>=0){clearTimeout(this.undoTimer);}this.clearMotionTimers(); if(this.cookKeepOn){this.cookScreen(false).catch(()=>{});} if(this.calendarTimer>=0){clearTimeout(this.calendarTimer);} if(this.spinTicker>=0){clearInterval(this.spinTicker);} if(this.successTimer>=0){clearTimeout(this.successTimer);} if(this.clockTicker>=0){clearInterval(this.clockTicker);} if(this.routeTimer>=0){clearTimeout(this.routeTimer);} if(this.scrollTimer>=0){clearTimeout(this.scrollTimer);} if(this.drawTimer>=0){clearTimeout(this.drawTimer);}  if (this.autoTimer >= 0) { clearInterval(this.autoTimer); } }
 private async checkCatalogUpdate():Promise<void>{if(!this.loggedIn){this.authReturn='';this.page='auth';return;}this.catalogPackage=await downloadCatalogUpdate(this.cloud,await this.store.catalogManifest());this.catalogCheckedAt=new Date().toLocaleString();this.page='catalog-update';}
 private async installCatalogPreview():Promise<void>{if(!this.catalogPackage){return;}await this.store.installCatalog(this.catalogPackage);this.refresh();this.recipeResumeRows=[];this.recommendationCacheKey='';this.searchCatalogKey='';this.catalogPackage=null;this.toast('离线菜谱已更新');}
 @Builder catalogUpdatePage(){
  this.title('','离线菜谱更新','')
  if(this.catalogPackage){Text(this.catalogPackage.unchanged?'已经是最新目录':'发现菜谱更新').fontSize(24).fontColor('#36564D').margin({bottom:16});Text('目录共 '+this.catalogPackage.manifest.count+' 道 · 本次 '+this.catalogPackage.records.length+' 道变更').fontSize(17).fontColor('#68766C').margin({bottom:12});Text('检查时间 '+this.catalogCheckedAt).fontSize(14).fontColor('#7C7568');ForEach(this.catalogPackage.records.slice(0,20),(r:CatalogRecord)=>{Text(this.catalogRecordName(r)).fontSize(17).fontColor('#304F52').padding(12).width('100%')},(r:CatalogRecord)=>r.id);if(this.catalogPackage.records.length>20){Text('以及其余 '+(this.catalogPackage.records.length-20)+' 道').fontSize(15).fontColor('#7C7568')}if(!this.catalogPackage.unchanged){Button('应用到离线菜谱').height(50).width('100%').fontColor('#FFFFFF').backgroundColor('#527764').onClick(()=>this.confirm('更新离线菜谱？','收藏和用餐记录保留；本次更新已完成完整性检查。',async()=>{await this.installCatalogPreview();}))}}
  Button('重新检查').height(48).width('100%').margin({top:16}).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.checkCatalogUpdate();}))
 }
 private catalogRecordName(record:CatalogRecord):string{return (JSON.parse(record.payload) as Recipe).name;}
 private repeatLastMeal():void{const last:Meal|undefined=this.quickMeals()[0];if(last){this.repeatPickedMeal(last);}}

 private pickPlanDate():void{this.dateDialog({selected:new Date(this.planDate+'T12:00:00'),onAccept:(v:DatePickerResult)=>{this.planDate=dateString(new Date(v.year||2026,v.month||0,v.day||1));}});}
 private async copyPlanDay():Promise<void>{const source:MealPlan[]=this.selectedPlans();if(!source.length){throw new Error('这天还没有安排');}const copies:MealPlan[]=source.filter((p:MealPlan)=>!this.plans.some((v:MealPlan)=>v.date===this.planTargetDate&&v.occasion===p.occasion&&v.recipeId===p.recipeId&&(v.note||'')===(p.note||''))).map((p:MealPlan)=>{const value:MealPlan=JSON.parse(JSON.stringify(p)) as MealPlan;value.id='';value.date=this.planTargetDate;value.completed=false;return value;});await this.store.saveMealPlans(copies);this.refresh();this.toast(copies.length?'已复制'+copies.length+'项安排':'目标日期已有相同安排');}
 private async rebuyShopping():Promise<void>{const f:Food=this.historyFood;if(this.shopping.some((v:Shopping)=>!v.purchased&&!v.familyId&&canonicalName(v.name)===canonicalName(f.name))){this.toast('采购清单里已经有了');return;}const item:Shopping=new Shopping();item.name=f.name;item.quantity=f.purchasedQuantity>0?f.purchasedQuantity:1;item.unit=f.unit;item.category=f.category;item.notes='上次购买 '+(f.purchasedAt||'未记录')+'，参考总价 ¥'+purchaseCost(f).toFixed(2);await this.store.saveShopping(item);this.refresh();this.toast('已加入下次采购');}

 private async saveExperience():Promise<void>{this.experience=normalizeExperience(this.experience);await this.store.setting('experience:v1',JSON.stringify(this.experience));}
 private currentCollectionRecipes():Recipe[]{const c:RecipeCollection|undefined=this.experience.collections.find((v:RecipeCollection)=>v.name===this.activeCollection);return c?this.recipes.filter((r:Recipe)=>c.ids.includes(r.id)):[];}
 private async createCollection():Promise<void>{const name:string=this.collectionName.trim().slice(0,24);if(!name){throw new Error('给收藏夹起个名字');}if(this.experience.collections.length>=30){throw new Error('最多保留30个收藏夹');}if(this.experience.collections.some((v:RecipeCollection)=>v.name===name)){throw new Error('这个名字已经用过了');}const c:RecipeCollection=new RecipeCollection();c.name=name;this.experience.collections=this.experience.collections.concat([c]);this.collectionName='';this.activeCollection=name;await this.saveExperience();}
 private async toggleCollection(name:string):Promise<void>{const c:RecipeCollection|undefined=this.experience.collections.find((v:RecipeCollection)=>v.name===name);if(!c){return;}c.ids=c.ids.includes(this.selectedRecipe.id)?c.ids.filter((id:string)=>id!==this.selectedRecipe.id):c.ids.concat([this.selectedRecipe.id]);await this.saveExperience();}
 private async saveFilterPreset():Promise<void>{const name:string=this.presetName.trim().slice(0,24);if(!name){throw new Error('给这组筛选起个名字');}const f:SavedRecipeFilter=new SavedRecipeFilter();f.name=name;f.options=normalizeRecipeFilter(this.recipeFilterDraft);f.favorites=this.draftFavorites;f.order=this.draftOrder;this.experience.filters=[f].concat(this.experience.filters.filter((v:SavedRecipeFilter)=>v.name!==name)).slice(0,12);await this.saveExperience();this.presetName='';this.toast('筛选组合已保存');}
 private applyPreset(f:SavedRecipeFilter):void{this.recipeFilterDraft=normalizeRecipeFilter(f.options);this.draftFavorites=f.favorites;this.draftOrder=f.order;this.applyRecipeFilters();}
 private relaxFilter():void{const f:RecipeFilterOptions=normalizeRecipeFilter(this.recipeFilter);if(f.maxMinutes){f.maxMinutes=0;}else if(f.maxCost){f.maxCost=0;}else if(f.regions.length||f.cuisines.length){f.regions=[];f.cuisines=[];}else if(f.availability!=='any'){f.availability='any';}else{this.beginRecipeFilters();return;}this.recipeFilter=f;this.recipeLimit=24;this.recipeResumeRows=[];this.toast('已放宽一项条件，忌口保持生效');}
 private quickMeals():Meal[]{const seen:string[]=[];return this.meals.slice().sort((a:Meal,b:Meal)=>b.date.localeCompare(a.date)).filter((m:Meal)=>{const key:string=m.name+'|'+m.place+'|'+m.diningMode;if(seen.includes(key)){return false;}seen.push(key);return true;}).slice(0,6);}
 private repeatPickedMeal(m:Meal):void{if(this.homeDate>dateString(new Date())){this.toast('未来日期请安排计划');return;}const draft:Meal=repeatMealDraft(m);const now:Date=new Date();draft.date=new Date(this.homeDate+'T'+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':00').toISOString();this.startMeal(draft);this.editingMeal=new Meal();this.mealDate=this.homeDate;this.mealInitial=this.mealFingerprint();}
 private planLabel(p:MealPlan):string{return p.mode&&p.mode!=='在家做'?(p.note||p.mode):(this.recipes.find((r:Recipe)=>r.id===p.recipeId)?.name||'菜谱已移除');}
 private async addNotePlan():Promise<void>{if(!this.planNote.trim()){throw new Error('选一种安排，再写下吃什么');}const p:MealPlan=new MealPlan();p.date=this.planDate;p.occasion=this.planOccasion;p.people=this.planPeople;p.mode=this.planMode;p.note=this.planNote.trim();await this.store.saveMealPlan(p);this.refresh();this.planNote='';}
 private async shiftPlan(p:MealPlan,copy:boolean):Promise<void>{if(!/^\d{4}-\d{2}-\d{2}$/.test(this.planTargetDate)){throw new Error('日期格式为 YYYY-MM-DD');}const next:MealPlan=JSON.parse(JSON.stringify(p)) as MealPlan;next.date=this.planTargetDate;if(copy){next.id='';next.completed=false;}if(this.plans.some((v:MealPlan)=>v.id!==next.id&&v.date===next.date&&v.occasion===next.occasion&&v.recipeId===next.recipeId&&(v.note||'')===(next.note||''))){throw new Error('目标日期已有相同安排');}await this.store.saveMealPlan(next);this.refresh();this.planEditId='';this.toast(copy?'已复制安排':'已移动安排');}
 private procurementPlans():MealPlan[]{return this.plans.filter((p:MealPlan)=>this.procurementWeek?this.weekDays().includes(p.date):p.date===this.planDate);}
 private procurement():ProcurementPreview{return previewProcurement(this.procurementPlans(),this.recipes,this.foods,this.shopping,dateString(new Date()));}
 private async commitProcurement():Promise<void>{const preview:ProcurementPreview=this.procurement();const lines:ProcurementLine[]=preview.lines.filter((v:ProcurementLine)=>v.missing>0&&!v.unknown&&(!v.optional||this.procurementSeasoning));if(!lines.length){this.toast('已覆盖所需食材，未知用量请先核对');return;}if(!await this.ask('加入'+lines.length+'项待采购？','按最新库存和待购量计算，未知用量不会自动加入。')){return;}await this.store.addShoppingBatch(lines.map((v:ProcurementLine)=>{const s:Shopping=new Shopping();s.name=v.name;s.quantity=v.missing;s.unit=v.unit;s.category=v.category;s.notes='计划：'+v.sources.join('、');return s;}));this.refresh();this.page='shopping';this.toast('已加入采购清单');}
 private async claimShopping(s:Shopping):Promise<void>{if(!s.familyId){return;}if(!this.claimsLoaded){await this.reloadClaims();return;}const claim:ShoppingClaim|undefined=this.shoppingClaim(s);if(claim&&!claim.mine){this.toast(claim.claimantName+'已经认领');return;}if(!s.version){await this.synchronize();}await this.cloud.request('/shopping/'+s.id+'/claim',claim&&claim.mine?http.RequestMethod.DELETE:http.RequestMethod.POST);await this.reloadClaims();this.toast(claim&&claim.mine?'已取消认领':'已认领');}
 private spending():SpendingSummary{return spendingSummary(this.reportMeals());}
 private async cookScreen(on:boolean):Promise<void>{const stage=await window.getLastWindow(this.getUIContext().getHostContext() as common.UIAbilityContext);await stage.setWindowKeepScreenOn(on);this.cookKeepOn=on;}

 private pendingSync():number{return this.store.state.changes.length;}
 private pendingPhotos():Meal[]{return this.meals.filter((m:Meal)=>Boolean(m.localPhoto)&&m.photoStatus!=='uploaded');}
 private blockedSync():number{const ids:string[]=this.families.map((f:Family)=>f.id);return this.store.state.changes.filter((c)=>{const f:Food=JSON.parse(c.payload) as Food;return Boolean(f.familyId)&&!ids.includes(f.familyId);}).length;}
 private async openFlow(section:string=''):Promise<void>{this.flowSection=section;this.page='daily-flow';this.lastAction=await this.store.lastUndo();}
 private async reloadWorkspacePreferences():Promise<void>{this.homeRegion=await this.store.getSetting('homeRegion','通用家常');this.outsideRegion=await this.store.getSetting('outsideRegion','通用家常');this.dietGoal=await this.store.getSetting('dietGoal','均衡饮食');this.outsideGoal=await this.store.getSetting('outsideGoal','均衡饮食');this.excluded=await this.store.getSetting('excluded','');this.learningEnabled=await this.store.getSetting('learningEnabled','true')==='true';this.outsideLearning=await this.store.getSetting('outsideLearning','true')==='true';this.experience=normalizeExperience(JSON.parse(await this.store.getSetting('experience:v1',JSON.stringify(new ExperienceState()))) as ExperienceState);this.household=JSON.parse(await this.store.getSetting('household:v1',JSON.stringify(new HouseholdState()))) as HouseholdState;this.refresh();}
 private async checkWorkspace():Promise<void>{if(!this.loggedIn){throw new Error('登录后同步安排与偏好');}this.workspaceOwner=this.cloud.session.userId;this.workspaceCheck=await this.cloud.checkWorkspace(this.store);this.workspaceMergeOpen=false;this.mergeRows=[];this.page='workspace';}
 private async useWorkspace(remote:boolean):Promise<void>{const check:WorkspaceCheck|null=this.workspaceCheck;if(!check||this.workspaceOwner!==this.cloud.session.userId){throw new Error('账号或工作区已变化，请重新检查');}if(remote){if(!check.remote.payload){throw new Error('云端尚无安排与偏好');}await this.store.applyWorkspace(check.remote,check.localRevision);await this.store.setting('workspaceBase',workspaceSignature(await this.store.workspacePayload()));await this.reloadWorkspacePreferences();}else{await this.cloud.uploadWorkspace(this.store,check);await this.store.setting('workspaceBase',check.localRevision);}this.workspaceCheck=null;this.toast('安排与偏好已同步');this.page='daily-flow';}
 private async previewWorkspaceMerge():Promise<void>{if(!this.workspaceCheck?.remote.payload){throw new Error('云端暂无内容');}let base:WorkspacePayload|null=null;const text:string=await this.store.getSetting('workspaceBase','');if(text){try{base=JSON.parse(text) as WorkspacePayload;}catch(_){}}this.mergeRows=workspaceMergeRows(this.workspaceCheck.local,this.workspaceCheck.remote.payload,base);this.workspaceMergeOpen=true;}
 private chooseMerge(key:string,side:string):void{this.mergeRows=this.mergeRows.map((r:WorkspaceMergeRow)=>{const row:WorkspaceMergeRow=JSON.parse(JSON.stringify(r)) as WorkspaceMergeRow;if(row.key===key){row.choice=side;}return row;});}
 private async commitWorkspaceMerge():Promise<void>{const check:WorkspaceCheck|null=this.workspaceCheck;if(!check||this.workspaceOwner!==this.cloud.session.userId){throw new Error('账号已变化，请重新对照');}await this.cloud.mergeWorkspace(this.store,check,mergedWorkspace(this.mergeRows));await this.reloadWorkspacePreferences();this.workspaceCheck=null;this.mergeRows=[];this.page='daily-flow';this.toast('已合并所选内容');}
 private async skipToday(recipe:Recipe):Promise<void>{const intent:string=this.recommendScene==='做饭'?'cook':'record';const tomorrow:Date=new Date();tomorrow.setHours(24,0,0,0);const row:TemporarySkip=new TemporarySkip();row.recipeId=recipe.id;row.intent=intent;row.until=tomorrow.getTime();this.temporarySkips=this.temporarySkips.filter((r:TemporarySkip)=>r.until>Date.now()&&!(r.recipeId===row.recipeId&&r.intent===intent)).concat([row]);await this.store.setting('temporarySkips:v1',JSON.stringify(this.temporarySkips));this.recipeResumeRows=[];this.recommendationCacheKey='';this.toast('今天推荐先跳过，仍可在菜谱库查找');this.page='';this.tab=3;}
 private purchaseInfo(item:Shopping):string{const insight=purchaseInsight(item,this.foods);return '家中 '+insight.stock+item.unit+(insight.lastDate?' · 上次 '+insight.lastDate:'')+(insight.lastUnitPrice>=0?' · 约¥'+insight.lastUnitPrice+'/'+item.unit:'');}
 private startPartial(item:Shopping):void{this.startFood();this.partialPurchase=true;this.partialModified=JSON.stringify(item);this.purchaseRecordId=item.id;this.formName=item.name;this.formQuantity=String(item.quantity);this.formUnit=item.unit;this.formCategory=item.category;this.formFamily=item.familyId;}
 private energyPreview():string{if(!this.mealCalories.trim()){return '未记录热量';}try{const portion:EnergyPortion=new EnergyPortion();portion.referenceKcal=Number(this.mealCalories);portion.fraction=this.energyFraction;portion.source=this.energySource;return '实际摄入约 '+consumedEnergy(portion)+' kcal';}catch(e){return (e as Error).message;}}
 private async excludeIngredient(name:string):Promise<void>{if(!await this.ask('长期不吃 '+name+'？','将加入忌口并持续影响推荐和抽餐，可在设置中移除。')){return;}const items:string[]=this.excluded.split(/[,，、]/).map((v:string)=>v.trim()).filter((v:string)=>Boolean(v));if(!items.some((v:string)=>canonicalName(v)===canonicalName(name))){items.push(name);}this.excluded=items.join('、');await this.store.setting('excluded',this.excluded);this.recipeResumeRows=[];this.recommendationCacheKey='';this.exclusionOpen=false;this.toast('已加入长期忌口');}
 private async submitCorrection():Promise<void>{if(!this.correctionText.trim()){throw new Error('请写下具体问题或更正依据');}if(!this.loggedIn){throw new Error('登录后可提交给管理端');}const report:RecipeCorrection=new RecipeCorrection();report.recipeId=this.selectedRecipe.id;report.category=this.correctionCategory;report.detail=this.correctionText.trim();await this.cloud.request('/catalog/corrections',http.RequestMethod.POST,report);this.correctionText='';this.toast('已提交核对，原菜谱暂不改动');this.page='recipe';}
 private async autoWorkspace():Promise<void>{const check:WorkspaceCheck=await this.cloud.checkWorkspace(this.store);if(check.remote.payload&&workspaceSignature(check.remote.payload)===check.localRevision){await this.store.setting('workspaceVersion',String(check.remote.version));await this.store.setting('workspaceBase',check.localRevision);return;}const base:string=await this.store.getSetting('workspaceBase','');if(check.remote.payload&&base===check.localRevision){await this.store.applyWorkspace(check.remote,check.localRevision);await this.store.setting('workspaceBase',workspaceSignature(await this.store.workspacePayload()));await this.reloadWorkspacePreferences();return;}if(!check.conflict){await this.cloud.uploadWorkspace(this.store,check);await this.store.setting('workspaceBase',check.localRevision);return;}this.workspaceCheck=check;this.workspaceOwner=this.cloud.session.userId;this.syncMessage+='；安排与偏好存在版本差异，请对照';}
 private addBulk(t:Template):void{if(this.bulkFoods.some((f:Food)=>f.name===t.name)){this.bulkFoods=this.bulkFoods.filter((f:Food)=>f.name!==t.name);return;}const f:Food=new Food();f.name=t.name;f.category=t.category;f.unit=t.unit;f.location=t.location;f.expiryDate=dateString(new Date(Date.now()+t.days*86400000));f.purchasedAt=dateString(new Date());const old:Food|undefined=this.foods.filter((v:Food)=>v.name===t.name).sort((a:Food,b:Food)=>b.modifiedAt.localeCompare(a.modifiedAt))[0];if(old){f.unit=old.unit;f.location=this.locations.includes(old.location)?old.location:t.location;}this.bulkFoods=this.bulkFoods.concat([f]);}
 private updateBulk(index:number,key:string,value:string):void{const foods:Food[]=JSON.parse(JSON.stringify(this.bulkFoods)) as Food[];if(key==='quantity'){foods[index].quantity=Number(value);}if(key==='expiry'){foods[index].expiryDate=value;}if(key==='price'){foods[index].estimatedPrice=Number(value);}this.bulkFoods=foods;}
 private async saveBulk():Promise<void>{if(!await this.ask('保存'+this.bulkFoods.length+'项食材？','数量、总价和日期以当前表单为准；每项新建独立批次。')){return;}await this.store.addFoodsBatch(this.bulkFoods);this.bulkFoods=[];this.refresh();this.toast('已整批保存');this.page='';this.tab=1;}
 private async addHousehold():Promise<void>{if(!this.memberName.trim()||this.household.members.length>=20){throw new Error('填写成员昵称，最多20位');}const member:HouseholdMember=new HouseholdMember();member.id=String(Date.now());member.name=this.memberName.trim().slice(0,24);member.appetite=this.memberAppetite;member.excluded=this.memberExcluded.split(/[,，、]/).map((v:string)=>v.trim()).filter((v:string)=>Boolean(v)).slice(0,30);this.household.members=this.household.members.concat([member]);await this.store.setting('household:v1',JSON.stringify(this.household));this.memberName='';this.memberExcluded='';}
 private async saveOpened():Promise<void>{const current:Food|undefined=this.foods.find((f:Food)=>f.id===this.historyFood.id);if(!current){throw new Error('食材已移除');}const f:Food=JSON.parse(JSON.stringify(current)) as Food;f.openedAt=this.openedDate;f.openedExpiry=this.openedExpiry;await this.store.saveFood(f);this.refresh();this.historyFood=f;this.toast('已保留原到期日并记录开封');}
 private async openDeduction():Promise<void>{this.deduction=previewDeduction(this.selectedRecipe,this.foods,dateString(new Date()));this.page='deduction';}
 private async confirmDeduction():Promise<void>{const preview:DeductionPreview=previewDeduction(this.selectedRecipe,this.foods,dateString(new Date()));if(preview.errors.length){throw new Error(preview.errors.join('；'));}if(!await this.ask('确认实际制作？','按最新库存扣减'+preview.lines.length+'个批次并记一餐，不能当作只记吃过。')){return;}await this.store.cook(this.selectedRecipe);this.refresh();this.page='';this.tab=4;this.toast('已制作并记餐');}
 private feedbackUndoId:string='';private feedbackUndoAction:string='';
 private async undoFeedback():Promise<void>{if(!this.feedbackUndoId){throw new Error('本次还没有可撤销反馈');}const intent:string=this.recommendScene==='做饭'?'cook':'record';if(this.loggedIn){await this.cloud.request('/catalog/recommendations/events/latest?recipeId='+encodeURIComponent(this.feedbackUndoId)+'&intent='+intent+'&action='+encodeURIComponent(this.feedbackUndoAction),http.RequestMethod.DELETE);}await this.store.removeLatestFeedback(this.feedbackUndoId,intent,this.feedbackUndoAction);this.feedbackUndoId='';this.refresh();this.toast('已撤销该场景的最近反馈');}
 private async saveSubstitute(option:SubstituteOption):Promise<void>{const excluded:string[]=this.excluded.split(/[,，、]/).concat(householdExclusions(this.household)).filter((v:string)=>Boolean(v));const recipe:Recipe=substitutedRecipe(this.selectedRecipe,option,excluded);if(!await this.ask('保存示例主体替代版？',option.original+' → '+option.replacement+'。'+option.note+'；用量仍需实际确认。')){return;}await this.store.saveRecipe(recipe);this.refresh();this.openRecipe(recipe);this.toast('已保存示例主体版本，原菜谱保留');}
 private async planLeftovers(m:Meal):Promise<void>{if(!(Number(this.leftoverCount)>0)||Number(this.leftoverCount)>100){throw new Error('剩余份数需大于0且不超过100');}const plan:MealPlan=new MealPlan();plan.date=this.leftoverDate;plan.mode='吃剩菜';plan.note=m.name.slice(0,200);plan.sourceMealId=m.id;plan.remainingPortions=Number(this.leftoverCount);plan.people=1;await this.store.saveMealPlan(plan);this.refresh();this.toast('已关联原餐安排；未重复采购或计费');}
 private recentPlaces():string[]{return Array.from(new Set<string>(this.meals.filter((m:Meal)=>Boolean(m.place)).sort((a:Meal,b:Meal)=>b.date.localeCompare(a.date)).map((m:Meal)=>m.place))).slice(0,8);}
 private financeValue():MealFinance{const f:MealFinance=new MealFinance();f.food=Number(this.draftMealCost())||0;f.delivery=Number(this.mealDelivery)||0;f.discount=Number(this.mealDiscount)||0;f.people=Number(this.mealSplit)||1;f.share=Number(this.mealShares)||1;return f;}
 private financeLabel():string{try{const total:FinanceTotal=mealFinance(this.financeValue());return '整餐 ¥'+total.total.toFixed(2)+' · 我承担 ¥'+total.personal.toFixed(2);}catch(e){return (e as Error).message;}}
 @Builder dailyFlow(){
  this.title('','生活工具','')
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(8)}}){ForEach(['同步','常买','家庭','撤销','迁入'],(section:string)=>{Column(){ChoiceChip({label:section,selected:this.flowSection===section})}.onClick(()=>{this.flowSection=section;})})}.width('100%').margin({bottom:16})
  if(!this.flowSection){Image($r('app.media.brand_monster')).width(120).height(120).objectFit(ImageFit.Contain);Text('少填一点，好好吃饭').fontFamily('ShikuHand').fontSize(27).fontColor('#426B5B')}
  if(this.flowSection==='同步'){
   Text(this.loggedIn?'当前账号的同步状态':'本地使用中 · 登录后可同步').fontSize(21).fontColor('#36564D')
   Text('待上传 '+this.pendingSync()+' · 照片 '+this.pendingPhotos().length+' · 冲突 '+this.conflicts.length).fontSize(18).lineHeight(30).fontColor('#596E65').margin({top:14,bottom:12})
   if(this.loggedIn){Text('家庭范围待处理 '+this.blockedSync()).fontSize(16).fontColor('#95674F')}
   Text(this.lastSync?'上次成功 '+this.lastSync:'还没有成功同步记录').fontSize(16).fontColor('#68776E').margin({bottom:12})
   Text(this.syncMessage).fontSize(16).lineHeight(26).fontColor('#596E65')
   Button('同步记录与照片').height(50).width('100%').margin({top:12}).backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.synchronize();}))
   Button('对照安排、收藏夹与偏好').height(50).width('100%').margin({top:12}).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.checkWorkspace();}))
   ForEach(this.pendingPhotos().slice(0,20),(m:Meal)=>{Row(){Text(m.name).fontSize(17).layoutWeight(1);Button('重试照片').height(44).fontColor('#426B5B').backgroundColor('#E6E9D8').onClick(()=>this.run(async()=>{await this.cloud.uploadPhotos(this.store,m.id);this.refresh();}))}.width('100%').margin({top:8})},(m:Meal)=>m.id)
   ForEach(this.conflicts,(c:Conflict)=>{Button('处理记录差异').height(48).width('100%').onClick(()=>{this.merging=c;this.cloudFields=[];this.page='merge';})})
  }
  if(this.flowSection==='常买'){
   Text('常买清单').fontSize(25).fontColor('#36564D')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(8)}}){ForEach(TEMPLATES,(t:Template)=>{Column(){ChoiceChip({label:t.name,selected:this.bulkFoods.some((f:Food)=>f.name===t.name)})}.onClick(()=>this.addBulk(t))})}.margin({top:14,bottom:14})
   ForEach(this.bulkFoods,(f:Food,index:number)=>{Column({space:9}){Text(f.name+' · '+f.unit+' · '+f.location).fontSize(19).fontColor('#36564D');TextInput({text:String(f.quantity),placeholder:'数量'}).type(InputType.Number).accessibilityText(f.name+'数量').onChange((v:string)=>this.updateBulk(index,'quantity',v));TextInput({text:f.expiryDate,placeholder:'到期 YYYY-MM-DD'}).accessibilityText(f.name+'到期日期').onChange((v:string)=>this.updateBulk(index,'expiry',v));TextInput({text:String(f.estimatedPrice),placeholder:'本批总价，未记可为0'}).type(InputType.Number).accessibilityText(f.name+'本批总价').onChange((v:string)=>this.updateBulk(index,'price',v))}.width('100%').padding(16).backgroundColor(index%2?'#F0DFCE':'#DDE8D5').borderRadius({topLeft:10,topRight:26,bottomLeft:20,bottomRight:12}).margin({bottom:12})},(f:Food)=>f.name)
   if(this.bulkFoods.length){Button('确认保存 '+this.bulkFoods.length+' 项').height(50).width('100%').backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.saveBulk();}))}
  }
  if(this.flowSection==='家庭'){
   Text('一起吃饭的人').fontSize(25).fontColor('#36564D')
   Text('用于本账号推荐；忌口合并为排除条件').fontSize(16).fontColor('#68776E').margin({top:12,bottom:14})
   ForEach(this.household.members,(m:HouseholdMember)=>{Row(){Column(){Text(m.name+' · '+m.appetite+'份食量').fontSize(18).fontColor('#36564D');Text(m.excluded.length?'不吃：'+m.excluded.join('、'):'未设置忌口').fontSize(16).fontColor('#7A6E56')}.layoutWeight(1).alignItems(HorizontalAlign.Start);Button(m.enabled?'参与':'不参与').height(44).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{m.enabled=!m.enabled;this.household=JSON.parse(JSON.stringify(this.household)) as HouseholdState;await this.store.setting('household:v1',JSON.stringify(this.household));}));Text('移除').padding(12).onClick(()=>this.run(async()=>{this.household.members=this.household.members.filter((v:HouseholdMember)=>v.id!==m.id);await this.store.setting('household:v1',JSON.stringify(this.household));}))}.width('100%').padding({top:12,bottom:12})},(m:HouseholdMember)=>m.id)
   Text('参考总食量 '+householdPeople(this.household)+' 成人份').fontSize(17).fontColor('#87694B').margin({bottom:12})
   TextInput({text:this.memberName,placeholder:'成员昵称'}).maxLength(24).onChange((v:string)=>{this.memberName=v;})
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([0.5,0.75,1,1.25,1.5],(v:number)=>{Column(){ChoiceChip({label:v+'份',selected:this.memberAppetite===v})}.onClick(()=>{this.memberAppetite=v;})})}.margin({top:10,bottom:10})
   TextInput({text:this.memberExcluded,placeholder:'不吃的食材，用逗号分隔'}).onChange((v:string)=>{this.memberExcluded=v;})
   Button('添加成员').height(50).width('100%').margin({top:12}).backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.addHousehold();}))
  }
  if(this.flowSection==='撤销'){
   Text('最近一次操作').fontSize(25).fontColor('#36564D')
   Text(this.lastAction?'可检查5分钟内最近一次消耗或采购勾选':'暂无可撤销操作').fontSize(17).fontColor('#68776E').margin({top:12,bottom:14})
   if(this.lastAction){Button('撤销最近一次').height(50).width('100%').backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.store.undoLast();this.refresh();this.lastAction=null;this.toast('已撤销，并保留反向流水');}));Text('已有后续修改或同步时会停止撤销').fontSize(16).fontColor('#95674F').margin({top:12})}
  }
  if(this.flowSection==='迁入'){
   Text('把访客记录带到账号').fontSize(25).fontColor('#36564D')
   Text('先在访客模式导出备份，再登录账号选择文件。预览条数和重复项后才合并，不自动上传。').fontSize(17).lineHeight(28).fontColor('#68776E').margin({top:14,bottom:14})
   Button('导出当前本地记录').height(50).width('100%').backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.exportBackup();}))
   Button('选择备份并预览迁入').height(50).width('100%').margin({top:12}).backgroundColor('#DCE8D7').fontColor('#426B5B').onClick(()=>this.run(async()=>{await this.importBackup();}))
  }
 }
 @Builder workspacePage(){
  this.title('','安排与偏好对照','')
  if(this.workspaceCheck?.remote.payload){this.workspaceMergePanel()}
  if(this.workspaceCheck){Text('本机 '+this.workspaceCheck.local.plans.length+' 项安排').fontSize(22).fontColor('#36564D');Text('云端 '+(this.workspaceCheck.remote.payload?this.workspaceCheck.remote.payload.plans.length:0)+' 项安排 · 版本 '+this.workspaceCheck.remote.version).fontSize(20).fontColor('#85684E').margin({top:14,bottom:14});Text('包含周计划、收藏夹和做饭/外食偏好。选择一侧会替换另一侧这部分内容，库存和记餐不受此选择影响。').fontSize(17).lineHeight(28).fontColor('#68776E');Button('保留本机，更新云端').height(50).width('100%').margin({top:16}).backgroundColor('#527764').onClick(()=>this.confirm('用本机安排更新云端？','已保留旧版本检查，其他设备刚修改时会拒绝覆盖。',async()=>{await this.useWorkspace(false);}));if(this.workspaceCheck.remote.payload){Button('使用云端安排与偏好').height(50).width('100%').margin({top:12}).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.confirm('使用云端版本？','将替换本机计划、收藏夹和偏好，请确认对照内容。',async()=>{await this.useWorkspace(true);}));}}
 }
 @Builder workspaceMergePanel(){
  Button('逐项合并，不整份覆盖').height(50).width('100%').margin({top:16}).backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.previewWorkspaceMerge();}))
  if(this.workspaceMergeOpen){
   ForEach(this.mergeRows,(row:WorkspaceMergeRow)=>{Column({space:9}){Text(row.label).fontSize(18).fontColor('#36564D');Text(row.conflict?'两端都改过，请选择':row.choice==='remote'?'自动保留云端变化':'自动保留本机变化').fontSize(15).fontColor('#85684E');Text('本机：'+workspaceMergeSummary(row,'local',this.recipes)).fontSize(14).maxLines(5).fontColor('#68776E');Text('云端：'+workspaceMergeSummary(row,'remote',this.recipes)).fontSize(14).maxLines(5).fontColor('#68776E');Row({space:8}){ForEach(['local','remote'],(side:string)=>{Column(){ChoiceChip({label:side==='local'?'保留本机':'保留云端',selected:row.choice===side})}.onClick(()=>this.chooseMerge(row.key,side))})}}.width('100%').padding(14).backgroundColor('#80FFFFFF').borderRadius(16).margin({top:12})},(row:WorkspaceMergeRow)=>row.key)
   Button('确认合并并同步').height(52).width('100%').margin({top:16}).enabled(!this.mergeRows.some((r:WorkspaceMergeRow)=>r.conflict&&!r.choice)).backgroundColor('#527764').onClick(()=>this.confirm('同步合并结果？','仅提交预览中保留的内容；版本变化会拒绝覆盖。',async()=>{await this.commitWorkspaceMerge();}))
  }
 }
 @Builder correctionPage(){
  this.title('','菜谱纠错','')
  Text(this.selectedRecipe.name).fontSize(24).fontColor('#36564D')
  Text('待完善：'+(auditRecipe(this.selectedRecipe).issues.join('、')||'可补充操作细节')).fontSize(16).lineHeight(26).fontColor('#85684E').margin({top:14,bottom:14})
  Flex({wrap:FlexWrap.Wrap}){ForEach(['做法','用量','时间','来源','其他'],(kind:string)=>{Column(){ChoiceChip({label:kind,selected:this.correctionCategory===kind})}.onClick(()=>{this.correctionCategory=kind;})})}
  TextArea({text:this.correctionText,placeholder:'哪一步有问题？可补充具体操作、完成判断或参考链接'}).maxLength(1000).height(180).margin({top:14}).onChange((v:string)=>{this.correctionText=v;})
  Button('提交核对').height(50).width('100%').margin({top:16}).backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.submitCorrection();}))
 }
 @Builder deductionPage(){
  this.title('',this.selectedRecipe.name,'')
  Text('这次将使用的批次').fontSize(23).fontColor('#36564D')
  ForEach(this.deduction.lines,(line:DeductionLine)=>{Column({space:7}){Text(line.name+' · '+line.quantity.toFixed(2)+line.unit).fontSize(20).fontColor('#36564D');Text((line.batch||'独立批次')+' · '+line.expiryDate+'到期').fontSize(16).fontColor('#68776E');Text('剩余 '+line.remaining.toFixed(2)+line.unit+' · 本次约 ¥'+line.cost.toFixed(2)).fontSize(16).fontColor('#95674F')}.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor('#DDE8D5').borderRadius({topLeft:10,topRight:24,bottomLeft:20,bottomRight:10}).margin({top:12})})
  ForEach(this.deduction.errors,(text:string)=>{Text(text).fontSize(18).fontColor('#A05D46').margin({top:12})})
  Button('确认制作并记餐').height(52).width('100%').margin({top:16}).enabled(!this.deduction.errors.length).backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.confirmDeduction();}))
  Button('只记录吃过').height(48).width('100%').margin({top:12}).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{this.startMeal();this.addMealDish(this.selectedRecipe);})
 }
 private lobbySnapshot():string {
  const value:LobbySnapshot=new LobbySnapshot();const today:string=dateString(new Date());
  value.scene=lobbyScene(this.lobbySceneName);value.quality=lobbyQuality(this.lobbyQualityName);value.reducedMotion=this.reducedMotion;value.nickname=(this.profile.displayName||'').slice(0,32);value.date=today;
  value.mealSummaries=['早餐','午餐','晚餐'].map((kind:string):string=>this.meals.filter((m:Meal)=>dateString(new Date(m.date))===today&&m.mealType===kind).map((m:Meal)=>m.name).join('、').slice(0,70));
  value.foodCount=this.foods.filter((f:Food)=>f.quantity>0).length;value.mealCount=this.meals.filter((m:Meal)=>dateString(new Date(m.date))===today).length;
  value.planCount=this.plans.filter((p:MealPlan)=>p.date===today&&!p.completed).length;value.shoppingCount=this.shopping.filter((i:Shopping)=>!i.purchased).length;value.favoriteCount=this.favorites.length;
  return JSON.stringify(value);
 }
 private async setDisplayMode(mode:string):Promise<void>{
  this.lobbyDrawerOpen=false;
  // 3D is suspended; keep the saved preference for a future restoration.
  this.displayMode='simple';this.lobbyVisible=false;
 }
 private async openLobby():Promise<void>{
  this.displayMode='simple';this.lobbyVisible=false;
 }
 private onLobbyRequest(raw:string):void{
  const request:LobbyRequest|null=parseLobbyRequest(raw);if(!request){return;}
  this.getUIContext().runScopedTask(()=>{
   if(request.type==='overlay'){this.lobbyDrawerOpen=this.lobbyVisible&&request.value==='features';return;}
   if(request.type==='scene'){this.lobbySceneName=lobbyScene(request.value);return;}
   if(request.type==='mode'){this.run(async()=>{await this.setDisplayMode(request.value);});return;}
   if(request.type==='route'){this.run(async()=>{await this.openLobbyRoute(request.value);});}
  });
 }
 private async openLobbyRoute(route:string):Promise<void>{if(route==='ai-assistant'){this.lobbyVisible=false;this.openAssistant();return;}if(socialRoute(route)){return;}
  this.lobbyVisible=false;this.lobbyDrawerOpen=false;
  if(route==='draw'){await this.openDraw();return;}if(route==='meal-plan'){this.openPlanner();return;}if(route==='stock-history'){this.historySearch='';this.historyFilter='全部批次';this.page='stock-history';return;}
  if(route==='new-meal'){this.startMeal();return;}if(route==='new-food'){this.startFood();return;}
  if(route==='community'){this.page='community';await this.loadFeed(this.feedScope);return;}
  if(route==='profile'){await this.openMyProfile();return;}
  if(route==='tools'){await this.openFlow();return;}
  if(route==='recipe-search'){this.tab=3;this.page='';this.openRecipeSearch();return;}
  if(route==='community-search'){this.page='community';this.communitySearchDraft=this.communityQuery;this.page='community-search';return;}
  if(route==='auth'){if(this.loggedIn){await this.loadAccount();this.page='account';}else{this.authReturn='';this.page='auth';}return;}
  if(route==='favorites'){this.collectionReturn='';this.page='collections';return;}
  if(route==='settings'){this.page='';this.tab=5;return;}
  if(route==='today'){this.page='';this.tab=0;return;}if(route==='diary'){this.page='';this.tab=4;return;}
  if(route==='recipes'){this.page='';this.tab=3;return;}if(route==='pantry'){this.page='';this.tab=1;return;}
  this.page=route;
 }
 @Builder nativeLobby(){Column(){}}
 private async loadPrivacy():Promise<void>{
  try{const choice:string=await this.legalStore.load(this.getUIContext().getHostContext() as common.UIAbilityContext);this.cloudAllowed=PrivacyAccess.allowed;this.analyticsEnabled=PrivacyAccess.analyticsEnabled;this.policyChosen=choice==='cloud'||choice==='local';this.policyLoaded=true;if(this.policyChosen){await this.initialize();}}catch(_){this.policyLoaded=true;this.legalError='隐私配置读取失败，请重试';}
 }
 private async choosePrivacy(cloud:boolean):Promise<void>{
  if(this.busy){return;}this.busy=true;this.legalError='';
  try{await this.legalStore.choose(cloud);this.cloudAllowed=cloud;this.policyChosen=true;if(!this.ready){this.launchVisible=true;await this.initialize();}else if(cloud){this.toast('云功能已开启；登录、同步及 AI 发送仍由你选择');}}catch(_){this.legalError='选择暂未保存，请重试';}finally{this.busy=false;}
 }
 private async withdrawPrivacy():Promise<void>{
  if(!await this.ask('切换为本机模式？','将关闭后续云端请求、自动同步及AI，清除本机登录凭据；既有本机和云端记录不自动删除。需要删除云端数据时，请先到账号与同步注销。','切换本机模式','取消')){return;}
  await this.legalStore.choose(false);this.cloudAllowed=false;this.clearAssistant();this.companionChatOpen=false;this.companionReturnOpen=false;this.autoSync=false;this.loggedIn=false;this.cloud.session=new Session();this.profileAvatarUrl='';await Vault.clear();await this.store.setting('autoSync','false');this.toast('已撤回云功能同意，本机记录保留');
 }
 private openLegal(key:string):void{this.legalKey=key;this.legalScroller.scrollTo({xOffset:0,yOffset:0});}
 private legalIcon(key:string):Resource{return key==='privacy'?$r('app.media.legal_privacy'):key==='terms'?$r('app.media.legal_terms'):key==='permissions'?$r('app.media.legal_permissions'):key==='ai'?$r('app.media.legal_ai'):key==='about'?$r('app.media.legal_about'):$r('app.media.legal_support');}
 private legalHint(key:string):string{return key==='privacy'?'信息如何使用，你有哪些选择':key==='terms'?'服务范围、使用规则与权益':key==='permissions'?'按需使用，随时可以查看':key==='ai'?'发送范围、生成提示与安全':key==='about'?'版本号与本次更新':'记餐、同步与常见问题';}
 @Builder legalGlow(){
  Stack(){
   Column().width('100%').height('100%').radialGradient({center:['90%','10%'],radius:260,colors:[['#60D8C4E9',0],['#00D8C4E9',1]]})
   Column().width('100%').height('100%').radialGradient({center:['0%','65%'],radius:210,colors:[['#40BED9C3',0],['#00BED9C3',1]]})
  }.width('100%').height(420).hitTestBehavior(HitTestMode.None).clip(true)
 }
 @Builder legalDocument(){
  Stack({alignContent:Alignment.Top}){
   this.legalGlow()
   Column({space:0}){
    Row({space:12}){
     Button('‹',{type:ButtonType.Normal}).width(44).height(44).fontSize(28).fontColor('#5C7163').backgroundColor('#EFFFFFFF').borderRadius(17).border({width:0.7,color:'#FFFFFF'}).accessibilityText('返回').onClick(()=>{this.legalKey='';})
     Column({space:3}){Text(legalTitle(this.legalKey)).fontSize(20).fontWeight(FontWeight.Medium).fontColor('#3C5148');Text('离线可读 · 随时查看').fontSize(11).fontColor('#858879')}.alignItems(HorizontalAlign.Start).layoutWeight(1)
     Image(this.legalIcon(this.legalKey)).width(44).height(44).objectFit(ImageFit.Contain).accessibilityLevel('no')
    }.width('100%').padding({left:20,right:20,top:12,bottom:14}).backgroundColor('#CFFBF8F0')
    Scroll(this.legalScroller){Column({space:14}){
     Text(this.legalHint(this.legalKey)).fontSize(14).lineHeight(23).fontColor('#7A8074').width('100%').padding({left:4,top:4,bottom:2})
     if(this.legalKey==='support'){LegalLinkCard({label:legalTitle('permissions'),detail:'查看按需权限与百炼 API 说明',icon:this.legalIcon('permissions'),onOpen:()=>this.openLegal('permissions')})}
     ForEach(legalParagraphs(this.legalKey,this.legalStore.config,this.appVersion||'0.9.17 (35)'),(paragraph:string,index:number)=>{
      Column({space:10}){
       if(paragraph.includes('\n')){Text(paragraph.split('\n')[0]).fontSize(17).lineHeight(26).fontWeight(FontWeight.Medium).fontColor('#4D6658').width('100%');Text(paragraph.slice(paragraph.indexOf('\n')+1)).fontSize(15).lineHeight(27).fontColor('#62665E').width('100%').copyOption(CopyOptions.InApp)}else{Text(paragraph).fontSize(15).lineHeight(27).fontColor('#62665E').width('100%').copyOption(CopyOptions.InApp)}
      }.width('100%').alignItems(HorizontalAlign.Start).padding(20).backgroundColor(index===0?'#DFF1EBF3':'#EBFFFFFF').borderRadius(25).border({width:0.7,color:'#FFFFFF'}).shadow({radius:12,color:'#076E6274',offsetY:4})
     })
     Text('开饭小怪 · 好好吃饭，也尊重你的选择').fontSize(11).lineHeight(20).fontColor('#929487').textAlign(TextAlign.Center).width('100%').margin({top:8,bottom:8})
    }.width('100%').constraintSize({maxWidth:760}).padding({left:20,right:20,top:8,bottom:24}).alignItems(HorizontalAlign.Start)}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).layoutWeight(1).width('100%').scrollBar(BarState.Off).clip(true)
   }.width('100%').height('100%')
  }.width('100%').height('100%').backgroundColor('#FAF7EF')
 }
 @Builder privacyGate(){
  Stack({alignContent:Alignment.Top}){
   this.legalGlow()
   Column(){
    Scroll(){Column({space:14}){
     Row({space:12}){
      Column({space:9}){
       Text('HELLO, LITTLE MONSTER').fontSize(9).letterSpacing(1.5).fontColor('#9884A0')
       Text('好好吃饭，\n也保护你的隐私').fontSize(this.viewportWidth<360?25:28).lineHeight(37).fontWeight(FontWeight.Medium).fontColor('#3B574A').width('100%')
       Row({space:6}){Text('本机可用').fontSize(10).fontColor('#68826E').padding({left:9,right:9,top:5,bottom:5}).backgroundColor('#E5EEE3').borderRadius(20);Text('云功能可选').fontSize(10).fontColor('#92779A').padding({left:9,right:9,top:5,bottom:5}).backgroundColor('#EDE4F1').borderRadius(20)}
      }.alignItems(HorizontalAlign.Start).layoutWeight(1)
      Stack(){Circle().width(98).height(98).fill('#60E2CDEA').stroke('#80FFFFFF').strokeWidth(0.7).shadow({radius:15,color:'#30D4BDE3',offsetY:1});Image($r('app.media.brand_monster')).width(100).height(100).objectFit(ImageFit.Contain).rotate({angle:-5})}.width(100).height(112).flexShrink(0)
     }.width('100%').padding({top:8,bottom:10})
     Column({space:10}){
      Row({space:8}){Text('先了解，再选择').fontSize(16).fontWeight(FontWeight.Medium).fontColor('#566A5D').layoutWeight(1);Text('由你决定').fontSize(10).fontColor('#9681A0').padding({left:9,right:9,top:5,bottom:5}).backgroundColor('#EEE5F3').borderRadius(12)}.width('100%')
      Text('阅读协议后，你可以只用本机菜谱、记餐和食材管理。账号同步与云端 AI 均为可选。').fontSize(14).lineHeight(24).fontColor('#70776C').width('100%')
      Button({type:ButtonType.Normal}){Row(){Text('哪些内容会发送？').fontSize(13).fontColor('#7A6687').layoutWeight(1);Text(this.privacyDetailsOpen?'−':'＋').fontSize(19).fontColor('#8E7B98')}.width('100%')}.width('100%').height(42).padding({left:12,right:12}).backgroundColor('#F0EAF3').borderRadius(15).accessibilityText(this.privacyDetailsOpen?'收起发送范围':'展开发送范围').onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:200,curve:Curve.EaseOut},()=>{this.privacyDetailsOpen=!this.privacyDetailsOpen;});})
      if(this.privacyDetailsOpen){Text('注册资料与主动同步内容用于云服务。AI 每次发送还需单独同意；库存和上一轮问答由你选择是否附带。照片、扫码和提醒仅在你主动操作时使用。').fontSize(13).lineHeight(23).fontColor('#77756E').width('100%').padding({left:3,right:3,bottom:3}).transition(TransitionEffect.OPACITY)}
     }.width('100%').alignItems(HorizontalAlign.Start).padding(18).backgroundColor('#BFFFFFFF').borderRadius(26).border({width:0.7,color:'#FFFFFF'}).shadow({radius:16,color:'#09655870',offsetY:5})
     Row(){Text('协议与使用说明').fontSize(12).fontColor('#8B8C80');Blank();Text('点开阅读 ↗').fontSize(10).fontColor('#A59AA9')}.width('100%').padding({left:4,right:4,top:5,bottom:1})
     Column({space:9}){ForEach(['privacy','terms','permissions','ai','support'],(key:string)=>{LegalLinkCard({label:legalTitle(key),detail:this.legalHint(key),icon:this.legalIcon(key),onOpen:()=>this.openLegal(key)})})}.width('100%')
     Text('本机模式不代表授权云端处理；以后可在\n我的 → 关于与支持中更改选择。').fontSize(11).lineHeight(20).fontColor('#929183').textAlign(TextAlign.Center).width('100%').padding({top:3,bottom:8})
     if(this.legalError){Text(this.legalError).fontSize(14).fontColor('#A05D46');Button('重试').onClick(()=>this.loadPrivacy())}
    }.width('100%').constraintSize({maxWidth:640}).padding({left:20,right:20,top:14,bottom:18})}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).id('privacy-scroll').layoutWeight(1).width('100%').scrollBar(BarState.Off).clip(true)
    Column({space:9}){
     Button({type:ButtonType.Capsule}){Row({space:8}){Text('同意协议和隐私政策，开启云功能').fontSize(14).lineHeight(22).maxLines(2).textAlign(TextAlign.Center).fontWeight(FontWeight.Medium).fontColor('#FFFDF6').layoutWeight(1);Text('↗').fontSize(19).fontColor('#E6F2DF').flexShrink(0)}}.width('100%').constraintSize({minHeight:52}).padding({left:17,right:17,top:12,bottom:12}).linearGradient({angle:110,colors:[['#5D826C',0],['#3E6658',1]]}).borderRadius(23).border({width:0.7,color:'#719782'}).shadow({radius:14,color:'#28567A62',offsetY:5}).scale({x:this.privacyPrimaryPressed&&!this.reducedMotion?0.985:1,y:this.privacyPrimaryPressed&&!this.reducedMotion?0.985:1}).animation({duration:this.reducedMotion?0:150,curve:Curve.EaseOut}).onTouch((e:TouchEvent)=>{this.privacyPrimaryPressed=e.type===TouchType.Down;}).enabled(!this.busy&&!this.legalError).onClick(()=>{this.privacyPrimaryPressed=false;this.choosePrivacy(true);})
     Button({type:ButtonType.Capsule}){Text('暂不授权云功能，仅使用本机').fontSize(14).lineHeight(22).maxLines(2).textAlign(TextAlign.Center).fontColor('#56715F').width('100%')}.width('100%').constraintSize({minHeight:50}).padding({left:16,right:16,top:12,bottom:12}).backgroundColor('#EBF1E8').borderRadius(23).border({width:0.8,color:'#D4DFD0'}).scale({x:this.privacyLocalPressed&&!this.reducedMotion?0.985:1,y:this.privacyLocalPressed&&!this.reducedMotion?0.985:1}).animation({duration:this.reducedMotion?0:150,curve:Curve.EaseOut}).onTouch((e:TouchEvent)=>{this.privacyLocalPressed=e.type===TouchType.Down;}).enabled(!this.busy&&!this.legalError).onClick(()=>{this.privacyLocalPressed=false;this.choosePrivacy(false);})
     Text('使用本机功能需遵守用户服务协议').fontSize(10).lineHeight(18).fontColor('#929486').textAlign(TextAlign.Center).width('100%')
    }.id('privacy-actions').width('100%').padding({left:20,right:20,top:14,bottom:12}).backgroundColor('#FCFAF4').borderRadius({topLeft:28,topRight:28,bottomLeft:0,bottomRight:0}).border({width:{top:0.8},color:'#FFFFFF'}).shadow({radius:18,color:'#09605757',offsetY:-5}).flexShrink(0).clip(true)
   }.width('100%').height('100%')
  }.width('100%').height('100%').backgroundColor('#FAF7EF')
 }
 @Builder aboutSupport(){
  this.title('','关于与支持','开饭小怪 · '+this.appVersion)
  ForEach(['about','privacy','terms','ai','support'],(key:string)=>{Column(){LegalLinkCard({label:legalTitle(key),detail:this.legalHint(key),icon:this.legalIcon(key),onOpen:()=>this.openLegal(key)})}.width('100%').margin({bottom:10})})
  Row({space:8}){Toggle({type:ToggleType.Switch,isOn:this.analyticsEnabled}).onChange((enabled:boolean)=>{this.run(async()=>{try{await this.legalStore.setAnalytics(enabled);this.analyticsEnabled=enabled;if(enabled){ClientTelemetry.foreground();ClientTelemetry.record('page_view',telemetryPage(this.page||'tab:'+this.tab));}}catch(_){this.analyticsEnabled=PrivacyAccess.analyticsEnabled;this.toast('设置未保存，请重试');}});});Column({space:4}){Text('帮助改进体验（可选）').fontSize(16);Text('默认关闭；同意云功能并登录后，仅上报页面分类、操作成败、耗时和版本，不含聊天、照片或搜索词。关闭后清除待发记录。').fontSize(12).lineHeight(20).fontColor('#68776E')}.layoutWeight(1)}.width('100%').margin({bottom:16})
  Text('隐私与联网选择').fontSize(20).fontColor('#36564D').margin({top:12,bottom:12})
  Text(this.cloudAllowed?'当前已授权云功能；同步和每次 AI 发送仍需你的选择。':'当前为本机模式，账号、同步及云端 AI 请求已关闭。').fontSize(15).lineHeight(26).fontColor('#68776E').margin({bottom:12})
  if(this.cloudAllowed){Button('撤回云功能同意').width('100%').height(48).borderRadius(20).fontColor('#A05D46').backgroundColor('#F4E7DC').onClick(()=>this.run(async()=>{await this.withdrawPrivacy();}))}else{Button('阅读并开启云功能').width('100%').height(48).borderRadius(20).backgroundColor('#527764').onClick(()=>{this.policyChosen=false;this.launchVisible=false;})}

 }
 private async initialize(): Promise<void> {
  this.undoNotice='';if(this.undoTimer>=0){clearTimeout(this.undoTimer);this.undoTimer=-1;}this.mealDraftSignature='';this.mealDraftCache='';this.recoverMealDraft=false;
  this.error='';
  try {
   await this.store.init(this.getUIContext().getHostContext() as common.UIAbilityContext);try{const info:bundleManager.BundleInfo=await bundleManager.getBundleInfoForSelf(bundleManager.BundleFlag.GET_BUNDLE_INFO_DEFAULT);this.appVersion=info.versionName+' ('+info.versionCode+')';}catch(_){this.appVersion='版本信息暂不可用';}
   ClientTelemetry.setVersion(this.appVersion);
   const savedEndpoint:string=await this.store.getSetting('endpoint','');this.endpoint=automaticServiceEndpoint(savedEndpoint);this.cloud.endpoint=this.endpoint;if(serviceOriginChanged(savedEndpoint,this.endpoint)){await Vault.clear();await this.store.setting('endpoint',this.endpoint);await this.store.setting('autoSync','false');}
   const sessionText:string=this.cloudAllowed?await Vault.load():'';if(sessionText){try{this.cloud.session=JSON.parse(sessionText) as Session;this.loggedIn=Boolean(this.cloud.session.accessToken);if(this.loggedIn){await this.store.selectAccountSpace(this.getUIContext().getHostContext() as common.UIAbilityContext,this.cloud.session.userId,await this.store.getSetting('boundEmail',''));}}catch(_){this.loggedIn=false;this.cloud.session=new Session();await Vault.clear();}}else{this.loggedIn=false;}
   this.smsDraft.restoreMetadata(await this.store.getSetting('smsAuth:v1:'+this.cloud.endpoint+':'+(this.cloud.session.userId||'guest'),''),Date.now());if(!this.loggedIn&&this.smsDraft.sentPurpose==='reset'){this.smsMode='reset';}this.clockNow=Date.now();
   ClientTelemetry.record('page_view',telemetryPage(this.page||'tab:'+this.tab));
   this.temporarySkips=JSON.parse(await this.store.getSetting('temporarySkips:v1','[]')) as TemporarySkip[];this.recommendScene = await this.store.getSetting('recommendScene','做饭'); this.outsideRegion = await this.store.getSetting('outsideRegion',''); this.outsideGoal = await this.store.getSetting('outsideGoal','均衡饮食'); this.outsideLearning = await this.store.getSetting('outsideLearning','true') === 'true'; this.profile = JSON.parse(await this.store.getSetting('profile:local',JSON.stringify(new UserProfile()))) as UserProfile; this.dietGoal = await this.store.getSetting('dietGoal','均衡饮食'); this.homeRegion = await this.store.getSetting('homeRegion', ''); this.learningEnabled = await this.store.getSetting('learningEnabled', 'true') === 'true'; this.excluded = await this.store.getSetting('excluded', ''); this.taste = await this.store.getSetting('taste', '');
   if(this.loggedIn){this.profile=JSON.parse(await this.store.getSetting('profile:account:'+this.cloud.session.userId,JSON.stringify(new UserProfile()))) as UserProfile;}

   this.quickstartDone=await this.store.getSetting('quickstartDone','false')==='true';this.drawDisliked=JSON.parse(await this.store.getSetting('drawDisliked','[]')) as string[];try{this.drawFilter=normalizeRecipeFilter(JSON.parse(await this.store.getSetting('drawFilter:v1',JSON.stringify(new RecipeFilterOptions()))) as RecipeFilterOptions);}catch(_){this.drawFilter=new RecipeFilterOptions();}
   this.dailyDate=await this.store.getSetting('dailyRecipeDate','');this.dailyRecipeId=await this.store.getSetting('dailyRecipeId','');
   const drawPreferencesText:string=await this.store.getSetting('drawPreferences:v2','');const drawPreferences:DrawOptions=drawPreferencesText?JSON.parse(drawPreferencesText) as DrawOptions:new DrawOptions();this.drawDishes=drawPreferencesText?drawPreferences.dishes:1;this.drawSoup=drawPreferencesText?drawPreferences.soups===1:false;this.drawPeople=drawPreferencesText?drawPreferences.people:2;this.drawMinutes=drawPreferencesText?String(drawPreferences.minutes):'0';this.drawBudget=drawPreferencesText?String(drawPreferences.budget):'0';this.drawParallel=drawPreferencesText?drawPreferences.timeMode==='parallel':false;this.drawBalanced=drawPreferencesText?Boolean(drawPreferences.balance):false;this.drawConditionsOpen=false;
   const savedMenuText:string=await this.store.getSetting('dailyMenu','');if(savedMenuText){const savedMenu:SavedMenu=JSON.parse(savedMenuText) as SavedMenu;if(savedMenu.date===dateString(new Date())&&!savedMenu.result.ids.some((id:string)=>this.drawDisliked.includes(id))){this.drawDay=savedMenu.date;this.drawResult=savedMenu.result;this.drawApplied=savedMenu.options;this.drawAttempt=savedMenu.attempt;}}
   this.mealDraftCache=await this.store.getSetting('mealEditorDraft:v1','');this.recoverMealDraft=Boolean(this.mealDraftCache);
   this.defaultUnit = await this.store.getSetting('defaultUnit', '个'); await this.loadCategoryPreferences();
   this.loginSyncOwner=await this.store.getSetting('loginSyncOwner','');
   this.autoSync = this.cloudAllowed && await this.store.getSetting('autoSync', 'false') === 'true'; this.wifiOnly = await this.store.getSetting('wifiOnly', 'true') === 'true'; this.lastSync = await this.store.getSetting('lastSync', '');
   this.notifications = await this.store.getSetting('notifications', 'false') === 'true'; this.reminderHour = await this.store.getSetting('reminderHour', '20');
   try{this.utility=JSON.parse(await this.store.getSetting('utility:v1',JSON.stringify(new UtilityState()))) as UtilityState;this.utility.timers=(this.utility.timers||[]).filter((v:KitchenTimer)=>Number.isFinite(v.deadline)&&v.deadline>0).slice(0,6);if(!this.utility.timers.length&&this.utility.timer&&this.utility.timer.deadline>0){this.utility.timers=[this.utility.timer];}this.utility.timers.forEach((v:KitchenTimer,index:number)=>{if(!v.id){v.id=String(v.deadline)+'-'+String(index);}});this.utility.timer=this.utility.timers[0]||new KitchenTimer();this.utility.searches=(this.utility.searches||[]).filter((v:string)=>typeof v==='string').slice(0,30);this.shareSearchHeat=await this.store.getSetting('shareSearchHeat','false')==='true';}catch(_){this.utility=new UtilityState();}
   try{this.experience=normalizeExperience(JSON.parse(await this.store.getSetting('experience:v1',JSON.stringify(new ExperienceState()))) as ExperienceState);}catch(_){this.experience=new ExperienceState();}try{this.household=JSON.parse(await this.store.getSetting('household:v1',JSON.stringify(new HouseholdState()))) as HouseholdState;}catch(_){this.household=new HouseholdState();}
   this.displayMode='simple';this.lobbyVisible=false;
   this.threshold = await this.store.getSetting('threshold', '3'); this.refresh(); this.revealHome(); this.handleShoppingLink();
   const foodId: string = AppStorage.get<string>('openFoodId') || ''; if (foodId) { const food: Food | undefined = this.foods.find((f: Food) => f.id === foodId); if (food) { this.startFood(food); } AppStorage.setOrCreate('openFoodId', ''); }
  } catch (e) { this.error = '本地数据库暂不可用，请重试。已保存数据不会被清空。'; }
 }
 private handleFoodLink(): void { if (!this.ready || !this.openFoodId) { return; } const food: Food | undefined = this.foods.find((f: Food) => f.id === this.openFoodId); if (food) { this.startFood(food); } this.openFoodId = ''; }
 private handleShoppingLink(): void { if (!this.ready || !this.openShoppingId) { return; } const item: Shopping | undefined = this.shopping.find((s: Shopping) => s.id === this.openShoppingId); this.openShoppingId = ''; this.lobbyVisible=false;this.tab = 1; this.page = 'shopping'; if (item && !item.purchased) { this.confirm('标记已购买', item.name + '，确认这次已经买到了？', async () => { const copy: Shopping = JSON.parse(JSON.stringify(item)) as Shopping; copy.purchased = true; await this.store.saveShopping(copy); }); } }
 private refresh(): void { this.leftoverBatches=this.store.state.leftovers.slice();this.trashEntries=this.store.state.trash.slice().reverse(); this.plans=this.store.state.plans.slice(); this.foods = this.store.state.foods.slice(); this.shopping = this.store.state.shopping.slice(); this.meals = this.store.state.meals.slice(); this.locations = this.store.state.locations.slice(); const combined: Recipe[] = offlineRecipes().concat(this.store.builtinRecipes).concat(this.store.state.recipes); const ids:Set<string>=new Set<string>();this.recipes=combined.slice().reverse().filter((r:Recipe)=>{if(ids.has(r.id)){return false;}ids.add(r.id);return true;}).reverse(); this.favorites = this.store.state.favorites.slice(); }
 private toast(message: string): void { promptAction.showToast({ message: message, duration: 2500 }); }
 private async run(action: () => Promise<void>): Promise<void> {
  if (this.busy) { return; } this.busy = true;
  const pendingTimer:number=setTimeout(()=>{this.operationPending=true;},300);
  try { await action(); this.refresh(); if (this.notifications) { try { await Reminders.schedule(this.store); } catch (reminderError) { this.toast('修改已保存；'+(reminderError as Error).message); } } } catch (e) { this.toast((e as Error).message || '操作未完成，请重试'); } finally { clearTimeout(pendingTimer); this.operationPending=false; this.busy = false; }
 }
 private async ask(title:string,message:string,yes:string='确认',no:string='取消'):Promise<boolean>{
  return await new Promise<boolean>((resolve)=>{let finished:boolean=false;const settle=(answer:boolean):void=>{if(finished){return;}finished=true;resolve(answer);};const dialog:CustomDialogController=new CustomDialogController({builder:ConfirmSheet({heading:title,detail:message,yes:yes,no:no,bodyHeight:Math.max(80,Math.min(320,this.viewportHeight*0.42)),resolved:(answer:boolean)=>{settle(answer);dialog.close();}}),alignment:DialogAlignment.Center,customStyle:true,autoCancel:true,cancel:()=>settle(false)});dialog.open();});
 }
 private chooseOption(title:string,options:string[],selected:string,accept:(index:number,value:string)=>void):void{
  let finished:boolean=false;const dialog:CustomDialogController=new CustomDialogController({builder:OptionSheet({heading:title,options:options,selected:selected,bodyHeight:Math.max(96,Math.min(360,this.viewportHeight*0.46)),resolved:(index:number)=>{if(finished){return;}finished=true;dialog.close();if(index>=0&&index<options.length){accept(index,options[index]);}}}),alignment:DialogAlignment.Center,customStyle:true,autoCancel:true,cancel:()=>{finished=true;}});dialog.open();
 }
 @Builder optionControl(title:string,value:string,options:string[],accept:(index:number,value:string)=>void){
  Button({type:ButtonType.Normal}){Row({space:8}){Text(value).fontSize(15).lineHeight(22).maxLines(1).textOverflow({overflow:TextOverflow.Ellipsis}).fontColor('#354F46').layoutWeight(1);Text('⌄').fontSize(18).fontColor('#846F8C').flexShrink(0)}.width('100%')}.width('100%').height(46).padding({left:12,right:12}).backgroundColor('#FFFDF6').border({width:0.7,color:'#D8CCB3'}).borderRadius(12).accessibilityText(title+'，'+value).onClick(()=>this.chooseOption(title,options,value,accept))
 }
 private dateDialog(options:DatePickerDialogOptions):void{
  options.backgroundColor='#FFFAF0';options.backgroundBlurStyle=BlurStyle.NONE;options.alignment=DialogAlignment.Center;
  options.textStyle={color:'#747768',font:{size:15}};options.selectedTextStyle={color:'#354F46',font:{size:20,weight:FontWeight.Medium}};
  options.acceptButtonStyle={type:ButtonType.Normal,fontSize:15,fontColor:'#FFFDF6',backgroundColor:'#56745E',borderRadius:14};options.cancelButtonStyle={type:ButtonType.Normal,fontSize:15,fontColor:'#637563',backgroundColor:'#EAEADD',borderRadius:14};DatePickerDialog.show(options);
 }
 private timeDialog(options:TimePickerDialogOptions):void{
  options.backgroundColor='#FFFAF0';options.backgroundBlurStyle=BlurStyle.NONE;options.alignment=DialogAlignment.Center;
  options.textStyle={color:'#747768',font:{size:15}};options.selectedTextStyle={color:'#354F46',font:{size:20,weight:FontWeight.Medium}};
  options.acceptButtonStyle={type:ButtonType.Normal,fontSize:15,fontColor:'#FFFDF6',backgroundColor:'#56745E',borderRadius:14};options.cancelButtonStyle={type:ButtonType.Normal,fontSize:15,fontColor:'#637563',backgroundColor:'#EAEADD',borderRadius:14};TimePickerDialog.show(options);
 }
 private async confirm(title: string, message: string, action: () => Promise<void>): Promise<void> { if (await this.ask(title, message)) { await this.run(action); } }
 private surface(): string { return '#E8FFFDFA'; }
 private backdrop(): string { return '#FFFDF5'; }
 private conflictPreview(payload: Object): string { const f: Food = payload as Food; const m: Meal = payload as Meal; return [f.name || '', f.quantity !== undefined ? String(f.quantity) + (f.unit || '') : '', f.location || '', f.expiryDate || '', m.date || '', f.notes || ''].filter((v: string) => v.length > 0).join(' · '); }
 private activeFoods(): Food[] { return this.foods.filter((f: Food) => !f.archived); }
 private count(status: string): number {
  return this.activeFoods().filter((f: Food) => status === 'all' || (status === 'expired' && daysLeft(f) < 0) || (status === 'soon' && daysLeft(f) >= 0 && daysLeft(f) <= Number(this.threshold)) || (status === 'normal' && daysLeft(f) > Number(this.threshold)) || (status === 'low' && f.quantity <= 1)).length;
 }
 private visibleFoods(): Food[] {
  return this.activeFoods().filter((f: Food) => (this.filter === '全部' || f.category === this.filter || f.location === this.filter) && `${f.name}${f.category}${f.location}${f.expiryDate}${f.tags}${f.notes}`.includes(this.search)).sort((a: Food, b: Food) => this.sortBy === '名称' ? a.name.localeCompare(b.name) : this.sortBy === '数量' ? a.quantity - b.quantity : this.sortBy === '新增时间' ? b.purchasedAt.localeCompare(a.purchasedAt) : a.expiryDate.localeCompare(b.expiryDate));
 }
 private status(food: Food): string { const d: number = daysLeft(food); return d < 0 ? '已过期' : d === 0 ? '今天到期' : d <= Number(this.threshold) ? `${d} 天后到期` : `保鲜 ${d} 天`; }
 private statusColor(food: Food): string { return daysLeft(food) < 0 ? '#BA5547' : daysLeft(food) <= Number(this.threshold) ? '#B67E24' : '#3E7755'; }
 private startFood(food?: Food): void { this.lobbyVisible=false; this.purchaseRecordId='';this.partialPurchase=false;this.packageOpen=false;this.packageCount='1';this.packageNet='';
  this.formStep = food ? 1 : 0; this.moreDetails = false; this.barcode = ''; this.saveBarcode = false; this.editing = food ? JSON.parse(JSON.stringify(food)) as Food : new Food();
  this.formMuted = this.editing.muted || false; this.formFamily = this.editing.familyId; this.formPurchased = this.editing.purchasedAt || dateString(new Date()); this.formBatch = this.editing.batch; this.formName = this.editing.name; this.formQuantity = String(this.editing.quantity); this.formUnit = food ? this.editing.unit : this.defaultUnit;
  this.formCategory = this.editing.category; this.formLocation = this.editing.location;
  this.formExpiry = this.editing.expiryDate || dateString(new Date(Date.now() + 7 * 86400000));
  this.formPrice = String(this.editing.estimatedPrice); this.formNotes = this.editing.notes; this.formTags = this.editing.tags; this.page = 'food';
 }
 private useTemplate(template: Template): void {
  this.startFood(); this.formName = template.name; this.formCategory = template.category; this.formLocation = template.location;
  const previous:Food|undefined=this.foods.filter((f:Food)=>canonicalName(f.name)===canonicalName(template.name)).sort((a:Food,b:Food)=>b.modifiedAt.localeCompare(a.modifiedAt))[0];this.formStep = 1; this.formUnit = previous?previous.unit:template.unit;if(previous&&this.locations.includes(previous.location)){this.formLocation=previous.location;} this.formExpiry = dateString(new Date(Date.now() + template.days * 86400000));
 }
 private async saveFood(): Promise<void> {
  const f: Food = JSON.parse(JSON.stringify(this.editing)) as Food;
  f.name = this.formName.trim(); f.quantity = Number(this.formQuantity); f.unit = this.formUnit; f.category = this.formCategory;
  f.location = this.formLocation; f.expiryDate = this.formExpiry; f.estimatedPrice = Number(this.formPrice); f.notes = this.formNotes; f.tags = this.formTags;
  f.muted = this.formMuted; f.familyId = this.formFamily; f.purchasedAt = this.formPurchased; f.batch = this.formBatch; if (!this.editing.id && f.familyId && !await this.ask('保存到家庭共享库存？', '该家庭的所有成员均可查看和修改这份食材。', '确认共享')) { return; } if(this.purchaseRecordId){if(this.partialPurchase){await this.store.purchasePartial(this.purchaseRecordId,f,this.partialModified);}else{await this.store.purchaseIntoInventory(this.purchaseRecordId,f);}}else{await this.store.saveFood(f);} if (this.saveBarcode && this.barcode) { const t: Template = new Template(f.name, f.category, Math.max(0, Math.round((new Date(f.expiryDate).getTime() - new Date(f.purchasedAt).getTime()) / 86400000)), f.location, f.unit); t.barcode = this.barcode; const old: Template | undefined = this.store.state.templates.find((v: Template) => v.barcode === this.barcode); if (old) { t.id = old.id; t.version = old.version; } await this.store.saveTemplate(t); } this.page = ''; this.toast('已保存到本机');
 }
 private recommendationCacheKey: string = ''; private recommendationCache: Recommendation[] = [];
 private searchCatalog:RecipeSearchIndex=new RecipeSearchIndex([]); private searchCatalogKey:string=''; private discoverySearch:RecipeSearchResult=new RecipeSearchResult();
 private searchCandidates(candidates:Recipe[],query:string,cuisines:string[]=[]):RecipeSearchResult{const key:string=String(this.store.revision)+'|'+String(this.recipes.length);if(this.searchCatalogKey!==key){this.searchCatalog=new RecipeSearchIndex(this.recipes);this.searchCatalogKey=key;}const region:string=this.recommendScene==='做饭'?this.homeRegion:this.outsideRegion;const preferred:CuisineGroup|undefined=CUISINE_GROUPS.find((g:CuisineGroup)=>g.regions.includes(region));return searchRecipeCatalog(this.searchCatalog,query,candidates.map((r:Recipe)=>r.id),12,cuisines.length?cuisines:preferred?[preferred.id]:[]);}
 private submitRecipeSearch():void{this.recipeSearch=this.searchDraft.trim().slice(0,80);this.libraryMode=true;this.recipeLimit=24;this.recipeResumeRows=[];this.page='';this.tab=3;this.rememberSearch();if(COMMUNITY_ENABLED&&this.shareSearchHeat&&this.loggedIn&&this.recipeSearch){this.cloud.request('/discovery/searches',http.RequestMethod.POST,new SearchHeatEvent(this.recipeSearch)).catch(()=>{});}this.recommendations();if(this.recipeSearch.trim()&&this.discoverySearch.message){this.toast(this.discoverySearch.message);}}
 private recipeSearchStatus(query:string):string{if(!query.trim()){return '';}this.recommendations();return this.discoverySearch.message;}

 private recommendations(): Recommendation[] {
  if(this.recipeResumeRows.length&&this.recipeResumeKey===this.recipeViewKey()){return this.recipeResumeRows;}
  const key: string = JSON.stringify([dateString(new Date()),this.recipeFilter,this.recommendScene,this.outsideRegion,this.outsideGoal,this.outsideLearning,this.temporarySkips,this.household,this.recipeBudget,this.recipeOrder,this.dietGoal,this.homeRegion,this.recipeRegion,this.recipeCategory,this.learningEnabled,this.threshold,this.batch,this.recipeSearch,this.favoritesOnly,this.discovery,this.excluded,this.taste,this.recentDays,this.libraryMode,this.store.revision,this.recipes.length]);
  if (key === this.recommendationCacheKey) { return this.recommendationCache; }
  const options: RankingOptions = new RankingOptions(); options.goal = this.recommendScene === '做饭' ? this.dietGoal : this.outsideGoal; options.homeRegion = this.recommendScene === '做饭' ? this.homeRegion : this.outsideRegion; options.region = ''; options.category = ''; options.learning = this.recommendScene === '做饭' ? this.learningEnabled : this.outsideLearning; options.threshold = Number(this.threshold) || 0; options.batch = this.batch; options.maxMinutes = 0; options.intent = this.recommendScene === '做饭' ? 'cook' : 'record';
  options.excluded=this.excluded.split(/[,，、]/).concat(householdExclusions(this.household)).map((v:string)=>v.trim()).filter((v:string)=>!!v);
  const eligible:Recipe[]=this.recipes.filter((r:Recipe)=>(!this.store.retiredRecipeIds.includes(r.id)||this.favoritesOnly)&&matchesRecipeFilter(r,this.recipeFilter,this.foods,dateString(new Date()))&&(!this.favoritesOnly||this.favorites.some((f:Favorite)=>f.recipeId===r.id))&&matchesRankingConstraints(r,options)&&(this.libraryMode||!activeSkips(this.temporarySkips,this.recommendScene==='做饭'?'cook':'record',Date.now()).includes(r.id)));
  this.discoverySearch=this.searchCandidates(eligible,this.recipeSearch,this.recipeFilter.cuisines||[]);const hitIds:string[]=this.discoverySearch.hits.map((hit)=>hit.recipeId);const scores:Map<string,number>=new Map<string,number>();this.discoverySearch.hits.forEach((hit)=>scores.set(hit.recipeId,hit.score));
  const candidates:Recipe[]=eligible.filter((r:Recipe)=>hitIds.includes(r.id));
  const all: Recommendation[] = this.libraryMode?candidates.map((r:Recipe)=>new Recommendation(r)):recommend(candidates,this.foods,this.meals,this.excluded,'',Number(this.recentDays) || 7,options,this.store.feedback);
  this.recommendationCacheKey=key;
  const order:string=(this.recipeOrder==='推荐'||this.recipeOrder==='综合排序')&&!this.libraryMode?'推荐':this.recipeOrder==='推荐'?'综合排序':this.recipeOrder;
  all.sort((a:Recommendation,b:Recommendation)=>{if(order==='收藏最多'){return this.communityFavoriteCount(b.recipe.id)-this.communityFavoriteCount(a.recipe.id)||a.recipe.name.localeCompare(b.recipe.name)||a.recipe.id.localeCompare(b.recipe.id);}if(order==='价格升序'||order==='价格降序'){return (displayCost(a.recipe,this.recipeFilter.costPeople).total-displayCost(b.recipe,this.recipeFilter.costPeople).total)*(order==='价格降序'?-1:1)||a.recipe.name.localeCompare(b.recipe.name)||a.recipe.id.localeCompare(b.recipe.id);}return (this.recipeSearch.trim()&&(order==='推荐'||order==='综合排序')?(scores.get(b.recipe.id)||0)-(scores.get(a.recipe.id)||0):0)||compareRecipeOrder(a.recipe,b.recipe,order,'',this.recipeFilter.costPeople);});
  this.recommendationCache=all;return all;
 }
 private timeText(recipe: Recipe): string { const minutes: number = recipeMinutes(recipe); return minutes > 0 ? '约 ' + (minutes >= 60 ? String(Math.floor(minutes / 60)) + '小时' + (minutes % 60 ? String(minutes % 60) + '分' : '') : String(minutes) + ' 分钟') : '耗时待补充'; }
 private timeBreakdown(recipe: Recipe): string { const prep: number = recipe.prepMinutes || 0; const cook: number = recipe.cookMinutes || 0; return prep >= 0 && cook > 0 && prep + cook === recipeMinutes(recipe) ? '备料 ' + prep + ' 分钟\n制作 ' + cook + ' 分钟' : '含备料与制作，仅供参考'; }
 private todayMeals(): Meal[] { return this.meals.filter((m: Meal) => dateString(new Date(m.date)) === dateString(new Date())); }
 private mealSpend(list: Meal[]): string { return list.reduce((sum: number,m: Meal) => sum + Math.round((m.personalCost>=0?m.personalCost:m.estimatedCost) * 100),0) / 100 + ''; }
 private knownCalories(list: Meal[]): number { return list.filter((m: Meal) => m.calories >= 0).reduce((sum: number,m: Meal) => sum + m.calories,0); }
 private visibleMeals(): Meal[] { return this.meals.filter((m: Meal) => (!this.diaryDate || dateString(new Date(m.date)) === this.diaryDate) && (!this.diaryDining || (m.diningMode || '在家做') === this.diaryDining)).slice().sort((a: Meal,b: Meal) => b.date.localeCompare(a.date)); }
 private mealFingerprint(): string { return JSON.stringify([this.mealDishes,this.dishName,this.dishCost,this.mealPortion,this.mealDining,this.mealDate,this.mealTime,this.mealType,this.mealPlace,this.mealRating,this.mealCalories,this.energySource,this.energyFraction,this.mealNotes,this.mealTags,this.mealCostType,this.mealPhoto.compressed,this.editingMeal.photoId,this.mealDelivery,this.mealDiscount,this.mealSplit,this.mealShares,this.trialOutcome,this.trialMinutes,this.trialReplacement,this.trialFailure]); }
 private draftMealCost(): string { const base: number = Number(this.mealCost); const pending: number = this.dishName.trim() ? Number(this.dishCost) : 0; const replaced: number = this.editingDish >= 0 && this.mealDishes[this.editingDish] ? this.mealDishes[this.editingDish].estimatedCost : 0; const value: number = base + pending - replaced; return Number.isFinite(value) && value >= 0 ? value.toFixed(2) : '待检查'; }
 private recentDishes(): MealItem[] { const out: MealItem[] = []; this.meals.slice().sort((a: Meal,b: Meal) => b.date.localeCompare(a.date)).forEach((m: Meal) => { mealItems(m).forEach((item: MealItem) => { if (!out.some((v: MealItem) => v.name === item.name) && out.length < 8) { out.push(item); } }); }); return out; }
 private useRecentDish(item: MealItem): void { if (this.mealDishes.length >= 40) { return; } this.mealDishes = this.mealDishes.concat([new MealItem(item.name,item.estimatedCost,item.recipeId,item.category)]); this.mealCost = String(totalMealCost(this.mealDishes)); }
 private resetRecipeFilters(): void { this.recipeFilter = new RecipeFilterOptions(); this.recipeFilterDraft = new RecipeFilterOptions(); this.recipeSearch = ''; this.recipeRegion = ''; this.recipeCategory = ''; this.favoritesOnly = false; this.recipeBudget = 0; this.recipeOrder = '综合排序';this.libraryMode=true;this.recipeResumeRows=[]; this.recipeLimit = 24; }
 private beginRecipeFilters(): void { this.recipeFilterSection='食材';this.filterReturn='';this.draftFavorites=this.favoritesOnly;this.draftOrder=this.recipeOrder;this.recipeFilterDraft=JSON.parse(JSON.stringify(this.recipeFilter)) as RecipeFilterOptions;this.recipeFiltersOpen=true;this.page='recipe-filters'; }
 private draftFilterChoice(field: string,value: string): void {
  const next: RecipeFilterOptions=JSON.parse(JSON.stringify(this.recipeFilterDraft)) as RecipeFilterOptions;
  if(field==='time'){next.maxMinutes=Number(value);}else if(field==='availability'){next.availability=value;}else if(field==='ingredientMode'){next.ingredientMode=value;}else if(field==='budget'){next.maxCost=Number(value);}else if(field==='costPeople'){next.costPeople=Number(value);}else{
   const values: string[]=field==='occasions'?next.occasions:field==='regions'?next.regions:field==='cuisines'?next.cuisines:field==='tastes'?next.tastes:field==='goals'?next.goals:field==='ingredients'?next.ingredients:field==='excludedIngredients'?next.excludedIngredients:field==='difficulties'?next.difficulties:next.categories;
   const changed:string[]=values.includes(value)?values.filter((v:string)=>v!==value):values.concat([value]);
   if(field==='occasions'){next.occasions=changed;}else if(field==='regions'){next.regions=changed;}else if(field==='cuisines'){next.cuisines=changed;}else if(field==='tastes'){next.tastes=changed;}else if(field==='goals'){next.goals=changed;}else if(field==='ingredients'){next.ingredients=changed;}else if(field==='excludedIngredients'){next.excludedIngredients=changed;}else if(field==='difficulties'){next.difficulties=changed;}else{next.categories=changed;}
  }this.recipeFilterDraft=next;
 }
 private beginDrawFilters():void{this.recipeFilterSection='食材';this.filterReturn='draw';this.draftFavorites=false;this.draftOrder='综合排序';this.recipeFilterDraft=JSON.parse(JSON.stringify(this.drawFilter)) as RecipeFilterOptions;this.recipeFiltersOpen=true;this.page='recipe-filters';}
 private drawCandidates():Recipe[]{return this.recipes.filter((r:Recipe)=>matchesRecipeFilter(r,this.drawFilter,this.foods,dateString(new Date())));}
 private applyRecipeFilters(): void {if(this.filterIssues().length){this.toast(this.filterIssues()[0]);return;}if(this.filterReturn==='draw'){this.drawFilter=JSON.parse(JSON.stringify(this.recipeFilterDraft)) as RecipeFilterOptions;this.store.setting('drawFilter:v1',JSON.stringify(this.drawFilter)).catch(()=>this.toast('抽取筛选尚未保存，请重试'));this.recipeFiltersOpen=false;this.page='draw';this.filterReturn='';return;}this.favoritesOnly=this.draftFavorites;this.recipeOrder=this.draftOrder;this.recipeFilter=JSON.parse(JSON.stringify(this.recipeFilterDraft)) as RecipeFilterOptions;this.recipeCategory=this.recipeFilter.categories[0]||'';this.libraryMode=true;this.recipeLimit=24;this.recipeFiltersOpen=false;this.page='';this.tab=3; }
 private cancelRecipeFilters():void{this.recipeFiltersOpen=false;this.page=this.filterReturn==='draw'?'draw':'';this.filterReturn='';}
 private draftFilterCount():number{const options:RankingOptions=new RankingOptions();options.excluded=this.excluded.split(/[,，、]/).concat(householdExclusions(this.household)).map((v:string)=>v.trim()).filter((v:string)=>!!v);const eligible:Recipe[]=this.recipes.filter((r:Recipe)=>(!this.store.retiredRecipeIds.includes(r.id)||this.favoritesOnly)&&matchesRecipeFilter(r,this.recipeFilterDraft,this.foods,dateString(new Date()))&&matchesRankingConstraints(r,options)&&((this.filterReturn!=='draw'&&this.libraryMode)||!activeSkips(this.temporarySkips,this.recommendScene==='做饭'?'cook':'record',Date.now()).includes(r.id))&&(this.filterReturn==='draw'?!this.drawDisliked.includes(r.id):!this.draftFavorites||this.favorites.some((f:Favorite)=>f.recipeId===r.id)));return this.filterReturn==='draw'?eligible.length:this.searchCandidates(eligible,this.recipeSearch,this.recipeFilterDraft.cuisines||[]).hits.length;}
 private recipeRows():Recommendation[]{const keys:string[]=[];return this.recommendations().filter((row:Recommendation)=>{const key:string=recipeGroupKey(row.recipe);if(keys.includes(key)){return false;}keys.push(key);return true;});}
 private recipeVariants(recipe:Recipe):Recipe[]{return this.recipes.filter((r:Recipe)=>recipeGroupKey(r)===recipeGroupKey(recipe));}
 private filterValues(kind:string):string[]{return Array.from(new Set<string>(this.recipes.map((r:Recipe)=>kind==='region'?r.region||r.cuisine:r.taste).filter((v:string)=>!!v)));}
 private filterIngredientNames():string[]{const names:string[]=[];this.foods.filter((f:Food)=>!f.archived&&f.quantity>0&&f.expiryDate>=dateString(new Date())).forEach((f:Food)=>{if(!names.includes(f.name)){names.push(f.name);}});return names.slice(0,16);}

 private async chooseScene(mode: string): Promise<void> { this.recommendScene = mode; this.recipeLimit = 24; await this.store.setting('recommendScene',mode); }
 private preferenceRegion(): string { return this.preferenceScene === '做饭' ? this.homeRegion : this.outsideRegion; }
 private preferenceGoal(): string { return this.preferenceScene === '做饭' ? this.dietGoal : this.outsideGoal; }
 private preferenceLearning(): boolean { return this.preferenceScene === '做饭' ? this.learningEnabled : this.outsideLearning; }
 private preferenceIntent(): string { return this.preferenceScene === '做饭' ? 'cook' : 'record'; }
 private async saveRegion(region: string): Promise<void> { if (this.preferenceScene === '做饭') { await this.setHomeRegion(region); } else { this.outsideRegion = region; await this.store.setting('outsideRegion',region); } }
 private async saveGoal(goal: string): Promise<void> { if (this.preferenceScene === '做饭') { this.dietGoal = goal; await this.store.setting('dietGoal',goal); } else { this.outsideGoal = goal; await this.store.setting('outsideGoal',goal); } }
 private async saveLearning(value: boolean): Promise<void> { if (this.preferenceScene === '做饭') { this.learningEnabled = value; await this.store.setting('learningEnabled',String(value)); } else { this.outsideLearning = value; await this.store.setting('outsideLearning',String(value)); } }
 private async setHomeRegion(region: string): Promise<void> { this.homeRegion = region; await this.store.setting('homeRegion',region); }
 private navIcon(index:number):Resource{return uiIcon(index===0?'today':index===1?'pantry':index===2?'storage':index===3?'recipes':index===4?'diary':'profile');}
 private foodImage(name: string, category: string): Resource {
  if (name.includes('蛋')) { return $r('app.media.food_eggs'); } if (name.includes('奶')) { return $r('app.media.food_milk'); }
  if (name.includes('米')) { return $r('app.media.food_rice'); } if (name.includes('苹果') || category === '水果') { return $r('app.media.food_apple'); }
  if (name.includes('西红柿') || name.includes('番茄')) { return $r('app.media.food_tomato'); } if (category === '肉禽水产') { return $r('app.media.food_pork'); }
  if (category === '干货') { return $r('app.media.food_dried'); } if (category === '调味品') { return $r('app.media.food_spice'); } return $r('app.media.food_greens');
 }
 private recipeImage(id: string): Resource { const r: Recipe | undefined = this.recipes.find((recipe: Recipe) => recipe.id === id); return r ? recipeCover(r) : $r('app.media.nav_line_recipe'); }
 private categoryTint(category: string): string {
  return category === '蔬菜' ? '#D8F2AA' : category === '肉禽水产' ? '#FFC6D7' : category === '蛋奶' ? '#FFE989' : category === '干货' ? '#F5DDA5' : category === '水果' ? '#FFB7DB' : category === '调味品' ? '#D4BFF7' : '#B8E2FA';
 }
 private categoryInk(category: string): string { return category === '肉禽水产' ? '#AC5C4A' : category === '蛋奶' ? '#9B7226' : category === '水果' ? '#A65673' : category === '调味品' ? '#7D609D' : category === '其他' ? '#587FA0' : '#547549'; }
 private foodEmoji(name: string, category: string): string { return name.includes('蛋') ? '🥚' : name.includes('奶') ? '🥛' : name.includes('米') ? '🍚' : name.includes('苹果') ? '🍎' : name.includes('西红柿') ? '🍅' : name.includes('骨') ? '🥩' : category === '水果' ? '🍊' : category === '干货' ? '🥜' : '🥬'; }
 private changeQuantity(delta: number): void { const value: number = Number(this.formQuantity) || 0; this.formQuantity = String(Math.max(0.01, Math.round((value + delta) * 100) / 100)); }
 private expiryAfter(days: number): void { const base: Date = new Date(this.formPurchased + 'T12:00:00'); base.setDate(base.getDate() + days); this.formExpiry = dateString(base); }
 private chooseDate(expiry: boolean): void {
  this.dateDialog({ start: new Date('2000-01-01'), end: new Date('2100-12-31'), selected: new Date((expiry ? this.formExpiry : this.formPurchased) + 'T12:00:00'), lunar: false, onAccept: (value: DatePickerResult) => { const date: string = dateString(new Date(value.year || 2026, value.month || 0, value.day || 1)); if (expiry) { this.formExpiry = date; } else { this.formPurchased = date; } } });
 }
 private toggleTag(tag: string): void { const tags: string[] = this.formTags.split(/[,，、]/).filter((v: string) => v.length > 0); this.formTags = tags.includes(tag) ? tags.filter((v: string) => v !== tag).join('、') : tags.concat([tag]).join('、'); }
 private sampleKey(id: string): number { let hash: number = this.batch + 1; for (let i: number = 0; i < id.length; i++) { hash = ((hash * 31) ^ id.charCodeAt(i)) >>> 0; } return hash; }
 private async scanFood(): Promise<void> {
  const code: string = await NativeMedia.scan(this.getUIContext().getHostContext() as common.UIAbilityContext); await this.lookupBarcode(code);
 }
 private async lookupBarcode(code: string): Promise<void> {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(code)) { throw new Error('请输入EAN/UPC条码'); }
  let template: Template | undefined = this.store.state.templates.find((v: Template) => v.barcode === code);
  if (!template && this.loggedIn) { try { const result: Template[] = JSON.parse(await this.cloud.request('/catalog/barcodes/' + code, http.RequestMethod.GET)) as Template[]; if (result.length > 0) { template = result[0]; } } catch (_) { this.toast('云端不可用，可继续手动录入'); } }
  if (template) { this.useTemplate(template); } else { this.startFood(); this.toast('尚无条码模板，请填写后确认保存'); } this.formStep = 1; this.barcode = code;
 }
 private async attachPhoto(camera: boolean): Promise<void> { this.composePhotos=[];this.composeCover=true;this.mealPhoto = await NativeMedia.select(this.getUIContext().getHostContext() as common.UIAbilityContext, camera); }
 private async addMissing(recipe: Recipe): Promise<void> {
  const additions:Shopping[]=missingShopping(recipe,this.foods,this.store.state.shopping,dateString(new Date()));if(!additions.length){this.toast('已备齐，或采购清单中已有');return;}const before:string[]=this.store.state.shopping.map((s:Shopping)=>s.id);await this.store.addShoppingBatch(additions);const ids:string[]=this.store.state.shopping.filter((s:Shopping)=>!before.includes(s.id)).map((s:Shopping)=>s.id);const expected:string=JSON.stringify(this.store.state.shopping);this.offerUndo('已加入采购',async()=>{await this.store.undoAddedRows('shopping_list',ids,expected);});
 }
 private async exportBackup(): Promise<void> {
  if(this.backupEncrypted&&this.backupPassword!==this.backupConfirm){throw new Error('两次备份密码不一致');}const content:string=this.backupEncrypted?await encryptBackup(this.store.exportData(),this.backupPassword):this.store.exportData();
  const save: picker.DocumentSaveOptions = new picker.DocumentSaveOptions(); save.newFileNames = [`开饭小怪备份-${dateString(new Date())}.json`];
  const result: string[] = await new picker.DocumentViewPicker(this.getUIContext().getHostContext() as common.UIAbilityContext).save(save);
  if (result.length === 0) { return; } const file: fileIo.File = fileIo.openSync(result[0], fileIo.OpenMode.READ_WRITE | fileIo.OpenMode.CREATE | fileIo.OpenMode.TRUNC);
  try { fileIo.writeSync(file.fd, content); } finally { fileIo.closeSync(file); } this.backupPassword='';this.backupConfirm='';this.toast('备份已导出');
 }
 private async importBackup(): Promise<void> {
  const owner:string=this.store.deviceId;const password:string=this.backupPassword;
  const options: picker.DocumentSelectOptions = new picker.DocumentSelectOptions(); options.maxSelectNumber = 1;
  const result: string[] = await new picker.DocumentViewPicker(this.getUIContext().getHostContext() as common.UIAbilityContext).select(options);
  if (result.length === 0) { return; }if(owner!==this.store.deviceId){throw new Error('账号已切换，请重新导入');} const file: fileIo.File = fileIo.openSync(result[0], fileIo.OpenMode.READ_ONLY);
  try {
   const size: number = fileIo.statSync(file.fd).size; if (size > 16 * 1024 * 1024) { throw new Error('备份超过16MB，请拆分后导入'); }
   if(size<=0){throw new Error('备份文件为空，请重新选择已导出的 JSON');}
   const bytes = new Uint8Array(size);
   const part = new ArrayBuffer(Math.min(65536,size));
   let offset = 0;
   while(offset<size){
    const length = fileIo.readSync(file.fd,part,{length:Math.min(part.byteLength,size-offset)});
    if(length<=0){throw new Error('备份文件读取不完整，请重新选择文件');}
    bytes.set(new Uint8Array(part,0,length),offset);
    offset+=length;
   }
   let content = util.TextDecoder.create('utf-8').decodeToString(bytes).replace(/^\uFEFF/,'');
   let envelope:BackupEnvelopeView;
   try{envelope=JSON.parse(content) as BackupEnvelopeView;}catch(_){throw new Error('JSON 格式不正确，请选择完整的开饭小怪备份文件');}
   if(!envelope){throw new Error('备份缺少数据');}
   if(envelope.format==='kaifan-backup'){
    if(!password){throw new Error('这是加密备份，请先输入导出时设置的密码');}
    content=await decryptBackup(content,password);
   }
   this.backupPassword='';this.backupConfirm=''; if(owner!==this.store.deviceId){throw new Error('账号已切换，请重新导入');}const snapshot:string=this.store.exportData();const count: number = this.store.backupConflicts(content); let replace: boolean = false;const incoming:Snapshot=JSON.parse(content) as Snapshot;if(!await this.ask('导入预览','库存 '+incoming.foods.length+'、采购 '+incoming.shopping.length+'、记餐 '+incoming.meals.length+'、剩菜 '+(incoming.leftovers||[]).length+'、计划 '+(incoming.plans||[]).length+'；重复 '+count+' 项。将合并到当前本机账号，不自动上传。')){return;}if (count > 0) { replace = await this.ask('备份中发现 ' + count + ' 条同ID记录', '选择保留本机可跳过冲突并导入新记录；选择采用备份会替换冲突记录，后续云端冲突仍需明确处理。', '采用备份', '保留本机'); } if(owner!==this.store.deviceId){throw new Error('账号已切换，请重新导入');}await this.store.importData(content, replace,snapshot);
  } finally { fileIo.closeSync(file); } this.toast('备份已合并');
 }

 private async submitAuth():Promise<void>{this.authError='';await this.run(async()=>{try{await this.cloudLogin(this.authRegister);}catch(e){this.authError=(e as Error).message||'连接未完成，请重试';await this.ask('登录未完成',this.authError,'返回修改','');}});}
 private async useServiceEndpoint():Promise<void>{
  const next:string=normalizeEndpoint(this.endpoint);
  if(serviceOriginChanged(this.cloud.endpoint,next)){this.clearAssistant();this.cloud.session=new Session();this.loggedIn=false;this.autoSync=false;await Vault.clear();await this.store.setting('autoSync','false');}
  this.cloud.endpoint=next;this.endpoint=next;
 }
 private async cloudLogin(register:boolean):Promise<void>{
  if(this.smsMode!=='password'){await this.smsSignIn();return;}
  this.email=normalizeEmail(this.email);const invalid:string=credentialError(this.email,this.password,register,this.profile.displayName,this.authConfirm);if(invalid){throw new Error(invalid);}

  await this.useServiceEndpoint();
  try{await this.cloud.login(this.email,this.password,register,this.profile);this.password='';this.authConfirm='';this.loggedIn=true;await this.switchAccountData();}catch(error){this.cloud.session=new Session();this.loggedIn=false;await Vault.clear();this.autoSync=false;throw new Error((error as Error).message);}
  await this.store.setting('endpoint',this.cloud.endpoint);await this.store.setting('boundEmail',this.email);this.syncMessage='登录成功';
  try{await this.loadAccount();this.dietGoal=this.profile.dietGoal;await this.store.setting('dietGoal',this.dietGoal);await this.setHomeRegion(this.regions.includes(cuisineForRegion(this.profile.regionName))?cuisineForRegion(this.profile.regionName):'');}catch(_){this.toast('已登录，资料稍后可刷新');}
  if(this.authReturn==='ai-assistant'){this.authReturn='';this.openAssistant();}else if(this.authReturn==='community'){this.authReturn='';await this.loadFeed(this.feedScope);}else{this.page='';this.tab=0;}
 }

 private async saveSmsMetadata():Promise<void>{try{await this.store.setting('smsAuth:v1:'+this.cloud.endpoint+':'+(this.cloud.session.userId||'guest'),this.smsDraft.metadata());}catch(_){} }
 private smsPurpose():string{return this.page==='account-security'?(this.smsClosing?'close':'bind'):this.smsMode==='reset'?'reset':'login';}
 private changeSmsMode(value:string):void{this.smsMode=value;this.smsDraft.clearProof();this.smsPassword='';this.password='';this.authConfirm='';this.authShowPassword=false;this.authError='';}
 private async smsSignIn():Promise<void>{
  this.smsDraft.purpose='login';const invalid:string=this.smsDraft.proofError(Date.now());if(invalid){throw new Error(invalid);}if(!this.smsConsent){throw new Error('请先阅读并同意协议及短信认证说明');}
  this.email=smsPhone(this.smsDraft.phone);await this.useServiceEndpoint();
  try{await this.cloud.smsLogin(this.smsDraft.challengeId,this.smsDraft.code);this.smsDraft.clearProof();await this.store.setting('smsAuth:v1:'+this.cloud.endpoint+':guest','');this.password='';this.authConfirm='';this.loggedIn=true;await this.switchAccountData();}catch(error){this.cloud.session=new Session();this.loggedIn=false;await Vault.clear();this.autoSync=false;throw new Error((error as Error).message);}
  await this.store.setting('endpoint',this.cloud.endpoint);await this.store.setting('boundEmail',this.email);this.syncMessage='登录成功';
  try{await this.loadAccount();this.dietGoal=this.profile.dietGoal;await this.store.setting('dietGoal',this.dietGoal);await this.setHomeRegion(this.regions.includes(cuisineForRegion(this.profile.regionName))?cuisineForRegion(this.profile.regionName):'');}catch(_){this.toast('已登录，资料稍后可刷新');}
  if(this.authReturn==='ai-assistant'){this.authReturn='';this.openAssistant();}else if(this.authReturn==='community'){this.authReturn='';await this.loadFeed(this.feedScope);}else{this.page='';this.tab=0;}
 }

 private async sendSmsCode():Promise<void>{await this.run(async()=>{this.authError='';try{
  const invalid:string=smsPhoneError(this.smsDraft.phone);if(invalid){throw new Error(invalid);}if(!this.loggedIn&&!this.smsConsent){throw new Error('请先阅读并同意协议及短信认证说明');}if(smsWaitSeconds(this.smsDraft.retryAt,Date.now())>0){throw new Error('请等待倒计时结束后重发');}
  await this.useServiceEndpoint();const phone:string=smsPhone(this.smsDraft.phone);const purpose:string=this.smsPurpose();const owner:string=this.cloud.session.userId;
  const sent:SmsChallenge=await this.cloud.sendSms(phone,purpose);if(owner!==this.cloud.session.userId){throw new Error('账号已变化，请重新操作');}this.smsDraft.sent(sent.challengeId,phone,purpose,sent.retryAfter,sent.expiresIn,Date.now());this.clockNow=Date.now();await this.saveSmsMetadata();this.toast('验证码已发送，5分钟内有效');
 }catch(error){this.authError=(error as Error).message;await this.ask('验证码发送未完成',this.authError,'返回修改','');}});}
 private async submitSmsAction():Promise<void>{
  if(this.smsPurpose()==='login'){await this.submitAuth();return;}
  await this.run(async()=>{this.authError='';try{this.smsDraft.purpose=this.smsPurpose();const invalid:string=this.smsDraft.proofError(Date.now());if(invalid){throw new Error(invalid);}
   if(this.smsPurpose()==='reset'){if(!this.smsConsent){throw new Error('请先同意短信认证说明');}const error:string=newPasswordError(this.smsPassword);if(error){throw new Error(error);}await this.cloud.resetPhonePassword(this.smsDraft.challengeId,this.smsDraft.code,this.smsPassword);this.changeSmsMode('sms');this.toast('密码已重置，请重新登录');}
   else if(this.smsClosing){if(this.accountDeleteConfirm!=='注销我的账号'){throw new Error('请输入“注销我的账号”确认');}if(!await this.ask('注销云端账号','此操作会清除云端示例主体数据并退出所有设备；本机记录保留。','确认注销','取消')){return;}await this.cloud.closeByPhone(this.smsDraft.challengeId,this.smsDraft.code,this.accountDeleteConfirm);await Vault.clear();this.cloud.session=new Session();this.loggedIn=false;this.smsDraft=new SmsAuthDraft();this.smsStatusValue=new SmsStatus();this.smsClosing=false;this.accountDeleteConfirm='';this.page='';this.tab=5;this.toast('云端账号已注销，本机记录保留');}
   else{await this.cloud.bindPhone(this.smsDraft.challengeId,this.smsDraft.code,this.smsPassword);this.smsPassword='';this.smsDraft.clearProof();this.smsStatusValue=await this.cloud.smsStatus();this.toast('手机号已绑定，原账号数据保留');}
  }catch(error){this.authError=(error as Error).message;await this.ask('验证未完成',this.authError,'返回修改','');}});
 }
 @Builder passwordGuide(value:string){
  Flex({wrap:FlexWrap.Wrap}){Text((passwordLengthOk(value)?'✓ ':'○ ')+'6–128位').fontSize(12).fontColor(passwordLengthOk(value)?'#477657':'#8C8879').margin({right:14});Text((passwordLetterOk(value)?'✓ ':'○ ')+'包含字母').fontSize(12).fontColor(passwordLetterOk(value)?'#477657':'#8C8879').margin({right:14});Text((passwordDigitOk(value)?'✓ ':'○ ')+'包含数字').fontSize(12).fontColor(passwordDigitOk(value)?'#477657':'#8C8879')}.width('100%').margin({top:4,bottom:14})
 }
 @Builder smsFields(){
  AuthFloatingField({value:this.smsDraft.phone,label:this.smsClosing?'已绑定手机号':'手机号',fieldId:'sms-phone',phone:true,maxChars:16,valid:!smsPhoneError(this.smsDraft.phone),invalid:this.smsDraft.phone.length>=11&&!!smsPhoneError(this.smsDraft.phone),reduceMotion:this.reducedMotion,onValue:(v:string)=>{if(smsPhone(v)!==smsPhone(this.smsDraft.phone)){this.smsDraft.clearProof();}this.smsDraft.phone=v;this.authError='';this.saveSmsMetadata();}})
  Text(!smsPhoneError(this.smsDraft.phone)?'手机号格式正确':this.smsDraft.phone.length>=11?'请检查手机号格式':this.smsDraft.phone?'已输入 '+String(this.smsDraft.phone.replace(/\D/g,'').length)+' / 11 位':'输入11位手机号，校验通过后可获取验证码').fontSize(12).lineHeight(20).fontColor(!smsPhoneError(this.smsDraft.phone)?'#477657':'#878573').width('100%').constraintSize({minHeight:28}).margin({bottom:10})
  AuthFloatingField({value:this.smsDraft.code,label:'6位短信验证码',fieldId:'sms-code',numeric:true,maxChars:6,reduceMotion:this.reducedMotion,onValue:(v:string)=>{this.smsDraft.code=v.replace(/\D/g,'').slice(0,6);this.authError='';}})
  Text(this.smsDraft.challengeId?(smsRemainingSeconds(this.smsDraft.expiresAt,this.clockNow)>0?'已发送至 '+this.smsDraft.sentPhone.slice(0,3)+'****'+this.smsDraft.sentPhone.slice(-4)+' · '+String(Math.floor(smsRemainingSeconds(this.smsDraft.expiresAt,this.clockNow)/60))+':'+String(smsRemainingSeconds(this.smsDraft.expiresAt,this.clockNow)%60).padStart(2,'0')+' 内有效':'验证码已过期，请重新获取'):'验证码为6位数字，支持整段粘贴').fontSize(12).lineHeight(20).fontColor('#878573').width('100%').constraintSize({minHeight:28}).margin({bottom:10})
  Button(this.busy?'正在处理…':smsWaitSeconds(this.smsDraft.retryAt,this.clockNow)>0?String(smsWaitSeconds(this.smsDraft.retryAt,this.clockNow))+'秒后重发':'获取验证码',{type:ButtonType.Normal}).id('sms-send').height(48).width('100%').backgroundColor('#F0E8F3').fontColor('#72547F').opacity(smsCanSend(this.smsDraft.phone,this.smsDraft.retryAt,this.clockNow,this.loggedIn||this.smsConsent,this.busy)?1:0.55).margin({top:0,bottom:16}).enabled(smsCanSend(this.smsDraft.phone,this.smsDraft.retryAt,this.clockNow,this.loggedIn||this.smsConsent,this.busy)).onClick(()=>this.sendSmsCode())
  if(this.smsMode==='reset'||this.loggedIn&&!this.smsClosing){
   AuthFloatingField({value:this.smsPassword,label:this.loggedIn?'当前账号密码':'设置新密码',fieldId:'sms-password',secret:true,reduceMotion:this.reducedMotion,onValue:(v:string)=>{this.smsPassword=v;}})
   if(this.smsMode==='reset'){this.passwordGuide(this.smsPassword)}else{Text('核对原账号密码，绑定后原有数据继续保留。').fontSize(12).fontColor('#878573').lineHeight(20).width('100%').margin({bottom:12})}
  }
  if(this.smsClosing){TextInput({text:this.accountDeleteConfirm,placeholder:'输入：注销我的账号'}).height(49).onChange((v:string)=>{this.accountDeleteConfirm=v;})}
  if(!this.loggedIn){
   Row({space:8}){Checkbox({name:'sms-consent'}).select(this.smsConsent).onChange((v:boolean)=>{this.smsConsent=v;});Text('我已阅读并同意协议及隐私政策，同意将手机号用于阿里云短信认证。').fontSize(13).lineHeight(21).fontColor('#6B7A6D').layoutWeight(1)}.width('100%').margin({top:8})
   Row({space:16}){Text('用户服务协议').fontSize(13).fontColor('#72547F').constraintSize({minHeight:44}).onClick(()=>this.openLegal('terms'));Text('隐私政策').fontSize(13).fontColor('#72547F').constraintSize({minHeight:44}).onClick(()=>this.openLegal('privacy'))}.width('100%')
  }
  Text('收不到验证码？查看发送与安全说明 ›').fontSize(12).fontColor('#878573').width('100%').constraintSize({minHeight:40}).onClick(()=>this.ask('收不到验证码？','检查手机号及短信拦截记录。发送后需等待60秒重发，每个手机号24小时最多5次。验证码5分钟有效，连续输错5次后需重新获取。','知道了',''))
  if(this.authError){Text(this.authError).fontSize(14).lineHeight(23).fontColor('#A34F47').width('100%').padding(12).backgroundColor('#F8E3D9').borderRadius(12)}
  Button(this.busy?'正在验证…':this.loggedIn?(this.smsClosing?'验证并注销云端账号':'验证并绑定手机号'):this.smsMode==='reset'?'验证并重置密码':'验证并登录',{type:ButtonType.Normal}).id('sms-submit').width('100%').height(50).fontColor('#FFFFFF').backgroundColor('#72547F').borderRadius(16).margin({top:10,bottom:10}).enabled(!this.busy&&!this.smsDraft.proofError(this.clockNow)&&(this.loggedIn||this.smsConsent)&&(this.smsMode!=='reset'||!newPasswordError(this.smsPassword))&&(!this.loggedIn||this.smsClosing||!!this.smsPassword)&&(!this.smsClosing||this.accountDeleteConfirm==='注销我的账号')).onClick(()=>this.submitSmsAction())
 }
 private async flushLoginSync():Promise<void>{
  const owner:string=this.cloud.session.userId;if(!this.cloudAllowed||!owner||!this.loggedIn||owner!==this.loginSyncOwner){return;}
  try{if(this.wifiOnly){const net:connection.NetHandle=await connection.getDefaultNet();const caps:connection.NetCapabilities=await connection.getNetCapabilities(net);if(!caps.bearerTypes.includes(connection.NetBearType.BEARER_WIFI)){return;}}
   const report:SyncReport=await this.cloud.sync(this.store);if(this.cloud.session.userId!==owner){return;}this.conflicts=report.conflicts;this.lastSync=await this.store.getSetting('lastSync','');this.refresh();await this.store.setting('loginSyncOwner','');this.loginSyncOwner='';
  }catch(_){this.syncMessage='记录已保存在本机，稍后自动同步';}
 }
 private async synchronize(): Promise<void> {
  this.syncMessage = '正在同步，期间请稍候…';
  const report: SyncReport = await this.cloud.sync(this.store); this.conflicts = report.conflicts;
  if (report.conflicts.length === 0) { const uploaded: number = await this.cloud.uploadPhotos(this.store); if (uploaded > 0) { await this.cloud.sync(this.store); } } this.lastSync = await this.store.getSetting('lastSync', '');this.refresh();await this.reloadClaims();
  this.syncMessage = report.conflicts.length > 0 ? `发现 ${report.conflicts.length} 项冲突，请选择保留版本` : `已上传 ${report.uploaded} 项，拉取 ${report.downloaded} 项`;
  if(!report.conflicts.length){await this.autoWorkspace();}
 }
 private async openFamily(family: Family): Promise<void> { this.selectedFamily = family; this.familyMembers = JSON.parse(await this.cloud.request('/families/' + family.id + '/members', http.RequestMethod.GET)) as FamilyMember[]; this.familyInvite = ''; if (family.role === 'admin') { const invite: InviteCode = JSON.parse(await this.cloud.request('/families/' + family.id + '/invite', http.RequestMethod.GET)) as InviteCode; this.familyInvite = invite.inviteCode; } this.page = 'family-members'; }
 private cleanupComposeTemps(keep:string):void{
  this.composeTemps=this.composeTemps.filter((path:string)=>{
   if(path===keep||this.composePhotos.includes(path)||this.store.state.meals.some((m:Meal)=>m.localPhoto===path||m.photoOriginal===path)){return true;}
   try{fileIo.unlinkSync(path);return false;}catch(_){return true;}
  });
 }
 private async persistMealEditorDraft():Promise<void>{
  if(this.page!=='meal'||!this.ready||this.busy||this.mealDraftWriting||this.mealFingerprint()===this.mealInitial){return;}
  const fingerprint:string=this.mealFingerprint();if(fingerprint===this.mealDraftSignature){return;}
  const draft:MealEditorDraft=new MealEditorDraft();draft.base=this.editingMeal;draft.items=this.mealDishes;draft.text=[this.mealPortion,this.dishName,this.dishCost,this.mealTime,this.mealDining,this.mealPlace,this.mealCalories,this.mealCostType,this.mealName,this.mealCost,this.mealNotes,this.mealType,this.mealDate,this.mealTags,this.energySource,this.mealDelivery,this.mealDiscount,this.mealSplit,this.mealShares,this.trialOutcome,this.trialMinutes,this.trialReplacement,this.trialFailure];draft.rating=this.mealRating;draft.fraction=this.energyFraction;draft.photo=this.mealPhoto;draft.photos=this.composePhotos;draft.cover=this.composeCover;draft.updatedAt=Date.now();
  const value:string=JSON.stringify(draft);this.mealDraftWriting=true;
  try{await this.store.setting('mealEditorDraft:v1',value);this.mealDraftCache=value;this.recoverMealDraft=true;this.mealDraftSignature=fingerprint;this.cleanupComposeTemps(draft.photo.compressed);}finally{this.mealDraftWriting=false;}
 }
 private restoreMealEditorDraft():void{
  if(!this.mealDraftCache){return;}const draft:MealEditorDraft=JSON.parse(this.mealDraftCache) as MealEditorDraft;if(!Array.isArray(draft.text)||draft.text.length!==23||!Array.isArray(draft.items)){this.toast('草稿格式不兼容');return;}
  this.startMeal(draft.base);this.mealPortion=draft.text[0];this.mealDishes=draft.items;this.dishName=draft.text[1];this.dishCost=draft.text[2];this.mealTime=draft.text[3];this.mealDining=draft.text[4];this.mealPlace=draft.text[5];this.mealCalories=draft.text[6];this.mealCostType=draft.text[7];this.mealName=draft.text[8];this.mealCost=draft.text[9];this.mealNotes=draft.text[10];this.mealType=draft.text[11];this.mealDate=draft.text[12];this.mealTags=draft.text[13];this.energySource=draft.text[14];this.mealDelivery=draft.text[15];this.mealDiscount=draft.text[16];this.mealSplit=draft.text[17];this.mealShares=draft.text[18];this.trialOutcome=draft.text[19];this.trialMinutes=draft.text[20];this.trialReplacement=draft.text[21];this.trialFailure=draft.text[22]; this.mealRating=draft.rating;this.energyFraction=draft.fraction;this.mealPhoto=draft.photo;this.composePhotos=(draft.photos||[]).slice(0,4);this.composeCover=draft.cover!==false;this.mealDraftSignature=this.mealFingerprint();
 }
 private startMeal(meal?: Meal): void { this.mealPortion=meal?.portionSize||'normal';this.composePhotos=[];this.composeCover=true;this.composeKey=String(Date.now())+'-'+String(Math.floor(Math.random()*1000000));this.lobbyVisible=false; this.energySource=ENERGY_SOURCES.includes(meal?.calorieSource||'')?meal!.calorieSource:'手动估算';this.energyFraction=meal?.consumedFraction||1;this.energyOpen=false; this.mealFinanceOpen=false;this.mealDelivery=String(meal?.deliveryFee||0);this.mealDiscount=String(meal?.discount||0);this.mealSplit=String(meal?.splitPeople||1);this.mealShares=String(meal?.personalShares||1);this.trialOutcome=meal?.trialOutcome||'未评价';this.trialMinutes=String(meal?.actualMinutes||0);this.trialReplacement=meal?.trialSubstitution||'';this.trialFailure=meal?.trialFailure||'';this.leftoverOpen=false; this.mealAfterSave='';this.photoReturnRecipe=''; this.mealDetailsOpen = false; this.mealRecipePicker = false; this.editingMeal = meal ? JSON.parse(JSON.stringify(meal)) as Meal : new Meal(); this.mealDishes = meal ? JSON.parse(JSON.stringify(mealItems(this.editingMeal))) as MealItem[] : []; this.dishName = ''; this.dishCost = '0'; this.editingDish = -1; const when: Date = meal ? new Date(meal.date) : new Date(); this.mealTime = String(when.getHours()).padStart(2,'0') + ':' + String(when.getMinutes()).padStart(2,'0'); this.mealDining = meal ? this.editingMeal.diningMode || '在家做' : '在家做'; this.mealPlace = this.editingMeal.place || ''; this.mealRating = this.editingMeal.rating || 0; this.mealCalories = (this.editingMeal.energyReference>=0?String(this.editingMeal.energyReference):this.editingMeal.calories>=0?String(this.editingMeal.calories):''); this.mealCostType = this.editingMeal.costType || '估算'; this.mealName = this.editingMeal.name; this.mealCost = String(this.editingMeal.estimatedCost); this.mealNotes = this.editingMeal.notes; this.mealType = this.editingMeal.mealType; this.mealDate = this.editingMeal.date ? dateString(new Date(this.editingMeal.date)) : dateString(new Date()); this.mealTags = this.editingMeal.tags; this.mealPhoto = new LocalPhoto(); this.mealPhoto.compressed = this.editingMeal.localPhoto; this.mealPhoto.original = this.editingMeal.photoOriginal; if (!meal) { this.mealType = when.getHours() < 11 ? '早餐' : when.getHours() < 15 ? '午餐' : when.getHours() < 21 ? '晚餐' : '加餐'; } this.mealInitial = this.mealFingerprint(); this.page = 'meal';if(meal?.id){const id:string=meal.id;const owner:string=this.cloud.session.userId;this.store.getSetting('photoEditor:'+id,'').then((raw:string)=>{if(!raw||this.page!=='meal'||this.editingMeal.id!==id||owner!==this.cloud.session.userId||this.composePhotos.length){return;}const draft:MealEditorDraft=JSON.parse(raw) as MealEditorDraft;this.composePhotos=(draft.photos||[]).slice(0,4);this.composeCover=draft.cover!==false;}).catch(()=>{});} }
 private pickMealDate(filter: boolean): void { this.dateDialog({ selected: new Date((filter ? this.diaryDate || dateString(new Date()) : this.mealDate) + 'T12:00:00'), onAccept: (value: DatePickerResult) => { const date: string = dateString(new Date(value.year || 2026, value.month || 0, value.day || 1)); if (filter) { this.diaryDate = date; } else { this.mealDate = date; } } }); }
 private async submitCatalog(kind: string, id: string): Promise<void> { if (!this.loggedIn) { throw new Error('请先登录云端，私有记录继续保留'); } if (!await this.ask('提交公共' + (kind === 'barcode' ? '条码模板' : '菜谱') + '审核？', '管理员通过后将向其他用户提供，不自动公开原有私有记录。', '确认提交')) { return; } await this.synchronize(); if (this.conflicts.length > 0) { throw new Error('请先处理同步冲突'); } const body: CatalogSubmission = new CatalogSubmission(); body.kind = kind; body.sourceId = id; await this.cloud.request('/catalog/submissions', http.RequestMethod.POST, body); this.toast('已进入审核队列'); }
 private logRecommendation(id: string, action: string): void { if(['like','dislike','recently_eaten','too_complex','not_my_taste','skip'].includes(action)){this.feedbackUndoId=id;this.feedbackUndoAction=action;}this.store.recordFeedback(id,action,this.recommendScene === '做饭' ? 'cook' : 'record').then(() => { this.refresh(); }).catch(() => {}); if (!this.loggedIn) { return; } const body: RecommendationEvent = new RecommendationEvent(); body.recipeId = id; body.action = action; body.intent = this.recommendScene === '做饭' ? 'cook' : 'record'; this.cloud.request('/catalog/recommendations/events', http.RequestMethod.POST, body).catch(() => {}); }
 private async loadCategoryPreferences(): Promise<void> { this.shelfDays = await this.store.getSetting('shelf:' + this.preferenceCategory, this.preferenceCategory === '干货' || this.preferenceCategory === '调味品' ? '180' : '7'); this.warningDays = await this.store.getSetting('threshold:' + this.preferenceCategory, this.preferenceCategory === '干货' || this.preferenceCategory === '调味品' ? '15' : this.preferenceCategory === '蛋奶' ? '5' : '3'); this.categoryMuted = await this.store.getSetting('mute:' + this.preferenceCategory, 'false') === 'true'; }
 private async exportText(name: string, content: string): Promise<void> { const options: picker.DocumentSaveOptions = new picker.DocumentSaveOptions(); options.newFileNames = [name]; const result: string[] = await new picker.DocumentViewPicker(this.getUIContext().getHostContext() as common.UIAbilityContext).save(options); if (result.length === 0) { return; } const file: fileIo.File = fileIo.openSync(result[0], fileIo.OpenMode.CREATE | fileIo.OpenMode.READ_WRITE | fileIo.OpenMode.TRUNC); try { fileIo.writeSync(file.fd, content); } finally { fileIo.closeSync(file); } this.toast('已导出'); }
 private moveMonth(delta: number): void { const d: Date = new Date(this.calendarMonth + '-01T12:00:00'); d.setMonth(d.getMonth() + delta); this.calendarMonth = dateString(d).slice(0, 7); }
 private calendarCells(): number[] { const d: Date = new Date(this.calendarMonth + '-01T12:00:00'); const offset: number = (d.getDay() + 6) % 7; const days: number = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); const out: number[] = []; for (let i: number = 0; i < Math.ceil((days + offset) / 7) * 7; i++) { out.push(i < offset || i >= offset + days ? 0 : i - offset + 1); } return out; }
 private cellDate(day: number): string { return this.calendarMonth + '-' + String(day).padStart(2, '0'); }
 private mealsOn(day: number): number { return this.meals.filter((m: Meal) => dateString(new Date(m.date)) === this.cellDate(day)).length; }
 private reportTags(): string[] { const tags: string[] = []; this.reportMeals().forEach((m: Meal) => { (m.tags || '').split('、').filter((t: string) => t.trim().length > 0).forEach((t: string) => { if (!tags.includes(t)) { tags.push(t); } }); }); return tags; }
 private reportMeals(): Meal[] { return this.meals.filter((m: Meal) => inMealPeriod(m, this.reportRange)); }
 private addMealDish(recipe?: Recipe): void {
  const item: MealItem = recipe ? new MealItem(recipe.name, recipe.estimatedCost, recipe.id, recipe.region || recipe.cuisine) : new MealItem(this.dishName.trim(), Number(this.dishCost), '', this.dishCategory);
  try { totalMealCost([item]); } catch (e) { this.toast((e as Error).message); return; }
  const dishes: MealItem[] = this.mealDishes.slice(); if (this.editingDish >= 0 && !recipe) { dishes[this.editingDish] = item; } else { if (dishes.length >= 40) { this.toast('一餐最多40道菜'); return; } dishes.push(item); } this.mealDishes = dishes; this.mealCost = String(totalMealCost(dishes)); this.dishName = ''; this.dishCost = '0'; this.editingDish = -1;
 }
 private pickMealTime(): void { const at: Date = new Date(this.mealDate + 'T' + this.mealTime + ':00'); this.timeDialog({ selected: at, useMilitaryTime: true, onAccept: (value: TimePickerResult) => { this.mealTime = String(value.hour || 0).padStart(2,'0') + ':' + String(value.minute || 0).padStart(2,'0'); } }); }
 private async saveMealForm(): Promise<void> {
  if (this.dishName.trim()) { this.addMealDish(); if (this.dishName.trim()) { return; } }
  const m: Meal = JSON.parse(JSON.stringify(this.editingMeal)) as Meal; m.items = this.mealDishes.slice(); m.name = m.items.length > 0 ? m.items.map((item: MealItem) => item.name).join('、').slice(0, 200) : this.mealName; m.estimatedCost = m.items.length > 0 ? totalMealCost(m.items) : Number(this.mealCost); m.notes = this.mealNotes;m.portionSize=this.mealPortion; m.mealType = this.mealType; m.date = new Date(this.mealDate + 'T' + this.mealTime + ':00').toISOString(); m.tags = this.mealTags; m.diningMode = this.mealDining; m.place = this.mealPlace.trim(); m.rating = this.mealRating; m.calories = this.mealCalories.trim() ? Number(this.mealCalories) : -1; m.energyReference=m.calories;m.consumedFraction=this.energyFraction;if(m.calories>=0){const energy:EnergyPortion=new EnergyPortion();energy.referenceKcal=m.energyReference;energy.fraction=this.energyFraction;energy.source=this.energySource;m.calories=consumedEnergy(energy);}m.calorieSource=m.calories>=0?this.energySource:'未记录'; m.costType = this.mealCostType;
  const finance:MealFinance=this.financeValue();const totals:FinanceTotal=mealFinance(finance);m.financeFood=finance.food;m.deliveryFee=finance.delivery;m.discount=finance.discount;m.splitPeople=finance.people;m.personalShares=finance.share;m.mealTotal=totals.total;m.personalCost=totals.personal;m.trialOutcome=this.trialOutcome;m.actualMinutes=Number(this.trialMinutes)||0;m.trialSubstitution=this.trialReplacement.slice(0,200);m.trialFailure=this.trialFailure.slice(0,400);
  if (m.localPhoto !== this.mealPhoto.compressed) { m.photoId = ''; m.cloudPhoto = ''; } m.localPhoto = this.mealPhoto.compressed; m.photoOriginal = this.mealPhoto.original; m.photoStatus = m.cloudPhoto ? 'uploaded' : m.localPhoto ? 'pending' : ''; await this.store.saveMeal(m);const photoEditor:MealEditorDraft=new MealEditorDraft();photoEditor.photos=this.composePhotos;photoEditor.cover=this.composeCover;await this.store.setting('photoEditor:'+m.id,JSON.stringify(photoEditor));await this.store.setting('mealEditorDraft:v1','');this.cleanupComposeTemps(m.localPhoto);this.mealDraftCache='';this.recoverMealDraft=false;const after:string=JSON.stringify(this.store.state.meals.find((row:Meal)=>row.id===m.id));const before:Meal=JSON.parse(JSON.stringify(this.editingMeal)) as Meal;this.offerUndo('这一餐已保存',async()=>{const current:Meal|undefined=this.store.state.meals.find((row:Meal)=>row.id===m.id);if(!current||JSON.stringify(current)!==after){throw new Error('记录已有后续修改，不能撤销');}if(before.id){await this.store.saveMeal(before);}else{await this.store.deleteMeal(current);}this.refresh();}); this.page = this.photoReturnRecipe?'recipe-works':'';this.tab=4;if(this.mealAfterSave==='publish'){this.publishSource=m.id;this.publishPrice=false;await this.loadAccount();this.page='publish';}this.toast('这一餐已保存');
 }
 private csvCell(text: string): string { const safe: string = /^[=+@-]/.test(text) ? "'" + text : text; return '"' + safe.replace(/"/g, '""') + '"'; }
 private async exportStats(): Promise<void> { const lines: string[] = ['日期,餐次,菜品,菜品合计,示例主体花费,费用类型,实际热量kcal,热量来源,参考整份热量,食用比例,标签']; this.reportMeals().forEach((m: Meal) => { lines.push([m.date, m.mealType, m.name, m.estimatedCost.toFixed(2),(m.personalCost>=0?m.personalCost:m.estimatedCost).toFixed(2),m.costType||'估算',m.calories>=0?String(m.calories):'',m.calorieSource||'未记录',m.energyReference>=0?String(m.energyReference):'',String(m.consumedFraction||1),m.tags].map((v: string) => this.csvCell(v)).join(',')); }); await this.exportText('开饭小怪统计-' + dateString(new Date()) + '.csv', '\uFEFF' + lines.join('\n')); }
 private async loadPublicRecipes(): Promise<void> { if (!this.loggedIn) { throw new Error('公共菜谱需要登录，离线菜谱始终可用'); } const rows: PublicRecipe[] = JSON.parse(await this.cloud.request('/catalog/recipes', http.RequestMethod.GET)) as PublicRecipe[]; this.publicRecipes = rows; this.page = 'public-recipes'; }
 private communityRecipeOptions():SelectOption[]{const values:SelectOption[]=this.recipes.slice().sort((a:Recipe,b:Recipe)=>a.name.localeCompare(b.name)).map((r:Recipe):SelectOption=>{return {value:r.name};});values.unshift({value:'全部菜谱'});return values;}
 private communityRegionOptions():SelectOption[]{const values:SelectOption[]=PROFILE_REGIONS.map((v:ProfileRegion):SelectOption=>{return {value:v.name};});values.unshift({value:'全部地区'});return values;}
 private async loadTrialEvidence(id:string):Promise<void>{if(!COMMUNITY_ENABLED){return;}this.trialEvidence=new TrialEvidence();this.trialEvidenceLoaded=false;if(!this.loggedIn){return;}const owner:string=this.cloud.session.userId;try{const result:TrialEvidence=JSON.parse(await this.cloud.request('/community/recipes/'+encodeURIComponent(id)+'/trials',http.RequestMethod.GET)) as TrialEvidence;if(this.selectedRecipe.id===id&&this.cloud.session.userId===owner){this.trialEvidence=result;this.trialEvidenceLoaded=true;}}catch(_){} }
 private async applyCommunityFilters(reset:boolean=false):Promise<void>{if(reset){this.communityRecipe='';this.communityRegion='';this.communityOutcome='';this.communityData='all';}this.communityApplied='&recipeId='+encodeURIComponent(this.communityRecipe)+'&region='+encodeURIComponent(this.communityRegion)+'&outcome='+encodeURIComponent(this.communityOutcome)+'&data='+this.communityData;this.feedCursor='';this.feedMore=false;await this.loadFeed(this.feedScope);}
 @Builder communityFilterPanel(){
  Text(this.communityFiltersOpen?'收起筛选 ↑':'筛选菜谱、地区与试做 ↓').fontSize(17).fontColor('#6C796D').padding(12).onClick(()=>{this.communityFiltersOpen=!this.communityFiltersOpen;})
  if(this.communityFiltersOpen){Column({space:10}){
   this.optionControl('菜谱',this.communityRecipe?this.recipes.find((r:Recipe)=>r.id===this.communityRecipe)?.name||'全部菜谱':'全部菜谱',this.communityRecipeOptions().map((option:SelectOption)=>option.value as string),(index:number,_value:string)=>{const list:Recipe[]=this.recipes.slice().sort((a:Recipe,b:Recipe)=>a.name.localeCompare(b.name));this.communityRecipe=index>0?list[index-1].id:'';})
   this.optionControl('地区',this.communityRegion||'全部地区',this.communityRegionOptions().map((option:SelectOption)=>option.value as string),(index:number,_value:string)=>{this.communityRegion=index>0?PROFILE_REGIONS[index-1].name:'';})
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(4),cross:LengthMetrics.vp(4)}}){ForEach(['','成功','需改进'],(v:string)=>{Column(){ChoiceChip({label:v||'全部结果',selected:this.communityOutcome===v})}.onClick(()=>{this.communityOutcome=v;})})}
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(4),cross:LengthMetrics.vp(4)}}){ForEach(['all','real','demo'],(v:string,index:number)=>{Column(){ChoiceChip({label:['全部分享','真实用户','演示内容'][index],selected:this.communityData===v})}.onClick(()=>{this.communityData=v;})})}
   Row({space:8}){Button('重置',{type:ButtonType.Normal}).height(46).borderRadius(12).fontColor('#786680').backgroundColor('#F4EDF5').layoutWeight(1).enabled(!this.feedLoading).onClick(()=>this.run(async()=>{await this.applyCommunityFilters(true);}));Button('应用筛选',{type:ButtonType.Normal}).height(46).borderRadius(12).fontColor('#FFFFFF').backgroundColor('#816D90').layoutWeight(1).enabled(!this.feedLoading).onClick(()=>this.run(async()=>{await this.applyCommunityFilters();}))}.width('100%')
  }.width('100%').padding(14).backgroundColor('#E8DFEB').borderRadius({topLeft:9,topRight:25,bottomLeft:19,bottomRight:11}).margin({bottom:12})}
 }
 private async loadFeed(scope:string,more:boolean=false):Promise<void>{if(!COMMUNITY_ENABLED){return;}
  if(this.feedLoading){return;}this.page='community';this.feedScope=scope;this.feedError='';this.publishPicker=false;
  const request:number=++this.feedRequest;const owner:string=this.cloud.session.userId;if(!this.loggedIn){this.posts=[];this.feedPhotos=new Map();return;}this.feedLoading=true;
  try{const result:CommunityPage=JSON.parse(await this.cloud.request('/community/posts/page?scope='+encodeURIComponent(scope)+this.communityApplied+(more&&this.feedCursor?'&cursor='+encodeURIComponent(this.feedCursor):''),http.RequestMethod.GET)) as CommunityPage;if(request!==this.feedRequest||!this.loggedIn||owner!==this.cloud.session.userId){return;}this.posts=(more?this.posts:[]).concat(result.items).filter((p:CommunityPost,index:number,items:CommunityPost[])=>items.findIndex((v:CommunityPost)=>v.id===p.id)===index).slice(-100);this.feedCursor=result.nextCursor||'';this.feedMore=result.hasMore;const images:Map<string,string>=new Map();for(const p of this.posts){const url:string|undefined=this.feedPhotos.get(p.id);if(url){images.set(p.id,url);}}this.feedPhotos=images;this.hydrateFeedPhotos(result.items,request,owner).catch(()=>{});}catch(_){if(request===this.feedRequest){if(!more){this.posts=[];}this.feedError='暂时没连上，已有内容仍可查看';}}finally{if(request===this.feedRequest){this.feedLoading=false;}}
 }
 private async reloadClaims():Promise<void>{this.claimsError='';if(!this.loggedIn){this.claims=[];this.claimsLoaded=false;return;}const owner:string=this.cloud.session.userId;try{const ids:string[]=Array.from(new Set(this.shopping.filter((v:Shopping)=>Boolean(v.familyId)).map((v:Shopping)=>v.familyId)));const claims:ShoppingClaim[]=[];for(const id of ids){const result:ShoppingClaims=JSON.parse(await this.cloud.request('/shopping/claims?familyId='+encodeURIComponent(id),http.RequestMethod.GET)) as ShoppingClaims;claims.push(...result.items);}if(owner===this.cloud.session.userId){this.claims=claims;this.claimsLoaded=true;}}catch(_){this.claimsLoaded=false;this.claims=[];this.claimsError='认领状态未刷新，点此重试';}}
 private shoppingClaim(s:Shopping):ShoppingClaim|undefined{return this.claimsLoaded?this.claims.find((v:ShoppingClaim)=>v.shoppingId===s.id):undefined;}
 private claimLabel(s:Shopping):string{if(!this.claimsLoaded){return '刷新认领';}const claim:ShoppingClaim|undefined=this.shoppingClaim(s);return claim?claim.mine?'取消认领':claim.claimantName+'已认领':'我来买';}
 private async hydrateFeedPhotos(rows:CommunityPost[],request:number,owner:string):Promise<void>{const photos:CommunityPost[]=rows.filter((p:CommunityPost)=>Boolean(p.payload.photoId));for(let index:number=0;index<photos.length;index+=4){if(this.page!=='community'||request!==this.feedRequest||owner!==this.cloud.session.userId){return;}await Promise.all(photos.slice(index,index+4).map(async(post:CommunityPost)=>{try{const photo:PhotoRead=JSON.parse(await this.cloud.request('/photos/'+post.payload.photoId+'/download',http.RequestMethod.GET)) as PhotoRead;if(this.page!=='community'||request!==this.feedRequest||owner!==this.cloud.session.userId){return;}const images:Map<string,string>=new Map(this.feedPhotos);images.set(post.id,photo.url);this.feedPhotos=images;}catch(_){}}));}}
 private async hydrateWorksPhotos(targets:GalleryPhoto[],id:string,owner:string,request:number):Promise<void>{for(let index:number=0;index<targets.length;index+=4){if(this.page!=='recipe-works'||this.selectedRecipe.id!==id||this.worksRequest!==request||this.cloud.session.userId!==owner){return;}await Promise.all(targets.slice(index,index+4).map(async(target:GalleryPhoto)=>{try{const photo:PhotoRead=JSON.parse(await this.cloud.request('/photos/'+target.photoId+'/download',http.RequestMethod.GET)) as PhotoRead;if(this.page!=='recipe-works'||this.selectedRecipe.id!==id||this.worksRequest!==request||this.cloud.session.userId!==owner){return;}const images:Map<string,string>=new Map(target.own?this.ownPhotoUrls:this.worksPhotos);images.set(target.id,photo.url);if(target.own){this.ownPhotoUrls=images;}else{this.worksPhotos=images;}}catch(_){}}));}}

 private async openPost(post:CommunityPost):Promise<void>{
  const detail:CommunityPost=JSON.parse(await this.cloud.request('/community/posts/'+post.id,http.RequestMethod.GET)) as CommunityPost;
  this.postReturn=this.page==='post'?this.postReturn:this.page==='recipe'||this.page==='recipe-works'||this.page==='notifications'||this.page==='community-search'?this.page:'community';this.selectedPost=detail;this.postLiked=detail.liked;this.likeCount=detail.like_count;this.commentText='';this.replyTo='';this.replyLabel='';
  this.comments=JSON.parse(await this.cloud.request('/community/posts/'+post.id+'/comments',http.RequestMethod.GET)) as CommunityComment[];
  this.relationship=new CommunityRelationship();if(detail.user_id!==this.cloud.session.userId){try{this.relationship=JSON.parse(await this.cloud.request('/community/users/'+detail.user_id+'/relationship',http.RequestMethod.GET)) as CommunityRelationship;}catch(_){}}this.postPhoto=this.feedPhotos.get(post.id)||'';if(!this.postPhoto && post.payload.photoId){try{const photo:PhotoRead=JSON.parse(await this.cloud.request('/photos/'+post.payload.photoId+'/download',http.RequestMethod.GET)) as PhotoRead;this.postPhoto=photo.url;}catch(_){}}this.page='post';
 }
 private async togglePostLike():Promise<void>{
  await this.cloud.request('/community/posts/'+this.selectedPost.id+'/like',this.postLiked?http.RequestMethod.DELETE:http.RequestMethod.POST,this.postLiked?undefined:new Object());
  this.getUIContext().animateTo({duration:this.reducedMotion?0:200,curve:Curve.EaseOut},()=>{this.postLiked=!this.postLiked;this.likeCount=Math.max(0,this.likeCount+(this.postLiked?1:-1));});
 }
 private async choosePublish(meal:Meal):Promise<void>{if(!this.loggedIn){this.page='auth';return;}this.publishSource=meal.id;this.publishPrice=false;await this.loadAccount();this.page='publish';}
 private async publishMeal(): Promise<void> {
  if (!this.publishSource) { throw new Error('先选择要发布的用餐记录'); }
  if (!await this.ask(this.publishScope === 'public' ? '确认提交公开审核？' : '确认分享给家庭？', '仅分享你选择的这条记录。' + (this.publishPrice ? '将展示估算花费。' : '估算花费默认隐藏。'), this.publishScope === 'public' ? '提交审核' : '确认分享')) { return; }
  await this.synchronize(); if (this.conflicts.length > 0) { throw new Error('请先解决同步冲突'); }
  const body: PublishRequest = new PublishRequest(); body.sourceId = this.publishSource; body.visibility = this.publishScope; body.showPrice = this.publishPrice; if (this.publishScope === 'family') { if (!this.publishFamily) { throw new Error('请选择家庭'); } body.familyId = this.publishFamily; } else { body.familyId = ''; }
  // 可选家庭参数仅在家庭发布时发送，避免把空字符串误作为UUID。
  if (this.publishScope === 'public') { await this.cloud.request('/community/posts', http.RequestMethod.POST, new PublicPublishRequest(body.sourceId, body.showPrice)); } else { await this.cloud.request('/community/posts', http.RequestMethod.POST, body); }
  this.toast(this.publishScope === 'public' ? '已提交，审核通过后才会公开' : '已分享到家庭'); await this.loadFeed(this.publishScope === 'public' ? 'mine' : 'family');
 }
 private async loadAccount(): Promise<void> {
  const owner:string=this.cloud.session.userId;
  const devices:Device[]=JSON.parse(await this.cloud.request('/devices',http.RequestMethod.GET)) as Device[];
  const families:Family[]=JSON.parse(await this.cloud.request('/families',http.RequestMethod.GET)) as Family[];
  const profile:UserProfile=JSON.parse(await this.cloud.request('/account/profile',http.RequestMethod.GET)) as UserProfile;
  if(owner!==this.cloud.session.userId){return;}
  this.devices=devices;this.families=families;this.profile=profile;
  await this.store.setting('profile:account:'+owner,JSON.stringify(profile));this.profileDirty=false;this.profileAvatarMode='keep';this.profileAvatarUrl='';
  if(profile.avatarId){try{const photo:PhotoRead=JSON.parse(await this.cloud.request('/account/avatar/'+profile.avatarId,http.RequestMethod.GET)) as PhotoRead;if(owner===this.cloud.session.userId&&this.profile.avatarId===profile.avatarId){this.profileAvatarUrl=photo.url;}}catch(_){if(owner===this.cloud.session.userId){this.toast('头像暂未加载，可刷新资料重试');}}}
 }
 private async saveProfile(): Promise<void> {
  if (this.profile.displayName.trim().length < 2 || this.profile.displayName.trim().length > 24) { throw new Error('昵称请填2至24字'); }
  if (this.loggedIn) { const patch: ProfilePatch = new ProfilePatch(); patch.version = this.profile.version; patch.displayName = this.profile.displayName.trim(); if (this.profile.regionCode) { patch.regionCode = this.profile.regionCode; } patch.avatarPreset = this.profile.avatarPreset; patch.bio = this.profile.bio; patch.dietGoal = this.profile.dietGoal; patch.avatarMode = this.profileAvatarMode; this.profile = JSON.parse(await this.cloud.request('/account/profile/update',http.RequestMethod.POST,patch)) as UserProfile; await this.store.setting('profile:account:'+this.cloud.session.userId,JSON.stringify(this.profile)); this.profileAvatarMode = 'keep'; }
  else { await this.store.setting('profile:local',JSON.stringify(this.profile)); }
  this.dietGoal = this.profile.dietGoal; await this.store.setting('dietGoal',this.dietGoal); await this.setHomeRegion(this.regions.includes(cuisineForRegion(this.profile.regionName)) ? cuisineForRegion(this.profile.regionName) : ''); this.profileDirty = false; this.toast(this.loggedIn ? '账号资料已保存' : '本机资料已保存');
 }
 private async chooseAvatarPhoto(): Promise<void> { if (!this.loggedIn) { throw new Error('请登录后上传相册头像，也可以先选择内置头像'); } const owner:string=this.cloud.session.userId;const photo: LocalPhoto = await NativeMedia.select(this.getUIContext().getHostContext() as common.UIAbilityContext,false);if(owner!==this.cloud.session.userId){return;} const saved: UserProfile = await this.cloud.uploadAvatar(photo.compressed);if(owner!==this.cloud.session.userId){return;} const next: UserProfile = JSON.parse(JSON.stringify(this.profile)) as UserProfile; next.avatarId = saved.avatarId; next.version = saved.version; this.profile = next; this.profileAvatarUrl = photo.compressed.startsWith('file://')?photo.compressed:'file://' + photo.compressed; await this.store.setting('profile:account:'+owner,JSON.stringify(next)); this.profileAvatarMode = 'keep'; this.toast('头像已更新'); }
 private chooseProfilePreset(key: string): void { const next: UserProfile = JSON.parse(JSON.stringify(this.profile)) as UserProfile; next.avatarPreset = key; next.avatarId = ''; this.profile = next; this.profileAvatarUrl = ''; this.profileAvatarMode = 'preset'; this.profileDirty = true; }
 private chooseProfileRegion(region: ProfileRegion): void { const next: UserProfile = JSON.parse(JSON.stringify(this.profile)) as UserProfile; next.regionCode = region.code; next.regionName = region.name; this.profile = next; this.profileDirty = true; this.page = this.regionReturn; }
 private async openMyProfile(): Promise<void> { if (this.loggedIn) { await this.loadAccount(); } else { this.profile = JSON.parse(await this.store.getSetting('profile:local',JSON.stringify(new UserProfile()))) as UserProfile; this.profileAvatarUrl = ''; this.profileAvatarMode = 'keep'; } this.profileDirty = false; this.page = 'my-profile'; }

 @Builder title(eyebrow: string, heading: string, subtitle: string) {
  Column({space:7}){Text(heading).fontFamily('ShikuHand').padding({left:3,right:12,bottom:5}).fontSize(28).fontWeight(FontWeight.Normal).fontColor('#345C4E');if(subtitle && (heading===this.selectedRecipe.name || ['食材的来去都有迹','这一餐，分享给谁','账号与家庭'].includes(heading))){Text(subtitle).fontSize(14).fontColor('#66736C').lineHeight(23)}}.alignItems(HorizontalAlign.Start).width('100%').margin({bottom:14,top:8})
 }
 @Builder smallLabel(label: string) { Text(label).fontSize(13).lineHeight(20).fontColor('#68766B').margin({ top: 12, bottom: 6 }) }
 @Builder empty(label: string, hint: string) {
  Column({ space: 8 }) {
   Image(this.tab === 2 ? $r('app.media.food_apple') : this.tab === 3 ? $r('app.media.recipe_steamed_eggs') : this.tab === 4 ? $r('app.media.food_tomato') : $r('app.media.food_eggs')).width(104).height(104).objectFit(ImageFit.Contain)
   Text(label).fontSize(17).fontWeight(FontWeight.Medium).fontColor('#435C49')
   Text(hint).fontSize(14).fontColor('#73806F').textAlign(TextAlign.Center).lineHeight(22)
  }.width('100%').padding({left:20,right:20,top:16,bottom:18}).backgroundColor('#FFFDFA').borderRadius(20).margin({ top: 12 })
 }
 @Builder gettingStarted() {
  this.title('START WITH ONE SMALL THING','今天，从哪一步开始？','所有核心操作离线可用，不必先注册')
  Image(recipeCover(this.recipes[0])).width(138).height(125).objectFit(ImageFit.Contain).alignSelf(ItemAlign.Center)
  Text('不做饭也适合用：只记录吃了什么、花了多少；做饭时再用库存、备料和教程。').fontSize(16).lineHeight(27).fontColor('#334E50').margin({ bottom: 18 })
  ForEach(['在家做饭：录一份食材','在外吃饭：记下这一餐','选择困难：抽一份整餐'],(label: string,index: number) => {
   Text(label + '  →').fontSize(18).fontWeight(FontWeight.Medium).fontColor('#304F52').padding(22).width('100%').backgroundColor(['#DDE8CF','#F2D4C8','#F3DEA1'][index]).borderRadius({ topLeft: 9,topRight: 25,bottomLeft: 21,bottomRight: 12 }).margin({ bottom: 13 }).onClick(() => this.run(async () => { await this.store.setting('quickstartDone','true'); this.quickstartDone = true; if (index === 0) { this.startFood(); } else if (index === 1) { this.startMeal(); this.mealDining = '外卖'; this.mealCostType = '实付'; } else { await this.openDraw(); } }))
  })
  Text('用完去哪找？食材看在库和历史批次，记餐看每天吃什么，菜谱看做法与食材区别。先录一项即可，不要求补填所有信息。').fontSize(14).lineHeight(25).fontColor('#64736B')
 }
 private historyFoods(): Food[] {
  return this.foods.filter((f: Food) => (this.historyFilter === '全部批次' || this.historyFilter === '有消耗' && ((f.movements||[]).length>0||(f.consumedCost||0)>0||(f.wastedCost||0)>0) || this.historyFilter === '在库' && !f.archived || this.historyFilter === '已吃完' && f.archived && f.archiveReason !== 'wasted' || this.historyFilter === '已丢弃' && f.archived && f.archiveReason === 'wasted') && (f.name + f.purchasedAt + f.batch).includes(this.historySearch)).sort((a: Food,b: Food) => (b.purchasedAt || b.modifiedAt).localeCompare(a.purchasedAt || a.modifiedAt));
 }
 private purchaseQuantityText(f: Food): string { return f.purchasedQuantity !== undefined && f.purchasedQuantity >= 0 ? f.purchasedQuantity + f.unit : '原始购买数量未记录'; }
 private rebuy(f: Food): void {
  this.startFood(); this.formName = f.name; this.formUnit = f.unit; this.formCategory = f.category; this.formLocation = this.locations.includes(f.location) ? f.location : this.locations[0]; this.formQuantity = String(f.purchasedQuantity > 0 ? f.purchasedQuantity : 1); this.formPrice = String(purchaseCost(f)); this.formStep = 1;
  const shelf: number = Math.round((new Date(f.expiryDate + 'T12:00:00').getTime() - new Date(f.purchasedAt + 'T12:00:00').getTime()) / 86400000);
  if (Number.isFinite(shelf) && shelf >= 0 && shelf <= 3650) { this.formExpiry = dateString(new Date(Date.now() + shelf * 86400000)); }
  this.toast('已预填上次购买；请确认本次数量、价格和到期日');
 }
 @Builder stockHistory() {
  this.title('EVERY LITTLE PURCHASE','食材的来去都有迹','已吃完会归档，不会从历史消失')
  Search({ value: this.historySearch,placeholder: '搜索食材、购买日期、批次' }).onChange((v: string) => { this.historySearch = v; })
  Scroll() { Row({ space: 8 }) { ForEach(['全部批次','在库','有消耗','已吃完','已丢弃'],(label: string) => { Column() { ChoiceChip({ label: label,selected: this.historyFilter === label,tint: '#D7E3EE' }) }.onClick(() => { this.historyFilter = label; }) }) } }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).margin({ top: 14,bottom: 18 })
  Text(this.historyFoods().length + ' 个批次 · 点开查看购买与每次消耗').fontSize(12).fontColor('#627775').margin({ bottom: 13 })
  if (this.historyFoods().length === 0) { this.empty('这里还没有记录','换个筛选，或先录入食材。旧的永久删除记录无法恢复；归档记录会保留。') }
  ForEach(this.historyFoods(),(f: Food) => {
   Column({ space: 12 }) {
    Row({ space: 12 }) { Image(this.foodImage(f.name,f.category)).width(66).height(64).objectFit(ImageFit.Contain); Column({ space: 6 }) { Text(f.name).fontSize(21).fontWeight(FontWeight.Medium).fontColor('#304F52'); Text((f.purchasedAt || '购买日期未记录') + ' · ' + (f.archived ? f.archiveReason === 'wasted' ? '已丢弃' : '已吃完' : '还在库存')).fontSize(12).fontColor('#687B7B') }.layoutWeight(1).alignItems(HorizontalAlign.Start) }.width('100%').onClick(() => { this.historyFood = f; this.page = 'stock-detail'; })
    Text('购入 ' + this.purchaseQuantityText(f) + ' · ¥' + purchaseCost(f).toFixed(2) + '（记录 / 估算）').fontSize(14).fontColor('#385C65')
    Text('当前 ' + f.quantity + f.unit + ' · 消耗 ' + (f.movements || []).length + ' 次').fontSize(13).fontColor('#697872').width('100%')
    Row(){Blank(); Text('查看历史 →').fontSize(14).fontColor('#385C65').constraintSize({minHeight:44}).padding({left:8,right:8}).onClick(() => { this.historyFood = f; this.page = 'stock-detail'; }); Text('再买一份').fontSize(14).fontColor('#87652F').constraintSize({minHeight:44}).padding({left:8,right:8}).onClick(() => this.rebuy(f)) }.width('100%')
   }.padding(18).width('100%').alignItems(HorizontalAlign.Start).backgroundColor('#C9EDF1F2').backgroundImage($r('app.media.crayon_swatch_sage')).backgroundImageSize(ImageSize.Cover).borderRadius({ topLeft: 8,topRight: 24,bottomLeft: 18,bottomRight: 10 }).margin({ bottom: 14 })
  },(f: Food) => f.id)
 }
 @Builder stockDetail() {
  Text('开封记录 ↓').fontSize(18).padding(12).fontColor('#426B5B').onClick(()=>{this.openedDate=this.historyFood.openedAt||dateString(new Date());this.openedExpiry=this.historyFood.openedExpiry||'';this.flowSection=this.flowSection==='开封'?'':'开封';})
  if(this.flowSection==='开封'){TextInput({text:this.openedDate,placeholder:'开封 YYYY-MM-DD'}).onChange((v:string)=>{this.openedDate=v;});TextInput({text:this.openedExpiry,placeholder:'开封后到期日，按包装说明确认'}).onChange((v:string)=>{this.openedExpiry=v;});Button('保存开封记录').height(48).width('100%').onClick(()=>this.run(async()=>{await this.saveOpened();}))}
  if(this.historyFood.openedAt){Text('开封 '+this.historyFood.openedAt+' · 当前到期 '+effectiveExpiry(this.historyFood)).fontSize(17).fontColor('#87694B')}
  Button('撤销最近消耗').height(48).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.openFlow('撤销');}))
  this.title('PURCHASE & USE',this.historyFood.name,'同名的每次购买各自保留一个批次')
  Row({ space: 16 }) { Image(this.foodImage(this.historyFood.name,this.historyFood.category)).width(92).height(92).objectFit(ImageFit.Contain); Column({ space: 9 }) { Text('购买 ' + (this.historyFood.purchasedAt || '未记录')).fontSize(16).fontColor('#304F52'); Text('原量 ' + this.purchaseQuantityText(this.historyFood)).fontSize(14).fontColor('#526D72'); Text('原购金额 ¥' + purchaseCost(this.historyFood).toFixed(2)).fontSize(17).fontWeight(FontWeight.Medium).fontColor('#87652F') }.alignItems(HorizontalAlign.Start) }.margin({ bottom: 18 })
  if(this.historyFood.purchasedQuantity>0){Text('当时单价约 ¥'+(purchaseCost(this.historyFood)/this.historyFood.purchasedQuantity).toFixed(2)+' / '+this.historyFood.unit).fontSize(16).fontColor('#87652F').margin({bottom:10})}
  Text('现余 ' + this.historyFood.quantity + this.historyFood.unit + ' · 消耗金额 ¥' + (this.historyFood.consumedCost || 0).toFixed(2) + ' · 丢弃金额 ¥' + (this.historyFood.wastedCost || 0).toFixed(2)).fontSize(13).lineHeight(24).fontColor('#526D72')
  Text('价格为记录 / 估算。旧批次原金额按现余与累计消耗、浪费金额恢复；原始购量未记录时不猜测。').fontSize(12).lineHeight(22).fontColor('#7E8070').margin({ top: 10,bottom: 15 })
  Button('按上次记录，再买一份',{ type: ButtonType.Normal }).width('100%').height(48).fontColor('#334E50').backgroundColor('#EBD9AD').borderRadius({ topLeft: 9,topRight: 23,bottomLeft: 18,bottomRight: 10 }).onClick(() => this.rebuy(this.historyFood))
  Button('加入下次采购').height(48).width('100%').fontColor('#426B5B').backgroundColor('#DCE8D7').margin({top:10}).onClick(()=>this.run(async()=>{await this.rebuyShopping();}))
  Text('这份食材的时间线').fontSize(21).fontWeight(FontWeight.Medium).fontColor('#304F52').margin({ top: 24,bottom: 15 })
  Text('● 买入 · ' + (this.historyFood.purchasedAt || '日期未记录') + '\n' + this.purchaseQuantityText(this.historyFood) + ' / ¥' + purchaseCost(this.historyFood).toFixed(2)).fontSize(15).lineHeight(25).fontColor('#87652F').padding(16).width('100%').backgroundColor('#EAE0B9').borderRadius(17).margin({ bottom: 12 })
  if (!(this.historyFood.movements || []).length) { Text('暂无逐次消耗记录。旧版仅有累计金额；从本版起每次消耗会保留时间与用量。').fontSize(14).fontColor('#687B7B').lineHeight(24) }
  ForEach((this.historyFood.movements || []).slice().reverse(),(m: FoodMovement) => {
   Column({ space: 7 }) { Text((m.reason === 'wasted' ? '● 丢弃' : '● 已用') + ' · ' + new Date(m.date).toLocaleString()).fontSize(15).fontColor(m.reason === 'wasted' ? '#965E50' : '#3C6758'); Text(m.quantity + this.historyFood.unit + ' / 约¥' + m.cost.toFixed(2) + ' · 余 ' + m.after + this.historyFood.unit).fontSize(14).fontColor('#526D72'); if (m.recipeName) { Text('用于 ' + m.recipeName).fontSize(13).fontColor('#687B7B') } }.width('100%').alignItems(HorizontalAlign.Start).padding(17).backgroundColor('#DDE8DB').borderRadius({ topLeft: 9,topRight: 21,bottomLeft: 18,bottomRight: 9 }).margin({ bottom: 12 })
  },(m: FoodMovement) => m.id)
  Text('同名购买记录').fontSize(19).fontColor('#304F52').margin({ top: 20,bottom: 12 })
  ForEach(this.foods.filter((f: Food) => canonicalName(f.name) === canonicalName(this.historyFood.name) && f.id !== this.historyFood.id).sort((a: Food,b: Food) => b.purchasedAt.localeCompare(a.purchasedAt)),(f: Food) => { Text((f.purchasedAt || '未记录日期') + ' · ' + this.purchaseQuantityText(f) + ' · ¥' + purchaseCost(f).toFixed(2) + '  →').fontSize(14).fontColor('#385C65').padding(14).width('100%').onClick(() => { this.historyFood = f; }) })
 }
 private async openDraw(): Promise<void> { const exclusions:string[]=this.excluded.split(/[,，、]/).concat(householdExclusions(this.household)).map((v:string)=>v.trim()).filter((v:string)=>v.length>0);if(this.drawDay!==dateString(new Date())||this.drawnRecipes().some((r:Recipe)=>exclusions.some((x:string)=>r.ingredients.some((i:Ingredient)=>canonicalName(i.name).includes(canonicalName(x)))))){this.drawResult=new MenuResult();this.drawLocked=[];this.drawAttempt=0;}this.drawMode = this.recommendScene === '做饭' ? '做饭' : '外食'; this.page = 'draw'; }
 private async replaceDrawRecipe(id:string):Promise<void>{
  const options:DrawOptions=JSON.parse(JSON.stringify(this.drawApplied)) as DrawOptions;options.lockedIds=this.drawResult.ids.filter((value:string)=>value!==id);options.disliked=options.disliked.concat([id]);options.attempt=++this.drawAttempt;
  const result:MenuResult=drawMenu(this.drawCandidates(),options,this.foods,dateString(new Date()));if(!result.ids.length){this.toast(result.message);return;}
  this.drawResult=result;this.drawChecked=[];await this.store.setting('dailyMenu',JSON.stringify(new SavedMenu(dateString(new Date()),result,this.drawApplied,this.drawAttempt)));this.toast('已换好，其余菜品保留');
 }
 private drawOptions(): DrawOptions { const o: DrawOptions = new DrawOptions(); o.timeMode=this.drawParallel?'parallel':'sequential';o.balance=this.drawBalanced;o.people=this.drawPeople;o.dishes=this.drawDishes;o.soups=this.drawSoup?1:0;o.minutes=Number(this.drawMinutes);o.budget=Number(this.drawBudget);o.mode=this.drawMode;o.outsideOverhead=Number(this.drawOutside);o.outsidePerPerson=Number(this.drawPerPerson);o.disliked=this.drawDisliked.concat(activeSkips(this.temporarySkips,this.drawMode==='做饭'?'cook':'record',Date.now()));o.excluded=this.excluded.split(/[,，、]/).concat(householdExclusions(this.household)).map((s: string) => s.trim()).filter((s: string) => s.length>0);o.lockedIds=this.drawLocked.slice();o.seed=dateString(new Date())+'|'+this.store.deviceId;o.attempt=this.drawAttempt;return o; }
 private async rollMenu(): Promise<void> {
  const options: DrawOptions = this.drawOptions();
  try { this.drawResult = drawMenu(this.drawCandidates(),options,this.foods,dateString(new Date())); } catch { this.toast('请检查人数、时间和预算；外食人均费用需大于0'); return; } this.drawApplied = options;
  if (this.drawResult.ids.length) { this.drawDay=dateString(new Date());this.drawAttempt++; await this.store.setting('drawPreferences:v2',JSON.stringify(options)); await this.store.setting('dailyMenu',JSON.stringify(new SavedMenu(dateString(new Date()),this.drawResult,options,this.drawAttempt))); this.drawChecked=[];this.drawResultTab='菜品';this.page='draw-result'; this.toast('整餐已抽好，可查看备料和逐道做法'); } else { this.toast(this.drawResult.message); }
 }
 private async toggleDrawDislike(id: string): Promise<void> { this.drawDisliked = this.drawDisliked.includes(id) ? this.drawDisliked.filter((v: string) => v !== id) : this.drawDisliked.concat([id]); await this.store.setting('drawDisliked',JSON.stringify(this.drawDisliked));if(this.dailyRecipeId===id && this.drawDisliked.includes(id)){this.dailyRecipeId='';await this.store.setting('dailyRecipeId','');} if (this.drawResult.ids.includes(id)) { this.drawResult = new MenuResult();this.drawLocked=[]; await this.store.setting('dailyMenu',''); } }
 private drawnRecipes(): Recipe[] { return this.drawResult.ids.map((id: string) => this.recipes.find((r: Recipe) => r.id === id)).filter((r: Recipe | undefined) => r !== undefined) as Recipe[]; }
 private openDrawnRecipe(recipe: Recipe): void { this.openRecipe(recipe); this.recipeReturn='draw-result';this.portionPeople=this.drawApplied.people; const r: Recipe=JSON.parse(JSON.stringify(recipe)) as Recipe;r.ingredients=this.portionPreview().map((a: PortionAmount) => { const i: Ingredient=new Ingredient(a.name,a.quantity,a.unit);i.optional=a.optional;i.quantitySource=a.quantitySource;i.quantityBasis=a.quantityBasis;return i; });r.people=this.drawApplied.people;this.selectedRecipe=r;this.portionOpen=true; }
 private async drawShopping(): Promise<void> { const amounts: MenuAmount[] = mergeMenuIngredients(this.drawnRecipes(),this.drawApplied.people,this.foods,dateString(new Date()));let n:number=0;for(const a of amounts.filter((a: MenuAmount) => !a.optional && a.missing>0)){const queued:number=this.shopping.filter((s:Shopping)=>!s.purchased&&canonicalName(s.name)===canonicalName(a.name)&&unitFactor(s.unit,a.unit)>0).reduce((sum:number,s:Shopping)=>sum+s.quantity*unitFactor(s.unit,a.unit),0);const missing:number=Math.round(Math.max(0,a.missing-queued)*10)/10;if(missing<=0){continue;}const s: Shopping=new Shopping();s.name=a.name;s.quantity=missing;s.unit=a.unit;s.notes='整餐'+this.drawApplied.people+'人份参考；制作前确认。';await this.store.saveShopping(s);n++;}this.toast(n?'已加入'+n+'项采购；未扣库存':'库存或待采购已覆盖；未知用量需先确认'); }
 @Builder drawPreset(p:DrawPreset){
  Row(){Text(p.label).fontFamily('ShikuHand').fontSize(18).fontColor('#304F52').textAlign(TextAlign.Center).layoutWeight(1)}.id('draw-preset-'+p.id).width('100%').constraintSize({minHeight:52}).padding({left:16,right:16,top:10,bottom:10}).backgroundImage(this.drawDishes===p.dishes&&this.drawSoup===(p.soups===1)?$r('app.media.crayon_swatch_wheat'):'').backgroundImageSize({width:'100%',height:'100%'}).backgroundImagePosition(Alignment.Center).onClick(()=>{this.drawDishes=p.dishes;this.drawSoup=p.soups===1;this.drawCustom=false;})
 }
 @State drawConditionsOpen:boolean=false; @State drawPreviewIndex:number=0; @State drawPreviewRecipes:Recipe[]=[];
 @Builder menuDraw(){
  this.spinCeremony()
  Row({space:8}){Image(uiIcon('shuffle')).width(34).height(34).objectFit(ImageFit.Contain).flexShrink(0).rotate({angle:this.wheelAngle});Text('今天吃什么').fontFamily('ShikuHand').fontSize(28).fontColor('#304F52').layoutWeight(1);Text(this.drawConditionsOpen?'收起条件':'按条件抽').id('draw-filter-entry').fontSize(17).fontColor('#91684D').padding(10).onClick(()=>{this.drawConditionsOpen=!this.drawConditionsOpen;})}.width('100%')
  if(!this.spinning&&!this.drawConditionsOpen){Column({space:10}){Image($r('app.media.brand_monster')).width(132).height(142).objectFit(ImageFit.Contain).accessibilityText('和小怪聊聊').onClick(()=>this.openCompanion());Text('把选择交给小怪').fontFamily('ShikuHand').fontSize(25).fontColor('#795B7D');Text(menuTitle(this.drawDishes,this.drawSoup?1:0)).fontSize(15).fontColor('#7B786A')}.width('100%').padding({top:20,bottom:24})}
  if(this.drawConditionsOpen){
  Text(recipeFilterSummary(this.drawFilter)).fontSize(14).lineHeight(23).fontColor('#6A7769').width('100%').margin({bottom:12})
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(10),cross:LengthMetrics.vp(8)}}){ForEach(['做饭','外食'],(mode:string)=>{Column(){ChoiceChip({label:mode==='做饭'?'在家做':'出去吃 / 外卖',selected:this.drawMode===mode,ink:mode==='做饭'?'#587B61':'#A67257'})}.onClick(()=>{this.drawMode=mode;})})}.margin({bottom:12})
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(10),cross:LengthMetrics.vp(4)}}){ForEach(DRAW_PRESETS,(p:DrawPreset)=>{Column(){this.drawPreset(p)}.width('47%')})}.width('100%')
  Text(this.drawCustom?'收起自定义 ↑':'自定义菜数与汤 ↓').fontSize(14).fontColor('#806B54').padding(12).onClick(()=>{this.drawCustom=!this.drawCustom;})
  if(this.drawCustom){
   Row(){Text('菜的数量').layoutWeight(1).fontSize(16);Button('－').width(44).height(44).touchFeedback().onClick(()=>{this.drawDishes=Math.max(this.drawSoup?0:1,this.drawDishes-1);});Text(String(this.drawDishes)).width(32).textAlign(TextAlign.Center);Button('＋').width(44).height(44).touchFeedback().onClick(()=>{this.drawDishes=Math.min(4,this.drawDishes+1);})}.width('100%')
   Row(){Text('加一份汤').fontSize(16).layoutWeight(1);Toggle({type:ToggleType.Switch,isOn:this.drawSoup}).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v:boolean)=>{this.drawSoup=v;if(!v&&this.drawDishes===0){this.drawDishes=1;}})}.constraintSize({minHeight:44}).width('100%').margin({bottom:12})
  }
  Row({space:8}){Image(uiIcon('people')).width(28).height(28).flexShrink(0).objectFit(ImageFit.Contain);Text('用餐人数').fontSize(16).layoutWeight(1);Button('－').width(44).height(44).padding(0).flexShrink(0).backgroundColor(Color.Transparent).fontColor('#526E62').onClick(()=>{this.drawPeople=Math.max(1,this.drawPeople-1);});Text(this.drawPeople+'人').width(48).textAlign(TextAlign.Center).fontSize(20).fontWeight(FontWeight.Medium);Button('＋').width(44).height(44).padding(0).flexShrink(0).backgroundColor(Color.Transparent).fontColor('#526E62').onClick(()=>{this.drawPeople=Math.min(20,this.drawPeople+1);})}.width('100%').padding({top:8,bottom:8})
  if(this.drawMode==='做饭'){
   Row(){Text('双灶并行估时').fontSize(17).layoutWeight(1);Toggle({type:ToggleType.Switch,isOn:this.drawParallel}).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v:boolean)=>{this.drawParallel=v;})}.width('100%').constraintSize({minHeight:48})
   Row(){Text('荤素搭配（至少两道菜）').fontSize(17).layoutWeight(1);Toggle({type:ToggleType.Switch,isOn:this.drawBalanced}).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v:boolean)=>{this.drawBalanced=v;})}.width('100%').constraintSize({minHeight:48})
  }
  Row({space:12}){Image(uiIcon('time')).width(28).height(28).flexShrink(0).objectFit(ImageFit.Contain);Text('空余时间').layoutWeight(1).fontSize(16);Text(Number(this.drawMinutes)?this.drawMinutes+' 分钟 ›':'不限时间 ›').fontSize(17).fontColor('#5B7868')}.width('100%').constraintSize({minHeight:52}).padding({top:8,bottom:8}).onClick(()=>{this.drawAdvanced=this.drawAdvanced==='time'?'':'time';})
  if(this.drawAdvanced==='time'){
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(8)}}){ForEach([30,60,90,0],(n:number)=>{Column(){ChoiceChip({label:n?n+'分钟':'不限',selected:Number(this.drawMinutes)===n,ink:'#5A7B68'})}.onClick(()=>{this.drawMinutes=String(n);this.drawAdvanced='';})})}
   TextInput({text:this.drawMinutes,placeholder:'自定义分钟，0为不限'}).type(InputType.Number).onChange((v:string)=>{this.drawMinutes=v;}).margin({top:10,bottom:10})
  }
  Row({space:12}){Image(uiIcon('budget')).width(28).height(28).flexShrink(0).objectFit(ImageFit.Contain);Text('整餐预算').layoutWeight(1).fontSize(16);Text(Number(this.drawBudget)?'约 ¥'+this.drawBudget+' ›':'不限预算 ›').fontSize(17).fontColor('#9A7452')}.width('100%').constraintSize({minHeight:52}).padding({top:8,bottom:8}).onClick(()=>{this.drawAdvanced=this.drawAdvanced==='budget'?'':'budget';})
  if(this.drawAdvanced==='budget'){
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(8)}}){ForEach([30,50,80,0],(n:number)=>{Column(){ChoiceChip({label:n?'¥'+n:'不限',selected:Number(this.drawBudget)===n,ink:'#A97855'})}.onClick(()=>{this.drawBudget=String(n);this.drawAdvanced='';})})}
   TextInput({text:this.drawBudget,placeholder:'自定义预算，0为不限'}).type(InputType.Number).onChange((v:string)=>{this.drawBudget=v;}).margin({top:10,bottom:10})
  }
  if(this.drawMode==='外食'){
   this.smallLabel('往返、候餐和吃饭合计（分钟）');TextInput({text:this.drawOutside}).type(InputType.Number).onChange((v:string)=>{this.drawOutside=v;});
   this.smallLabel('预计人均花费（元）');TextInput({text:this.drawPerPerson}).type(InputType.Number).onChange((v:string)=>{this.drawPerPerson=v;});
  }
  Text('不抽清单 · '+this.drawDisliked.length+'道 ›').fontSize(15).fontColor('#806B54').padding({top:18,bottom:14}).onClick(()=>{this.page='draw-dislikes';})
  Text('更多菜谱筛选 ›').fontSize(15).fontColor('#806B54').padding(12).onClick(()=>this.beginDrawFilters())
  }
  if(this.drawResult.ids.length){Text('查看上次抽好的方案 →').fontSize(16).fontColor('#5C7B89').padding(14).onClick(()=>{this.page='draw-result';})}
  if(this.drawResult.message&&!this.drawResult.ids.length){Text(this.drawResult.message).fontSize(15).lineHeight(24).fontColor('#966851')}
 }
 @Builder drawMenuResult(){
  Row({space:10}){Column(){ChoiceChip({label:'这一餐的菜',selected:this.drawResultTab==='菜品'})}.onClick(()=>{this.drawResultTab='菜品';});if(this.drawApplied.mode==='做饭'){Column(){ChoiceChip({label:'一起备料',selected:this.drawResultTab==='备料',ink:'#A87756'})}.onClick(()=>{this.drawResultTab='备料';})}}.margin({bottom:12})
  if(this.drawResult.ids.length){
   Button('小怪帮我安排这一餐',{type:ButtonType.Normal}).height(42).fontSize(14).fontColor('#796180').backgroundColor('#EEE6ED').onClick(()=>{this.assistantMenuOptions=JSON.parse(JSON.stringify(this.drawApplied)) as DrawOptions;this.assistantMenuOptions.lockedIds=this.drawLocked.slice();this.openContextAssistant(this.drawResult.ids,'menu',this.drawApplied.people);})
   Text('已经为你选好').fontSize(25).fontWeight(FontWeight.Bold).fontColor('#304F52').margin({top:27,bottom:10})
   Text('上次抽选：'+this.drawApplied.people+'人 · '+menuTitle(this.drawApplied.dishes,this.drawApplied.soups)+' · '+this.drawApplied.mode+' · 约'+this.drawResult.minutes+'分钟 / '+(this.drawResult.costComplete===false?'费用待确认':'约¥'+this.drawResult.cost)).fontSize(14).lineHeight(24).fontColor('#526D63')
   Text(this.drawDetails?'收起估算说明 ↑':'时间与费用怎么算？').fontSize(14).fontColor('#6C776B').padding({top:10,bottom:10}).onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:200},()=>{this.drawDetails=!this.drawDetails;});})
   if(this.drawDetails){Text(this.drawResult.message).fontSize(14).lineHeight(23).fontColor('#7C7E6B').margin({bottom:15})}
   if(this.drawApplied.mode==='做饭'){
    Text(this.menuTimelineOpen?'收起做菜顺序 ↑':'看看先做哪道 ↓').fontSize(18).fontColor('#426B5B').padding(12).onClick(()=>{this.menuTimelineOpen=!this.menuTimelineOpen;})
    if(this.menuTimelineOpen){Text('逐道约 '+cookTimeline(this.drawnRecipes()).conservativeMinutes+' 分钟 · 双灶参考 '+cookTimeline(this.drawnRecipes()).parallelMinutes+' 分钟').fontSize(16).fontColor('#8A6549').margin({bottom:10});Text('双灶需独立锅具，快炒时专心操作').fontSize(14).fontColor('#68766C').margin({bottom:12});ForEach(cookTimeline(this.drawnRecipes()).tasks,(task:KitchenTask)=>{Column({space:6}){Text(task.order+' · '+task.name).fontSize(19).fontColor('#304F52');Text(task.instruction).fontSize(16).lineHeight(25).fontColor('#68766C');Text(task.splitKnown?'备料 '+task.prepMinutes+' 分钟 · 动手约 '+task.activeMinutes+' 分钟（含备料）':task.timingKnown?'总耗时约 '+task.totalMinutes+' 分钟':'耗时待补充').fontSize(14).fontColor('#8A6549')}.width('100%').alignItems(HorizontalAlign.Start).padding(13).backgroundColor('#90FFFFFF').borderRadius(14).margin({bottom:10}).onClick(()=>{const recipe:Recipe|undefined=this.recipes.find((v:Recipe)=>v.id===task.recipeId);if(recipe){this.openDrawnRecipe(recipe);}})},(task:KitchenTask)=>task.recipeId)}
   }
   if(this.drawResultTab==='菜品'){ForEach(this.drawnRecipes(),(r:Recipe)=>{Column({space:5}){Row({space:13}){Image(recipeCover(r)).width(104).height(104).objectFit(ImageFit.Contain).flexShrink(0);Column({space:9}){Text(r.name).fontSize(21).fontWeight(FontWeight.Medium).fontColor('#304F52');Text(r.category+' · '+r.region).fontSize(12).fontColor('#6C776B');Text(this.drawApplied.mode==='做饭'?'备料与完整做法 →':'点菜灵感 / 查看介绍 →').fontSize(14).fontColor('#805F50')}.layoutWeight(1).alignItems(HorizontalAlign.Start)}.width('100%').padding(14).backgroundColor('#DCE9DBC9').borderRadius({topLeft:10,topRight:25,bottomLeft:21,bottomRight:12}).margin({bottom:13}).scale({x:this.revealScale,y:this.revealScale}).transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({y:18}))).onClick(()=>this.openDrawnRecipe(r));Row({space:10}){Button(this.drawLocked.includes(r.id)?'已锁定':'锁定',{type:ButtonType.Normal}).fontSize(14).height(42).layoutWeight(1).fontColor('#6A7A61').backgroundColor('#DCE6CF').onClick(()=>{this.drawLocked=this.drawLocked.includes(r.id)?this.drawLocked.filter((id:string)=>id!==r.id):this.drawLocked.concat([r.id]);});Button('只换这道',{type:ButtonType.Normal}).fontSize(14).height(42).layoutWeight(1).fontColor('#9A724E').backgroundColor('#ECDDC5').enabled(!this.drawLocked.includes(r.id)).onClick(()=>this.run(async()=>{await this.replaceDrawRecipe(r.id);}))}.width('100%')}.width('100%').margin({bottom:12})},(r:Recipe)=>r.id)}
   if(this.drawApplied.mode==='做饭' && this.drawResultTab==='备料'){
    Text('这一餐一起备好 · '+this.drawChecked.length+'项已准备').fontSize(19).fontWeight(FontWeight.Medium).fontColor('#304F52').margin({top:18,bottom:12})
    ForEach(this.drawResult.amounts,(a:MenuAmount,index:number)=>{Row({space:9}){Text(this.drawChecked.includes(index)?'☑':'□').fontSize(24).fontColor('#51745F');Column({space:6}){Text(a.name+' · '+(a.quantity>0?'约'+a.quantity+a.unit:'用量需确认')+(a.optional?'（调味）':'')).fontSize(15).fontColor('#304F52');Text(a.recipes.join(' / ')+(a.estimated?' · 推荐估算':'' )).fontSize(11).fontColor('#6C776B')}.layoutWeight(1)}.width('100%').padding(12).backgroundColor('#90FFFFFF').borderRadius(13).margin({bottom:8}).onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:180},()=>{this.drawChecked=this.drawChecked.includes(index)?this.drawChecked.filter((v:number)=>v!==index):this.drawChecked.concat([index]);});})})
    Button('把合并缺口加入采购',{type:ButtonType.Normal}).width('100%').fontColor('#304F52').backgroundColor('#D5E2E6').margin({top:15}).onClick(()=>this.confirm('添加整餐缺口','将按当前库存重新核对合并用料，扣除现有待采购量后添加缺少的主料；仅加采购，不扣库存、不记录用餐。',async()=>{await this.drawShopping();}))
   }
  }
 }
 @Builder drawActionBar(){
  Row({space:12}){Column({space:4}){Text(menuTitle(this.drawDishes,this.drawSoup?1:0)+' · '+this.drawPeople+'人').fontSize(15).fontColor('#304F52');Text((Number(this.drawMinutes)?this.drawMinutes+'分钟':'不限时')+' / '+(Number(this.drawBudget)?'约¥'+this.drawBudget:'不限预算')).fontSize(13).fontColor('#7C7B69')}.alignItems(HorizontalAlign.Start).layoutWeight(1);Button({type:ButtonType.Normal}){Text(this.spinning?'正在抽…':this.page==='draw-result'?'再抽一次':this.drawDishes+(this.drawSoup?1:0)===1?'帮我抽一道':'帮我抽一餐').fontFamily('ShikuHand').fontSize(20).lineHeight(28).textAlign(TextAlign.Center).fontColor('#304F52')}.id('draw-menu-submit').constraintSize({minHeight:52}).padding({left:18,right:18,top:10,bottom:10}).flexShrink(0).fontFamily('ShikuHand').fontSize(20).fontColor('#304F52').backgroundColor(Color.Transparent).backgroundImage($r('app.media.crayon_ribbon_honey')).backgroundImageSize({width:'100%',height:'100%'}).backgroundImagePosition(Alignment.Center).enabled(!this.spinning&&!this.busy).onClick(()=>this.startSpin(false))}.width('100%').padding({left:18,right:18,top:10,bottom:12}).backgroundColor('#FFF9F3E8')
 }
 @Builder drawDislikesPage(){
  this.title('ONLY WHAT YOU LIKE','这些菜，先不抽','点选即保存；取消后恢复候选，忌口仍独立生效')
  Search({value:this.dislikeSearch,placeholder:'搜索菜名、食材'}).onChange((v:string)=>{this.dislikeSearch=v;})
  Text('只看已排除 '+(this.dislikesOnly?'✓':'○')).fontSize(15).fontColor('#805F50').padding(13).onClick(()=>{this.dislikesOnly=!this.dislikesOnly;})
  ForEach(this.recipes.filter((r:Recipe)=>(!this.dislikesOnly||this.drawDisliked.includes(r.id))&&(!this.dislikeSearch||(r.name+r.ingredients.map((i:Ingredient)=>i.name).join('')).includes(this.dislikeSearch))).slice(0,this.dislikeLimit),(r:Recipe)=>{Row({space:12}){Image(recipeCover(r)).width(62).height(58).objectFit(ImageFit.Contain);Text(r.name).fontSize(16).fontColor('#304F52').layoutWeight(1);Text(this.drawDisliked.includes(r.id)?'不抽 ✓':'可抽 ○').fontSize(14).fontColor('#805F50')}.width('100%').padding(13).backgroundColor(this.drawDisliked.includes(r.id)?'#EFD7CD':'#C0FFFFFF').borderRadius({topLeft:9,topRight:20,bottomLeft:17,bottomRight:10}).margin({bottom:10}).onClick(()=>this.run(async()=>{await this.toggleDrawDislike(r.id);}))},(r:Recipe)=>r.id)
  Button('显示更多菜').backgroundColor('#E3E8D5').fontColor('#304F52').onClick(()=>{this.dislikeLimit+=60;})
 }
 private guide():CookingGuide{return buildCookingGuide(this.selectedRecipe);}
 private openKnowledge(name:string,from:string='recipe'):void{this.knowledgeName=name;this.knowledgeReturn=from;this.page='ingredient-knowledge';}
 @Builder knowledgePage(){
  this.title('KNOW YOUR INGREDIENTS','食材与调味小课堂','先看品类差异，再决定怎么选、怎么替换')
  Search({value:this.knowledgeName,placeholder:'豆腐、生抽、淀粉、鸡肉……'}).onChange((v:string)=>{this.knowledgeName=v;})
  if(knowledgeFor(this.knowledgeName).length===0&&this.knowledgeName){Text('暂时没有这项专门说明。试试豆腐、油、酱油、米、肉等关键词，或清空查看全部。').fontSize(15).lineHeight(25).fontColor('#7D705D').padding(15)}
  ForEach(this.knowledgeName?knowledgeFor(this.knowledgeName):COOKING_KNOWLEDGE,(k:IngredientKnowledge)=>{Column({space:12}){Text(k.title).fontSize(23).fontWeight(FontWeight.Bold).fontColor('#304F52');Text('怎么选 · '+k.selection).fontSize(15).lineHeight(26).fontColor('#3F5C58');Text('口感与风味 · '+k.texture).fontSize(15).lineHeight(26).fontColor('#805F50');Text('怎么用 · '+k.use).fontSize(15).lineHeight(26).fontColor('#3F5C58');Text('替换区别 · '+k.substitution).fontSize(14).lineHeight(25).fontColor('#637562');Text('留意 · '+k.caution).fontSize(13).lineHeight(24).fontColor('#886452')}.width('100%').alignItems(HorizontalAlign.Start).padding(20).backgroundColor('#ECE5CFC9').borderRadius({topLeft:10,topRight:26,bottomLeft:21,bottomRight:10}).margin({top:15})},(k:IngredientKnowledge)=>k.key)
 }
 @Builder guideStepCard(step:GuideStep,index:number){
  Column({space:8}){
   Row({space:12}){Text(String(index+1).padStart(2,'0')).fontFamily('ShikuHand').fontSize(24).lineHeight(30).width(32).flexShrink(0).fontWeight(FontWeight.Bold).fontColor('#B36F42');Text(step.title==='收尾与确认'&&/盛出备用/.test(step.instruction)?'处理后备用':step.title).fontSize(20).lineHeight(28).fontWeight(FontWeight.Medium).fontColor('#304F52').layoutWeight(1);Text(this.completedSteps.includes(index)?'✓ 完成':'待做').scale({x:this.completedSteps.includes(index)?1.07:1,y:this.completedSteps.includes(index)?1.07:1}).rotate({angle:this.completedSteps.includes(index)?-2:0}).animation({duration:this.reducedMotion?0:240,curve:Curve.EaseOut}).fontSize(14).fontColor('#52745C').width(52).constraintSize({minHeight:44}).textAlign(TextAlign.Center).flexShrink(0).onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:180},()=>{this.completedSteps=this.completedSteps.includes(index)?this.completedSteps.filter((n:number)=>n!==index):this.completedSteps.concat([index]);this.saveCookProgress();});if(this.completedSteps.includes(index)){this.toast(['这一步很漂亮！','又做好一步啦！','手艺不错！'][index%3]);}})}.width('100%')
   Text(step.instruction).fontSize(this.page==='cook-guide'&&this.cookLarge?24:17).lineHeight(this.page==='cook-guide'&&this.cookLarge?39:29).fontColor('#30484B').width('100%')
   if(step.ingredients){Text('本步用料：'+step.ingredients.replace('；本步未给独立用量，按备料总量分配，勿每步重复投入全量','').replace('按本步文字取料；','')).fontSize(13).lineHeight(23).fontColor('#6C6956')}
   if(step.heat||step.time){Text([step.heat,step.time].filter((v:string)=>Boolean(v)).join(' · ')).fontSize(15).lineHeight(25).fontColor('#5D7768')}
   if(step.checkpoint&&!step.instruction.includes(step.checkpoint)){Text(step.checkpoint).fontSize(15).lineHeight(25).fontColor('#86644D')}
  }.id('guide-step-'+index).width('100%').alignItems(HorizontalAlign.Start).padding({left:14,right:14,top:10,bottom:14}).backgroundColor(this.completedSteps.includes(index)?'#B0DFEAD9':index%3===0?'#A3EEE5D2':index%3===1?'#A3F0DBCE':'#A3E7DDED').animation({duration:this.reducedMotion?0:180,curve:Curve.EaseOut}).backgroundImage($r('app.media.crayon_paper_tile')).backgroundImageSize({width:320,height:320}).borderRadius({topLeft:10,topRight:25,bottomLeft:20,bottomRight:12}).margin({bottom:10})
 }

 @Builder foodRow(food: Food) {
  Column({ space: 6 }) {
   Row({ space: 13 }) {
    if (this.batchMode) { Text(this.selectedFoods.includes(food.id) ? '☑' : '□').fontSize(23).fontColor('#6A8C9F').onClick(() => { this.selectedFoods = this.selectedFoods.includes(food.id) ? this.selectedFoods.filter((v: string) => v !== food.id) : this.selectedFoods.concat([food.id]); }) }
    Image(this.foodImage(food.name, food.category)).sourceSize({width:160,height:160}).width(56).height(56).flexShrink(0).objectFit(ImageFit.Contain).borderRadius(15)
    Column({ space: 6 }) {
     Text(food.name).fontFamily('HarmonyOS Sans SC').fontSize(19).fontWeight(FontWeight.Medium).fontColor('#2A4031')
     Text(`${food.location} · ${food.quantity}${food.unit}`).fontSize(12).fontColor('#879080')
    }.alignItems(HorizontalAlign.Start).layoutWeight(1)
    Text(this.status(food)).fontSize(12).fontColor(this.statusColor(food)).padding({left:10,right:10,top:8,bottom:8}).flexShrink(0).backgroundImage(daysLeft(food)<0?$r('app.media.crayon_swatch_clay'):$r('app.media.crayon_swatch_sage')).backgroundImageSize(ImageSize.Cover).backgroundColor('#50FFFFFF').borderRadius(10)
   }.width('100%').onClick(() => { if (this.batchMode) { this.selectedFoods = this.selectedFoods.includes(food.id) ? this.selectedFoods.filter((v: string) => v !== food.id) : this.selectedFoods.concat([food.id]); } else { this.openIngredient(food.name); } })
   Text(`到期 ${food.expiryDate}`).fontSize(13).lineHeight(20).fontColor('#707A67').width('100%')
   Flex({wrap:FlexWrap.Wrap,justifyContent:FlexAlign.End,space:{main:LengthMetrics.vp(4),cross:LengthMetrics.vp(4)}}) {
    Text('编辑').fontSize(14).fontColor('#385C65').constraintSize({minHeight:44}).padding({left:8,right:8}).onClick(()=>this.startFood(food))
    Text('购买记录').fontSize(14).fontColor('#385C65').constraintSize({minHeight:44}).padding({left:8,right:8}).onClick(()=>{this.historyFood=food;this.page='stock-detail';})
    Text('消耗').fontSize(14).fontColor('#397454').constraintSize({minHeight:44}).padding({left:8,right:8}).onClick(() => { this.editing = JSON.parse(JSON.stringify(food)) as Food; this.consumeAmount = '1'; this.page = 'consume'; })
    Text('全部吃完').fontSize(14).fontColor('#397454').constraintSize({minHeight:44}).padding({left:8,right:8}).onClick(() => this.confirm('全部吃完', `确认将 ${food.name} 全部标记为已吃完？`, async () => { await this.store.consume(food, food.quantity); }))
   }.width('100%')
  }.gesture(PanGesture({direction:PanDirection.Horizontal,distance:45}).onActionEnd((event:GestureEvent)=>{if(this.batchMode||Math.abs(event.offsetX)<72){return;}if(event.offsetX<0){this.editing=JSON.parse(JSON.stringify(food)) as Food;this.consumeAmount=String(food.quantity);this.page='consume';}else{this.historyFood=food;this.page='stock-detail';}})).padding({left:14,right:14,top:12,bottom:6}).backgroundColor(this.surface()).border({ width: 0.5, color: '#C4BCAB' }).borderRadius({ topLeft: 8, topRight: 19, bottomLeft: 17, bottomRight: 8 }).margin({ bottom: 10 })
 }
 @Builder stat(value: number, label: string, color: string) {
  Column({ space: 3 }) { Text(String(value)).fontFamily('HarmonyOS Sans SC').fontSize(30).fontWeight(FontWeight.Bold).fontColor('#263E46'); Text(label).fontFamily('HarmonyOS Sans SC').fontSize(12).fontColor('#263E46') }.layoutWeight(1).padding({ top: 11, bottom: 11 }).backgroundImage(label.includes('期')?$r('app.media.crayon_swatch_clay'):$r('app.media.crayon_swatch_sage')).backgroundImageSize(ImageSize.Cover).borderRadius({topLeft:8,topRight:20,bottomLeft:15,bottomRight:7})
 }
 @Builder sceneChoices() {
  Row({ space: 8 }) { ForEach(['做饭','外食 / 外卖'],(mode: string) => { Column() { ChoiceChip({ label: mode,selected: this.recommendScene === mode,tint: '#DDE8DF' }) }.onClick(() => this.run(async () => { await this.chooseScene(mode); })) }) }.margin({ bottom: 18 })
 }
 private startSpin(daily:boolean):void{
  if(this.spinning||this.busy){return;}this.drawPreviewRecipes=this.drawCandidates().filter((r:Recipe)=>!this.drawDisliked.includes(r.id)&&!this.drawOptions().excluded.some((x:string)=>r.ingredients.some((i:Ingredient)=>canonicalName(i.name).includes(canonicalName(x)))));this.spinning=true;this.drawPhase='小怪翻菜单';this.spinCardScale=0.94;this.spinCardTilt=-4;
  this.getUIContext().animateTo({duration:this.reducedMotion?0:1550,curve:Curve.EaseInOut},()=>{this.wheelAngle+=1440;});
  let beat:number=0;if(!this.reducedMotion){this.spinTicker=setInterval(()=>{beat++;this.drawPreviewIndex=(this.drawPreviewIndex+7)%Math.max(1,this.drawPreviewRecipes.length);this.drawPhase=beat<3?'小怪翻菜单':beat<5?'摇匀好味道':'就快揭晓啦';this.getUIContext().animateTo({duration:200,curve:Curve.EaseInOut},()=>{this.spinCardTilt=beat%2?4:-4;this.spinCardScale=beat%2?1.02:0.96;});},230);}
  this.drawTimer=setTimeout(()=>{this.drawTimer=-1;if(this.spinTicker>=0){clearInterval(this.spinTicker);this.spinTicker=-1;}this.spinning=false;this.spinCardTilt=0;this.drawPhase='';this.run(async()=>{
   if(daily){const options:DrawOptions=this.drawOptions();options.lockedIds=[];options.dishes=1;options.soups=0;options.minutes=0;options.budget=0;options.mode='做饭';options.attempt=this.drawAttempt++;const result:MenuResult=drawMenu(this.drawCandidates(),options);if(!result.ids.length){this.toast(result.message);return;}this.dailyRecipeId=result.ids[0];this.dailyDate=dateString(new Date());await this.store.setting('dailyRecipeId',this.dailyRecipeId);await this.store.setting('dailyRecipeDate',this.dailyDate);}else{await this.rollMenu();}
   this.revealScale=this.reducedMotion?1:0.78;this.getUIContext().animateTo({duration:this.reducedMotion?0:420,curve:Curve.EaseOut},()=>{this.revealScale=1;});
  });},this.reducedMotion?0:1650);
 }
 @Builder spinCeremony(){
  if(this.spinning){Stack(){Column().width('76%').height(220).backgroundColor('#E9DDED').borderRadius({topLeft:19,topRight:35,bottomLeft:28,bottomRight:14}).rotate({angle:-this.spinCardTilt});Column().width('83%').height(220).backgroundColor('#F3DDB5').borderRadius({topLeft:25,topRight:15,bottomLeft:21,bottomRight:30}).rotate({angle:this.spinCardTilt});Column({space:8}){if(this.drawPreviewRecipes.length){Image(recipeCover(this.drawPreviewRecipes[this.drawPreviewIndex%this.drawPreviewRecipes.length])).width(150).height(150).objectFit(ImageFit.Contain)}Text(this.drawPhase).fontFamily('ShikuHand').fontSize(21).fontColor('#785E85')}.width('86%').height(230).justifyContent(FlexAlign.Center).backgroundColor('#FFF9EF').borderRadius({topLeft:29,topRight:18,bottomLeft:17,bottomRight:32}).rotate({angle:this.spinCardTilt*0.4}).scale({x:this.spinCardScale,y:this.spinCardScale})}.width('100%').height(270).transition(TransitionEffect.OPACITY)}
 }
 @Builder dailyWheel(){
  Column({space:12}){
   this.spinCeremony()
   Row(){Column({space:5}){Text('每日一菜').fontFamily('ShikuHand').fontSize(27).fontWeight(FontWeight.Bold).fontColor('#6C5043');Text(this.spinning?this.drawPhase:'转一转，今天吃什么').fontSize(14).fontColor('#876B57')}.alignItems(HorizontalAlign.Start).layoutWeight(1);Button({type:ButtonType.Normal}){Image(uiIcon('shuffle')).width(64).height(64).objectFit(ImageFit.Contain)}.width(64).height(64).backgroundColor(Color.Transparent).rotate({angle:this.wheelAngle}).enabled(!this.spinning).onClick(()=>this.startSpin(true))}.width('100%')
   if(!this.spinning&&this.dailyDate===dateString(new Date()) && this.dailyRecipeId && this.recipes.some((r:Recipe)=>r.id===this.dailyRecipeId)){
    Row({space:12}){Image(this.recipeImage(this.dailyRecipeId)).width(98).height(98).objectFit(ImageFit.Contain);Column({space:7}){Text((this.recipes.find((r:Recipe)=>r.id===this.dailyRecipeId) as Recipe).name).fontSize(21).fontColor('#304F52');Text('看材料与做法 →').fontSize(15).fontColor('#86613F')}.layoutWeight(1).alignItems(HorizontalAlign.Start)}.width('100%').scale({x:this.revealScale,y:this.revealScale}).onClick(()=>{const r:Recipe|undefined=this.recipes.find((r:Recipe)=>r.id===this.dailyRecipeId);if(r){this.openRecipe(r);this.recipeReturn='';}})
   }
   if(this.dailyDate===dateString(new Date()) && this.dailyRecipeId){Row({space:10}){Button(this.favorites.some((f:Favorite)=>f.recipeId===this.dailyRecipeId)?'♥ 已收藏':'♡ 收藏这道').layoutWeight(1).fontColor('#9E687B').backgroundColor('#EDDCE4').onClick(()=>this.run(async()=>{await this.store.favorite(this.dailyRecipeId);}));Button('不喜欢，换一道').layoutWeight(1).fontColor('#856D4A').backgroundColor('#EBDDBE').onClick(()=>{const id:string=this.dailyRecipeId;this.run(async()=>{await this.toggleDrawDislike(id);this.dailyRecipeId='';}).then(()=>this.startSpin(true));})}.width('100%')}
   if(this.dailyRecipeId){Button('问小怪这道菜',{type:ButtonType.Normal}).height(44).touchFeedback().fontSize(14).fontColor('#796180').backgroundColor(Color.Transparent).onClick(()=>this.openContextAssistant([this.dailyRecipeId]));Text('搭配一餐 ›').fontSize(15).fontColor('#526C6F').padding({top:7,bottom:7}).onClick(()=>this.run(async()=>{await this.openDraw();}))}
  }.width('100%').padding({left:17,right:17,top:12,bottom:10}).backgroundColor('#EFDAB8').borderRadius({topLeft:13,topRight:30,bottomLeft:25,bottomRight:12}).margin({bottom:18})
 }
 private startSteam():void{if(this.reducedMotion||this.steamActive){return;}this.steamActive=true;this.getUIContext().animateTo({duration:1600,iterations:3,curve:Curve.EaseInOut},()=>{this.steamLift=-10;this.steamOpacity=0;});}
 @Builder cookingScene(){
  Row({space:12}){Stack({alignContent:Alignment.Center}){Image($r('app.media.scene_cooking_prep')).width(132).height(94).objectFit(ImageFit.Contain);if(!this.reducedMotion){Image($r('app.media.layer_steam')).width(38).height(38).objectFit(ImageFit.Contain).translate({x:-22,y:-13+this.steamLift}).opacity(this.steamOpacity)}}.width(132).height(94);Column({space:7}){Text('慢慢做，别着急').fontFamily('ShikuHand').fontSize(22).fontColor('#507267');Text('已完成 '+this.completedSteps.length+' / '+this.guide().steps.length+' 步').fontSize(15).fontColor('#81755D')}.layoutWeight(1).alignItems(HorizontalAlign.Start)}.width('100%').margin({bottom:12}).transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({y:10})))
 }
 private saveUtility():void{this.utility=JSON.parse(JSON.stringify(this.utility)) as UtilityState;const value:string=JSON.stringify(this.utility);this.utilityWrite=this.utilityWrite.then(()=>this.store.setting('utility:v1',value)).catch(()=>{this.toast('本机进度未保存，请重试');});}
 private rememberSearch():void{if(!this.recipeSearch.trim()){return;}const term:string=this.recipeSearch.normalize('NFKC').trim().replace(/\s+/g,' ');this.utility.searches=rememberValue(this.utility.searches.filter((value:string)=>value.normalize('NFKC').toLowerCase()!==term.toLowerCase()),term,30);this.saveUtility();}
 private toggleCompare(id:string):void{const state:UtilityState=JSON.parse(JSON.stringify(this.utility)) as UtilityState;if(state.compare.includes(id)){state.compare=state.compare.filter((v:string)=>v!==id);}else{if(state.compare.length>=3){this.toast('最多对比3道，先移除一道');return;}state.compare=state.compare.concat([id]);}this.getUIContext().animateTo({duration:this.reducedMotion?0:180,curve:Curve.EaseOut},()=>{this.utility=state;});this.saveUtility();}
 private recentRecipes():Recipe[]{return this.utility.recent.map((id:string)=>this.recipes.find((r:Recipe)=>r.id===id)).filter((r:Recipe|undefined)=>r!==undefined) as Recipe[];}
 private comparedRecipes():Recipe[]{return this.recipes.filter((r:Recipe)=>this.utility.compare.includes(r.id));}
 private saveCookProgress():void{const p:CookProgress=new CookProgress();p.recipeId=this.selectedRecipe.id;p.signature=cookingSignature(this.selectedRecipe);p.step=this.cookStep;p.completed=this.completedSteps.slice();p.prepared=this.preparedIngredients.slice();p.updatedAt=Date.now();this.utility.progress=[p].concat(this.utility.progress.filter((v:CookProgress)=>v.recipeId!==p.recipeId)).slice(0,20);this.saveUtility();}
 private moveCookStep(delta:number):void{const next:number=Math.max(0,Math.min(this.guide().steps.length-1,this.cookStep+delta));if(next===this.cookStep){return;}if(this.stepTimer>=0){clearTimeout(this.stepTimer);this.stepTimer=-1;}this.stepFade=this.reducedMotion?1:0.8;this.stepShift=this.reducedMotion?0:delta*14;this.cookStep=next;this.saveCookProgress();if(!this.reducedMotion){this.stepTimer=setTimeout(()=>{this.stepTimer=-1;if(this.foreground&&this.page==='cook-guide'){this.getUIContext().animateTo({duration:200,curve:Curve.EaseOut},()=>{this.stepFade=1;this.stepShift=0;});}},16);}}
 private shelfGroups(index:number):IngredientGroup[] {
  const ids:string[][]=[['pork','beef','lamb','poultry'],['fish','seafood'],['greens','roots','mushroom'],['egg','tofu','staple']];
  return INGREDIENT_GROUPS.filter((g:IngredientGroup)=>ids[index].includes(g.id));
 }
 private cookingMeal(now:Date):string {
  const hour=now.getHours();
  return hour<11?'早餐':hour<17?'午餐':'晚餐';
 }
 private cookedToday(now:Date):MealPlan|undefined {
  return this.plans.find((p:MealPlan)=>p.note==='从做菜步骤加入' && p.recipeId===this.selectedRecipe.id && p.date===dateString(now) && p.occasion===this.cookingMeal(now));
 }
 private async finishGuideDish():Promise<void> {
  const now=new Date();
  if(this.cookStep!==this.guide().steps.length-1 || this.cookedToday(now)){return;}
  const plan=new MealPlan();
  plan.recipeId=this.selectedRecipe.id;
  plan.date=dateString(now);
  plan.occasion=this.cookingMeal(now);
  plan.people=Math.min(20,Math.max(1,Math.round(this.selectedRecipe.people||2)));
  plan.completed=true;
  plan.note='从做菜步骤加入';
  await this.store.saveMealPlan(plan);
  this.plans=this.store.state.plans.slice();
  this.toast('出锅啦！已加入今日'+plan.occasion);
 }
 private async undoGuideDish(plan:MealPlan|undefined):Promise<void> {
  if(!plan || plan.note!=='从做菜步骤加入'){return;}
  await this.store.removeMealPlan(plan.id);
  this.plans=this.store.state.plans.slice();
  this.toast('已撤销这道菜');
 }
 private kitchenTimers():KitchenTimer[]{return this.utility.timers||[];}
 private async startDockTimer(minutes:number):Promise<void> {
  if(!Number.isInteger(minutes) || minutes<1 || minutes>180){throw new Error('计时请填1至180分钟');}
  await this.beginKitchenTimer(minutes);
  this.cookClockOpen=false;
  this.pageScroller.scrollEdge(Edge.Bottom);
 }
 private async beginKitchenTimer(minutes:number):Promise<void>{if(this.kitchenTimers().length>=6){throw new Error('最多同时保留6个计时，请先收起已完成的');}const timer:KitchenTimer=new KitchenTimer();timer.id=String(Date.now())+'-'+String(Math.random());timer.recipeId=this.selectedRecipe.id;timer.label=this.selectedRecipe.name+' · 步骤'+(this.cookStep+1);timer.deadline=Date.now()+Math.round(minutes*60000);this.utility.timers=this.kitchenTimers().concat([timer]);this.utility.timer=this.utility.timers[0];this.clockNow=Date.now();this.saveUtility();this.toast('已添加计时');}
 private async stopKitchenTimer(id:string=''):Promise<void>{const timer:KitchenTimer|undefined=this.kitchenTimers().find((v:KitchenTimer)=>v.id===(id||this.utility.timer.id));if(!timer){return;}if(timer.reminderId>=0){await Reminders.cancelTimer(timer.reminderId);}this.utility.timers=this.kitchenTimers().filter((v:KitchenTimer)=>v.id!==timer.id);this.utility.timer=this.utility.timers[0]||new KitchenTimer();this.saveUtility();}
 private weekDays():string[]{return weekDates(this.planDate);}
 private planRecipe(plan:MealPlan):Recipe|undefined{return this.recipes.find((r:Recipe)=>r.id===plan.recipeId);}
 private selectedPlans():MealPlan[]{return this.plans.filter((p:MealPlan)=>p.date===this.planDate).slice().sort((a:MealPlan,b:MealPlan)=>['早餐','午餐','晚餐','加餐'].indexOf(a.occasion)-['早餐','午餐','晚餐','加餐'].indexOf(b.occasion));}
 private openPlanner(from:string=''):void{this.planMode='在家做';this.planNote='';this.planDayTools=false;this.planDate=dateString(new Date());this.planChoosing=false;this.planReturn=from;this.page='meal-plan';}
 private async addPlan(recipe:Recipe):Promise<void>{const p:MealPlan=new MealPlan();p.date=this.planDate;p.recipeId=recipe.id;p.people=this.planPeople;p.occasion=this.planOccasion;if(this.plans.some((v:MealPlan)=>v.date===p.date&&v.occasion===p.occasion&&v.recipeId===p.recipeId)){this.toast('这餐已经安排了这道菜');return;}await this.store.saveMealPlan(p);this.getUIContext().animateTo({duration:this.reducedMotion?0:260,curve:Curve.EaseOut},()=>{this.refresh();this.planChoosing=false;});if(this.successTimer>=0){clearTimeout(this.successTimer);}this.actionFlash=true;this.successBurst=0;this.successTimer=setTimeout(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:450,curve:Curve.EaseOut},()=>{this.successBurst=1;});this.successTimer=setTimeout(()=>{this.actionFlash=false;this.successTimer=-1;},1000);},24);this.toast('已加入'+p.date.slice(5)+' '+p.occasion);}
 private async shopPlans():Promise<void>{const active:MealPlan[]=this.selectedPlans().filter((p:MealPlan)=>!p.completed);if(!active.length){throw new Error('当天没有待准备的计划');}const combined:Recipe=new Recipe();combined.name='计划采购';const ingredients:Ingredient[]=[];for(const p of active){const r:Recipe|undefined=this.planRecipe(p);if(!r){continue;}const opts:PortionOptions=new PortionOptions();opts.people=p.people;opts.basePeople=r.people||2;const amounts:PortionAmount[]=recommendPortions(r.ingredients,opts);for(const a of amounts){if(a.optional){continue;}if(!(a.quantity>0)){throw new Error(r.name+'有待补充用量，请先核对菜谱');}const old:Ingredient|undefined=ingredients.find((i:Ingredient)=>canonicalName(i.name)===canonicalName(a.name)&&compatibleUnit(a.unit,i.unit)>0);if(old){old.quantity=Math.round((old.quantity+a.quantity*compatibleUnit(a.unit,old.unit))*1000)/1000;}else{ingredients.push(new Ingredient(a.name,a.quantity,a.unit));}}}combined.ingredients=ingredients;await this.addMissing(combined);this.toast('已汇总当天缺少食材到采购');}
 @Builder utilityShortcuts(){
  Row({space:10}){Button({type:ButtonType.Normal}){Row({space:6}){Image($r('app.media.utility_week_plan')).width(30).height(28).flexShrink(0).objectFit(ImageFit.Contain);Text('七日计划').fontFamily('ShikuHand').fontSize(17).layoutWeight(1)}}.id('open-plan').padding({left:8,right:8,top:10,bottom:10}).constraintSize({minHeight:52}).layoutWeight(1).fontColor('#5E6D86').backgroundColor(Color.Transparent).backgroundImage($r('app.media.crayon_ribbon_sage')).backgroundImageSize({width:'100%',height:'100%'}).borderRadius({topLeft:8,topRight:22,bottomLeft:18,bottomRight:10}).onClick(()=>this.openPlanner());Button({type:ButtonType.Normal}){Row({space:6}){Image($r('app.media.utility_search')).width(30).height(28).flexShrink(0).objectFit(ImageFit.Contain);Text('最近浏览').fontFamily('ShikuHand').fontSize(17).layoutWeight(1)}}.id('open-recent').padding({left:8,right:8,top:10,bottom:10}).constraintSize({minHeight:52}).layoutWeight(1).fontColor('#897044').backgroundColor(Color.Transparent).backgroundImage($r('app.media.crayon_ribbon_honey')).backgroundImageSize({width:'100%',height:'100%'}).borderRadius({topLeft:20,topRight:9,bottomLeft:11,bottomRight:22}).onClick(()=>{this.page='recent-recipes';})}.width('100%').margin({bottom:16})
 }
 @Builder recipeQuickTools(){
  if(!this.recipeSearch&&this.utility.searches.length){Scroll(){Row({space:7}){ForEach(this.utility.searches,(q:string)=>{Text(q).fontSize(14).fontColor('#5A7669').padding(10).backgroundColor('#DCE9DB').borderRadius(12).onClick(()=>{this.recipeSearch=q;this.recipeLimit=24;})});Text('清除').fontSize(14).padding(10).onClick(()=>{this.utility.searches=[];this.saveUtility();})}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).width('100%').margin({bottom:8})}
  Row({space:10}){Text('最近浏览').fontSize(14).padding(10).fontColor('#716252').onClick(()=>{this.page='recent-recipes';});Text('对比 '+this.utility.compare.length+'/3').id('open-compare').fontSize(14).padding(10).fontColor('#506A81').onClick(()=>{this.page='compare';});Blank();if(this.recipeSearch){Text('清空搜索 ×').fontSize(14).padding(10).onClick(()=>{this.recipeSearch='';this.recipeLimit=24;})}}.width('100%')
 }
 @Builder recentPage(){
  this.title('','最近浏览','')
  if(!this.recentRecipes().length){this.empty('还没看过菜谱','去菜谱挑一道喜欢的。');Button('去挑菜').onClick(()=>{this.page='';this.tab=3;})}
  ForEach(this.recentRecipes(),(r:Recipe)=>{Row({space:14}){Image(recipeCover(r)).width(85).height(80).objectFit(ImageFit.Contain);Column({space:7}){Text(r.name).fontFamily('ShikuHand').fontSize(23).fontColor('#304F52');Text(this.timeText(r)+' · '+r.region).fontSize(14).fontColor('#6F7969')}.layoutWeight(1).alignItems(HorizontalAlign.Start);Text('继续 ›').fontSize(15).fontColor('#956D4C')}.width('100%').padding(12).backgroundColor('#70FFFFFF').borderRadius({topLeft:10,topRight:25,bottomLeft:20,bottomRight:9}).margin({bottom:12}).onClick(()=>{this.openRecipe(r);this.recipeReturn='recent-recipes';})},(r:Recipe)=>r.id)
  if(this.recentRecipes().length){Button('清除浏览记录').fontSize(14).fontColor('#8A6D59').backgroundColor(Color.Transparent).onClick(()=>{this.utility.recent=[];this.saveUtility();this.utility=JSON.parse(JSON.stringify(this.utility)) as UtilityState;})}
 }
 @Builder comparePage(){
  this.title('','哪道更适合这顿？','')
  if(!this.comparedRecipes().length){this.empty('先选两三道菜','在菜谱卡片点“＋ 对比”。');Button('去选菜谱').fontSize(16).fontColor('#4D6F60').backgroundColor('#E0E9DB').onClick(()=>{this.page='';this.tab=3;})}
  Row({space:7}){ForEach(this.comparedRecipes(),(r:Recipe)=>{Column({space:12}){
   Image(recipeCover(r)).width('100%').height(92).objectFit(ImageFit.Contain)
   Text(r.name).fontFamily('ShikuHand').fontSize(21).minFontSize(14).maxFontSize(21).maxLines(3).heightAdaptivePolicy(TextHeightAdaptivePolicy.MIN_FONT_SIZE_FIRST).lineHeight(25).height(76).fontColor('#304F52').textAlign(TextAlign.Center)
   Text(this.timeText(r)).fontSize(17).fontWeight(FontWeight.Medium).fontColor('#567457')
   Text((r.people||2)+'人份').fontSize(15).fontColor('#72756A')
   Text(r.region||'家常').fontSize(14).height(38).fontColor('#72756A').textAlign(TextAlign.Center)
   Text(r.ingredients.filter((i:Ingredient)=>!i.optional).slice(0,4).map((i:Ingredient)=>i.name).join('、')).fontSize(14).lineHeight(23).height(74).fontColor('#506964').textAlign(TextAlign.Center)
   Text('预估 ¥'+displayCost(r,2).total+' / 2人').fontSize(15).fontColor('#93704F')
   Button('看做法',{type:ButtonType.Normal}).height(44).width('100%').padding(0).fontSize(15).borderRadius(12).fontColor('#466A5D').backgroundColor('#DFE8D9').onClick(()=>{this.openRecipe(r);this.recipeReturn='compare';})
   Button('安排',{type:ButtonType.Normal}).height(44).width('100%').padding(0).fontSize(15).borderRadius(12).fontColor('#6C718D').backgroundColor('#E0E5F1').onClick(()=>{this.selectedRecipe=r;this.openPlanner('compare');})
   Text('移除').fontSize(15).padding({top:12,bottom:12}).fontColor('#98634E').onClick(()=>this.toggleCompare(r.id))
  }.layoutWeight(1).padding({left:6,right:6,top:12,bottom:6}).backgroundColor('#70FFFFFF').borderRadius({topLeft:9,topRight:25,bottomLeft:18,bottomRight:11}).transition(TransitionEffect.OPACITY.combine(TransitionEffect.scale({x:0.94,y:0.94})))},(r:Recipe)=>r.id)}.width('100%').alignItems(VerticalAlign.Top)
 }
 @Builder recipeUtilityActions(){
  Row({space:10}){Button('安排一餐').id('recipe-plan').height(48).borderRadius({topLeft:19,topRight:9,bottomLeft:11,bottomRight:22}).layoutWeight(1).fontSize(16).fontColor('#61718A').backgroundColor('#E0E7F2').onClick(()=>{this.openPlanner('recipe');});Button({type:ButtonType.Normal}){Row({space:6}){Image($r('app.media.utility_cooking')).width(32).height(32).objectFit(ImageFit.Contain);Text(this.cookStep>0||this.completedSteps.length||this.preparedIngredients.length?'继续做菜':'开始做菜').fontSize(16)}}.id('resume-cook').height(48).borderRadius({topLeft:9,topRight:21,bottomLeft:18,bottomRight:10}).layoutWeight(1).fontSize(16).fontColor('#FFFFFF').backgroundColor('#3D6C60').onClick(()=>{this.page='cook-guide';})}.width('100%').margin({bottom:14})
 }
 @Builder mealPlanPage(){
  this.title('','七日餐桌计划','')
  this.weekSuggestionPanel()
  Row(){Text('‹ 上周').fontSize(16).padding(12).fontColor('#426B5B').onClick(()=>{this.planDate=shiftDay(this.planDate,-7);});Text(this.planDate+' ▾').fontSize(16).constraintSize({minHeight:44}).textAlign(TextAlign.Center).layoutWeight(1).fontColor('#304F52').onClick(()=>this.pickPlanDate());Text('下周 ›').fontSize(16).padding(12).fontColor('#426B5B').onClick(()=>{this.planDate=shiftDay(this.planDate,7);})}.width('100%').margin({bottom:10})
  if(this.actionFlash){Row({space:8}){Image($r('app.media.utility_success')).width(38).height(38).objectFit(ImageFit.Contain);Text('安排好了').fontSize(17).fontColor('#52755E');Image($r('app.media.layer_sparkles')).width(38).height(38).objectFit(ImageFit.Contain).scale({x:0.7+this.successBurst*0.5,y:0.7+this.successBurst*0.5}).opacity(1-this.successBurst*0.65)}.width('100%').transition(TransitionEffect.OPACITY)}
  Row({space:3}){ForEach(this.weekDays(),(day:string)=>{Column({space:5}){Text(day===dateString(new Date())?'今天':day.slice(8)+'日').fontSize(14).fontColor('#304F52');Text(String(this.plans.filter((p:MealPlan)=>p.date===day).length)).fontSize(13).fontColor('#7E7966')}.layoutWeight(1).constraintSize({minHeight:56}).padding({top:8,bottom:8}).opacity(this.planDate===day?1:0.7).backgroundImage(this.planDate===day?$r('app.media.crayon_swatch_wheat'):'').backgroundImageSize({width:'100%',height:'100%'}).onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:200},()=>{this.planDate=day;});})})}.width('100%').margin({bottom:14})

  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['早餐','午餐','晚餐','加餐'],(v:string)=>{Column(){ChoiceChip({label:v,selected:this.planOccasion===v})}.onClick(()=>{this.planOccasion=v;})})}
  Row({space:12}){Text('用餐人数').fontSize(16).layoutWeight(1);Button('−',{type:ButtonType.Normal}).width(44).height(44).fontSize(24).padding(0).fontColor('#536D64').backgroundColor(Color.Transparent).backgroundImage($r('app.media.crayon_swatch_sage')).backgroundImageSize({width:'100%',height:'100%'}).onClick(()=>{this.planPeople=Math.max(1,this.planPeople-1);});Text(String(this.planPeople)).fontSize(20).width(28).textAlign(TextAlign.Center).contentTransition(this.reducedMotion?undefined:new NumericTextTransition({flipDirection:FlipDirection.DOWN,enableBlur:false}));Button('＋',{type:ButtonType.Normal}).width(44).height(44).fontSize(24).padding(0).fontColor('#936F45').backgroundColor(Color.Transparent).backgroundImage($r('app.media.crayon_swatch_wheat')).backgroundImageSize({width:'100%',height:'100%'}).onClick(()=>{this.planPeople=Math.min(20,this.planPeople+1);})}.width('100%').margin({top:12,bottom:16})
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['在家做','外食','外卖','吃剩菜'],(v:string)=>{Column(){ChoiceChip({label:v,selected:this.planMode===v})}.onClick(()=>{this.planMode=v;})})}.margin({bottom:12})
  if(this.planMode!=='在家做'){Row({space:8}){TextInput({text:this.planNote,placeholder:'店铺、餐食或剩菜安排'}).maxLength(200).layoutWeight(1).onChange((v:string)=>{this.planNote=v;});Button('安排').height(46).backgroundColor('#DCE8D7').fontColor('#426B5B').onClick(()=>this.run(async()=>{await this.addNotePlan();}))}.width('100%').margin({bottom:12})}
  if(this.planReturn&&this.selectedRecipe.id&&this.planMode==='在家做'){Button('安排 '+this.selectedRecipe.name).width('100%').height(48).fontColor('#FFFFFF').backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.addPlan(this.selectedRecipe);})).margin({bottom:12})}
  Row(){Text(this.planDate.slice(5)+' 已安排').fontFamily('ShikuHand').fontSize(23).layoutWeight(1);Text('＋ 选菜').fontSize(16).padding(12).fontColor('#8B7047').onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:220},()=>{this.planMode='在家做';this.planChoosing=!this.planChoosing;});})}.width('100%')
  if(this.planChoosing){Column(){TextInput({text:this.planSearch,placeholder:'搜索计划菜品'}).onChange((v:string)=>{this.planSearch=v;});ForEach(this.recipes.filter((r:Recipe)=>!this.planSearch||r.name.includes(this.planSearch)).slice(0,8),(r:Recipe)=>{Row({space:10}){Image(recipeCover(r)).width(50).height(50).objectFit(ImageFit.Contain);Text(r.name).fontSize(17).layoutWeight(1);Text('＋').fontSize(22).padding(12)}.width('100%').onClick(()=>this.run(async()=>{await this.addPlan(r);}))})}.transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({y:12}))).margin({bottom:12})}
  if(!this.selectedPlans().length){Image($r('app.media.scene_week_to_table')).width(156).height(100).objectFit(ImageFit.Contain);Text('这天还没安排，选一道想吃的。').fontSize(16).fontColor('#7B7F6D').padding({top:8,bottom:16})}
  ForEach(this.selectedPlans(),(p:MealPlan)=>{Column({space:10}){Row({space:10}){Text(p.completed?'✓':'○').fontSize(24).fontColor('#5D8465').padding(10).onClick(()=>this.run(async()=>{await this.store.completeMealPlan(p.id,!p.completed);this.getUIContext().animateTo({duration:this.reducedMotion?0:220},()=>{this.plans=this.store.state.plans.slice();});}));Column({space:6}){Text(this.planLabel(p)).fontFamily('ShikuHand').fontSize(23).fontColor('#304F52').decoration({type:p.completed?TextDecorationType.LineThrough:TextDecorationType.None});Text(p.occasion+' · '+p.people+'人份').fontSize(15).fontColor('#737965')}.layoutWeight(1).alignItems(HorizontalAlign.Start).onClick(()=>{const r:Recipe|undefined=this.planRecipe(p);if(r){this.openRecipe(r);this.recipeReturn='meal-plan';}});Column(){Text('调整').fontSize(15).fontColor('#657C8E').constraintSize({minHeight:44}).padding({left:10,right:10}).onClick(()=>{this.planEditId=this.planEditId===p.id?'':p.id;this.planTargetDate=shiftDay(p.date,1);});Text('移除').fontSize(14).fontColor('#91684F').constraintSize({minHeight:44}).padding({left:10,right:10}).onClick(()=>this.confirm('移除这道计划？','已保存的记餐和库存不变。',async()=>{await this.store.removeMealPlan(p.id);this.getUIContext().animateTo({duration:this.reducedMotion?0:220},()=>{this.plans=this.store.state.plans.slice();});}));}.flexShrink(0)}.width('100%');if(p.mode==='吃剩菜'&&!p.completed){Button('吃过了，记这一餐').height(46).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.confirm('记下这份剩菜？','仅关联原餐，费用不重复计入，不扣库存。请确认保存与食用安全。',async()=>{await this.store.recordLeftoverPlan(p.id);this.refresh();this.toast('已记餐并完成计划');}));}if(this.planEditId===p.id){Column({space:8}){this.planReplacementPanel(p);Text('明天').fontSize(15).fontColor('#426B5B').padding(10).onClick(()=>{this.planTargetDate=shiftDay(p.date,1);});Text('下周同一天').fontSize(15).fontColor('#426B5B').padding(10).onClick(()=>{this.planTargetDate=shiftDay(p.date,7);});TextInput({text:this.planTargetDate,placeholder:'YYYY-MM-DD'}).onChange((v:string)=>{this.planTargetDate=v;});Row({space:8}){Button('移到这天').fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.shiftPlan(p,false);}));Button('复制到这天').fontColor('#8A6549').backgroundColor('#EAD8BF').onClick(()=>this.run(async()=>{await this.shiftPlan(p,true);}))}}.width('100%')}}.width('100%').padding(12).backgroundColor(p.completed?'#DCE8D5':'#E6EBF0').borderRadius({topLeft:9,topRight:26,bottomLeft:20,bottomRight:11}).margin({bottom:12}).transition(TransitionEffect.OPACITY.combine(TransitionEffect.scale({x:0.94,y:0.94})))},(p:MealPlan)=>p.id+':'+String(p.completed)+':'+p.modifiedAt)
  if(this.selectedPlans().some((p:MealPlan)=>!p.completed)){Button('预览计划采购').width('100%').height(50).fontColor('#FFFFFF').backgroundColor('#567765').onClick(()=>this.run(async()=>{this.procurementWeek=false;this.page='procurement';}))}
  Button('本周采购预览').width('100%').height(48).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{this.procurementWeek=true;this.page='procurement';})
  Text(this.planDayTools?'收起整天复制 ↑':'复制整天安排 ↓').fontSize(17).fontColor('#657C8E').padding(12).onClick(()=>{this.planDayTools=!this.planDayTools;this.planTargetDate=shiftDay(this.planDate,7);})
  if(this.planDayTools){Row({space:8}){TextInput({text:this.planTargetDate,placeholder:'目标日期 YYYY-MM-DD'}).layoutWeight(1).onChange((v:string)=>{this.planTargetDate=v;});Button('复制').height(46).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.copyPlanDay();}))}.width('100%')}
  Text('完成标记不会自动扣库存').fontSize(14).lineHeight(23).fontColor('#76796C').margin({top:14})
 }
 @Builder activeTimer(){
  ForEach(this.kitchenTimers(),(timer:KitchenTimer)=>{Column({space:9}){Row({space:8}){Image($r('app.media.experience_timer')).width(34).height(34);Text(timer.label).fontSize(16).fontColor('#304F52').layoutWeight(1)}.width('100%');Text(timer.deadline>this.clockNow?countdownText(timer.deadline,this.clockNow):'时间到啦').fontSize(34).fontColor('#996B45');Row({space:8}){Button(timer.deadline>this.clockNow?'停止':'收起').fontSize(15).height(46).fontColor('#426B5B').backgroundColor('#DCE7D9').onClick(()=>this.run(async()=>{await this.stopKitchenTimer(timer.id);}));if(timer.deadline>this.clockNow&&timer.reminderId<0){Button('离开也提醒').fontSize(15).height(46).fontColor('#65798D').backgroundColor('#E0E7EF').onClick(()=>this.run(async()=>{await Reminders.permission(this.getUIContext().getHostContext() as common.UIAbilityContext);const seconds:number=Math.ceil((timer.deadline-Date.now())/1000);if(seconds<=0){return;}timer.reminderId=await Reminders.timer(timer.label,seconds);this.utility.timers=this.kitchenTimers().map((v:KitchenTimer)=>v.id===timer.id?timer:v);this.saveUtility();this.toast('已登记系统提醒');}))}}.width('100%')}.width('100%').padding(16).backgroundColor('#EAF0E4').borderRadius({topLeft:9,topRight:25,bottomLeft:21,bottomRight:10}).margin({bottom:12}).transition(TransitionEffect.OPACITY)},(timer:KitchenTimer)=>timer.id)
 }

 private homeMeals(occasion:string=''):Meal[]{return this.meals.filter((m:Meal)=>dateString(new Date(m.date))===this.homeDate&&(!occasion||m.mealType===occasion)).slice().sort((a:Meal,b:Meal)=>a.date.localeCompare(b.date));}
 private homePlans(occasion:string):MealPlan[]{return this.plans.filter((p:MealPlan)=>p.date===this.homeDate&&p.occasion===occasion);}
 private selectHomeDate(date:string):void{this.getUIContext().animateTo({duration:this.reducedMotion?0:220,curve:Curve.EaseOut},()=>{this.homeDate=date;this.homeMonth=date.slice(0,7);});}
 private homeMonthCells():number[]{const first:Date=new Date(this.homeMonth+'-01T12:00:00');const offset:number=(first.getDay()+6)%7;const days:number=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();const out:number[]=[];for(let n:number=0;n<Math.ceil((offset+days)/7)*7;n++){out.push(n>=offset&&n<offset+days?n-offset+1:0);}return out;}
 private homeMonthMove(delta:number):void{const d:Date=new Date(this.homeMonth+'-01T12:00:00');d.setMonth(d.getMonth()+delta);this.homeMonth=dateString(d).slice(0,7);}
 private openHomeMeal(occasion:string):void{this.startMeal();this.mealDate=this.homeDate;this.mealType=occasion;this.mealInitial=this.mealFingerprint();}
 private openHomePlan(occasion:string):void{this.openPlanner();this.planDate=this.homeDate;this.planOccasion=occasion;this.planChoosing=true;}
 @Builder homeDayCell(date:string,label:string){
  Column({space:2}){Text(label).fontSize(12).lineHeight(18).textAlign(TextAlign.Center).fontColor('#827485');Text(date.slice(8)).fontSize(18).lineHeight(24).textAlign(TextAlign.Center).fontWeight(this.homeDate===date?FontWeight.Bold:FontWeight.Normal).fontColor('#3E5A55');Text(this.meals.some((m:Meal)=>dateString(new Date(m.date))===date)?'●':this.plans.some((p:MealPlan)=>p.date===date)?'○':' ').fontSize(10).fontColor('#A86F50')}.id('home-date-'+date).layoutWeight(1).height(64).justifyContent(FlexAlign.Center).backgroundImage(this.homeDate===date?$r('app.media.crayon_swatch_wheat'):'').backgroundImageSize({width:'100%',height:'100%'}).backgroundImagePosition(Alignment.Center).animation({duration:this.reducedMotion?0:180,curve:Curve.EaseOut}).onClick(()=>this.selectHomeDate(date))
 }
 @Builder homeCalendar(){
  Row({space:10}){AssistantMascot({mascotSize:44,active:this.foreground&&!this.companionChatOpen,mood:'idle'}).accessibilityLevel('yes').accessibilityText('和小怪聊聊').onClick(()=>this.openCompanion());Column({space:3}){Text('开饭小怪').fontFamily('ShikuHand').fontSize(25).fontColor('#5C648E');Text(this.homeDate===dateString(new Date())?'今天也要好好吃饭':this.homeDate).fontSize(13).fontColor('#7E796A')}.alignItems(HorizontalAlign.Start).layoutWeight(1);Text('回今天').fontSize(14).fontColor('#64806B').constraintSize({minHeight:44}).padding({left:10,right:4}).flexShrink(0).onClick(()=>this.selectHomeDate(dateString(new Date())))}.width('100%').margin({bottom:12})
  Row({space:6}){Text(dailySlogan(this.homeDate)).lineBreakStrategy(LineBreakStrategy.BALANCED).fontFamily('ShikuHand').fontSize(this.contentWidth()<300?22:25).lineHeight(this.contentWidth()<300?30:34).fontColor('#8F4B38').layoutWeight(1);Image($r('app.media.table_collage')).id('home-collage').sourceSize({width:432,height:210}).width(Math.min(112,this.contentWidth()*0.28)).aspectRatio(1024/498).flexShrink(0).objectFit(ImageFit.Contain)}.width('100%').margin({bottom:4})
  Row({space:8}){Button(this.homeDate>dateString(new Date())?'安排一餐':'今天吃什么').id('home-primary-action').layoutWeight(2).height(50).backgroundColor('#426B5B').onClick(()=>this.run(async()=>{if(this.homeDate>dateString(new Date())){this.openHomePlan('晚餐');}else{await this.openDraw();}}));if(this.homeDate<=dateString(new Date())){Button('记一餐').layoutWeight(1).height(50).backgroundColor('#E3EADF').fontColor('#35584B').onClick(()=>this.openHomeMeal('午餐'))}}.width('100%').margin({top:8,bottom:16})
  Row(){Text('‹').fontSize(25).width(44).height(44).textAlign(TextAlign.Center).accessibilityText('上一周').onClick(()=>this.selectHomeDate(shiftDay(this.homeDate,-7)));Text(this.homeMonth+'  '+(this.homeCalendarOpen?'收起月历 ↑':'月历 ↓')).id('home-month-toggle').fontSize(17).fontColor('#695A7A').layoutWeight(1).textAlign(TextAlign.Center).padding(10).onClick(()=>{this.homeMonth=this.homeDate.slice(0,7);this.getUIContext().animateTo({duration:this.reducedMotion?0:240},()=>{this.homeCalendarOpen=!this.homeCalendarOpen;});});Text('›').fontSize(25).width(44).height(44).textAlign(TextAlign.Center).accessibilityText('下一周').onClick(()=>this.selectHomeDate(shiftDay(this.homeDate,7)))}.width('100%')
  if(this.homeCalendarOpen){
   Row(){Text('‹ 上月').fontSize(14).constraintSize({minHeight:44}).padding({left:10,right:10}).onClick(()=>this.homeMonthMove(-1));Blank();Text(this.homeMonth).fontSize(17);Blank();Text('下月 ›').fontSize(14).constraintSize({minHeight:44}).padding({left:10,right:10}).onClick(()=>this.homeMonthMove(1))}.width('100%')
   Grid(){ForEach(this.homeMonthCells(),(day:number,index:number)=>{GridItem(){if(day){Column(){Text(String(day)).fontSize(16).fontColor('#426659');Text(this.meals.some((m:Meal)=>dateString(new Date(m.date))===this.homeMonth+'-'+String(day).padStart(2,'0'))?'●':this.plans.some((p:MealPlan)=>p.date===this.homeMonth+'-'+String(day).padStart(2,'0'))?'○':' ').fontSize(9).fontColor('#B27A53')}.id('home-month-date-'+this.homeMonth+'-'+String(day).padStart(2,'0')).width('100%').height(46).justifyContent(FlexAlign.Center).backgroundImage(this.homeDate===this.homeMonth+'-'+String(day).padStart(2,'0')?$r('app.media.crayon_swatch_wheat'):'').backgroundImageSize({width:'100%',height:'100%'}).onClick(()=>{const date:string=this.homeMonth+'-'+String(day).padStart(2,'0');this.selectHomeDate(date);this.homeCalendarOpen=false;})}}},(_day:number,index:number)=>String(index))}.columnsTemplate('1fr 1fr 1fr 1fr 1fr 1fr 1fr').rowsGap(3).height(this.homeMonthCells().length/7*49).translate({x:this.calendarShift}).opacity(this.calendarFade).transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({y:-8}))).gesture(PanGesture({direction:PanDirection.Horizontal,distance:24}).onActionEnd((event:GestureEvent)=>{if(Math.abs(event.offsetX)>48){this.swipeCalendar(event.offsetX<0?1:-1,true);}}))
  }else{Row(){ForEach(weekDates(this.homeDate),(date:string,index:number)=>{this.homeDayCell(date,['一','二','三','四','五','六','日'][index])})}.id('home-week-strip').width('100%').translate({x:this.calendarShift}).opacity(this.calendarFade).gesture(PanGesture({direction:PanDirection.Horizontal,distance:24}).onActionEnd((event:GestureEvent)=>{if(Math.abs(event.offsetX)>48){this.swipeCalendar(event.offsetX<0?1:-1);}}))}
 }
 @Builder homeMealCard(occasion:string,index:number){
  Column({space:8}){
   Row({space:8}){Image(occasionImage(index===0?'breakfast':index===1?'lunch':'dinner')).width(32).height(32).flexShrink(0).objectFit(ImageFit.Contain);Text(occasion).fontFamily('ShikuHand').fontSize(23).fontColor('#3B5B54').layoutWeight(1);if(this.homeDate<=dateString(new Date())){Text('＋ 记餐').fontSize(14).fontColor('#956247').constraintSize({minHeight:44}).padding({left:8,right:8}).flexShrink(0).onClick(()=>this.openHomeMeal(occasion))}Text('安排 ›').fontSize(14).fontColor('#756487').constraintSize({minHeight:44}).padding({left:8,right:4}).flexShrink(0).onClick(()=>this.openHomePlan(occasion))}.width('100%')
   ForEach(this.homeMeals(occasion),(m:Meal)=>{Row(){Text(m.name).fontSize(16).fontColor('#304F52').layoutWeight(1);Text('¥'+m.estimatedCost.toFixed(2)+' ›').fontSize(14).fontColor('#8C7357')}.width('100%').padding({top:6,bottom:9}).constraintSize({minHeight:44}).onClick(()=>this.startMeal(m))},(m:Meal)=>m.id)
   ForEach(this.homePlans(occasion),(p:MealPlan)=>{Row({space:7}){Text(p.completed?'✓':'○').fontSize(17).fontColor('#768D70');Text(this.planLabel(p)+' · '+p.people+'人').fontSize(15).fontColor('#6F677F').layoutWeight(1);if(p.note==='从做菜步骤加入'){Button('撤销加入').height(44).fontSize(14).fontColor('#426653').backgroundColor('#EAF0E4').onClick(()=>this.run(()=>this.undoGuideDish(p)))}else{Text('计划 ›').fontSize(13).fontColor('#9A7755')}}.width('100%').padding({top:5,bottom:7}).onClick(()=>{const r:Recipe|undefined=this.planRecipe(p);if(r){this.openRecipe(r);}else{this.openPlanner();this.planDate=p.date;this.planMode=p.mode;this.planNote=p.note||'';}})},(p:MealPlan)=>p.id+':'+String(p.completed)+':'+p.modifiedAt)
   if(!this.homeMeals(occasion).length&&!this.homePlans(occasion).length){Text(this.homeDate>dateString(new Date())?'想好吃什么，就安排下来':'还没记录').fontSize(14).fontColor('#8B877C').padding({bottom:5})}
  }.width('100%').padding({left:13,right:10,top:7,bottom:7}).backgroundColor(index===0?'#70F9E6BD':index===1?'#70DDE9DE':'#70E7E0F0').border({width:{left:3},color:index===0?'#D7AA58':index===1?'#7C9B83':'#9C8AB2'}).borderRadius({topLeft:2,topRight:16,bottomLeft:2,bottomRight:5}).margin({bottom:8})
 }
 @Builder collectionsPage(){
  this.title('',this.collectionReturn==='recipe'?'加入菜单':'我的收藏','')
  if(this.collectionReturn!=='recipe'){
   Row(){Text('喜欢的菜').fontFamily('ShikuHand').fontSize(23).fontColor('#8E6554').layoutWeight(1);Text(this.favorites.length+'道').fontSize(15).fontColor('#7C7465')}.width('100%').margin({bottom:8})
   if(!this.favorites.length){Text('点菜谱上的爱心，就收在这里').fontSize(15).fontColor('#7C7465').padding({top:8,bottom:16})}
   ForEach(this.recipes.filter((r:Recipe)=>this.favorites.some((f:Favorite)=>f.recipeId===r.id)),(r:Recipe)=>{
    Row({space:10}){Image(recipeCover(r)).width(54).height(54).objectFit(ImageFit.Contain).flexShrink(0);Text(r.name).fontSize(17).fontColor('#36564D').layoutWeight(1).onClick(()=>{this.openRecipe(r);this.recipeReturn='collections';});Button({type:ButtonType.Normal}){this.paperHeart(true,r.id)}.id('collection-heart-'+r.id).width(44).height(44).padding(0).backgroundColor(Color.Transparent).clip(false).accessibilityText('取消喜欢'+r.name).onClick(()=>this.toggleRecipeFavorite(r.id))}.width('100%').padding({top:5,bottom:5}).margin({bottom:6})
   },(r:Recipe)=>r.id)
   Text('自建菜单').fontFamily('ShikuHand').fontSize(23).fontColor('#536B5A').margin({top:14,bottom:10})
  }
  Row({space:8}){TextInput({text:this.collectionName,placeholder:'新建：下班快手菜…'}).maxLength(24).layoutWeight(1).onChange((v:string)=>{this.collectionName=v;});Button('新建').height(48).fontColor('#FFFFFF').backgroundColor('#527764').onClick(()=>this.run(async()=>{await this.createCollection();}))}.width('100%').margin({bottom:16})
  ForEach(this.experience.collections,(c:RecipeCollection)=>{
   Row({space:8}){Text(c.name).fontSize(19).fontColor('#36564D').layoutWeight(1);Text(c.ids.length+'道').fontSize(15).fontColor('#736D5A');if(this.collectionReturn==='recipe'){Button(c.ids.includes(this.selectedRecipe.id)?'已加入':'加入').fontSize(15).height(44).backgroundColor('#DCE8D7').fontColor('#426B5B').onClick(()=>this.run(async()=>{await this.toggleCollection(c.name);}))}Text('移除').fontSize(14).fontColor('#966F56').padding(10).onClick(()=>this.confirm('删除收藏夹？','菜谱和爱心收藏仍保留。',async()=>{this.experience.collections=this.experience.collections.filter((v:RecipeCollection)=>v.name!==c.name);await this.saveExperience();}))}.width('100%').padding(14).backgroundColor('#85E5DEC9').borderRadius({topLeft:10,topRight:25,bottomLeft:20,bottomRight:10}).margin({bottom:8}).onClick(()=>{this.activeCollection=this.activeCollection===c.name?'':c.name;})
   if(this.activeCollection===c.name){ForEach(this.currentCollectionRecipes(),(r:Recipe)=>{Row({space:10}){Image(recipeCover(r)).width(60).height(60).objectFit(ImageFit.Contain);Text(r.name).fontSize(18).fontColor('#304F52').layoutWeight(1);Text('做法 ›').fontSize(15).fontColor('#7B694C')}.width('100%').padding(10).onClick(()=>{this.openRecipe(r);this.recipeReturn='collections';})},(r:Recipe)=>r.id)}
  },(c:RecipeCollection)=>c.name)
  if(!this.experience.collections.length){this.empty('把喜欢的菜，收成一份菜单','例如：工作日午餐、周末请客、减脂便当')}
  if(this.activeCollection&&this.currentCollectionRecipes().length){Button('把这份菜单安排到一天').width('100%').height(48).fontColor('#FFFFFF').backgroundColor('#527764').onClick(()=>this.run(async()=>{this.openPlanner();for(const r of this.currentCollectionRecipes()){await this.addPlan(r);}this.toast('已安排到今天，可在计划中调整日期');}))}
 }
 @Builder procurementPage(){
  this.title('','计划采购','')
  Row({space:8}){Button(this.procurementWeek?'本周':'当天').height(46).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{this.procurementWeek=!this.procurementWeek;});Text(this.procurementWeek?this.weekDays()[0]+' 至 '+this.weekDays()[6]:this.planDate).fontSize(15).fontColor('#76674E').layoutWeight(1)}.width('100%').margin({bottom:12})
  Row(){Text('包括调味品').fontSize(16).layoutWeight(1);Toggle({type:ToggleType.Switch,isOn:this.procurementSeasoning}).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v:boolean)=>{this.procurementSeasoning=v;})}.constraintSize({minHeight:44}).width('100%').margin({bottom:12})
  Text('汇总 '+this.procurement().planCount+' 道待做菜品').fontSize(19).fontColor('#304F52').margin({bottom:12})
  if(this.procurement().unknownRecipes.length){Text('需先核对用量：'+this.procurement().unknownRecipes.join('、')).fontSize(15).lineHeight(24).fontColor('#9A6548').margin({bottom:14})}
  ForEach(this.procurement().lines.filter((v:ProcurementLine)=>!v.optional||this.procurementSeasoning),(v:ProcurementLine)=>{
   Column({space:7}){Row(){Text(v.name+(v.optional?' · 调味':'' )).fontSize(18).fontColor('#304F52').layoutWeight(1);Text(v.unknown?'待核对':v.missing>0?'缺 '+v.missing+v.unit:'已备齐').fontSize(16).fontColor(v.unknown?'#A16B4C':v.missing>0?'#8A6549':'#527764')}.width('100%');Text('需 '+v.required+v.unit+' · 库存 '+Math.round(v.stock*100)/100+' · 待购 '+Math.round(v.pending*100)/100).fontSize(14).fontColor('#68766C');Text(v.sources.join('、')).fontSize(14).fontColor('#746C60')}.width('100%').alignItems(HorizontalAlign.Start).padding(15).backgroundColor('#80FFFFFF').borderRadius({topLeft:9,topRight:23,bottomLeft:19,bottomRight:10}).margin({bottom:10})
  })
  Button('确认加入缺少食材').width('100%').height(50).fontColor('#FFFFFF').backgroundColor('#527764').enabled(this.procurement().lines.some((v:ProcurementLine)=>v.missing>0&&!v.unknown&&(!v.optional||this.procurementSeasoning))).onClick(()=>this.run(async()=>{await this.commitProcurement();}))
 }
 @Builder savedFilterTools(){
  if(!this.filterReturn){
   if(this.experience.filters.length){Scroll(){Row({space:8}){ForEach(this.experience.filters,(f:SavedRecipeFilter)=>{Column({space:4}){Text(f.name).fontSize(16).fontColor('#426B5B').padding(12).backgroundColor('#DCE8D7').borderRadius(12).onClick(()=>this.applyPreset(f));Text('删除').fontSize(14).fontColor('#906B56').padding(8).onClick(()=>this.run(async()=>{this.experience.filters=this.experience.filters.filter((v:SavedRecipeFilter)=>v.name!==f.name);await this.saveExperience();}))}})}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).margin({bottom:12})}
   Row({space:8}){TextInput({text:this.presetName,placeholder:'保存当前条件为…'}).maxLength(24).layoutWeight(1).onChange((v:string)=>{this.presetName=v;});Button('保存').height(46).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.saveFilterPreset();}))}.width('100%').margin({bottom:14})
  }
 }
 @Builder quickMealStrip(){
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(8)}}){ForEach(['早餐','午餐','晚餐','加餐'],(occasion:string)=>{Button('＋ '+occasion).height(48).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{if(this.homeDate>dateString(new Date())){this.toast('未来日期请先安排计划');this.openPlanner();this.planDate=this.homeDate;this.planOccasion=occasion;return;}this.startMeal();this.mealType=occasion;this.mealDate=this.homeDate;this.mealDining=this.recommendScene==='做饭'?'在家做':'餐馆';this.mealInitial=this.mealFingerprint();})})}.width('100%').margin({bottom:16})
  if(this.quickMeals().length){
   Row(){Text('最近吃过').fontSize(19).fontColor('#36564D').layoutWeight(1);Text('全部记录 ›').fontSize(15).fontColor('#7E694F').padding(10).onClick(()=>{this.page='';this.tab=4;})}.width('100%')
   Scroll(){Row({space:10}){ForEach(this.quickMeals(),(m:Meal)=>{Column({space:7}){Text(m.name).fontSize(17).maxLines(2).fontColor('#304F52');Text('再吃一次').fontSize(14).maxLines(1).fontColor('#6D725F')}.width(160).height(88).padding(12).alignItems(HorizontalAlign.Start).justifyContent(FlexAlign.Center).backgroundColor('#80EAD8BF').borderRadius({topLeft:10,topRight:22,bottomLeft:19,bottomRight:10}).onClick(()=>this.repeatPickedMeal(m))},(m:Meal)=>m.id)}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).width('100%').margin({bottom:16})
  }
 }

 @Builder dashboard(){
  this.homeCalendar()
  if(this.recoverMealDraft){Row(){Text('有一餐还没写完').fontSize(15).fontColor('#65506E').layoutWeight(1);Button('继续').height(44).onClick(()=>this.restoreMealEditorDraft());Button('丢弃').height(44).fontColor('#85684E').backgroundColor('#EEE0C7').onClick(()=>this.confirm('丢弃这份草稿？','已保存的记录不会删除。',async()=>{await this.store.setting('mealEditorDraft:v1','');this.mealDraftCache='';this.recoverMealDraft=false;}))}.width('100%').margin({bottom:10})}
  if(!this.quickstartDone){Row({space:8}){Text('先选一种用法').fontSize(17).fontColor('#36564D').layoutWeight(1);Button('做饭').height(46).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{this.recommendScene='做饭';this.quickstartDone=true;await this.store.setting('recommendScene',this.recommendScene);await this.store.setting('quickstartDone','true');}));Button('记餐').height(46).fontColor('#8A6549').backgroundColor('#EAD8BF').onClick(()=>this.run(async()=>{this.recommendScene='外食 / 外卖';this.quickstartDone=true;await this.store.setting('recommendScene',this.recommendScene);await this.store.setting('quickstartDone','true');}))}.width('100%').margin({bottom:12})}
  Row(){Text(this.homeDate===dateString(new Date())?'今天的三餐':this.homeDate.slice(5)+' 的餐桌').fontSize(20).fontColor('#344F4D').layoutWeight(1);Text(this.homeMeals().length+'餐 · ¥'+Number(this.mealSpend(this.homeMeals())).toFixed(2)).fontSize(13).fontColor('#87745D')}.width('100%').margin({top:12,bottom:10})
  ForEach(['早餐','午餐','晚餐'],(occasion:string,index:number)=>{this.homeMealCard(occasion,index)})
  if(this.homeMeals('加餐').length||this.homePlans('加餐').length){this.homeMealCard('加餐',3)}
  this.dailyWheel()
  this.utilityShortcuts()
  Row({space:10}){Button('常买几样').height(48).layoutWeight(1).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.openFlow('常买');}));Button('同步状态').height(48).layoutWeight(1).fontColor('#7E6854').backgroundColor('#EDE1C7').onClick(()=>this.run(async()=>{await this.openFlow('同步');}))}.width('100%').margin({bottom:12})
  if(this.utility.timer.deadline>0){this.activeTimer()}


  this.quickMealStrip()

 }
 @Builder pantryDashboard() {
  Row({ space: 12 }) {
   Text('食材柜').fontFamily('HarmonyOS Sans SC').fontSize(34).fontWeight(FontWeight.Bold).fontColor('#263E46')
   Column({ space: 6 }) { Text('冰箱里的小日子').fontFamily('HarmonyOS Sans SC').fontSize(16).fontColor('#263E46').padding({ left: 10, right: 10, top: 5, bottom: 5 }).fontWeight(FontWeight.Medium); Text('每一份食材，都值得珍惜').fontFamily('HarmonyOS Sans SC').fontSize(11).fontColor('#57534D') }.alignItems(HorizontalAlign.Start)
   Blank()
  }.width('100%').margin({ top: 5, bottom: 5 })
  Row() { Text('PANTRY CLUB / ' + dateString(new Date())).fontSize(10).letterSpacing(1).fontColor('#686258'); Blank(); Text('离线也好用 ✓').fontFamily('HarmonyOS Sans SC').fontSize(11).fontColor('#263E46') }.width('100%').margin({ bottom: 17 })
  Column({ space: 16 }) {
   Stack({ alignContent: Alignment.Start }) {
    Image($r('app.media.portion_editorial_header')).width('100%').height(194).objectFit(ImageFit.Cover)
    Row() { Column({ space: 8 }) { Text('我的食材柜').fontSize(13).fontColor('#59705E').letterSpacing(1); Text(`${this.count('all')}`).fontSize(46).fontWeight(FontWeight.Bold).fontColor('#263E46'); Text('份新鲜 · 慢慢享用').fontSize(12).fontColor('#7A837B'); Text('把日子过成喜欢的味道').fontSize(11).fontColor('#967B63') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Image(avatarImage('cat')).width(155).height(160).objectFit(ImageFit.Contain) }.width('100%').padding(22)
   }.width('100%').height(194).borderRadius({ topLeft: 14, topRight: 28, bottomLeft: 22, bottomRight: 9 }).clip(true).border({ width: 0.6, color: '#B7AC94' }).shadow({ radius: 15, color: '#10263E46', offsetX: 0, offsetY: 5 })
   Row({ space: 9 }) { this.stat(this.count('normal'), '新鲜', '#D7E1CB'); this.stat(this.count('soon'), '临期', '#E8C993'); this.stat(this.count('expired'), '过期', '#D9B0A3'); this.stat(this.count('low'), '余量不足', '#C2D5DE') }.width('100%')
   Row({ space: 12 }) {
    Button('＋ 录入食材', { type: ButtonType.Normal }).fontFamily('HarmonyOS Sans SC').fontSize(19).fontColor('#263E46').layoutWeight(1).height(52).backgroundColor('#E8C993').border({ width: 0.6, color: '#B7AC94' }).borderRadius({ topLeft: 8, topRight: 17, bottomLeft: 15, bottomRight: 7 }).shadow({ radius: 10, color: '#10263E46', offsetX: 0, offsetY: 3 }).onClick(() => this.startFood())
    Button('食材模板', { type: ButtonType.Normal }).fontFamily('HarmonyOS Sans SC').fontSize(19).layoutWeight(1).height(52).backgroundColor('#D9B0A3').fontColor('#263E46').border({ width: 0.6, color: '#B7AC94' }).borderRadius({ topLeft: 14, topRight: 7, bottomLeft: 7, bottomRight: 16 }).shadow({ radius: 10, color: '#10263E46', offsetX: 0, offsetY: 3 }).onClick(() => { this.page = 'templates'; })
   }
   Row({ space: 10 }) {
    Text('扫码录入 · EAN / UPC').fontFamily('HarmonyOS Sans SC').fontSize(12).fontColor('#263E46').padding(10).backgroundColor('#C2D5DE').borderRadius(7).onClick(() => this.run(async () => { await this.scanFood(); }))
   }.width('100%')
   Row() { Text('先吃这些，刚刚好').fontFamily('HarmonyOS Sans SC').fontSize(23).fontWeight(FontWeight.Bold).fontColor('#263E46').layoutWeight(1); Text('查看库存 →').fontFamily('HarmonyOS Sans SC').fontSize(13).fontColor('#263E46').onClick(() => { this.tab = 1; }) }.margin({ top: 5 })
   if (this.activeFoods().length === 0) { this.empty('给食材柜添一点新鲜', '从一盒牛奶、一把青菜开始\n食材只保存在本机，也能完整使用。') }
   ForEach(this.activeFoods().sort((a: Food, b: Food) => a.expiryDate.localeCompare(b.expiryDate)).slice(0, 3), (f: Food) => { this.foodRow(f) }, (f: Food) => f.id)
   Row({ space: 10 }) {
    Column({ space: 9 }) { Text('今日吃什么').fontFamily('HarmonyOS Sans SC').fontSize(22).fontColor('#263E46'); Text('用手边食材，做一顿家常').fontSize(12).fontColor('#57534D'); Text('去挑菜谱 ↗').fontFamily('HarmonyOS Sans SC').fontSize(15).fontColor('#263E46') }.alignItems(HorizontalAlign.Start).layoutWeight(1)
    Image($r('app.media.recipe_tomato_eggs')).width(96).height(80).objectFit(ImageFit.Contain)
   }.padding(18).backgroundColor('#BCD2C3').border({ width: 0.6, color: '#B7AC94' }).borderRadius(14).onClick(() => { this.tab = 3; })
  }
 }
 @Builder inventory() {
  this.title('', '我的库存', '')
  Row({space:8}){Row({space:6}){Image(uiIcon('storage')).width(26).height(26).objectFit(ImageFit.Contain).flexShrink(0);Text('购买与消耗').fontSize(15).fontColor('#385C65').layoutWeight(1)}.id('stock-history-entry').accessibilityText('查看购买与消耗历史').layoutWeight(1).constraintSize({minHeight:48}).padding({left:10,right:8,top:6,bottom:6}).backgroundColor('#A0DCE8EC').borderRadius({topLeft:4,topRight:16,bottomLeft:4,bottomRight:9}).onClick(()=>{this.historySearch='';this.historyFilter='全部批次';this.page='stock-history';});Row({space:6}){Image($r('app.media.utility_shopping')).width(26).height(26).objectFit(ImageFit.Contain).flexShrink(0);Text('采购清单').fontSize(15).fontColor('#44634F').layoutWeight(1)}.layoutWeight(1).constraintSize({minHeight:48}).padding({left:10,right:8,top:6,bottom:6}).backgroundColor('#A0E4EBE1').borderRadius({topLeft:10,topRight:4,bottomLeft:15,bottomRight:4}).onClick(()=>{this.page='shopping';})}.width('100%').margin({bottom:12})
  if(!this.activeFoods().length){this.empty('库存还是空的','');Button('添加第一份食材').width('100%').height(48).backgroundColor('#426B5B').onClick(()=>this.startFood())}else{
  Row({ space: 10 }) { Search({ placeholder: '名称、位置、标签或到期日期', value: this.search }).onChange((v: string) => { this.search = v; }).layoutWeight(1); Button('＋').width(44).height(44).padding(0).fontSize(24).fontColor('#FFFFFF').accessibilityText('录入食材').backgroundColor('#285C54').onClick(() => this.startFood()) }
  Scroll() { Row({ space: 8 }) { ForEach(['全部'].concat(CATEGORIES), (c: string) => { Column() { FilterChip({ label: c, selected: this.filter === c }) }.onClick(() => { this.filter = c; }) }) } }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).margin({ top: 16, bottom: 15 })
  Row() { Text(`${this.visibleFoods().length} 份食材`).fontSize(12).fontColor('#7C8A74').layoutWeight(1); Column(){this.optionControl('食材排序',this.sortBy,['到期时间','新增时间','名称','数量'],(_index:number,value:string)=>{this.sortBy=value;})}.width(140) }.margin({ bottom: 14 })
  Row() { Text(this.batchMode ? `已选 ${this.selectedFoods.length} 项` : '按位置筛选').fontSize(12).fontColor('#8A99A1').layoutWeight(1); Text(this.batchMode ? '完成选择' : '批量整理').fontSize(14).fontColor('#786184').constraintSize({minHeight:44}).padding({left:10,right:4}).onClick(() => { this.batchMode = !this.batchMode; this.selectedFoods = []; }) }.margin({ bottom: 10 })
  Scroll() { Row({ space: 8 }) { ForEach(this.locations, (loc: string) => { Column() { ChoiceChip({ label: loc, selected: this.filter === loc, tint: '#E0EDF7', ink: '#6B90A8' }) }.onClick(() => { this.filter = this.filter === loc ? '全部' : loc; }) }) } }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).margin({ bottom: 12 })
  if (this.batchMode && this.selectedFoods.length > 0) {
   Row({ space: 7 }) { Text(this.batchExpiry + ' ▦').fontSize(13).fontColor('#B18D7B').layoutWeight(1).onClick(() => { this.dateDialog({ selected: new Date(this.batchExpiry), onAccept: (v: DatePickerResult) => { this.batchExpiry = dateString(new Date(v.year || 2026,v.month || 0,v.day || 1)); } }); }); Button('改到期日').fontSize(12).backgroundColor('#F8E6DC').fontColor('#B68E78').onClick(() => this.confirm('批量修改到期日', `${this.selectedFoods.length}份食材改为 ${this.batchExpiry}？`, async () => { await this.store.batchFood(this.selectedFoods, 'expiry', this.batchExpiry); this.selectedFoods = []; })) }.padding(12).backgroundColor('#FFF7F0').borderRadius(14).margin({ bottom: 10 })
   Row({ space: 7 }) { Column(){this.optionControl('存放位置',this.batchLocation||'选择位置',this.locations,(_index:number,value:string)=>{this.batchLocation=value;})}.layoutWeight(1); Button('迁移').backgroundColor('#DCEAF6').fontColor('#638CA9').onClick(() => this.confirm('批量迁移', `将选中 ${this.selectedFoods.length} 项迁移至 ${this.batchLocation}？`, async () => { await this.store.batchFood(this.selectedFoods, 'location', this.batchLocation); this.selectedFoods = []; })); Button('删除').backgroundColor('#F9E3DD').fontColor('#B88373').onClick(() => this.confirm('批量删除', `删除选中 ${this.selectedFoods.length} 项？`, async () => { await this.store.batchFood(this.selectedFoods, 'delete', ''); this.selectedFoods = []; })) }.margin({ bottom: 12 })
  }
  if (this.visibleFoods().length === 0) { this.empty('没有符合条件的食材','');Button('清除筛选').height(44).onClick(()=>{this.filter='全部';this.search='';}) }
  ForEach(this.visibleFoods(), (f: Food) => { this.foodRow(f) }, (f: Food) => f.id)
  }
 }
 @Builder shoppingPage() {
  Row(){Button(this.supermarket?'退出超市模式':'超市模式').height(48).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{this.supermarket=!this.supermarket;});Button('撤销最近操作').height(48).fontColor('#87694B').backgroundColor('#EEE2CA').onClick(()=>this.run(async()=>{await this.openFlow('撤销');}))}.margin({bottom:12})
  if(this.claimsError){Text(this.claimsError).fontSize(15).fontColor('#98674D').padding(12).onClick(()=>this.run(async()=>{await this.reloadClaims();}))}
  Row({space:8}){Image($r('app.media.utility_shopping')).width(47).height(47).objectFit(ImageFit.Contain);Text('采购清单').fontFamily('ShikuHand').fontSize(31).fontColor('#304F52')}.margin({bottom:18})
  Scroll() { Row({ space: 8 }) { ForEach(TEMPLATES, (t: Template) => { Row({ space: 5 }) { Image(this.foodImage(t.name, t.category)).width(27).height(27).objectFit(ImageFit.Contain).borderRadius(7); Text(t.name).fontSize(12).fontColor('#8E7962') }.padding(8).backgroundColor(this.categoryTint(t.category)).borderRadius(12).onClick(() => { this.purchaseName = t.name; this.purchaseUnit = t.unit; this.purchaseCategory = t.category; }) }) } }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).margin({ bottom: 15 })
  Row({ space: 10 }) { TextInput({ placeholder: '想买点什么？', text: this.purchaseName }).layoutWeight(1).onChange((v: string) => { this.purchaseName = v; }); TextInput({ text: this.purchaseQuantity }).width(60).type(InputType.Number).onChange((v: string) => { this.purchaseQuantity = v; }); Button('添加').backgroundColor('#285C54').onClick(() => this.run(async () => { const s: Shopping = new Shopping(); s.name = this.purchaseName; s.quantity = Number(this.purchaseQuantity); s.unit = this.purchaseUnit; s.category = this.purchaseCategory; s.familyId = this.purchaseFamily; if (s.familyId && !await this.ask('加入家庭采购？', '家庭成员可以查看和修改。')) { return; } await this.store.saveShopping(s); this.purchaseName = ''; })) }.margin({ bottom: 18 })
  Row({ space: 8 }) { Column(){this.optionControl('计量单位',this.purchaseUnit,UNITS,(_index:number,value:string)=>{this.purchaseUnit=value;})}.layoutWeight(1); Column(){this.optionControl('食材分类',this.purchaseCategory,CATEGORIES,(_index:number,value:string)=>{this.purchaseCategory=value;})}.layoutWeight(1) }.margin({ bottom: 15 })
  if (this.families.length > 0) { Row({ space: 7 }) { Column() { ChoiceChip({ label: '示例主体清单', selected: !this.purchaseFamily, tint: '#F1E7F6', ink: '#9B85AD' }) }.onClick(() => { this.purchaseFamily = ''; }); ForEach(this.families, (f: Family) => { Column() { ChoiceChip({ label: f.name, selected: this.purchaseFamily === f.id, tint: '#E3EEF7', ink: '#7495AD' }) }.onClick(() => { this.purchaseFamily = f.id; }) }, (f: Family) => f.id) }.margin({ bottom: 15 }) }
  Row({ space: 10 }) { Button('补货建议').fontSize(12).backgroundColor('#F9ECD8').fontColor('#AC8B58').onClick(() => { this.page = 'replenishment'; }); Button('清空已购买').fontSize(12).backgroundColor('#E8E2F2').fontColor('#9682AC').onClick(() => this.confirm('清理已购买', '仅移除已勾选项，待采购项会保留。', async () => { await this.store.clearPurchased(); })); Button('导出').fontSize(12).backgroundColor('#E1EDF5').fontColor('#7396AB').onClick(() => this.run(async () => { await this.exportText('开饭小怪采购.txt', this.shopping.filter((item: Shopping) => !item.purchased).map((item: Shopping) => `${item.name} ${item.quantity}${item.unit}`).join('\n')); })) }.margin({ bottom: 16 })
  if(this.supermarket){Button(this.shoppingBoughtOpen?'折叠已买':'查看已买').height(48).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{this.shoppingBoughtOpen=!this.shoppingBoughtOpen;})}
  if (this.shopping.length === 0) { this.empty('清单空空，心里有数', '记下下次要买的食材\n买完后可选择录入库存。') }
  ForEach(CATEGORIES, (category: string) => {
   if (this.shopping.some((s: Shopping) => s.category === category)) {
    Text(category).fontSize(12).fontColor('#8C977F').margin({ top: 10, bottom: 8 })
    ForEach(this.shopping.filter((s: Shopping) => s.category === category&&(!this.supermarket||this.shoppingBoughtOpen||!s.purchased)), (s: Shopping) => {
     Column({space:4}){Row({ space: 10 }) {
      Text(s.purchased ? '✓' : '○').accessibilityText((s.purchased?'取消购买 ':'标记购买 ')+s.name).width(44).constraintSize({minHeight:44}).textAlign(TextAlign.Center).flexShrink(0).fontSize(this.supermarket?32:23).fontColor('#517D50').onClick(() => this.confirm(s.purchased ? '取消已购买' : '标记已购买', s.name, async () => { if(!s.purchased&&duplicatePurchase(s,this.shopping)&&!await this.ask('今天已经买过同名食材','仍要标记这项已购买吗？')){return;}await this.store.purchaseStatus(s);this.refresh();const item:Shopping=this.shopping.find((v:Shopping)=>v.id===s.id)!;if (item.purchased) { const answer: boolean = await this.ask('带回家，也记入库存？', '先检查数量、存放位置和到期时间，确认后才保存。', '去录入', '稍后'); if (answer) { this.startFood(); this.purchaseRecordId=s.id;this.formFamily=s.familyId;this.formName = s.name; this.formQuantity = String(s.quantity); this.formUnit = s.unit; const template: Template | undefined = TEMPLATES.find((t: Template) => t.name === s.name); if (template) { this.formCategory = template.category; this.formLocation = template.location; this.formExpiry = dateString(new Date(Date.now() + template.days * 86400000)); } } } }))
      Column({ space: 5 }) { Text(s.name).fontSize(16).fontColor(s.purchased ? '#9AAB94' : '#354D37'); Text(`${s.quantity}${s.unit}`).fontSize(14).fontColor('#68776E');Text(this.purchaseInfo(s)).fontSize(14).fontColor('#85684E') }.alignItems(HorizontalAlign.Start).layoutWeight(1)
     }.width('100%');Flex({wrap:FlexWrap.Wrap,justifyContent:FlexAlign.End,space:{main:LengthMetrics.vp(4),cross:LengthMetrics.vp(4)}}){if(!s.purchased){Text('部分买到').fontSize(15).padding(10).fontColor('#426B5B').onClick(()=>this.startPartial(s));}
      if(s.familyId&&!s.purchased){Text(this.claimLabel(s)).fontSize(15).fontColor('#657C8E').padding(10).onClick(()=>this.run(async()=>{await this.claimShopping(s);}));}Text('移除').fontSize(15).fontColor('#806D56').padding(10).onClick(() => this.confirm('移除采购项', s.name, async () => { await this.store.deleteShopping(s); }))
     }.width('100%')}.width('100%').padding({left:12,right:12,top:10,bottom:8}).backgroundColor(this.surface()).borderRadius(16).margin({ bottom: 9 })
    }, (s: Shopping) => s.id)
   }
  })
 }
 @Builder tastePreferences() {
  this.title('YOUR TASTE ATLAS','把口味，慢慢记住','按你的选择与用餐记录，在本机调整推荐')
  Row({ space: 8 }) { ForEach(['做饭','外食 / 外卖'],(scene: string) => { Column() { ChoiceChip({ label: scene, selected: this.preferenceScene === scene, tint: '#DDE8DF' }) }.onClick(() => { this.preferenceScene = scene; }) }) }.margin({ bottom: 16 })
  Text(this.preferenceScene === '做饭' ? '做饭：参考库存、临期、做菜时间与在家用餐反馈' : '外食：参考地区风味、饮食目标与外食评分，不看库存').fontSize(13).lineHeight(23).fontColor('#68766C').margin({ bottom: 16 })
  Text('当前：' + (this.preferenceRegion() || '不限地区') + ' · ' + this.preferenceGoal() + ' · 学习' + (this.preferenceLearning() ? '开启' : '关闭')).id('preference-summary').fontSize(13).fontColor('#426B5B').margin({ bottom: 18 })
  Text('偏好的地区风味').fontFamily('HarmonyOS Sans SC').fontSize(22).fontColor('#263E46').margin({ bottom: 14 })
  Flex({ wrap: FlexWrap.Wrap, space: { main: LengthMetrics.vp(8), cross: LengthMetrics.vp(10) } }) {
   Column() { ChoiceChip({ label: '不限地区', selected: !this.preferenceRegion() }) }.onClick(() => this.run(async () => { await this.saveRegion(''); }))
   ForEach(this.regions,(region: string) => { Column() { ChoiceChip({ label: region, selected: this.preferenceRegion() === region }) }.onClick(() => this.run(async () => { await this.saveRegion(region); })) })
  }.margin({ bottom: 22 })
  Flex({ wrap: FlexWrap.Wrap, space: { main: LengthMetrics.vp(8), cross: LengthMetrics.vp(8) } }) { ForEach(['均衡饮食','控制热量','高蛋白','清淡少油'],(value: string) => { Button(value).fontSize(13).backgroundColor(this.preferenceGoal() === value ? '#E8C993' : '#FFF3CD').fontColor('#263E46').onClick(() => this.run(async () => { await this.saveGoal(value); })) }) }.margin({ bottom: 20 })
  Row() { Column({ space: 7 }) { Text('根据饮食记录学习').fontFamily('HarmonyOS Sans SC').fontSize(20).fontColor('#263E46'); Text('参考菜名、味道评分、地区与喜欢/少推荐反馈').fontSize(12).fontColor('#686258') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Toggle({ type: ToggleType.Switch, isOn: this.preferenceLearning() }).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((value: boolean) => this.run(async () => { await this.saveLearning(value); })) }.constraintSize({minHeight:44}).padding(17).backgroundColor('#D7E1CB').borderRadius(12)
  Text('已识别 ' + trainTasteModel(this.recipes,this.meals,this.store.feedback,Date.now(),this.preferenceIntent()).samples + ' 份用餐样本 · ' + this.store.feedback.filter((event: PreferenceEvent) => (event.intent || 'cook') === this.preferenceIntent()).length + ' 条行为反馈').fontSize(13).fontColor('#57534D').margin({ top: 18, bottom: 12 })
  Text('忌口始终优先，做饭与外食分别记住你的偏好。').fontSize(13).lineHeight(23).fontColor('#686258')
  Button('清除本场景反馈').backgroundColor('#D9B0A3').fontColor('#263E46').margin({ top: 18 }).onClick(() => this.confirm('清除反馈','仅清除当前场景的喜欢、少推荐和浏览反馈；另一场景与用餐日记保留。',async () => { await this.store.clearLearning(this.preferenceIntent()); }))
 }
 private communityFavoriteCount(id:string):number{const row:FavoriteCount|undefined=this.discovery.favorites.find((v:FavoriteCount)=>v.recipeId===id);return row?(row.realCount===undefined?row.count:row.realCount):0;}
 private favoriteCountLabel(id:string):string{const row:FavoriteCount|undefined=this.discovery.favorites.find((v:FavoriteCount)=>v.recipeId===id);return this.discoveryLoaded?'收藏 '+this.communityFavoriteCount(id)+(row&&row.demoCount?' · 演示 '+row.demoCount:''):'收藏 —';}
 private async refreshDiscovery():Promise<void>{
  if(!COMMUNITY_ENABLED){return;}
  if(!this.loggedIn){this.discovery=new DiscoverySummary();this.discoveryLoaded=false;this.discoveryError='登录后查看社区热搜与收藏榜';return;}
  if(this.discoveryLoading){return;}const owner:string=this.cloud.session.userId;this.discoveryLoading=true;this.discoveryError='';
  try{const summary:DiscoverySummary=JSON.parse(await this.cloud.request('/discovery/summary',http.RequestMethod.GET)) as DiscoverySummary;if(this.loggedIn&&this.cloud.session.userId===owner){this.discovery=summary;this.discoveryOwner=owner;this.discoveryLoaded=true;this.recommendationCacheKey='';}}
  catch(_){this.discoveryError='社区数据暂不可用，搜索和本机收藏仍可使用';}
  finally{this.discoveryLoading=false;}
 }
 private async publishFavoriteSnapshot():Promise<void>{if(!this.loggedIn){this.toast('登录后可更新社区收藏统计');return;}await this.refreshDiscovery();if(!this.discoveryLoaded||this.discoveryError){this.toast('请先连接社区再试');return;}const ids:string[]=this.favorites.map((f:Favorite)=>f.recipeId);const revision:number=this.discovery.favoriteRevision;if(!await this.ask('更新收藏榜贡献？','将当前本机收藏中的公开菜谱计入人数统计，其他设备之前的贡献以本机列表为准。私房菜及搜索历史不公开。','确认更新','取消')){return;}try{await this.cloud.request('/discovery/favorites/snapshot',http.RequestMethod.POST,new FavoriteSnapshot(ids,revision));await this.refreshDiscovery();const now:string[]=this.favorites.map((f:Favorite)=>f.recipeId);this.toast(JSON.stringify(ids)===JSON.stringify(now)?'收藏统计已更新':'本机收藏有新变化，可再次更新');}catch(_){await this.refreshDiscovery();this.toast('未更新，数据可能已变化；请检查后重新确认');}}
 private openRecipeSearch():void{this.searchReturn=this.page;this.searchReturnTab=this.tab;this.searchDraft=this.recipeSearch;this.page='recipe-search';this.refreshDiscovery();}
 private useSearchTerm(term:string):void{this.searchDraft=term;this.submitRecipeSearch();}
 private removeSearch(term:string):void{this.utility.searches=this.utility.searches.filter((value:string)=>value!==term);this.saveUtility();}
 private allIngredientNames():string[]{const values:string[]=[];this.recipes.forEach((recipe:Recipe)=>recipe.ingredients.forEach((i:Ingredient)=>{i.name.split(/[、,，/]|\s+or\s+|或者|或/).forEach((part:string)=>{const name:string=part.trim();if(name&&name.length<=12&&!values.includes(name)){values.push(name);}});}));return values.filter((name:string)=>!this.ingredientSearch.trim()||name.includes(this.ingredientSearch.trim())).sort((a:string,b:string)=>a.localeCompare(b)).slice(0,36);}
 private difficultyValues():string[]{return Array.from(new Set<string>(this.recipes.map((r:Recipe)=>r.difficulty).filter((value:string)=>!!value)));}
 private openIngredient(name:string):void{this.ingredientReturn=this.page;this.selectedIngredient=name;this.page='ingredient-recipes';}
 private ingredientRecipes():Recipe[]{const group:string=ingredientGroupFor(this.selectedIngredient);const options:RankingOptions=new RankingOptions();options.excluded=this.excluded.split(/[,，、]/).concat(householdExclusions(this.household)).map((value:string)=>value.trim()).filter((value:string)=>!!value);return this.recipes.filter((recipe:Recipe)=>recipeHasIngredient(recipe,this.selectedIngredient)&&matchesRankingConstraints(recipe,options)).sort((a:Recipe,b:Recipe)=>recipeMinutes(a)-recipeMinutes(b)).slice(0,12);}
 private browseIngredient(value:string):void{this.recipeFilter=new RecipeFilterOptions();this.recipeFilter.ingredients=[value];this.recipeSearch='';this.favoritesOnly=false;this.libraryMode=true;this.recipeLimit=24;this.recipeResumeRows=[];this.page='';this.tab=3;}
 @Builder recipeSearchEntry(){
  Button({type:ButtonType.Normal}){Row({space:5}){Image($r('app.media.utility_search')).width(22).height(22).objectFit(ImageFit.Contain);Text('搜索').fontSize(15).fontColor('#516E65')}}.id('recipe-search').constraintSize({minWidth:76,minHeight:44}).padding({left:8,right:8}).backgroundColor(Color.Transparent).borderRadius(14).accessibilityText('搜索菜谱').onClick(()=>this.openRecipeSearch())
 }
 @Builder searchInputBar(){
  Column(){Row({space:8}){TextInput({text:this.searchDraft,placeholder:'菜名、食材、地区、30分钟内…'}).id('discovery-search-input').cancelButton({style:CancelButtonStyle.INPUT}).maxLength(80).enterKeyType(EnterKeyType.Search).height(46).layoutWeight(1).onChange((value:string)=>{this.searchDraft=value;}).onSubmit(()=>this.submitRecipeSearch());Button('搜索',{type:ButtonType.Normal}).height(46).fontColor('#FFFFFF').backgroundColor('#527A68').borderRadius(15).onClick(()=>this.submitRecipeSearch())}.width(this.searchFieldWidth()).alignSelf(ItemAlign.Center).constraintSize({maxWidth:480}).padding({bottom:10})}.width('100%').alignItems(HorizontalAlign.Center)
 }
 @Builder recipeSearchPage(){
  Text('搜索菜谱').fontFamily('ShikuHand').fontSize(26).fontColor('#38584D').margin({bottom:16})
  if(this.utility.searches.length){
  Row(){Text('搜索历史').fontFamily('ShikuHand').fontSize(24).fontColor('#38584D').layoutWeight(1);Text('清空').id('clear-search-history').fontSize(15).fontColor('#A06E52').padding(12).enabled(this.utility.searches.length>0).onClick(()=>this.confirm('清空搜索历史？','仅清除本机历史，不影响收藏和记餐。',async()=>{this.utility.searches=[];this.saveUtility();}))}.width('100%')
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(8)}}){ForEach(this.utility.searches,(term:string)=>{Row({space:7}){Text(term).fontSize(15).lineHeight(22).maxLines(2).fontColor('#496C5A').padding({left:12,top:11,bottom:11}).constraintSize({maxWidth:220}).onClick(()=>this.useSearchTerm(term));Text('×').fontSize(20).fontColor('#927960').width(44).constraintSize({minHeight:44}).textAlign(TextAlign.Center).flexShrink(0).accessibilityText('删除搜索词'+term).onClick(()=>this.removeSearch(term))}.backgroundColor('#A8E2EADA').borderRadius({topLeft:11,topRight:18,bottomLeft:16,bottomRight:9})},(term:string)=>term)}.width('100%').margin({bottom:24})
  }
  Text('按食材找菜').fontFamily('ShikuHand').fontSize(24).fontColor('#38584D').width('100%').margin({bottom:12})
  ForEach(['肉禽','水产','蔬菜与菌菇','蛋豆与主食'], (label:string, index:number)=>{
   Column({space:6}){
    Row({space:10}){
     Image(index===0?$r('app.media.food_pork'):index===1?$r('app.media.ui_recipes'):index===2?$r('app.media.ui_pantry'):$r('app.media.ui_breakfast')).width(34).height(34).objectFit(ImageFit.Contain)
     Text(label).fontSize(17).fontColor('#38584D').layoutWeight(1)
     Text(this.ingredientShelf===label?'收起':'展开').fontSize(13).fontColor('#65796B')
    }.width('100%').constraintSize({minHeight:46}).onClick(()=>{this.ingredientShelf=this.ingredientShelf===label?'':label;})
    if(this.ingredientShelf===label){
     Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){
      ForEach(this.shelfGroups(index),(g:IngredientGroup)=>{Button(g.label).constraintSize({minHeight:44}).fontColor('#38584D').backgroundColor('#E8EDDF').onClick(()=>this.openIngredient(g.label))},(g:IngredientGroup)=>g.id)
     }
    }
   }.width('100%').padding({left:14,right:14,top:5,bottom:5}).backgroundColor('#FFF9ED').border({width:1,color:'#DFD4BC'}).borderRadius(12).margin({bottom:8})
  },(label:string)=>label)
 }
 @Builder ingredientRecipesPage(){
  Button('用这份食材设计新菜',{type:ButtonType.Normal}).height(46).width('100%').fontColor('#527764').backgroundColor('#E9EBDD').onClick(()=>{this.openIntelligence('inventory');this.assistantPrompt='优先用'+this.selectedIngredient+'设计一道家常菜；缺少的食材说明。';})
  Text(this.selectedIngredient+'，可以这样吃').fontFamily('ShikuHand').fontSize(29).fontColor('#38584D').width('100%').margin({bottom:15})
  Row({space:8}){Button('全部相关菜谱',{type:ButtonType.Normal}).layoutWeight(1).height(46).backgroundColor('#DAE6D0').fontColor('#4C7056').onClick(()=>this.browseIngredient(this.selectedIngredient));if(ingredientGroupFor(this.selectedIngredient)){Button(ingredientLabel(ingredientGroupFor(this.selectedIngredient)),{type:ButtonType.Normal}).height(46).backgroundColor('#EEDDC8').fontColor('#946C48').onClick(()=>this.browseIngredient(ingredientGroupFor(this.selectedIngredient)))}}.width('100%').margin({bottom:16})
  if(this.ingredientRecipes().length===0){this.empty('暂时没有匹配的菜谱','可以看看同类食材，忌口依然保留。')}
  ForEach(this.ingredientRecipes(),(recipe:Recipe)=>{Row({space:13}){Image(recipeCover(recipe)).width(90).height(90).objectFit(ImageFit.Contain);Column({space:7}){Text(recipe.name).fontFamily('ShikuHand').fontSize(24).fontColor('#355D50');Text(this.timeText(recipe)+' · 约¥'+displayCost(recipe,2).total+'/2人份').fontSize(14).fontColor('#8A785E');Text(recipe.ingredients.filter((i:Ingredient)=>!i.optional).slice(0,4).map((i:Ingredient)=>i.name).join(' · ')).fontSize(14).fontColor('#718370')}.layoutWeight(1).alignItems(HorizontalAlign.Start)}.width('100%').padding(12).backgroundColor('#85FFFFFF').borderRadius({topLeft:9,topRight:25,bottomLeft:20,bottomRight:12}).margin({bottom:12}).onClick(()=>this.openRecipe(recipe))},(recipe:Recipe)=>recipe.id)
  if(this.foods.some((food:Food)=>food.name===this.selectedIngredient&&!food.archived)){Button('编辑这份食材',{type:ButtonType.Normal}).width('100%').height(46).fontColor('#806A55').backgroundColor('#E7DFCD').onClick(()=>{const food:Food|undefined=this.foods.find((row:Food)=>row.name===this.selectedIngredient&&!row.archived);if(food){this.startFood(food);}})}
 }

 @Builder activeFilterTokens(draft:boolean=false){
  Scroll(){Row({space:6}){ForEach(filterTokens(draft?this.recipeFilterDraft:this.recipeFilter),(token:FilterToken)=>{
   Button(token.label+' ×',{type:ButtonType.Normal}).constraintSize({minHeight:44,maxWidth:240}).fontSize(14).fontColor('#426455').backgroundColor('#DAE6D5').borderRadius({topLeft:9,topRight:17,bottomLeft:15,bottomRight:10}).accessibilityText('取消条件：'+token.label).onClick(()=>{if(draft){this.recipeFilterDraft=removeFilterToken(this.recipeFilterDraft,token);}else{this.recipeFilter=removeFilterToken(this.recipeFilter,token);this.recipeCategory=this.recipeFilter.categories[0]||'';this.recipeLimit=24;this.recipeResumeRows=[];}})
  },(token:FilterToken)=>token.field+':'+token.value)}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).width('100%')
 }
 private filterIssues():string[]{return filterConflicts(this.recipeFilterDraft,this.excluded.split(/[,，、]/).concat(householdExclusions(this.household)));}
 @Builder filterTabs(){
  Scroll(){Row({space:5}){ForEach(['食材','类别','餐次','菜系','地区','口味','目标','时间','预算','难度','排序'].filter((section:string)=>this.filterReturn!=='draw'||section!=='排序'),(section:string)=>{Column(){ChoiceChip({label:section,selected:this.recipeFilterSection===section})}.id('filter-section-'+section).onClick(()=>{this.recipeFilterSection=section;this.pageScroller.scrollTo({xOffset:0,yOffset:0});})})}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).width('100%').height(58).padding({left:15,right:15})
 }
 @Builder filterActionBar(){
  Row({space:10}){Button('重置',{type:ButtonType.Normal}).height(48).borderRadius({topLeft:12,topRight:19,bottomLeft:16,bottomRight:9}).fontColor('#88634E').backgroundColor('#EADFCC').onClick(()=>{this.recipeFilterDraft=new RecipeFilterOptions();this.draftFavorites=false;this.draftOrder='综合排序';});Button('查看 '+this.draftFilterCount()+' 份做法',{type:ButtonType.Normal}).id('recipe-filter-apply').height(48).borderRadius({topLeft:19,topRight:11,bottomLeft:13,bottomRight:23}).layoutWeight(1).fontColor('#FFFFFF').backgroundColor('#527A68').enabled(this.filterIssues().length===0).onClick(()=>this.applyRecipeFilters())}.width('100%').padding({left:20,right:20,top:12,bottom:12}).backgroundColor('#FFF9ED')
 }
 @Builder recipeFilterPanel() {
  Column({space:14}){
   this.activeFilterTokens(true)
   ForEach(this.filterIssues(),(issue:string)=>{Text(issue).fontSize(15).lineHeight(23).fontColor('#A14E38').width('100%')})
   if(this.recipeFilterSection==='餐次'){
   Text('哪一餐吃 · 可多选').fontFamily('ShikuHand').fontSize(22).fontColor('#38584D').width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(MEAL_OCCASIONS,(meal:MealOccasion)=>{Column({space:4}){Image(occasionImage(meal.id)).width(42).height(42).objectFit(ImageFit.Contain);ChoiceChip({label:meal.label,selected:this.recipeFilterDraft.occasions.includes(meal.id)})}.width(this.contentWidth()<340?'46%':'22%').onClick(()=>this.draftFilterChoice('occasions',meal.id))})}
   }
   if(this.recipeFilterSection==='类别'){
   Text('菜品分类 · 可多选').fontFamily('ShikuHand').fontSize(20).fontColor('#38584D').width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(this.recipeCategories,(value:string)=>{Column(){ChoiceChip({label:value,selected:this.recipeFilterDraft.categories.includes(value)})}.onClick(()=>this.draftFilterChoice('categories',value))})}
   }
   if(this.recipeFilterSection==='时间'){
   Text('想做多久').fontFamily('ShikuHand').fontSize(20).fontColor('#38584D').width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([0,15,30,45,60],(minutes:number)=>{Column(){ChoiceChip({label:minutes?minutes+'分钟内':'不限',selected:this.recipeFilterDraft.maxMinutes===minutes})}.onClick(()=>this.draftFilterChoice('time',String(minutes)))})}
   if(this.recommendScene!=='做饭'){Text('这里筛选菜谱制作时间，不是送达或到店时间。').fontSize(12).fontColor('#817B6C')}
   }
   if(this.recipeFilterSection==='菜系'){
   Text('九类菜系导航').fontFamily('ShikuHand').fontSize(22).fontColor('#38584D').width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(7),cross:LengthMetrics.vp(7)}}){ForEach(CUISINE_GROUPS,(group:CuisineGroup)=>{Column(){ChoiceChip({label:group.label,selected:this.recipeFilterDraft.cuisines.includes(group.id)})}.onClick(()=>this.draftFilterChoice('cuisines',group.id))})}
   Text('八大菜系＋其他地方菜；家常与异国料理可在不限时浏览。').fontSize(13).lineHeight(22).fontColor('#7C796C')
   }
   if(this.recipeFilterSection==='地区'){
   Text('地区风味 · 可多选').fontFamily('ShikuHand').fontSize(20).fontColor('#38584D').width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(this.filterValues('region'),(value:string)=>{Column(){ChoiceChip({label:value,selected:this.recipeFilterDraft.regions.includes(value)})}.onClick(()=>this.draftFilterChoice('regions',value))})}
   }
   if(this.recipeFilterSection==='口味'){
   Text('口味 · 可多选').fontFamily('ShikuHand').fontSize(20).fontColor('#38584D').width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(this.filterValues('taste'),(value:string)=>{Column(){ChoiceChip({label:value,selected:this.recipeFilterDraft.tastes.includes(value)})}.onClick(()=>this.draftFilterChoice('tastes',value))})}
   }
   if(this.recipeFilterSection==='目标'){
   Text('饮食目标 · 仅看已标注菜谱').fontFamily('ShikuHand').fontSize(20).fontColor('#38584D').width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['减脂餐','高蛋白','清淡少油','素食'],(value:string)=>{Column(){ChoiceChip({label:value,selected:this.recipeFilterDraft.goals.includes(value)})}.onClick(()=>this.draftFilterChoice('goals',value))})}
   }
   if(this.recipeFilterSection==='食材'){
   Text('现有食材').fontFamily('ShikuHand').fontSize(20).fontColor('#38584D').width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['any','partial','ready'],(value:string)=>{Column(){ChoiceChip({label:value==='any'?'不限':value==='partial'?'用上现有食材':'主料够用',selected:this.recipeFilterDraft.availability===value})}.onClick(()=>this.draftFilterChoice('availability',value))})}
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['all','any'],(mode:string)=>{Column(){ChoiceChip({label:mode==='all'?'全部包含':'包含任一种',selected:this.recipeFilterDraft.ingredientMode===mode})}.onClick(()=>this.draftFilterChoice('ingredientMode',mode))})}.width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(INGREDIENT_GROUPS,(group:IngredientGroup)=>{Column(){ChoiceChip({label:group.label,selected:this.recipeFilterDraft.ingredients.includes(group.id)})}.onClick(()=>this.draftFilterChoice('ingredients',group.id))})}
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['ingredients','excludedIngredients'],(field:string)=>{Column(){ChoiceChip({label:field==='ingredients'?'想用的食材':'不想用的食材',selected:this.filterIngredientTarget===field})}.onClick(()=>{this.filterIngredientTarget=field;})})}.width('100%')
   TextInput({text:this.ingredientSearch,placeholder:'找具体食材，如嫩豆腐、五花肉'}).height(46).onChange((value:string)=>{this.ingredientSearch=value;})
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(this.allIngredientNames(),(name:string)=>{Column(){ChoiceChip({label:name,selected:(this.filterIngredientTarget==='ingredients'?this.recipeFilterDraft.ingredients:this.recipeFilterDraft.excludedIngredients).includes(name)})}.onClick(()=>this.draftFilterChoice(this.filterIngredientTarget,name))})}
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(this.recipeFilterDraft.ingredients,(name:string)=>{Text('想用 '+ingredientLabel(name)+' ×').fontSize(14).fontColor('#557B62').padding(10).onClick(()=>this.draftFilterChoice('ingredients',name))});ForEach(this.recipeFilterDraft.excludedIngredients,(name:string)=>{Text('避开 '+ingredientLabel(name)+' ×').fontSize(14).fontColor('#A16F55').padding(10).onClick(()=>this.draftFilterChoice('excludedIngredients',name))})}.width('100%')
   Text('排除食材').fontSize(17).fontColor('#91624F').width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(INGREDIENT_GROUPS,(group:IngredientGroup)=>{Column(){ChoiceChip({label:group.label,selected:this.recipeFilterDraft.excludedIngredients.includes(group.id),ink:'#A77155'})}.onClick(()=>this.draftFilterChoice('excludedIngredients',group.id))})}

   }
   if(this.recipeFilterSection==='预算'){
    Text('整道菜的预计花费').fontFamily('ShikuHand').fontSize(22).fontColor('#38584D')
    Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([1,2,3,4,6],(people:number)=>{Column(){ChoiceChip({label:people+'人',compact:true,selected:this.recipeFilterDraft.costPeople===people})}.onClick(()=>this.draftFilterChoice('costPeople',String(people)))})}
    Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([0,10,20,30,50,100],(budget:number)=>{Column(){ChoiceChip({label:budget?'约'+budget+'元内':'不限',selected:this.recipeFilterDraft.maxCost===budget})}.onClick(()=>this.draftFilterChoice('budget',String(budget)))})}
    Text('预算筛选仅纳入用量可核对的费用估算').fontSize(14).fontColor('#7A705E')
   }
   if(this.recipeFilterSection==='难度'){
    Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(this.difficultyValues(),(value:string)=>{Column(){ChoiceChip({label:value,selected:this.recipeFilterDraft.difficulties.includes(value)})}.onClick(()=>this.draftFilterChoice('difficulties',value))})}
   }
   if(this.recipeFilterSection==='排序'&&this.filterReturn!=='draw'){
    Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['综合排序','价格升序','价格降序','耗时升序','耗时降序'],(value:string)=>{Column(){ChoiceChip({label:value,selected:this.draftOrder===value})}.onClick(()=>{this.draftOrder=value;})})}
    Row(){Text('只看我的收藏').layoutWeight(1);Toggle({type:ToggleType.Switch,isOn:this.draftFavorites}).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((value:boolean)=>{this.draftFavorites=value;})}.constraintSize({minHeight:44}).width('100%')
   }
   Text(recipeFilterSummary(this.recipeFilterDraft)).fontSize(14).fontColor('#6D796C').width('100%')
   if(this.draftFilterCount()===0){Text('没有同时满足条件的做法，试试取消一项或重置。').fontSize(15).fontColor('#A06D4E').width('100%')}

  }.alignItems(HorizontalAlign.Start).padding({left:12,right:12,top:15,bottom:18}).width('100%').backgroundImage($r('app.media.crayon_paper_tile')).backgroundImageSize(ImageSize.Cover).borderRadius({topLeft:8,topRight:24,bottomLeft:19,bottomRight:10}).margin({bottom:10})
  this.savedFilterTools()
 }
 @Builder recipePage() {
  Row({space:8}){this.recipeSearchEntry();Text('菜谱').fontFamily('ShikuHand').fontSize(31).fontColor('#304F52').layoutWeight(1);Row({space:6}){Image(uiIcon('shuffle')).width(30).height(30).objectFit(ImageFit.Contain).flexShrink(0);Text('抽一餐').fontFamily('ShikuHand').fontSize(20).lineHeight(28).fontColor('#896340')}.id('menu-draw-entry').constraintSize({minHeight:48}).padding({left:16,right:18,top:8,bottom:8}).flexShrink(0).backgroundImage($r('app.media.crayon_ribbon_honey')).backgroundImageSize({width:'100%',height:'100%'}).backgroundImagePosition(Alignment.Center).onClick(()=>this.run(async()=>{await this.openDraw();}))}.width('100%').margin({bottom:7})
  Row({space:6}){Column(){ChoiceChip({label:'菜谱大全',selected:this.libraryMode})}.id('recipe-library-mode').onClick(()=>this.chooseRecipeMode(true));Column(){ChoiceChip({label:'为你推荐',selected:!this.libraryMode,ink:'#A77155'})}.id('recipe-recommend-mode').onClick(()=>this.chooseRecipeMode(false));Blank();Text(this.recipeMoreOpen?'收起 ↑':'更多 ↓').fontSize(15).fontColor('#8A725A').padding({left:8,right:3,top:12,bottom:12}).onClick(()=>{this.recipeMoreOpen=!this.recipeMoreOpen;})}.width('100%').margin({bottom:8})
  if(this.recipeMoreOpen){
   this.sceneChoices()
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(7)}}){ForEach(this.recipeCategories,(category:string)=>{Column({space:4}){Image(categoryImage(category)).width(32).height(32).objectFit(ImageFit.Contain);Text(category).fontFamily('ShikuHand').fontSize(16).fontColor('#304F52')}.width('22%').padding({top:3,bottom:5}).backgroundImage(this.recipeFilter.categories.includes(category)?$r('app.media.crayon_swatch_wheat'):'').backgroundImageSize(ImageSize.Contain).onClick(()=>{this.filterReturn='';this.draftFavorites=this.favoritesOnly;this.draftOrder=this.recipeOrder;this.recipeFilterDraft=normalizeRecipeFilter(this.recipeFilter);this.draftFilterChoice('categories',category);this.applyRecipeFilters();})})}.width('100%')
   this.recipeQuickTools()
   Row({space:8}){Text('写一道菜 ›').fontSize(15).padding(10).fontColor('#8B6B4D').onClick(()=>{this.recipeDraft=new Recipe();this.page='recipe-edit';});Text('偏好 ›').fontSize(15).padding(10).fontColor('#7F657F').onClick(()=>{this.preferenceScene=this.recommendScene;this.page='taste';})}.width('100%')
  }

  Row({space:4}){Row({space:5}){Image(uiIcon('taste')).width(24).height(24).objectFit(ImageFit.Contain);Text('筛选').fontSize(16).fontColor('#38584D')}.id('recipe-filter-entry').constraintSize({minHeight:44}).padding({left:4,right:10}).onClick(()=>this.beginRecipeFilters());Button('小怪').height(44).backgroundColor(Color.Transparent).fontColor('#536B60').onClick(()=>this.openCompanion());Blank();Text('收藏').id('recipe-collection-entry').fontSize(16).constraintSize({minHeight:44}).padding({left:14,right:10}).fontColor('#916653').onClick(()=>{this.collectionReturn='';this.page='collections';})}.width('100%')
  if(filterTokens(this.recipeFilter).length){this.activeFilterTokens()}
  if(this.recipeSearch.trim()||this.favoritesOnly||recipeFilterSummary(this.recipeFilter)!=='全部餐次 · 不限条件'){Row(){Text(this.recipeRows().length+'道菜').fontSize(14).fontColor('#718070').layoutWeight(1);Text('清空筛选').fontSize(14).fontColor('#A16E50').constraintSize({minHeight:44}).padding({left:10,right:6}).onClick(()=>this.resetRecipeFilters())}.width('100%')}
  if(this.recipeSearch.trim()){Text('菜谱结果 · '+this.recipeSearch).fontSize(20).fontColor('#38584D').margin({bottom:8})}
  if(this.recipeSearch.trim()){Text(this.recipeSearchStatus(this.recipeSearch)).id('recipe-search-message').fontSize(15).lineHeight(24).fontColor('#607C69').width('100%').padding({top:6,bottom:12})}
  if (this.recommendations().length === 0) {Image($r('app.media.recipe_no_results')).width('100%').height(130).objectFit(ImageFit.Contain); this.empty('暂时没有合适的菜','试试放宽一项条件');Button('放宽一个条件').height(46).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.relaxFilter()) }
  if(!this.recipeSearch.trim()&&!this.favoritesOnly&&recipeFilterSummary(this.recipeFilter)==='全部餐次 · 不限条件'){Text(this.recipeRows().length+'道菜').fontSize(14).fontColor('#526653')}
  ForEach(this.recipeRows().slice(this.libraryMode?Math.max(0,this.recipeLimit-24):0,this.libraryMode?this.recipeLimit:12),(r: Recommendation,index:number) => {
   Column({ space: 8 }) {
    Row({ space: 12 }) { Stack(){Image(index%3===0?$r('app.media.crayon_swatch_clay'):index%3===1?$r('app.media.crayon_swatch_sage'):$r('app.media.crayon_swatch_wheat')).width(this.recipeThumbSize()).height(this.recipeThumbSize()*0.85).objectFit(ImageFit.Contain).opacity(0.48).rotate({angle:index%2===0?-7:5});Image(recipeCover(r.recipe)).id('recipe-image-'+r.recipe.id).sourceSize({width:312,height:312}).width(this.recipeThumbSize()).height(this.recipeThumbSize()).objectFit(ImageFit.Contain).autoResize(true)}.width(this.recipeThumbSize()).height(this.recipeThumbSize()).flexShrink(0); Column({ space: 4 }) { Text(r.recipe.name).fontFamily('ShikuHand').fontSize(22).lineHeight(28).lineBreakStrategy(LineBreakStrategy.BALANCED).maxLines(3).textOverflow({overflow:TextOverflow.Ellipsis}).fontColor('#263E46'); Text((r.recipe.region || '通用家常') + ' · ' + (r.recipe.category || '家常菜')).fontSize(13).lineHeight(19).fontColor('#686258'); Text((this.recommendScene === '做饭' ? this.timeText(r.recipe) : '制作 ' + this.timeText(r.recipe)) + ' · ' + r.recipe.difficulty).fontSize(13).lineHeight(20).fontWeight(FontWeight.Medium).fontColor('#426B5B'); Text((this.recommendScene==='做饭'?'约 ¥':'家常约 ¥')+displayCost(r.recipe,this.recipeFilter.costPeople).total+' / '+this.recipeFilter.costPeople+'人份').fontSize(14).lineHeight(21).fontColor('#9A714C') }.alignItems(HorizontalAlign.Start).layoutWeight(1) }.onClick(() => { this.openRecipe(r.recipe); })

    if(this.recipeVariants(r.recipe).length>1){Text(this.recipeVariants(r.recipe).length+'种做法 ›').fontSize(16).fontColor('#8B6A8F').padding({top:6,bottom:6}).onClick(()=>this.openRecipe(r.recipe))}
    Row(){Button({type:ButtonType.Normal}){this.paperHeart(this.favorites.some((f:Favorite)=>f.recipeId===r.recipe.id),r.recipe.id)}.id('recipe-card-heart-'+r.recipe.id).width(44).height(44).padding(0).backgroundColor(Color.Transparent).clip(false).flexShrink(0).accessibilityText(this.favorites.some((f:Favorite)=>f.recipeId===r.recipe.id)?'取消收藏'+r.recipe.name:'收藏'+r.recipe.name).enabled(!this.busy).onClick(()=>this.toggleRecipeFavorite(r.recipe.id));Text('看做法 →').fontSize(15).lineHeight(22).fontColor('#304F52').constraintSize({minHeight:44}).layoutWeight(1).onClick(()=>this.openRecipe(r.recipe));Text(this.utility.compare.includes(r.recipe.id)?'✓ 已对比':'＋ 对比').fontSize(15).fontColor('#5A748C').constraintSize({minHeight:44}).padding({left:8,right:2}).flexShrink(0).onClick(()=>this.toggleCompare(r.recipe.id))}.width('100%')
    if(!this.libraryMode&&r.reasons.length){Text(r.reasons.slice(0,2).join(' · ')).fontSize(15).lineHeight(24).fontColor('#68776E')}
    if(!this.libraryMode){Row(){Text('喜欢 ♡').fontSize(14).padding(10).fontColor('#8A526A').onClick(()=>{this.logRecommendation(r.recipe.id,'like');this.toast('已记住你的口味');});Blank();Text('少推荐').fontSize(15).padding(12).fontColor('#736E5D').onClick(()=>{this.feedbackRecipeId=this.feedbackRecipeId===r.recipe.id?'':r.recipe.id;})}.width('100%');if(this.feedbackRecipeId===r.recipe.id){Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['最近吃过','太麻烦','不合口味'],(reason:string)=>{Button(reason).height(44).fontSize(15).fontColor('#6C6D56').backgroundColor('#E7E3D3').onClick(()=>{this.logRecommendation(r.recipe.id,feedbackAction(reason));this.feedbackRecipeId='';this.batch++;this.toast('已调整推荐');})})}}}

   }.id('recipe-card-'+r.recipe.id).transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({y:12})).animation({duration:this.reducedMotion?0:220})).padding({left:10,right:12,top:12,bottom:9}).width('100%').backgroundColor(index%3===0?'#CFFFFBF3':index%3===1?'#BFF1F4ED':'#BFF3EDF5').border({width:{bottom:1},color:'#E0D8C8'}).borderRadius({topLeft:4,topRight:index%2===0?21:7,bottomLeft:8,bottomRight:4}).margin({ bottom: 10 })
  },(r: Recommendation) => r.recipe.id)
  if(this.libraryMode&&this.recipeRows().length>24){Row({space:8}){Text(this.recipeRows().length+'道菜').fontSize(13).fontColor('#718070').layoutWeight(1);if(this.recipeLimit>24){Button('上一页',{type:ButtonType.Normal}).height(44).padding({left:10,right:10}).fontSize(14).fontColor('#5B7566').backgroundColor('#EEE9DB').borderRadius(8).enabled(this.recipeLimit>24).onClick(()=>{this.recipeLimit=Math.max(24,this.recipeLimit-24);this.pageScroller.scrollTo({xOffset:0,yOffset:0});});}Text(Math.ceil(this.recipeLimit/24)+' / '+Math.max(1,Math.ceil(this.recipeRows().length/24))).fontSize(14).constraintSize({minWidth:40}).textAlign(TextAlign.Center);Button('下一页',{type:ButtonType.Normal}).height(44).padding({left:10,right:10}).fontSize(14).fontColor('#5B7566').backgroundColor('#EEE9DB').borderRadius(8).enabled(this.recipeLimit<this.recipeRows().length).onClick(()=>{this.recipeLimit+=24;this.pageScroller.scrollTo({xOffset:0,yOffset:0});})}.width('100%').margin({bottom:8})}
  if(!this.libraryMode){Button('换一换').width('100%').backgroundColor('#D7E1CB').fontColor('#263E46').margin({ top: 10 }).onClick(() => { this.batch++; this.toast('已换一组推荐'); })}
 }
 @State diaryToolsOpen:boolean=false;
 @Builder diary() {
  this.title('', '我的记餐', '')
  Button('＋ 记一餐').width('100%').height(48).backgroundColor('#426B5B').margin({bottom:12}).onClick(()=>this.startMeal())
  Button(this.diaryToolsOpen?'收起工具':'记餐工具').height(44).backgroundColor(Color.Transparent).fontColor('#516452').onClick(()=>{this.diaryToolsOpen=!this.diaryToolsOpen;})
  if(this.diaryToolsOpen){
  Row({space:8}){Button('剩菜盒').layoutWeight(1).height(48).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{this.page='leftovers';});Button('常去店铺').layoutWeight(1).height(48).fontColor('#816D90').backgroundColor('#ECE3F4').onClick(()=>{this.page='dining-places';})}.width('100%').margin({bottom:12})
  Button('查看统计与导出报表').width('100%').backgroundColor('#ECE3F4').fontColor('#947CAD').margin({ bottom: 16 }).onClick(() => { this.page = 'stats'; })
  }
  Row({ space: 12 }) { Column({ space: 8 }) { Text('当前筛选 · ' + this.visibleMeals().length + ' 餐').fontSize(13).fontColor('#6C776E'); Text('¥ ' + Number(this.mealSpend(this.visibleMeals())).toFixed(2)).fontSize(30).fontWeight(FontWeight.Bold).fontColor('#263E46'); Text('实付 ¥' + Number(this.mealSpend(this.visibleMeals().filter((m: Meal) => m.costType === '实付'))).toFixed(2) + ' · 其余为估算').fontSize(11).fontColor('#827969'); Text('已填热量 ' + this.knownCalories(this.visibleMeals()) + ' kcal · ' + this.visibleMeals().filter((m: Meal) => m.calories < 0).length + ' 餐未填').fontSize(11).fontColor('#6C776E') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Image(avatarImage('rice')).width(84).height(100).objectFit(ImageFit.Contain) }.padding(17).width('100%').backgroundColor('#EDE7D0').border({width:{left:3,bottom:0.5},color:'#BDAA6B'}).borderRadius({topLeft:3,topRight:23,bottomLeft:3,bottomRight:6}).margin({bottom:16})
  Scroll() { Row({ space: 8 }) { ForEach(['全部方式','在家做','外卖','餐馆','食堂'],(mode: string) => { Button(mode,{type:ButtonType.Normal}).height(40).padding({left:14,right:14}).fontSize(14).fontColor('#355347').backgroundColor(this.diaryDining === mode || (!this.diaryDining && mode === '全部方式')?'#DCE8D7':'#EEE8DA').borderRadius(14).onClick(() => { this.diaryDining = mode === '全部方式' ? '' : mode; }) }) } }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).margin({ bottom: 14 })
  if (this.meals.length === 0) { this.empty('第一餐，从今天开始', '手动记录不会修改库存\n做菜确认后则会同时记录用餐。') }
  Row() { Text(this.diaryDate || '全部日期').fontSize(14).constraintSize({minHeight:44}).fontColor('#9C8CAD').layoutWeight(1).onClick(() => this.pickMealDate(true)); Text(this.showCalendar ? '收起日历 ▦' : '查看日历 ▦').fontSize(14).constraintSize({minHeight:44}).padding({left:8,right:8}).fontColor('#A18BB1').onClick(() => { this.showCalendar = !this.showCalendar; }); if (this.diaryDate) { Text('全部').fontSize(12).fontColor('#A99D8C').margin({ left: 12 }).onClick(() => { this.diaryDate = ''; }) } }.padding({left:12,right:8,top:4,bottom:4}).backgroundColor('#B0EAE0EF').borderRadius(15).margin({ bottom: 14 })
  if (this.showCalendar) {
   Column({ space: 14 }) {
    Row() { Text('‹ 上月').fontSize(12).fontColor('#9F89B1').onClick(() => { this.moveMonth(-1); }); Text(this.calendarMonth).fontSize(18).fontColor('#846C9A').layoutWeight(1).textAlign(TextAlign.Center); Text('下月 ›').fontSize(12).fontColor('#9F89B1').onClick(() => { this.moveMonth(1); }) }.width('100%')
    Row() { ForEach(['一','二','三','四','五','六','日'], (v: string) => { Text(v).layoutWeight(1).fontSize(11).fontColor('#A99AB6').textAlign(TextAlign.Center) }) }.width('100%')
    Grid() { ForEach(this.calendarCells(), (day: number,index: number) => { GridItem() { Column({ space: 3 }) { Text(day ? String(day) : '').fontSize(14).fontColor(day && this.diaryDate === this.cellDate(day) ? '#FFFFFF' : '#8D849C'); Text(day && this.mealsOn(day) ? '●' : ' ').fontSize(8).fontColor('#BE8B9E') }.width('100%').height(43).justifyContent(FlexAlign.Center).backgroundColor(day && this.diaryDate === this.cellDate(day) ? '#A493B8' : '#F5EFF9').borderRadius(11).onClick(() => { if (day) { this.diaryDate = this.cellDate(day); } }) } }, (_d: number,index: number) => String(index)) }.columnsTemplate('1fr 1fr 1fr 1fr 1fr 1fr 1fr').columnsGap(5).rowsGap(5).height(this.calendarCells().length / 7 * 48)
   }.padding(17).backgroundColor(this.surface()).borderRadius(20).margin({ bottom: 16 }).width('100%')
  }
  ForEach(this.visibleMeals(), (m: Meal) => {
   Column({ space: 9 }) {
    Row() { Text(m.name).fontFamily('HarmonyOS Sans SC').fontSize(21).fontWeight(FontWeight.Medium).fontColor('#354E38').constraintSize({minHeight:44}).onClick(() => this.startMeal(m)).layoutWeight(1); Text(m.familyId ? '家庭共享' : '仅自己').fontSize(10).fontColor('#7F9573').padding(5).backgroundColor('#EFF3E8').borderRadius(8) }
    Text(`${dateString(new Date(m.date))} · ${m.mealType}`).fontSize(12).fontColor('#969E8C')
    Text((m.diningMode || '在家做') + (m.place ? ' · ' + m.place : '') + (m.rating ? ' · ' + m.rating + '星' : '')).fontSize(12).fontColor('#8A526A')
    Text(m.calories >= 0 ? '示例主体热量约 ' + m.calories + ' kcal' : '热量未记录').fontSize(12).fontColor('#686258')
    if (m.localPhoto) { Image('file://' + m.localPhoto).width('100%').height(170).objectFit(ImageFit.Cover).borderRadius(12) }
    if (m.photoStatus) { Text(m.photoStatus === 'uploaded' ? '云端照片已同步' : '照片待上传 · 本机原图已保留').fontSize(11).fontColor('#7F9573') }
    if (m.notes) { Text(m.notes).fontSize(13).fontColor('#788470') }
    Row({space:8}){ForEach(mealItems(m).filter((item:MealItem)=>item.recipeId&&this.recipes.some((r:Recipe)=>r.id===item.recipeId)).slice(0,3),(item:MealItem)=>{Image(this.recipeImage(item.recipeId)).width(76).height(72).objectFit(ImageFit.Contain).onClick(()=>{const recipe:Recipe|undefined=this.recipes.find((r:Recipe)=>r.id===item.recipeId);if(recipe){this.openRecipe(recipe);}})})}.width('100%')
    ForEach(mealItems(m), (item: MealItem) => { Text(item.name + ' · ¥' + item.estimatedCost.toFixed(2) + '（' + (m.costType || '估算') + '）').fontSize(12).fontColor('#6C766C') })
    Text('¥' + m.estimatedCost.toFixed(2) + ' · ' + (m.costType || '估算') + '花费').fontSize(12).fontColor('#9B986F')
    Text('删除记录').fontSize(12).fontColor('#A76C57').onClick(() => this.confirm('删除这次用餐', '云端同步后将同时清理已上传照片；本机原图仍保留。', async () => { await this.store.deleteMeal(m); }))
   }.alignItems(HorizontalAlign.Start).padding(19).width('100%').backgroundColor(this.surface()).border({ width: 0.5, color: '#C4BCAB' }).borderRadius({ topLeft: 8, topRight: 20, bottomLeft: 14, bottomRight: 7 }).margin({ bottom: 12 })
  }, (m: Meal) => m.id)
 }
 @Builder settings(){
  Row({ space: 14 }) { this.profilePortrait(62); Column({ space: 6 }) { Text(this.loggedIn ? this.profile.displayName : '我的吃饭档案').fontSize(22).lineHeight(28).maxLines(2).textOverflow({overflow:TextOverflow.Ellipsis}).fontWeight(FontWeight.Medium).fontColor('#36564D'); Text(this.loggedIn ? '示例主体资料 · 头像 · 地区' : '设置昵称与口味，或登录同步').fontSize(13).lineHeight(20).fontColor('#6C766C') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Text('›').fontSize(26).fontColor('#A86F50').width(20).textAlign(TextAlign.Center).flexShrink(0) }.width('100%').padding({left:16,right:16,top:12,bottom:12}).backgroundImage($r('app.media.crayon_ribbon_sage')).backgroundImageSize({width:'100%',height:'100%'}).borderRadius(20).margin({ bottom: 8 }).onClick(() => this.run(async () => { await this.openMyProfile(); }))

  Text('设置').fontSize(14).fontColor('#6C766C').margin({top:8,bottom:8})
  Column(){ForEach(['口味与抽菜','食材管理','提醒','账号与同步','数据与备份','帮助与课堂'],(label:string,index:number)=>{
   Row({space:14}){Image(uiIcon(['taste','storage','reminder','cloud','backup','help'][index])).width(36).height(36).flexShrink(0).objectFit(ImageFit.Contain).rotate({angle:index%2===0?-5:4});Text(label).fontSize(18).fontColor('#345C4E').layoutWeight(1);Text('›').fontSize(23).fontColor('#A16B52').width(20).textAlign(TextAlign.Center).flexShrink(0)}.width('100%').constraintSize({minHeight:55}).padding({left:12,right:14,top:6,bottom:6}).backgroundColor(index%3===0?'#70F5EAD6':index%3===1?'#60E1EAE1':'#60EAE1EF').border({width:{bottom:0.5},color:'#DDD5C3'}).onClick(()=>{this.settingsGroup=label;this.page='settings-detail';})
  })}.width('100%').padding({top:4,bottom:4}).backgroundColor('#90FFFCF3').borderRadius({topLeft:5,topRight:20,bottomLeft:13,bottomRight:5})
  Button('生活工具').constraintSize({minHeight:48}).padding({left:12,right:12,top:10,bottom:10}).width('100%').margin({top:12,bottom:8}).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.openFlow();}))
  Button('关于与支持').width('100%').height(50).fontColor('#426B5B').backgroundColor('#E7EEE1').onClick(()=>{this.page='about-support';})
  Text('版本 '+this.appVersion).fontSize(12).fontColor('#7D8276').margin({top:18,bottom:12})
 }
 @Builder settingsDetail(){
  if(this.settingsGroup!=='账号与同步'){this.title('',this.settingsGroup,'')}
  if(this.settingsGroup==='口味与抽菜'){
   Column({space:0}){
    ForEach(['做饭偏好','外食 / 外卖偏好','不喜欢的菜'],(label:string,index:number)=>{Row({space:13}){Image(uiIcon(index===0?'home':index===1?'budget':'taste')).width(32).height(32).flexShrink(0).objectFit(ImageFit.Contain);Text(label).fontSize(18).fontColor('#415E57').layoutWeight(1);Text('›').fontSize(24).fontColor('#9D7C58').width(20).textAlign(TextAlign.Center).flexShrink(0)}.width('100%').constraintSize({minHeight:52}).padding({top:8,bottom:8,left:8,right:12}).onClick(()=>{if(index===2){this.page='draw-dislikes';}else{this.preferenceScene=index===0?'做饭':'外食 / 外卖';this.page='taste';}});if(index<2){Divider().color('#DAD8CD').margin({left:52})}})
   }.padding({left:10,right:10}).width('100%').backgroundColor('#65FFFFFF').borderRadius({topLeft:10,topRight:25,bottomLeft:22,bottomRight:12}).margin({bottom:20})
   Text('忌口与临期提醒').fontSize(19).fontColor('#426051').margin({bottom:12})
   this.smallLabel('不吃的食材');TextInput({text:this.excluded,placeholder:'多个食材用逗号分隔'}).height(49).onChange((v:string)=>{this.excluded=v;})
   Row(){Text('提前提醒').fontSize(16).fontColor('#526B5A').layoutWeight(1);Button('−',{type:ButtonType.Normal}).width(44).height(44).touchFeedback().fontColor('#647452').backgroundColor('#DFE7D8').onClick(()=>{this.threshold=String(Math.max(0,(Number(this.threshold)||0)-1));});Text(this.threshold+'天').width(50).fontSize(18).textAlign(TextAlign.Center);Button('＋',{type:ButtonType.Normal}).width(44).height(44).touchFeedback().fontColor('#647452').backgroundColor('#DFE7D8').onClick(()=>{this.threshold=String(Math.min(365,(Number(this.threshold)||0)+1));})}.width('100%').margin({top:18,bottom:20})
   Button('保存偏好',{type:ButtonType.Normal}).width('100%').height(49).fontSize(16).fontColor('#FFFFFF').backgroundColor('#4C7466').borderRadius(14).onClick(()=>this.run(async()=>{await this.store.setting('excluded',this.excluded);await this.store.setting('threshold',this.threshold);await this.store.setting('taste',this.taste);this.toast('偏好已保存');}))
  }else if(this.settingsGroup==='食材管理'){
  Column({ space: 12 }) {
   Text('按分类设置默认值').fontSize(18).fontWeight(FontWeight.Bold).fontColor('#7C6996')
   Scroll() { Row({ space: 7 }) { ForEach(CATEGORIES, (c: string) => { Column() { ChoiceChip({ label: c, selected: this.preferenceCategory === c, tint: this.categoryTint(c), ink: this.categoryInk(c) }) }.onClick(() => this.run(async () => { this.preferenceCategory = c; await this.loadCategoryPreferences(); })) }) } }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off)
   Text('默认保质期（天）').fontSize(12).fontColor('#9D8DAA')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(4),cross:LengthMetrics.vp(4)}}) { ForEach([3,7,15,30,180], (n: number) => { Column() { ChoiceChip({ label: String(n), selected: Number(this.shelfDays) === n, tint: '#F8EBD6', ink: '#A98D5D' }) }.onClick(() => { this.shelfDays = String(n); }) }) }
   TextInput({ text: this.shelfDays }).type(InputType.Number).onChange((v: string) => { this.shelfDays = v; })
   Text('提前提醒（天）').fontSize(12).fontColor('#9D8DAA')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(4),cross:LengthMetrics.vp(4)}}) { ForEach([1,3,5,7,15], (n: number) => { Column() { ChoiceChip({ label: String(n), selected: Number(this.warningDays) === n, tint: '#E6E0F4', ink: '#8F7CAB' }) }.onClick(() => { this.warningDays = String(n); }) }) }
   Row() { Text('关闭该分类提醒').layoutWeight(1).fontSize(13).fontColor('#9D8DAA'); Toggle({ type: ToggleType.Switch, isOn: this.categoryMuted }).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v: boolean) => { this.categoryMuted = v; }) }.constraintSize({minHeight:44})
   Button('保存分类默认值').backgroundColor('#E8E1F2').fontColor('#927AA8').onClick(() => this.run(async () => { if (!Number.isInteger(Number(this.shelfDays)) || Number(this.shelfDays) < 0 || Number(this.shelfDays) > 3650) { throw new Error('保质期需为0到3650天'); } await this.store.setting('shelf:' + this.preferenceCategory, this.shelfDays); await this.store.setting('threshold:' + this.preferenceCategory, this.warningDays); await this.store.setting('mute:' + this.preferenceCategory, String(this.categoryMuted)); this.toast('分类偏好已保存'); }))
   Text('默认计量单位').fontSize(12).fontColor('#9D8DAA')
   Flex({ wrap: FlexWrap.Wrap, space: { main: LengthMetrics.vp(6), cross: LengthMetrics.vp(7) } }) { ForEach(UNITS, (v: string) => { Column() { ChoiceChip({ label: v, selected: this.defaultUnit === v, tint: '#E1EDF7', ink: '#6F94AD' }) }.onClick(() => this.run(async () => { this.defaultUnit = v; await this.store.setting('defaultUnit', v); })) }) }
  }.alignItems(HorizontalAlign.Start).padding(20).backgroundColor(this.surface()).borderRadius(20).margin({ top: 16 })
  Column({ space: 12 }) {
   Text('存放位置').fontSize(18).fontWeight(FontWeight.Bold).fontColor('#3A563D')
   ForEach(this.locations, (location: string) => { Row() { Text(location).layoutWeight(1).fontSize(14).fontColor('#748267'); Text('改名').fontSize(12).fontColor('#7998AE').margin({ right: 15 }).onClick(() => { this.renameLocationFrom = location; this.renameLocationTo = location; }); Text('删除').fontSize(12).fontColor('#A1A68E').onClick(() => this.confirm('删除位置', '有库存的位置不能删除。', async () => { if (this.activeFoods().some((f: Food) => f.location === location)) { throw new Error('请先将该位置库存调拨到其他位置'); } await this.store.saveLocations(this.locations.filter((v: string) => v !== location)); })) } })
   if (this.renameLocationFrom) { Text('修改：' + this.renameLocationFrom).fontSize(12).fontColor('#9C86AE'); TextInput({ text: this.renameLocationTo }).onChange((v: string) => { this.renameLocationTo = v; }); Row({ space: 12 }) { Button('取消改名').backgroundColor('#EEE7F3').fontColor('#927FA3').onClick(() => { this.renameLocationFrom = ''; }); Button('确认改名').backgroundColor('#DFEDF5').fontColor('#6E91AB').onClick(() => this.confirm('修改存放位置', '该位置的食材及私有模板会一并更新。', async () => { await this.store.renameLocation(this.renameLocationFrom, this.renameLocationTo); this.renameLocationFrom = ''; })) } }
   Row({ space: 8 }) { TextInput({ text: this.newLocation, placeholder: '新增位置' }).onChange((v: string) => { this.newLocation = v; }).layoutWeight(1); Button('＋').backgroundColor('#285C54').onClick(() => this.run(async () => { const name: string = this.newLocation.trim(); if (!name || this.locations.includes(name)) { throw new Error('位置名称为空或已存在'); } await this.store.saveLocations(this.locations.concat([name])); this.newLocation = ''; })) }
  }.alignItems(HorizontalAlign.Start).padding(20).backgroundColor(this.surface()).borderRadius(20).margin({ top: 16 })
  }else if(this.settingsGroup==='提醒'){
  Column({ space: 12 }) {
   Text('本地通知').fontSize(18).fontColor('#3A563D')
   Row() { Text('系统代理提醒').layoutWeight(1); Toggle({ type: ToggleType.Switch, isOn: this.notifications }).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v: boolean) => this.run(async () => { if (v) { await Reminders.permission(this.getUIContext().getHostContext() as common.UIAbilityContext); } this.notifications = v; await this.store.setting('notifications', String(v));if(!v){await Reminders.cancel(this.store);} })) }.constraintSize({minHeight:44})
   TextInput({ text: this.reminderHour, placeholder: '每日提醒小时（0–23）' }).type(InputType.Number).onChange((v: string) => { this.reminderHour = v; })
   Button('保存提醒时间').onClick(() => this.run(async () => { const h: number = Number(this.reminderHour); if (!Number.isInteger(h) || h < 0 || h > 23) { throw new Error('小时应为0–23'); } await this.store.setting('reminderHour', String(h));this.toast(this.notifications?'提醒时间已保存':'时间已保存，开启系统代理提醒后生效'); }))
  }.padding(20).backgroundColor(this.surface()).borderRadius(20).margin({ top: 16 })
  }else if(this.settingsGroup==='账号与同步'){
   this.accountPage()
  }else if(this.settingsGroup==='数据与备份'){
  Button('检查离线菜谱更新').height(50).width('100%').fontSize(17).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.checkCatalogUpdate();}))
  Column({ space: 12 }) {
   Button('我的条码模板').width('100%').backgroundColor('#F9ECD8').fontColor('#AB8D61').onClick(() => { this.page = 'barcodes'; })
   Text('数据与备份').fontSize(18).fontWeight(FontWeight.Bold).fontColor('#3A563D')
   Text(`待同步变更 ${this.store.state.changes.length} 条\n记录保存在此设备。`).fontSize(13).fontColor('#89957B').lineHeight(23)
   Row(){Text('密码加密备份').fontSize(17).layoutWeight(1);Toggle({type:ToggleType.Switch,isOn:this.backupEncrypted}).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v:boolean)=>{this.backupEncrypted=v;})}.constraintSize({minHeight:44}).width('100%')
   TextInput({text:this.backupPassword,placeholder:'备份密码（导入加密文件也在此填写）'}).type(InputType.Password).maxLength(128).onChange((v:string)=>{this.backupPassword=v;})
   if(this.backupEncrypted){TextInput({text:this.backupConfirm,placeholder:'再次输入导出密码'}).type(InputType.Password).maxLength(128).onChange((v:string)=>{this.backupConfirm=v;});Text('密码不会保存；忘记后无法解密。备份不含照片原文件。').fontSize(14).fontColor('#87694B')}
   Button('查看回收站').height(48).width('100%').fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{this.page='trash';})
   Button(this.backupEncrypted?'导出加密备份':'导出 JSON 备份').width('100%').backgroundColor('#E9EEDD').fontColor('#486D45').onClick(() => this.run(async () => { await this.exportBackup(); }))
   Button('导入备份').width('100%').backgroundColor('#E9EEDD').fontColor('#486D45').onClick(() => this.confirm('合并备份', '将先检查备份，再由你选择同ID记录保留本机还是采用备份。', async () => { await this.importBackup(); }))
  }.alignItems(HorizontalAlign.Start).padding(20).backgroundColor(this.surface()).borderRadius(20).margin({ top: 16 })  }else{
   Button('使用指南').onClick(()=>{this.page='quickstart';})
   Button('食材与调味课堂').margin({top:14}).onClick(()=>this.openKnowledge('','settings-detail'))
  }
 }
 @Builder replenishmentPage() {
  this.title('READY FOR NEXT TIME', '下次，补一点刚好', '已吃完或余量不足才建议 · 过期丢弃不推荐')
  ForEach(this.foods.filter((f: Food) => f.archiveReason !== 'wasted' && (f.quantity <= 1 || f.archiveReason === 'consumed')), (f: Food) => { Row({ space: 12 }) { Image(this.foodImage(f.name, f.category)).sourceSize({width:160,height:160}).width(55).height(55).objectFit(ImageFit.Contain).flexShrink(0).borderRadius(15); Column({ space: 5 }) { Text(f.name).fontSize(17).fontColor('#526878'); Text(f.archiveReason === 'consumed' ? '上次已经吃完' : '余量不足').fontSize(11).fontColor('#AB987F') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Button('添加').fontSize(12).backgroundColor('#F8E9D3').fontColor('#AC8851').onClick(() => this.confirm('加入采购清单', `采购 ${f.name} 1${f.unit}？`, async () => { const item: Shopping = new Shopping(); item.name = f.name; item.unit = f.unit; item.category = f.category; await this.store.saveShopping(item); this.toast('已加入采购'); })) }.padding(16).backgroundColor(this.surface()).border({ width: 0.5, color: '#C4BCAB' }).borderRadius({ topLeft: 8, topRight: 20, bottomLeft: 14, bottomRight: 7 }).margin({ bottom: 12 }) }, (f: Food) => f.id)
 }
 @Builder mergePage() {
  this.title('KEEP WHAT MATTERS', '把两边的修改，选好再合并', '每项默认保留本机内容，选择云端内容后再确认')
  ForEach(mergeFields(this.merging), (field: MergeField) => {
   Column({ space: 12 }) { Text(field.label).fontSize(16).fontColor('#8B729F'); Text((this.cloudFields.includes(field.key) ? '○ ' : '● ') + '本机 · ' + field.local).fontSize(13).fontColor('#6E91AA').lineHeight(22).width('100%').onClick(() => { this.cloudFields = this.cloudFields.filter((key: string) => key !== field.key); }); Text((this.cloudFields.includes(field.key) ? '● ' : '○ ') + '云端 · ' + field.server).fontSize(13).fontColor('#B18498').lineHeight(22).width('100%').onClick(() => { if (!this.cloudFields.includes(field.key)) { this.cloudFields = this.cloudFields.concat([field.key]); } }) }.alignItems(HorizontalAlign.Start).padding(20).backgroundColor(this.surface()).borderRadius(20).margin({ bottom: 12 }).width('100%')
  }, (field: MergeField) => field.key)
  Button('确认合并到本机').backgroundColor('#73958A').height(48).width('100%').onClick(() => this.confirm('保存你的合并选择', '仅将所选内容保存到本机待同步队列。再次同步时仍会检查云端版本。', async () => { await this.store.mergeConflict(this.merging.local.entityType, this.merging.entityId, mergedPayload(this.merging, this.cloudFields), this.merging.server!.version, this.merging.changeId); this.conflicts = this.conflicts.filter((c: Conflict) => c.entityId !== this.merging.entityId); this.syncMessage = '合并已保存，请再次同步'; this.page = ''; this.tab = 5; }))
 }
 private planAlternatives(p:MealPlan):Recipe[]{const options:RankingOptions=new RankingOptions();options.excluded=this.excluded.split(/[,，、]/).concat(householdExclusions(this.household)).filter((v:string)=>!!v.trim());return this.recipes.filter((r:Recipe)=>r.id!==p.recipeId&&!this.store.retiredRecipeIds.includes(r.id)&&!this.drawDisliked.includes(r.id)&&matchesRankingConstraints(r,options)).slice(0,8);}
 @Builder planReplacementPanel(p:MealPlan){
  if(p.mode==='在家做'&&!p.completed){Text('换一道').fontSize(18).fontColor('#426B5B');Scroll(){Row({space:8}){ForEach(this.planAlternatives(p),(r:Recipe)=>{Button(r.name+' · 约¥'+displayCost(r,p.people).total).height(48).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.confirm('换成'+r.name+'？','已买到的食材保留；计划采购与预算按新菜重新预览。',async()=>{await this.store.replacePlannedRecipe(p.id,r.id,JSON.stringify(p));this.refresh();this.planEditId='';}))})}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).width('100%').scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off)}
 }
 private weeklyPreview():void{
  const options:RankingOptions=new RankingOptions();options.excluded=this.excluded.split(/[,，、]/).concat(householdExclusions(this.household)).filter((v:string)=>!!v.trim());options.homeRegion=this.homeRegion;options.goal=this.dietGoal;
  const start:string=this.planDate<dateString(new Date())?dateString(new Date()):this.planDate;
  this.weeklySnapshot=JSON.stringify(this.store.state.plans);this.weeklyDraft=suggestWeek(this.recipes.filter((r:Recipe)=>!this.drawDisliked.includes(r.id)&&!this.store.retiredRecipeIds.includes(r.id)),this.foods,this.meals,this.plans,start,this.planOccasion,this.planPeople,options);this.weeklyOpen=true;
 }
 @Builder weekSuggestionPanel(){
  Button('帮我安排七天').height(48).width('100%').fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.weeklyPreview())
  if(this.weeklyOpen){Column({space:10}){
   ForEach(this.weeklyDraft.plans,(p:MealPlan)=>{Row(){Text(p.date.slice(5)+' '+p.occasion).fontSize(15).fontColor('#68776E');Text(this.planLabel(p)).fontSize(17).layoutWeight(1);Text('约¥'+displayCost(this.planRecipe(p)!,p.people).total).fontSize(15).fontColor('#8A6549')}.width('100%')})
   if(this.weeklyDraft.unfilled.length){Text(this.weeklyDraft.unfilled.length+'天没有符合条件的新菜，保留空位').fontSize(15).fontColor('#8A6549')}
   Text('保留已有安排；采购与预算在计划页重新预览').fontSize(14).fontColor('#68776E')
   Row({space:8}){Button('取消').layoutWeight(1).height(48).onClick(()=>{this.weeklyOpen=false;});Button('采用草案').layoutWeight(1).height(48).enabled(this.weeklyDraft.plans.length>0).onClick(()=>this.run(async()=>{await this.store.applySuggestedWeek(this.weeklyDraft.plans,this.weeklySnapshot);this.refresh();this.weeklyOpen=false;}))}.width('100%')
  }.width('100%').padding(14).backgroundColor('#DCE8D7').borderRadius({topLeft:8,topRight:24,bottomLeft:20,bottomRight:10}).margin({top:10,bottom:14})}
 }
 private weekNutrition():NutritionWeek{return nutritionWeek(this.meals,dateString(new Date()));}
 @Builder nutritionWeekPanel(){
  Column({space:10}){Text('近七天 · 热量记录').fontSize(21).fontColor('#426B5B');Text('已记 '+this.weekNutrition().known+' 餐 · 未记热量 '+this.weekNutrition().unknown+' 餐').fontSize(16).fontColor('#68776E');
   ForEach(this.weekNutrition().days,(d:NutritionDay)=>{Row(){Text(d.date.slice(5)).fontSize(15).width(54);Text(d.known?d.kcal+' kcal':'未记录热量').fontSize(17).layoutWeight(1);Text(d.known+'/'+(d.known+d.unknown)+'餐').fontSize(14).fontColor('#68776E')}.width('100%');if(d.known){Text('包装标签 '+d.label+' · 估算或其他 '+d.estimated).fontSize(13).fontColor('#68776E')}})
   Text('仅汇总已填写部分，不代表全天摄入；空白不计为零').fontSize(14).fontColor('#87694B')
  }.width('100%').alignItems(HorizontalAlign.Start).padding(18).backgroundColor('#E6ECDE').borderRadius({topLeft:9,topRight:28,bottomLeft:19,bottomRight:11}).margin({bottom:16})
 }
 @Builder leftoverPage(){
  this.title('','剩菜盒','')
  Text('日期由你标注，不自动判断食物安全').fontSize(15).fontColor('#87694B').margin({bottom:12})
  if(!this.leftoverBatches.length){Text('保存记餐后，展开“安排剩菜”存入一盒').fontSize(17).fontColor('#68776E').padding(18)}
  Row(){Text('本次处理').fontSize(17);TextInput({text:this.leftoverAmount,placeholder:'份数'}).type(InputType.Number).width(100).onChange((v:string)=>{this.leftoverAmount=v;});Text('份').fontSize(16)}.width('100%').margin({bottom:12})
  ForEach(this.leftoverBatches.slice().reverse().slice(0,50),(b:LeftoverBatch)=>{Column({space:10}){Text(b.name).fontSize(22).fontColor('#36564D');Text((b.container||'未标注容器')+' · '+b.storage+' · 余 '+b.remaining+'/'+b.total+'份').fontSize(16).fontColor('#68776E');Text('标注截止 '+b.expiryDate).fontSize(16).fontColor(b.expiryDate<dateString(new Date())?'#AE664C':'#68776E');if(b.remaining>0){Row({space:8}){Button('吃这份').height(48).layoutWeight(1).enabled(b.expiryDate>=dateString(new Date())).onClick(()=>this.confirm('记录本次食用？',this.leftoverAmount+'份；关联原餐，不重复计费或扣库存。',async()=>{await this.store.useLeftover(b.id,Number(this.leftoverAmount),'eat',JSON.stringify(b));this.refresh();}));Button('丢弃').height(48).layoutWeight(1).onClick(()=>this.confirm('丢弃这份？',this.leftoverAmount+'份将从剩余份数中移除。',async()=>{await this.store.useLeftover(b.id,Number(this.leftoverAmount),'discard',JSON.stringify(b));this.refresh();}))}.width('100%')}ForEach(b.events.slice(-3),(e:LeftoverEvent)=>{Text(e.date.slice(0,10)+' · '+(e.action==='eat'?'食用':'丢弃')+' '+e.portions+'份').fontSize(14).fontColor('#68776E')})}.width('100%').alignItems(HorizontalAlign.Start).padding(18).backgroundColor(b.storage==='冷冻'?'#DFE8ED':'#EEE3CD').borderRadius({topLeft:10,topRight:26,bottomLeft:20,bottomRight:12}).margin({bottom:14})},(b:LeftoverBatch)=>b.id)
 }
 @Builder trashPage(){
  this.title('','回收站','')
  Text('最多30条，保留30天；恢复为本机私有新记录').fontSize(15).fontColor('#68776E').margin({bottom:14})
  ForEach(this.trashEntries,(e:TrashEntry)=>{Row(){Column(){Text(e.name).fontSize(18).fontColor('#36564D');Text(dateString(new Date(e.deletedAt))).fontSize(14).fontColor('#68776E')}.layoutWeight(1).alignItems(HorizontalAlign.Start);Button('恢复').height(48).onClick(()=>this.confirm('恢复这条记录？','作为新记录保存，不恢复原来的云端ID和家庭共享。',async()=>{await this.store.restoreTrash(e.id);this.refresh();}))}.width('100%').padding(12)},(e:TrashEntry)=>e.id)
  if(this.trashEntries.length){Button('清空回收站').height(48).onClick(()=>this.confirm('清空回收站？','这些记录将无法从本机恢复。',async()=>{await this.store.clearTrash();this.refresh();}))}else{Text('回收站是空的').fontSize(18).fontColor('#68776E').padding(24)}
 }
 @Builder diningPlacesPage(){
  this.title('','常去店铺','')
  if(!diningPlaces(this.meals).length){Text('外食或外卖记餐时选填店铺，即可在这里查看').fontSize(17).fontColor('#68776E').padding(18)}
  ForEach(diningPlaces(this.meals),(p:DiningPlace)=>{Column({space:10}){Text(p.name).fontSize(23).fontColor('#36564D');Text(p.visits+'次 · 实付 ¥'+p.paid.toFixed(2)+' · 估算 ¥'+p.estimated.toFixed(2)).fontSize(16).fontColor('#87694B');Text(p.combos.join('、')).fontSize(17).fontColor('#68776E');Button('再记一餐').height(48).onClick(()=>{const m:Meal|undefined=this.meals.find((v:Meal)=>v.id===p.lastMealId);if(m){this.startMeal(repeatMealDraft(m));}})}.width('100%').alignItems(HorizontalAlign.Start).padding(18).backgroundColor('#ECE3F0').borderRadius({topLeft:9,topRight:26,bottomLeft:20,bottomRight:11}).margin({bottom:14})},(p:DiningPlace)=>p.name)
 }
 @Builder statisticsPage() {
  this.title('', '餐费与饮食', '')
  this.nutritionWeekPanel()
  Row({ space: 10 }) { ForEach(['天','周','月'], (v: string) => { Column() { ChoiceChip({ label: '本' + v, selected: this.reportRange === v, tint: '#D4BFF7', ink: '#9478AE' }) }.onClick(() => { this.reportRange = v; }) }) }.margin({ bottom: 18 })
  Column({ space: 10 }) { Text('本' + this.reportRange + '餐饮花费').fontSize(13).fontColor('#786484'); Text('¥ ' + this.reportMeals().reduce((sum: number,m: Meal) => sum + (m.personalCost>=0?m.personalCost:m.estimatedCost), 0).toFixed(2)).fontSize(32).lineHeight(40).maxLines(2).fontWeight(FontWeight.Bold).fontColor('#826A9F'); Text(`${this.reportMeals().length} 次用餐`).fontSize(12).fontColor('#786C80') }.alignItems(HorizontalAlign.Start).width('100%').padding(18).backgroundColor('#EEE5F6').borderRadius(23).margin({ bottom: 18 })
  Text('实付 ¥'+this.spending().paid.toFixed(2)+' · 估算 ¥'+this.spending().estimated.toFixed(2)).fontSize(16).fontColor('#426B5B').margin({bottom:12})
  Text('记录了'+this.spending().days+'天 · 热量已填'+this.spending().calorieMeals+'/'+this.spending().meals+'餐').fontSize(15).fontColor('#68766C').margin({bottom:12})
  if(this.spending().calorieMeals){Text('已记录餐食合计 '+Math.round(this.spending().calories)+' kcal').fontSize(16).fontColor('#8A6549').margin({bottom:16})}
  ForEach(['早餐','午餐','晚餐','加餐'], (v: string,index: number) => { Row() { Text(v).fontSize(14).fontColor('#68757D').layoutWeight(1); Text('¥' + this.reportMeals().filter((m: Meal) => m.mealType === v).reduce((sum: number,m: Meal) => sum + (m.personalCost>=0?m.personalCost:m.estimatedCost), 0).toFixed(2)).fontSize(17).fontColor(['#B59457','#7194AA','#957CA8','#B5818C'][index]) }.padding(17).backgroundColor(this.surface()).borderRadius(15).margin({ bottom: 8 }) })
  Row({ space: 12 }) { Column({ space: 9 }) { Text('食材已消耗').fontSize(12).fontColor('#7D9B83'); Text('¥' + this.foods.reduce((sum: number,f: Food) => sum + (f.consumedCost || 0), 0).toFixed(2)).fontSize(23).fontColor('#71977B') }.layoutWeight(1).padding(18).backgroundColor('#E6F0DE').borderRadius(18); Column({ space: 9 }) { Text('丢弃损失').fontSize(12).fontColor('#B38C77'); Text('¥' + this.foods.reduce((sum: number,f: Food) => sum + (f.wastedCost || 0), 0).toFixed(2)).fontSize(23).fontColor('#BE8C75') }.layoutWeight(1).padding(18).backgroundColor('#FAE8DC').borderRadius(18) }.margin({ top: 15, bottom: 18 })
  this.sectionHeader('02', '餐桌上的小偏好', '本' + this.reportRange + ' · 估算', '#F5E1E8')
  ForEach(this.reportTags(), (tag: string) => { Row() { Text(tag).fontSize(13).fontColor('#AC8798').layoutWeight(1); Text('¥' + this.reportMeals().filter((m: Meal) => m.tags.split('、').includes(tag)).reduce((sum: number,m: Meal) => sum + (m.personalCost>=0?m.personalCost:m.estimatedCost), 0).toFixed(2)).fontSize(15).fontColor('#9F83AC') }.padding(13).backgroundColor('#F8EBF1').borderRadius(12).margin({ bottom: 7 }) })
  Text('标签可重复归类，各项金额不应相加').fontSize(13).fontColor('#786C80').margin({ bottom: 15 })
  ForEach(summarizeDishes(this.reportMeals()).slice(0,5), (dish: DishSummary,index: number) => { Row() { Text(String(index + 1).padStart(2,'0')).fontSize(20).fontColor('#876C94').margin({ right: 12 }); Text(dish.name).layoutWeight(1).fontSize(14).fontColor('#8D7B9D'); Text(dish.count + ' 次 · ¥' + dish.estimatedCost.toFixed(2)).fontSize(12).fontColor('#786C80') }.padding(13).backgroundColor(this.surface()).borderRadius(13).margin({ bottom: 7 }) })
  Text('菜品费用构成 · 整菜参考，不含分摊与配送').fontSize(15).fontColor('#68776E').margin({top:12,bottom:8})
  ForEach(['家常','素菜','荤菜','汤羹','主食','外卖'], (category: string) => { Row() { Text(category).fontSize(12).fontColor('#68775E').layoutWeight(1); Text('¥' + this.reportMeals().reduce((sum: number,m: Meal) => sum + mealItems(m).filter((i: MealItem) => i.category === category).reduce((cost: number,i: MealItem) => cost + i.estimatedCost, 0), 0).toFixed(2)).fontSize(13).fontColor('#786484') }.padding(10) })
  Text('食材消耗与浪费为全部时间累计估算').fontSize(13).fontColor('#A8A49A')
  Button('导出当前报表 CSV').width('100%').backgroundColor('#DDEAF4').fontColor('#7596AD').margin({ top: 18 }).onClick(() => this.run(async () => { await this.exportStats(); }))
 }
 @Builder recipeEditPage() {
  this.title('YOUR FAMILY RECIPE', '写一道家常菜', '保存在本机，默认私有 · 随时可以继续编辑')
  TextInput({ text: this.recipeDraft.name, placeholder: '菜名' }).onChange((v: string) => { this.recipeDraft.name = v; })
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['清淡','酸甜','香辣'], (v: string) => { Column() { ChoiceChip({ label: v, selected: this.recipeDraft.taste === v, tint: '#F8E9D3', ink: '#AC8A58' }) }.onClick(() => { const r: Recipe = JSON.parse(JSON.stringify(this.recipeDraft)) as Recipe; r.taste = v; this.recipeDraft = r; }) }) }.margin({ top: 12, bottom: 17 })
  this.smallLabel('制作分钟 / 人数 / 参考成本（估算）')
  Row({ space: 8 }) { TextInput({ text: String(this.recipeDraft.minutes) }).type(InputType.Number).layoutWeight(1).onChange((v: string) => { this.recipeDraft.minutes = Number(v); }); TextInput({ text: String(this.recipeDraft.people) }).type(InputType.Number).layoutWeight(1).onChange((v: string) => { this.recipeDraft.people = Number(v); }); TextInput({ text: String(this.recipeDraft.estimatedCost) }).type(InputType.Number).layoutWeight(1).onChange((v: string) => { this.recipeDraft.estimatedCost = Number(v); }) }
  this.smallLabel('用料')
  ForEach(this.recipeDraft.ingredients, (i: Ingredient,index: number) => { Row() { Text(i.name).layoutWeight(1); Text(`${i.quantity}${i.unit}`).fontColor('#8A9CA8'); Text('移除').fontSize(11).fontColor('#BA8B7B').onClick(() => { const r: Recipe = JSON.parse(JSON.stringify(this.recipeDraft)) as Recipe; r.ingredients.splice(index, 1); this.recipeDraft = r; }) }.padding(12).backgroundColor(this.surface()).borderRadius(13).margin({ bottom: 7 }) })
  Scroll() { Row({ space: 7 }) { ForEach(TEMPLATES, (t: Template) => { Text(t.name).fontSize(12).fontColor('#9E886B').padding(9).backgroundColor('#FAEEDC').borderRadius(12).onClick(() => { this.ingredientName = t.name; this.ingredientUnit = t.unit; }) }) } }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off)
  Row({ space: 7 }) { TextInput({ text: this.ingredientName, placeholder: '食材' }).layoutWeight(1).onChange((v: string) => { this.ingredientName = v; }); TextInput({ text: this.ingredientQuantity }).width(60).type(InputType.Number).onChange((v: string) => { this.ingredientQuantity = v; }); Column(){this.optionControl('计量单位',this.ingredientUnit,UNITS,(_index:number,value:string)=>{this.ingredientUnit=value;})}.layoutWeight(1) }.margin({ top: 10 })
  Button('加入用料').fontSize(13).backgroundColor('#E2EDF5').fontColor('#7998AC').margin({ top: 9, bottom: 17 }).onClick(() => { if (!this.ingredientName.trim() || Number(this.ingredientQuantity) <= 0) { this.toast('请填写有效用料'); return; } const r: Recipe = JSON.parse(JSON.stringify(this.recipeDraft)) as Recipe; r.ingredients.push(new Ingredient(this.ingredientName, Number(this.ingredientQuantity), this.ingredientUnit)); this.recipeDraft = r; this.ingredientName = ''; })
  this.smallLabel('分步教程')
  ForEach(this.recipeDraft.steps, (step: string,index: number) => { Text(`${index+1}. ${step}`).fontSize(14).fontColor('#8797A1').lineHeight(23).padding(14).width('100%').backgroundColor(this.surface()).borderRadius(14).margin({ bottom: 8 }) })
  TextArea({ text: this.recipeStep, placeholder: '写下这一步…' }).height(90).onChange((v: string) => { this.recipeStep = v; })
  Button('加入步骤').fontSize(13).backgroundColor('#EEE3F5').fontColor('#A18AB6').margin({ top: 9 }).onClick(() => { if (!this.recipeStep.trim()) { return; } const r: Recipe = JSON.parse(JSON.stringify(this.recipeDraft)) as Recipe; r.steps.push(this.recipeStep.trim()); this.recipeDraft = r; this.recipeStep = ''; })
  Button('保存私有菜谱').width('100%').height(48).backgroundColor('#648B7F').margin({ top: 22 }).onClick(() => this.run(async () => { await this.store.saveRecipe(this.recipeDraft); this.page = ''; this.toast('菜谱已存本机'); }))
  if (this.recipeDraft.id) { Button('删除此菜谱').backgroundColor('#F6E3DF').fontColor('#B08679').margin({ top: 15 }).onClick(() => this.confirm('删除菜谱', '已生成的用餐记录会保留。', async () => { await this.store.deleteRecipe(this.recipeDraft); this.page = ''; })) }
 }
 @Builder publicRecipePage() {
  this.title('RECIPES FROM EVERYDAY LIFE', '家常菜谱集', '审核通过的公共菜谱，收藏后可离线查看')
  if (this.publicRecipes.length === 0) { this.empty('还没有公开菜谱', '你仍可使用本地预置菜谱或写下自家做法。') }
  ForEach(this.publicRecipes, (entry: PublicRecipe) => { Row({ space: 12 }) { Image(recipeCover(entry.payload)).width(85).height(75).objectFit(ImageFit.Cover).borderRadius(17); Column({ space: 7 }) { Text(entry.payload.name).fontSize(19).fontColor('#567080'); Text(`${entry.payload.taste} · ${entry.payload.minutes}分钟`).fontSize(12).fontColor('#A3ACB1') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Button('存本机').fontSize(12).backgroundColor('#FAEAD5').fontColor('#B19266').onClick(() => this.confirm('保存菜谱到本机', '以私有副本保存，下次断网也能查看。', async () => { const recipe: Recipe = JSON.parse(JSON.stringify(entry.payload)) as Recipe; recipe.id = ''; recipe.version = 0; await this.store.saveRecipe(recipe); this.toast('已保存私有副本'); })) }.padding(17).backgroundColor(this.surface()).borderRadius(19).margin({ bottom: 11 }) }, (entry: PublicRecipe) => entry.id)
 }
 private clearCommunitySearch():void{this.communitySearchRequest++;this.communitySearchDraft='';this.communityQuery='';this.communityResults=[];this.communitySearchCursor='';this.communitySearchMore=false;this.communitySearchDone=false;this.communitySearchBusy=false;this.communitySearchError='';this.communitySearchContext='';}
 private openCommunitySearch():void{this.communitySearchDraft=this.communityQuery||this.communitySearchDraft;if(this.communitySearchContext!==this.feedScope+this.communityApplied){this.communityQuery='';this.communityResults=[];this.communitySearchCursor='';this.communitySearchMore=false;this.communitySearchDone=false;}this.page='community-search';}
 private async searchCommunity(more:boolean=false):Promise<void>{
  if(!this.loggedIn){this.communitySearchError='登录后搜索分享';return;}const q:string=more?this.communityQuery:this.communitySearchDraft.trim().slice(0,80);if(!q){this.communitySearchRequest++;this.communityQuery='';this.communityResults=[];this.communitySearchCursor='';this.communitySearchMore=false;this.communitySearchDone=false;this.communitySearchBusy=false;this.communitySearchError='';return;}
  const request:number=++this.communitySearchRequest;const owner:string=this.cloud.session.userId;this.communitySearchContext=this.feedScope+this.communityApplied;this.communityQuery=q;this.communitySearchBusy=true;this.communitySearchError='';if(!more){this.communityResults=[];this.communitySearchCursor='';this.communitySearchMore=false;}const filters:string=this.communityApplied;
  try{const result:CommunityPage=JSON.parse(await this.cloud.request('/community/posts/page?scope='+encodeURIComponent(this.feedScope)+filters+'&q='+encodeURIComponent(q)+(more&&this.communitySearchCursor?'&cursor='+encodeURIComponent(this.communitySearchCursor):''),http.RequestMethod.GET)) as CommunityPage;
   if(request!==this.communitySearchRequest||owner!==this.cloud.session.userId||this.page!=='community-search'){return;}this.communityResults=(more?this.communityResults:[]).concat(result.items).filter((p:CommunityPost,index:number,list:CommunityPost[])=>list.findIndex((item:CommunityPost)=>item.id===p.id)===index).slice(-100);this.communitySearchCursor=result.nextCursor;this.communitySearchMore=result.hasMore;this.communitySearchDone=true;
  }catch(_){if(request===this.communitySearchRequest){this.communitySearchError='暂时没搜到，请重试';}}finally{if(request===this.communitySearchRequest){this.communitySearchBusy=false;}}
 }
 @Builder communitySearchEntry(){
  Button({type:ButtonType.Normal}){Row({space:5}){Image($r('app.media.utility_search')).width(22).height(22).objectFit(ImageFit.Contain);Text('搜索').fontSize(15).fontColor('#75637C')}}.id('community-search-entry').constraintSize({minWidth:76,minHeight:44}).padding({left:8,right:8}).backgroundColor(Color.Transparent).borderRadius(14).accessibilityText('搜索社区分享').onClick(()=>this.openCommunitySearch())
 }
 @Builder communitySearchPage(){
  this.title('','搜索社区分享','')
  Column(){Row({space:8}){TextInput({text:this.communitySearchDraft,placeholder:'分享标题、话题、试做经验'}).id('community-search-input').maxLength(80).cancelButton({style:CancelButtonStyle.INPUT}).enterKeyType(EnterKeyType.Search).height(46).layoutWeight(1).onChange((v:string)=>{this.communitySearchDraft=v;}).onSubmit(()=>this.searchCommunity());Button('搜索').height(46).fontColor('#FFFFFF').backgroundColor('#816D90').onClick(()=>this.searchCommunity())}.width(this.searchFieldWidth()).alignSelf(ItemAlign.Center).constraintSize({maxWidth:480}).margin({bottom:16})}.width('100%').alignItems(HorizontalAlign.Center)
  if(this.communitySearchBusy){LoadingProgress().width(32).height(32)}
  if(this.communitySearchError){Text(this.communitySearchError).fontSize(16).fontColor('#8A6549');if(!this.loggedIn){Button('登录').height(46).onClick(()=>{this.authReturn='community';this.page='auth';})}else{Button('重试').height(46).onClick(()=>this.searchCommunity())}}
  if(!this.communityQuery){Text('找大家分享的吃饭日常和试做经验').fontSize(16).fontColor('#7C7284').padding(16)}
  else if(this.communitySearchDone&&!this.communityResults.length&&!this.communitySearchBusy){Text('没有相关分享，换个词试试').fontSize(17).fontColor('#7C7284').padding(16)}
  ForEach(this.communityResults,(post:CommunityPost)=>{Column({space:10}){Row({space:10}){Image(avatarImage(post.author_avatar||'tomato')).width(36).height(36).objectFit(ImageFit.Contain);Text((post.author_name||'小怪朋友')+(post.demo_data?' · 演示':'')).fontSize(15).fontColor('#816D90')}.width('100%');Text(post.payload.name||'餐桌分享').fontSize(21).fontColor('#304F52');if(post.payload.notes){Text(post.payload.notes).fontSize(16).lineHeight(25).maxLines(3).textOverflow({overflow:TextOverflow.Ellipsis}).fontColor('#68776E')}Text(post.payload.tags||'餐桌日常').fontSize(14).fontColor('#816D90')}.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor('#ECE3F0').borderRadius({topLeft:9,topRight:25,bottomLeft:20,bottomRight:12}).margin({bottom:12}).onClick(()=>this.run(async()=>{await this.openPost(post);}))},(post:CommunityPost)=>post.id)
  if(this.communitySearchMore){Button('更多分享').height(48).enabled(!this.communitySearchBusy).onClick(()=>this.searchCommunity(true))}
 }
 @Builder communityPage(){
  Row({space:8}){this.communitySearchEntry();Text('餐桌广场').fontFamily('ShikuHand').fontSize(29).fontColor('#5C648E').layoutWeight(1);Text('消息 ›').fontSize(16).fontColor('#816D90').padding(12).onClick(()=>this.run(async()=>{await this.loadInbox();}))}.width('100%')
  this.communityFilterPanel()
  Image($r('app.media.community_banner')).width('100%').height(88).objectFit(ImageFit.Contain).margin({bottom:10})
  Row({space:10}){Button('＋ 分享一餐').fontColor('#FFFFFF').backgroundColor('#8F695C').layoutWeight(1).enabled(!this.busy).onClick(()=>{if(!this.loggedIn){this.authReturn='community';this.page='auth';return;}this.getUIContext().animateTo({duration:this.reducedMotion?0:200},()=>{this.publishPicker=!this.publishPicker;});});Button('刷新').fontColor('#55768A').backgroundColor('#DDE9EF').enabled(!this.busy).onClick(()=>this.run(async()=>{await this.loadFeed(this.feedScope);}))}.width('100%').margin({bottom:16})
  if(this.publishPicker){
   Row({space:10}){Button({type:ButtonType.Normal}){Row({space:5}){Image(uiIcon('camera')).width(30).height(30).objectFit(ImageFit.Contain);Text('拍照记餐').fontSize(14)}}.onClick(()=>this.run(async()=>{this.startMeal();this.mealAfterSave='publish';await this.attachPhoto(true);}));Button({type:ButtonType.Normal}){Row({space:5}){Image(uiIcon('album')).width(30).height(30).objectFit(ImageFit.Contain);Text('相册记餐').fontSize(14)}}.onClick(()=>this.run(async()=>{this.startMeal();this.mealAfterSave='publish';await this.attachPhoto(false);}))}.margin({bottom:14})
   Text('选一餐，分享给大家').fontSize(18).fontColor('#304F52').margin({bottom:12})
   if(!this.meals.length){Button('先记下这一餐').onClick(()=>this.startMeal())}
   ForEach(this.meals.slice().sort((a:Meal,b:Meal)=>b.date.localeCompare(a.date)).slice(0,12),(m:Meal)=>{Row(){Text(m.name).fontSize(16).fontColor('#304F52').layoutWeight(1);Text('选择 ›').fontColor('#966E50')}.width('100%').padding(16).backgroundColor('#F2E3CC').borderRadius(15).margin({bottom:8}).onClick(()=>this.run(async()=>{await this.choosePublish(m);}))})
  }
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(10)}}){ForEach(['public','following','favorites','family','mine'],(scope:string,index:number)=>{Column(){ChoiceChip({label:['生活广场','关注','收藏','家庭','发布'][index],selected:this.feedScope===scope,tint:['#F1DCC8','#DDE9EF','#E9DEF0'][index%3],ink:['#AE7854','#5D8498','#9477AA'][index%3]})}.onClick(()=>this.run(async()=>{await this.loadFeed(scope);}))})}.margin({bottom:16})
  if(!this.loggedIn){Image($r('app.media.community_welcome')).width('100%').height(130).objectFit(ImageFit.Contain);Text('登录，坐下来聊聊').fontFamily('ShikuHand').fontSize(23).fontColor('#526A7B');Button('登录 / 注册').width('100%').fontColor('#FFFFFF').backgroundColor('#527A68').margin({top:15}).onClick(()=>{this.authReturn='community';this.page='auth';})}
  else{
   if(this.feedLoading){LoadingProgress().width(40).height(40)}
   else if(this.feedError&&!this.posts.length){Image($r('app.media.community_connection')).width('100%').height(120).objectFit(ImageFit.Contain);Text(this.feedError).fontSize(16).fontColor('#8F695C');Button('重新加载').onClick(()=>this.run(async()=>{await this.loadFeed(this.feedScope);}))}
   else if(!this.posts.length){Image(this.feedScope==='mine'?$r('app.media.community_compose'):$r('app.media.community_empty')).width('100%').height(120).objectFit(ImageFit.Contain);this.empty(this.feedScope==='mine'?'把第一餐分享出来':this.feedScope==='favorites'?'喜欢的分享收藏在这里':this.feedScope==='following'?'关注喜欢的餐桌':this.feedScope==='family'?'家庭餐桌等你来':'来分享第一份好味道','点上方“分享一餐”，选择已记录的用餐')}
   else if(!this.visiblePosts().length){Text('没有找到，换个词试试').fontSize(16).fontColor('#6C796D')}
   ForEach(this.visiblePosts(),(p:CommunityPost)=>{
    Column({space:12}){
     Row({space:10}){Image(avatarImage(p.author_avatar||'tomato')).width(38).height(38).objectFit(ImageFit.Contain);Column({space:3}){Text((p.author_name||'小怪朋友')+(p.demo_data?' · 演示':'')).fontSize(15).fontColor('#304F52');Text(p.payload.date?p.payload.date.slice(0,10):'').fontSize(12).fontColor('#718078')}.alignItems(HorizontalAlign.Start).layoutWeight(1);if(this.feedScope==='mine'){if(p.status==='pending'){Image($r('app.media.community_pending')).width(48).height(42).objectFit(ImageFit.Contain)}Text(p.status==='pending'?'审核中':p.status==='rejected'?'未公开':'已分享').fontSize(13).fontColor('#987255')}}.width('100%')
     if(this.feedPhotos.has(p.id)){Image(this.feedPhotos.get(p.id)||'').width('100%').height(210).objectFit(ImageFit.Contain).autoResize(true).borderRadius(18)}else if(p.payload.recipeId && this.recipes.some((r:Recipe)=>r.id===p.payload.recipeId)){Image(this.recipeImage(p.payload.recipeId)).width('100%').height(180).objectFit(ImageFit.Contain)}
     Text(p.payload.name).fontSize(21).fontWeight(FontWeight.Medium).fontColor('#304F52').width('100%');if(p.payload.notes){Text(p.payload.notes).fontSize(15).lineHeight(25).maxLines(3).textOverflow({overflow:TextOverflow.Ellipsis}).fontColor('#65736C')}
     Row(){Text(p.payload.tags||'餐桌日常').fontSize(13).fontColor('#9A7654').layoutWeight(1);Text('♡ '+(p.like_count||0)+'   ◌ '+(p.comment_count||0)).fontSize(15).fontColor('#8C6775')}.width('100%')
    }.width('100%').alignItems(HorizontalAlign.Start).padding(15).backgroundColor('#F9F4E9').border({width:{top:2,bottom:0.5},color:'#B6B8CC'}).borderRadius({topLeft:4,topRight:18,bottomLeft:12,bottomRight:4}).shadow({radius:8,color:'#125F6684',offsetY:4}).margin({bottom:18}).transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({y:12}))).onClick(()=>this.run(async()=>{await this.openPost(p);}))
   },(p:CommunityPost)=>p.id)
  }
  if(this.loggedIn&&this.feedMore){Button(this.feedLoading?'加载中…':'再看看更多').height(48).width('100%').enabled(!this.feedLoading).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.loadFeed(this.feedScope,true);}))}

 }
 private visiblePosts():CommunityPost[]{return this.posts;}
 @Builder postPage() {
  if(this.selectedPost.payload.trialOutcome&&this.selectedPost.payload.trialOutcome!=='未评价'){Text('试做：'+this.selectedPost.payload.trialOutcome+(this.selectedPost.payload.actualMinutes?' · '+this.selectedPost.payload.actualMinutes+'分钟':'')).fontSize(18).fontColor('#426B5B');if(this.selectedPost.payload.trialSubstitution){Text('替代：'+this.selectedPost.payload.trialSubstitution).fontSize(17).lineHeight(28).fontColor('#87694B')}if(this.selectedPost.payload.trialFailure){Text(this.selectedPost.payload.trialFailure).fontSize(17).lineHeight(28).fontColor('#68776E')}}
  this.title('AROUND THE TABLE', this.selectedPost.payload.name, this.selectedPost.visibility === 'family' ? '仅家庭可见' : '生活里的好好吃饭')
  if (this.postPhoto) { Image(this.postPhoto).width('100%').height(260).objectFit(ImageFit.Contain).borderRadius(22) }
  Text(this.selectedPost.payload.notes || '这是一餐平凡又美好的日常。').fontSize(15).fontColor('#859098').lineHeight(26).margin({ top: 16, bottom: 15 })
  Row({space:12}){Button((this.postLiked?'♥ 已喜欢 ':'♡ 喜欢 ')+this.likeCount).fontSize(16).fontColor(this.postLiked?'#A3536B':'#7B6975').backgroundColor(this.postLiked?'#F1CDD9':'#EAE1EC').scale({x:this.postLiked?1.04:1,y:this.postLiked?1.04:1}).enabled(!this.busy).onClick(()=>this.run(async()=>{await this.togglePostLike();})); Text('举报').fontSize(12).fontColor('#B3A095').onClick(() => this.confirm('举报这条内容', '将提交为不适当内容，交由管理员处理。', async () => { const body: ReportRequest = new ReportRequest(); body.reason = '用户反馈：内容不适当，请审核'; await this.cloud.request('/community/posts/' + this.selectedPost.id + '/reports', http.RequestMethod.POST, body); this.toast('举报已提交'); })) }
  Row({space:10}){Button((this.selectedPost.favorited?'已收藏 ':'收藏 ')+(this.selectedPost.favorite_count||0),{type:ButtonType.Normal}).height(44).layoutWeight(1).fontColor('#8D6B88').backgroundColor('#EADFEA').onClick(()=>this.run(async()=>{await this.cloud.request('/community/posts/'+this.selectedPost.id+'/favorite',this.selectedPost.favorited?http.RequestMethod.DELETE:http.RequestMethod.POST,this.selectedPost.favorited?null:new Object());const next:CommunityPost=JSON.parse(JSON.stringify(this.selectedPost)) as CommunityPost;next.favorited=!next.favorited;next.favorite_count=Math.max(0,(next.favorite_count||0)+(next.favorited?1:-1));this.selectedPost=next;}));if(this.selectedPost.user_id!==this.cloud.session.userId){Button(this.relationship.following?'已关注':'关注作者',{type:ButtonType.Normal}).height(44).layoutWeight(1).fontColor('#557B70').backgroundColor('#DDE9DF').onClick(()=>this.run(async()=>{await this.cloud.request('/community/users/'+this.selectedPost.user_id+'/follow',this.relationship.following?http.RequestMethod.DELETE:http.RequestMethod.POST,this.relationship.following?null:new Object());const next:CommunityRelationship=JSON.parse(JSON.stringify(this.relationship)) as CommunityRelationship;next.following=!next.following;this.relationship=next;}))}}.width('100%').margin({top:12})
  Text('查看作者的公开主页 →').fontSize(13).fontColor('#9D82AD').margin({ top: 18 }).onClick(() => this.run(async () => { this.profilePosts = JSON.parse(await this.cloud.request('/community/users/' + this.selectedPost.user_id, http.RequestMethod.GET)) as CommunityPost[]; this.page = 'profile'; }))
  Text('聊聊这道好味道 · '+this.comments.length).fontSize(20).fontColor('#304F52').margin({top:24,bottom:9})
  if(!this.comments.length){Text('还没有留言，来坐第一桌').fontSize(15).fontColor('#718078')}
  ForEach(this.comments, (c: CommunityComment) => { Column({ space: 8 }) { if (c.parent_id) { Text('↳ 回复').fontSize(10).fontColor('#AA8DB6') } Text(c.body).fontSize(14).fontColor('#83909A').width('100%'); Text('回复这条').fontSize(11).fontColor('#7797AF').onClick(() => { this.replyTo = c.id; this.replyLabel = c.body.slice(0, 24); }) }.alignItems(HorizontalAlign.Start).padding(16).width('100%').backgroundColor(this.surface()).borderRadius(15).margin({ top: 10 }) }, (c: CommunityComment) => c.id)
  if (this.replyTo) { Text('回复：' + this.replyLabel + ' · 点此取消').fontSize(12).fontColor('#AB89B8').margin({ top: 12 }).onClick(() => { this.replyTo = ''; this.replyLabel = ''; }) }
  TextInput({ text: this.commentText, placeholder: '留一句话…' }).margin({ top: 20 }).onChange((v: string) => { this.commentText = v; })
  Button(this.busy?'发送中…':'发送评论').enabled(!this.busy && this.commentText.trim().length>0).backgroundColor('#DCEBF5').fontColor('#6F91A9').margin({ top: 10 }).onClick(() => this.run(async () => { const body: CommentRequest = new CommentRequest(); body.body = this.commentText.trim(); if (this.replyTo) { body.parentId = this.replyTo; } await this.cloud.request('/community/posts/' + this.selectedPost.id + '/comments', http.RequestMethod.POST, body); this.commentText = ''; this.replyTo = ''; this.replyLabel = ''; await this.openPost(this.selectedPost); }))
  if (this.selectedPost.user_id === this.cloud.session.userId) { Button('撤回分享').backgroundColor('#F7E4DE').fontColor('#B68471').margin({ top: 15 }).onClick(() => this.confirm('撤回这条分享', '其他用户将无法继续查看。', async () => { await this.cloud.request('/community/posts/' + this.selectedPost.id, http.RequestMethod.DELETE); await this.loadFeed('mine'); })) }
 }
 private async loadInbox():Promise<void>{this.page='notifications';this.inboxError='';if(!this.loggedIn){this.inbox=new CommunityInbox();this.inboxError='登录后查看消息';return;}const owner:string=this.cloud.session.userId;try{const value:CommunityInbox=JSON.parse(await this.cloud.request('/community/notifications?unread='+String(this.inboxUnread),http.RequestMethod.GET)) as CommunityInbox;if(this.loggedIn&&this.cloud.session.userId===owner){this.inbox=value;}}catch(_){this.inboxError='消息暂未加载，请重试';}}
 private notificationLabel(kind:string):string{return kind==='like'?'喜欢了你的分享':kind==='comment'?'评论了你的分享':kind==='reply'?'回复了你的评论':kind==='follow'?'关注了你':'分享了新的一餐';}
 @Builder notificationsPage(){
  Row(){Text('餐桌消息').fontFamily('ShikuHand').fontSize(27).fontColor('#566C70').layoutWeight(1);Text('全部已读').fontSize(15).padding(12).fontColor('#8D7188').enabled(this.loggedIn).onClick(()=>this.run(async()=>{await this.cloud.request('/community/notifications/read',http.RequestMethod.POST,new Object());await this.loadInbox();}))}.width('100%')
  Row(){Text('只看未读 · '+this.inbox.unreadCount).fontSize(16).fontColor('#5F7869').layoutWeight(1);Toggle({type:ToggleType.Switch,isOn:this.inboxUnread}).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((value:boolean)=>{this.inboxUnread=value;this.run(async()=>{await this.loadInbox();});});Text('刷新').fontSize(15).padding(12).onClick(()=>this.run(async()=>{await this.loadInbox();}))}.constraintSize({minHeight:44}).width('100%').margin({bottom:18})
  if(this.inboxError){Text(this.inboxError).fontSize(16).fontColor('#99725C')}else if(!this.inbox.items.length){Text('暂时没有新消息').fontSize(16).fontColor('#7F8D7D')}
  ForEach(this.inbox.items,(item:CommunityNotification)=>{Column({space:8}){Text((item.read_at?'':'● ')+(item.actor_name||'小怪朋友')+this.notificationLabel(item.kind)).fontSize(17).fontColor('#4B6861');Text(item.created_at.slice(0,16).replace('T',' ')).fontSize(13).fontColor('#8E8777')}.width('100%').alignItems(HorizontalAlign.Start).padding(17).backgroundColor(item.read_at?'#90FFFFFF':'#C9E1E8DA').borderRadius({topLeft:11,topRight:21,bottomLeft:18,bottomRight:9}).margin({bottom:11}).onClick(()=>this.run(async()=>{await this.cloud.request('/community/notifications/'+item.id+'/read',http.RequestMethod.POST,new Object());if(item.post_id){const post:CommunityPost=JSON.parse(await this.cloud.request('/community/posts/'+item.post_id,http.RequestMethod.GET)) as CommunityPost;await this.openPost(post);}else{await this.loadInbox();}}))},(item:CommunityNotification)=>item.id)
 }
 @Builder publishPage() {
  this.title('SHARE WITH CARE', '这一餐，分享给谁', '私有日记不会自动公开')
  if(!this.publishSource){Image($r('app.media.community_compose')).width('100%').height(130).objectFit(ImageFit.Contain)}
  ForEach(this.meals.filter((m:Meal)=>m.id===this.publishSource),(m:Meal)=>{Column({space:10}){Text(m.name).fontSize(21).fontColor('#304F52');if(m.localPhoto){Image('file://'+m.localPhoto).width('100%').height(190).objectFit(ImageFit.Contain).borderRadius(18)}Button(m.localPhoto||m.photoId?'更换照片 / 编辑这餐':'添加照片').onClick(()=>{this.startMeal(m);this.mealAfterSave='publish';})}.width('100%').padding(16).backgroundColor('#F1E4D3').borderRadius(18).margin({bottom:18})})
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(10),cross:LengthMetrics.vp(10)}}) { ForEach(['public','family'], (v: string,index: number) => { Column() { ChoiceChip({ label: ['公开社区 · 先审核','仅家庭成员'][index], selected: this.publishScope === v, tint: '#EEE4F5', ink: '#9476AB' }) }.onClick(() => { this.publishScope = v; }) }) }.margin({ bottom: 20 })
  if (this.publishScope === 'family') { if(!this.families.length){Text('先加入或创建家庭，再分享给家人').fontSize(15).fontColor('#718078');Button('管理我的家庭').onClick(()=>this.run(async()=>{await this.loadAccount();this.page='account';}))} ForEach(this.families, (f: Family) => { Column() { ChoiceChip({ label: f.name, selected: this.publishFamily === f.id, tint: '#E2EDF7', ink: '#6A8EAA' }) }.margin({ bottom: 8 }).onClick(() => { this.publishFamily = f.id; }) }, (f: Family) => f.id) }
  Row() { Text('展示估算花费').fontSize(15).fontColor('#9B896A').layoutWeight(1); Toggle({ type: ToggleType.Switch, isOn: this.publishPrice }).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v: boolean) => { this.publishPrice = v; }) }.constraintSize({minHeight:44}).padding(18).backgroundColor('#FFF5E4').borderRadius(18).margin({ bottom: 18 })
  Text('公开分享需审核；花费可选择隐藏。').fontSize(14).fontColor('#65736C').lineHeight(24)
  Button('下一步 · 检查并确认').width('100%').height(49).backgroundColor('#60877C').margin({ top: 25 }).onClick(() => this.run(async () => { await this.publishMeal(); }))
 }
 @Builder barcodePage() {
  this.title('YOUR OWN LITTLE CATALOG', '我的条码模板', '扫码只作预填辅助，始终由你确认保存')
  if (this.store.state.templates.length === 0) { this.empty('包装信息，记住一次就好', '录入食材时展开选填，填写条码并保存私有模板。') }
  ForEach(this.store.state.templates, (t: Template) => {
   Column({ space: 12 }) { Row({ space: 12 }) { Image(this.foodImage(t.name,t.category)).sourceSize({width:160,height:160}).width(60).height(60).objectFit(ImageFit.Contain).flexShrink(0).borderRadius(16); Column({ space: 6 }) { Text(t.name).fontSize(18).fontColor('#526F81'); Text(t.barcode).fontSize(12).fontColor('#A8A096'); Text(`${t.days}天 · ${t.location}`).fontSize(11).fontColor('#A8A096') }.alignItems(HorizontalAlign.Start).layoutWeight(1) }.width('100%'); Row({ space: 12 }) { Text('使用/编辑').fontSize(12).fontColor('#7999AF').onClick(() => { this.useTemplate(t); this.barcode = t.barcode; this.saveBarcode = true; this.moreDetails = true; }); Text('删除').fontSize(12).fontColor('#BA947F').onClick(() => this.confirm('删除私有模板', '已有库存记录不会删除。', async () => { await this.store.deleteTemplate(t); })) } }.padding(18).width('100%').backgroundColor(this.surface()).borderRadius(19).margin({ bottom: 12 })
  }, (t: Template) => t.id)
 }
 @Builder familyMembersPage() {
  this.title('A SHARED PANTRY', this.selectedFamily.name, '成员读写共享记录，管理员管理成员')
  Image($r('app.media.pantry_hero')).width('100%').height(150).objectFit(ImageFit.Cover).border({ width: 0.6, color: '#B7AC94' }).borderRadius(15).margin({ bottom: 17 })
  if (this.selectedFamily.role === 'admin') { Text('家庭邀请码').fontSize(12).fontColor('#A18AAE'); Text(this.familyInvite).fontSize(14).fontColor('#728FA6').copyOption(CopyOptions.InApp).margin({ top: 8, bottom: 12 }); Button('更换邀请码').backgroundColor('#F1E5F5').fontColor('#9B7CAB').margin({ bottom: 15 }).onClick(() => this.confirm('更换家庭邀请码', '旧邀请码将立即失效，已加入的成员不受影响。', async () => { const code: InviteCode = JSON.parse(await this.cloud.request('/families/' + this.selectedFamily.id + '/invite', http.RequestMethod.POST, new Object())) as InviteCode; this.familyInvite = code.inviteCode; })) }
  ForEach(this.familyMembers, (m: FamilyMember) => { Row() { Column({ space: 7 }) { Text(m.email).fontSize(14).fontColor('#6F8595'); Text(m.role === 'admin' ? '管理员' : '普通成员').fontSize(11).fontColor('#AA9B87') }.alignItems(HorizontalAlign.Start).layoutWeight(1); if (this.selectedFamily.role === 'admin' && m.role !== 'admin') { Text('移除').fontSize(12).fontColor('#BA8C7A').onClick(() => this.confirm('移除成员', '对方将失去该家庭共享访问权限。', async () => { await this.cloud.request('/families/' + this.selectedFamily.id + '/members/' + m.user_id, http.RequestMethod.DELETE); await this.openFamily(this.selectedFamily); })) } }.padding(18).backgroundColor(this.surface()).borderRadius(17).margin({ bottom: 10 }) }, (m: FamilyMember) => m.user_id)
 }
 private async navigateBack():Promise<void>{if(this.page==='meal'){await this.persistMealEditorDraft();}const previous:string=this.page;this.navigationDirection=-1;await this.backPage();if(this.page===previous){this.navigationDirection=0;}}
 private async backPage(): Promise<void> {if(this.companionChatOpen){this.closeCompanion();return;}if((this.page==='assistant-shopping'||this.page==='meal-plan')&&this.companionReturnOpen){this.companionReturnOpen=false;this.page=this.companionOriginPage;this.tab=this.companionOriginTab;this.companionChatOpen=true;setTimeout(()=>{this.companionScroller.scrollTo({xOffset:0,yOffset:this.assistantReadingY});},32);return;}if(this.page==='recipe'&&this.recipeReturn==='assistant-overlay'){this.companionReturnOpen=false;this.page=this.companionOriginPage;this.tab=this.companionOriginTab;const origin=this.recipes.find((r:Recipe)=>r.id===this.companionOriginRecipe);if(origin){this.selectedRecipe=origin;}this.recipeReturn=this.companionOriginReturn;this.companionChatOpen=true;setTimeout(()=>{this.companionScroller.scrollTo({xOffset:0,yOffset:this.assistantReadingY});},32);return;}if(this.page==='assistant-shopping'){this.navigationOffset=this.assistantReadingY;this.page='ai-assistant';return;}if(this.page==='ai-assistant'){this.assistantReadingY=(this.pageScroller.currentOffset()?.yOffset || 0);if(this.assistantBusy){this.stopAssistantReply();}if(this.assistantOrigin==='recipe'&&this.assistantOriginRecipe){const origin:Recipe|undefined=this.recipes.find((r:Recipe)=>r.id===this.assistantOriginRecipe);if(origin){this.openRecipe(origin);this.recipeReturn=this.assistantOriginRecipeReturn;return;}}this.page=this.assistantOrigin;return;}if(this.page==='community-search'){this.communitySearchRequest++;this.communitySearchBusy=false;this.page='community';return;}if(this.page==='leftovers'||this.page==='dining-places'){this.page='';this.tab=4;return;}if(this.page==='trash'){this.settingsGroup='数据与备份';this.page='settings-detail';return;}if(this.page==='recipe-correction'){this.page='recipe';return;}if(this.page==='daily-flow'){this.page='';this.tab=5;return;}if(this.page==='deduction'){this.page='recipe';return;}if(this.page==='workspace'){this.page='daily-flow';return;}if(this.page==='catalog-update'){this.catalogPackage=null;this.settingsGroup='数据与备份';this.page='settings-detail';return;}if(this.page==='collections'){this.page=this.collectionReturn;return;}if(this.page==='procurement'){this.page='meal-plan';return;}if(this.page==='notifications'){await this.loadFeed(this.feedScope);return;}if((this.page==='account'||this.page==='settings-detail'&&this.settingsGroup==='账号与同步')&&this.accountSection){this.accountSection='';return;}if(this.page==='account-recovery'){this.page='auth';this.authError='';return;}if(this.page==='account-security'){this.page='account';this.authError='';return;}if(this.page==='recipe-search'){this.page=this.searchReturn;this.tab=this.searchReturnTab;return;}if(this.page==='ingredient-recipes'){this.page=this.ingredientReturn;return;}if(this.page==='recipe'&&this.recipeOriginList&&!this.recipeReturn){this.restoreRecipeList=true;this.page='';return;} if(this.page==='meal-plan'&&this.planReturn){this.page=this.planReturn;this.planReturn='';return;} if(this.page==='compare'||this.page==='recent-recipes'||this.page==='meal-plan'){this.page='';return;} if(this.page==='recipe-filters'){this.cancelRecipeFilters();return;} if(this.page==='auth'&&this.authReturn==='community'){this.authReturn='';this.page='community';return;} if(this.page==='draw-result'){this.page='draw';return;}if(this.page==='recipe-works'){this.page='recipe';return;}if(this.page==='post'){if(this.postReturn!=='community'){this.page=this.postReturn;}else{await this.loadFeed(this.feedScope);}return;}if(this.page==='publish'){this.page='community';return;}if(this.page==='settings-detail'){this.page='';this.tab=5;return;}if(this.page==='ingredient-knowledge'){this.page=this.knowledgeReturn;return;}if(this.page==='stock-detail'){this.page='stock-history';return;}if(this.page==='draw-dislikes'){this.page='draw';return;}if(this.page==='recipe'&&this.recipeReturn){if(this.recipeReturn==='ai-assistant'){this.navigationOffset=this.assistantReadingY;}this.page=this.recipeReturn;return;} if (this.page === 'meal' && this.mealFingerprint() !== this.mealInitial && !await this.ask('这一餐还没保存','离开会放弃本次编辑，已保存的记录不受影响。','放弃修改','继续记录')) { return; } if (this.page === 'cook-guide') { if(this.cookKeepOn){await this.cookScreen(false);} this.page = 'recipe'; return; } if (this.page === 'region-picker') { this.page = this.regionReturn; return; } if (this.page === 'my-profile' && this.profileDirty && !await this.ask('资料还没保存','离开后本次未保存的修改会放弃。','放弃修改','继续编辑')) { return; } this.profileDirty = false; this.page = ''; }
 @Builder profilePortrait(size: number) {
  Stack(){
   if(this.profileAvatarUrl && this.profile.avatarId){Image(this.profileAvatarUrl).width(size-8).height(size-8).objectFit(ImageFit.Cover).borderRadius((size-8)/2).onError(()=>{this.profileAvatarUrl='';})}
   else{Image(avatarImage(this.profile.avatarPreset)).width(size-8).height(size-8).objectFit(ImageFit.Contain).borderRadius((size-8)/2)}
  }.width(size).height(size).backgroundColor('#FFF8E6').borderRadius(size/2).border({width:1,color:'#A9B286'}).shadow({radius:1,color:'#559B855F',offsetX:1,offsetY:2})
 }
 @Builder myProfilePage() {
  this.title('','示例主体资料','')
  Row({space:12}){Column(){this.profilePortrait(72)}.onClick(()=>this.run(async()=>{await this.chooseAvatarPhoto();}));Column({space:6}){Text(this.profile.displayName||'我的吃饭档案').fontFamily('ShikuHand').fontSize(23).lineHeight(30).lineBreakStrategy(LineBreakStrategy.BALANCED).maxLines(2).fontColor('#36564D');Text(this.profile.regionName||'地区未设置').fontSize(14).fontColor('#786484')}.layoutWeight(1).alignItems(HorizontalAlign.Start)}.width('100%').constraintSize({minHeight:96}).padding({left:14,right:14,top:10,bottom:10}).backgroundImage($r('app.media.crayon_ribbon_lilac')).backgroundImageSize({width:'100%',height:'100%'}).margin({bottom:10})
  Row() { Text('选择一个餐桌伙伴').fontSize(14).fontWeight(FontWeight.Medium).fontColor('#425954').layoutWeight(1); Text('相册换头像 ↗').fontSize(14).fontColor('#946346').constraintSize({minHeight:44}).padding({left:8,right:0}).onClick(() => this.run(async () => { await this.chooseAvatarPhoto(); })) }.width('100%').margin({ bottom: 9 })
  Row({ space: 7 }) { ForEach(['tomato','rice','cat','mushroom'],(key: string,index: number) => { Column({ space: 2 }) { Image(avatarImage(key)).width(Math.min(60,(this.contentWidth()-21)/4-8)).height(Math.min(60,(this.contentWidth()-21)/4-8)).flexShrink(0).objectFit(ImageFit.Contain); Text(['小番茄','米饭团','小厨喵','森林菇'][index]).fontSize(12).fontColor('#687568') }.layoutWeight(1).padding({ top: 5,bottom: 10 }).backgroundImage(this.profile.avatarPreset===key&&!this.profile.avatarId?$r('app.media.crayon_swatch_wheat'):'').backgroundImageSize({width:'100%',height:'100%'}).onClick(() => { this.chooseProfilePreset(key); }) }) }.margin({ bottom: 22 })
  this.smallLabel('怎么称呼你'); TextInput({ text: this.profile.displayName,placeholder: '昵称，2–24字' }).id('profile-name').maxLength(24).height(47).fontSize(15).backgroundColor('#B0FFFFFF').border({ width: 0.7,color: '#DDD8CC' }).borderRadius(12).onChange((v: string) => { const next: UserProfile = JSON.parse(JSON.stringify(this.profile)) as UserProfile; if (next.displayName !== v) { next.displayName = v; this.profile = next; this.profileDirty = true; } })
  Row() { Column({ space: 6 }) { Text('所在地区').fontSize(13).fontColor('#6C766C'); Text(this.profile.regionName || '选择地区（可选）').fontSize(16).fontColor('#304F52') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Text('选择 ›').fontSize(13).fontColor('#A16F52') }.width('100%').padding({ top: 17,bottom: 17 }).border({ width: { bottom: 0.6 },color: '#DAD6CA' }).onClick(() => { this.regionReturn = 'my-profile'; this.profileRegionSearch = ''; this.page = 'region-picker'; })
  this.smallLabel('吃饭小目标')
  Flex({ wrap: FlexWrap.Wrap,space: { main: LengthMetrics.vp(8),cross: LengthMetrics.vp(8) } }) { ForEach(['均衡饮食','控制热量','高蛋白','清淡少油'],(value: string) => { Column() { ChoiceChip({ label: value,selected: this.profile.dietGoal === value,tint: '#DDE7DA' }) }.onClick(() => { const next: UserProfile = JSON.parse(JSON.stringify(this.profile)) as UserProfile; next.dietGoal = value; this.profile = next; this.profileDirty = true; }) }) }.margin({ top: 5,bottom: 14 })
  this.smallLabel('一句话介绍自己（可选）'); TextArea({ text: this.profile.bio,placeholder: '喜欢什么味道，最近在认真吃什么…' }).maxLength(160).height(90).fontSize(14).backgroundColor('#90FFFFFF').borderRadius(12).onChange((v: string) => { const next: UserProfile = JSON.parse(JSON.stringify(this.profile)) as UserProfile; if (next.bio !== v) { next.bio = v; this.profile = next; this.profileDirty = true; } })
  Button('保存示例主体资料',{ type: ButtonType.Normal }).id('save-profile').width('100%').height(48).fontSize(15).fontColor('#FFFFFF').linearGradient({ angle: 110,colors: [['#385D59',0],['#263F49',1]] }).borderRadius(13).margin({ top: 23,bottom: 13 }).enabled(!this.busy).onClick(() => this.run(async () => { await this.saveProfile(); }))
  if (!this.loggedIn) { Text('登录 / 注册账号 →').fontSize(13).fontColor('#A16F52').padding(8).onClick(() => { this.authRegister = false; this.page = 'auth'; }) }
  if (this.loggedIn) { Text('刷新资料').fontSize(12).fontColor('#6F7667').padding(8).onClick(() => this.confirm('重新读取资料','未保存修改会被账号资料替换。',async () => { await this.loadAccount(); })) }
  if (this.loggedIn) { Text('账号安全与家庭空间 →').fontSize(13).fontColor('#A16F52').padding(8).onClick(() => this.run(async () => { await this.loadAccount(); this.page = 'account'; })) }
 }
 @Builder profileRegionPage() {
  this.title('ROOTS & FLAVOURS','你在哪里生活','地区为可选资料，也会为你预选相近的地区口味')
  TextInput({ text: this.profileRegionSearch,placeholder: '搜索省份或地区' }).height(45).backgroundColor('#B0FFFFFF').borderRadius(12).onChange((v: string) => { this.profileRegionSearch = v; }).margin({ bottom: 19 })
  Text('暂不设置').constraintSize({minHeight:44}).padding({left:8,right:8}).fontSize(13).fontColor('#6F7667').margin({ bottom: 17 }).onClick(() => { this.chooseProfileRegion(new ProfileRegion('','')); })
  Flex({ wrap: FlexWrap.Wrap,space: { main: LengthMetrics.vp(9),cross: LengthMetrics.vp(12) } }) { ForEach(PROFILE_REGIONS.filter((region: ProfileRegion) => !this.profileRegionSearch || region.name.includes(this.profileRegionSearch)),(region: ProfileRegion) => { Column() { ChoiceChip({ label: region.name,selected: this.profile.regionCode === region.code,tint: '#E1E7DB' }) }.onClick(() => { this.chooseProfileRegion(region); }) }) }
 }
 private async loadAccountSecurity():Promise<void>{try{this.accountSecurity=JSON.parse(await this.cloud.request('/auth/account',http.RequestMethod.GET)) as AccountSecurity;this.smsStatusValue=await this.cloud.smsStatus();this.smsDraft=new SmsAuthDraft();this.smsPassword='';this.smsClosing=false;}catch(error){this.authError=(error as Error).message;}}
 private async switchAccountData():Promise<void>{
  this.clearCommunitySearch();
  await this.utilityWrite;
  const endpoint:string=this.endpoint;
  await this.store.selectAccountSpace(this.getUIContext().getHostContext() as common.UIAbilityContext,this.cloud.session.userId,this.email);
  await this.store.setting('endpoint',endpoint);await this.store.setting('boundEmail',this.email);await this.store.setting('loginSyncOwner',this.cloud.session.userId);
  this.claims=[];this.claimsLoaded=false;this.claimsError='';this.catalogPackage=null;this.experience=new ExperienceState();this.activeCollection='';this.collectionReturn='';this.autoSync=false;this.inbox=new CommunityInbox();this.relationship=new CommunityRelationship();this.discovery=new DiscoverySummary();this.discoveryLoaded=false;this.discoveryOwner='';this.posts=[];this.comments=[];this.works=[];this.feedPhotos=new Map();this.worksPhotos=new Map();this.ownPhotoUrls=new Map();this.mealPhoto=new LocalPhoto();this.mealDishes=[];this.recipeResumeRows=[];this.utility=new UtilityState();this.drawResult=new MenuResult();this.dailyRecipeId='';this.drawLocked=[];this.resetRecipeFilters();
  await this.initialize();if(this.error){throw new Error(this.error);}await this.flushLoginSync();
 }
 private async requestAccountMail(reset:boolean):Promise<void>{this.authError='';try{const result:AccountMailResult=JSON.parse(await this.cloud.request(reset?'/auth/password/request-reset':'/auth/email/request',http.RequestMethod.POST,new AccountEmail(this.email))) as AccountMailResult;this.authError=result.message||'请求已受理，请查看邮箱';}catch(error){this.authError=(error as Error).message;}}
 private async confirmAccountToken(reset:boolean):Promise<void>{this.authError='';try{if(reset&&(!!newPasswordError(this.passwordNew)||this.passwordNew!==this.authConfirm)){throw new Error('两次新密码须一致，至少6位且含字母和数字');}await this.cloud.request(reset?'/auth/password/reset':'/auth/email/confirm',http.RequestMethod.POST,new AccountToken(this.email,this.accountToken,this.passwordNew));this.accountToken='';this.authConfirm='';this.passwordNew='';if(reset){await Vault.clear();this.cloud.session=new Session();this.loggedIn=false;this.page='auth';this.toast('密码已重置，请重新登录');}else{await this.loadAccountSecurity();this.toast('邮箱已验证');}}catch(error){this.authError=(error as Error).message;}}
 @Builder accountRecoveryPage(){
  Text(this.page==='account-recovery'?'账号帮助':'账号安全').fontFamily('ShikuHand').fontSize(30).fontColor('#72547F').width('100%').margin({bottom:18})
  if(this.page==='account-recovery'){
   Text('已有账号请用账号密码登录后绑定手机号；绑定后可通过短信登录和找回密码。未绑定手机的旧账号请联系客服核实归属。').fontSize(16).lineHeight(25).fontColor('#6B7A6D')
  }else{
   if(this.cloud.session.role!=='admin'){
    Text('手机号与账号安全').fontSize(21).fontColor('#72547F').width('100%').margin({top:15,bottom:12})
    Text(this.smsStatusValue.phoneBound?'已绑定 '+this.smsStatusValue.phoneMasked:'绑定手机后可短信登录、找回密码；原账号数据保留。').fontSize(15).lineHeight(24).fontColor('#6B7A6D').width('100%')
    if(!this.smsStatusValue.phoneBound||this.smsClosing){this.smsFields()}
    else{Text('换绑请联系客服核实。').fontSize(13).fontColor('#7F7568');Button('通过短信注销账号',{type:ButtonType.Normal}).height(46).fontColor('#A46B58').backgroundColor('#F0DFD3').margin({top:12}).onClick(()=>{this.smsClosing=true;this.smsDraft.clearProof();this.authError='';})}
   }
   Text('注销账号').fontSize(21).fontColor('#A46B58').width('100%').margin({top:25,bottom:12})
   Text('注销会删除示例主体云端数据并撤回分享；本机记录保留。存在家庭共享关系时需先处理。').fontSize(15).lineHeight(24).fontColor('#7F7568')
   TextInput({text:this.passwordCurrent,placeholder:'当前密码'}).type(InputType.Password).height(48).margin({top:12}).onChange((value:string)=>{this.passwordCurrent=value;})
   TextInput({text:this.accountDeleteConfirm,placeholder:'输入：注销我的账号'}).height(48).margin({top:12}).onChange((value:string)=>{this.accountDeleteConfirm=value;})
   Button('注销云端账号',{type:ButtonType.Normal}).height(48).width('100%').margin({top:18}).fontColor('#A46B58').backgroundColor('#F0DFD3').enabled(this.accountDeleteConfirm==='注销我的账号'&&!!this.passwordCurrent).onClick(()=>this.confirm('确定注销账号？','此操作会清除云端示例主体数据，撤回公开分享并退出所有设备。',async()=>{await this.cloud.request('/auth/account',http.RequestMethod.DELETE,new AccountDeletion(this.passwordCurrent,this.accountDeleteConfirm));await Vault.clear();this.cloud.session=new Session();this.loggedIn=false;this.passwordCurrent='';this.accountDeleteConfirm='';this.discovery=new DiscoverySummary();this.discoveryLoaded=false;this.page='';this.tab=5;this.toast('云端账号已注销，本机记录保留');}))
  }
  if(this.authError){Text(this.authError).fontSize(15).lineHeight(24).fontColor('#A46B58').width('100%').padding(12).margin({top:15}).backgroundColor('#F1E1D3').borderRadius(12)}
 }

 @Builder authPage(){
  Row({space:14}){Image($r('app.media.brand_monster')).width(64).height(64).flexShrink(0).objectFit(ImageFit.Contain);Column({space:5}){Text('开饭小怪').fontFamily('ShikuHand').fontSize(30).fontColor('#795782');Text(this.authRegister?'认识你，很高兴':'回来一起吃饭').fontSize(16).fontColor('#6B7A6D')}.alignItems(HorizontalAlign.Start)}.width('100%').margin({bottom:12})

  Row({space:8}){Button('短信登录 / 注册',{type:ButtonType.Normal}).height(44).backgroundColor(this.smsMode==='sms'?'#E5DEEB':Color.Transparent).fontColor('#72547F').onClick(()=>this.changeSmsMode('sms'));Button('账号密码',{type:ButtonType.Normal}).height(44).backgroundColor(this.smsMode==='password'?'#E5DEEB':Color.Transparent).fontColor('#72547F').onClick(()=>this.changeSmsMode('password'))}.width('100%').margin({bottom:12})
  if(this.smsMode!=='password'){
   Text(this.smsMode==='reset'?'仅可找回已绑定手机号的普通账号；成功后所有设备需重新登录。':'未注册手机号验证后自动创建账号。已有账号请先用账号密码登录，再绑定手机号，保留原数据。').fontSize(14).lineHeight(23).fontColor('#6B7A6D').width('100%').margin({bottom:12})
   this.smsFields()
   Button(this.smsMode==='reset'?'返回短信登录':'已绑定手机？找回密码',{type:ButtonType.Normal}).height(44).fontColor('#72547F').backgroundColor(Color.Transparent).onClick(()=>this.changeSmsMode(this.smsMode==='reset'?'sms':'reset'))
  }else{
  AuthFloatingField({value:this.email,label:'账号',fieldId:'auth-email',maxChars:254,reduceMotion:this.reducedMotion,onValue:(v:string)=>{this.email=v;this.authError='';}})
  Text(this.authFocus==='account'?'自定义账号，无需邮箱验证':this.authRegister?'至少6位，包含字母和数字':'点显示密码可检查输入').fontSize(13).fontColor('#786184').constraintSize({minHeight:30})
  AuthFloatingField({value:this.password,label:'密码',fieldId:'auth-password',secret:true,reduceMotion:this.reducedMotion,onValue:(v:string)=>{this.password=v;this.authError='';}})
  if(this.authRegister){this.passwordGuide(this.password)}
  if(this.authRegister){
   AuthFloatingField({value:this.authConfirm,label:'确认密码',fieldId:'auth-confirm',secret:true,reduceMotion:this.reducedMotion,onValue:(v:string)=>{this.authConfirm=v;this.authError='';}})
   Text(this.authConfirm?(this.authConfirm===this.password?'✓ 两次密码一致':'两次密码还不一致'):'再次填写密码以确认').fontSize(12).fontColor(this.authConfirm&&this.authConfirm===this.password?'#477657':'#878573').width('100%').margin({bottom:12})
   this.smallLabel('昵称');TextInput({text:this.profile.displayName,placeholder:'2–24个字'}).id('auth-name').maxLength(24).height(49).backgroundColor('#B0FFFFFF').borderRadius(13).onChange((v:string)=>{const next:UserProfile=JSON.parse(JSON.stringify(this.profile)) as UserProfile;next.displayName=v;this.profile=next;this.authError='';})
   Row(){Text('地区（选填）').fontSize(14).fontColor('#6C766C').layoutWeight(1);Text((this.profile.regionName||'选择地区')+' ›').fontSize(15).fontColor('#A16F52')}.width('100%').padding({top:15,bottom:15}).onClick(()=>{this.regionReturn='auth';this.profileRegionSearch='';this.page='region-picker';})
  }
  if(this.authError){Text(this.authError).id('auth-error').fontSize(15).lineHeight(24).fontColor('#A34F47').width('100%').padding(13).backgroundColor('#F8E3D9').borderRadius(12).margin({top:12})}
  Button(this.busy?'正在连接…':this.authRegister?'创建小怪账号':'登录账号',{type:ButtonType.Normal}).id('auth-submit').width('100%').height(50).fontSize(17).fontColor('#FFFFFF').backgroundColor('#72547F').borderRadius({topLeft:13,topRight:25,bottomLeft:22,bottomRight:11}).margin({top:14,bottom:10}).enabled(!this.busy).onClick(()=>this.submitAuth())
  Row(){Blank();Button(this.authRegister?'已有账号？去登录':'没有账号？注册',{type:ButtonType.Normal}).height(44).fontSize(14).fontColor('#85638C').backgroundColor(Color.Transparent).onClick(()=>{this.authRegister=!this.authRegister;this.authShowPassword=false;this.authError='';this.authConfirm='';})}.width('100%')
  }
 }
 @State accountSection:string='';
 @Builder accountRow(label:string,section:string){
  Button({type:ButtonType.Normal}){Row(){Text(label).fontSize(15).fontColor('#354F46').layoutWeight(1);Text('›').fontSize(22).fontColor('#98998A')}.width('100%')}.width('100%').height(56).padding({left:0,right:0}).backgroundColor(Color.Transparent).borderRadius(0).touchFeedback().onClick(()=>this.run(async()=>{if(section==='profile'){this.page='my-profile';}else if(section==='security'){this.authError='';this.page='account-security';await this.loadAccountSecurity();}else{await this.loadAccount();this.accountSection=section;}}))
 }
 @Builder accountPage(){
  if(!this.loggedIn){this.authPage()}else if(this.accountSection){
   Button('‹ 账号',{type:ButtonType.Normal}).height(44).fontColor('#536B60').backgroundColor(Color.Transparent).onClick(()=>{this.accountSection='';})
   if(this.accountSection==='devices'){
  this.sectionHeader('01', '登录设备', '可解绑陌生设备', '#E8E2F6')
  ForEach(this.devices, (d: Device) => { Row() { Column({ space: 5 }) { Text(d.name).fontSize(16).fontColor('#536473').onClick(() => { this.renameDeviceId = d.id; this.renameDeviceName = d.name; }); Text(d.revoked_at ? '已解绑' : d.id === this.cloud.session.deviceId ? '当前设备' : '已登录').fontSize(11).fontColor('#A2AAB0') }.alignItems(HorizontalAlign.Start).layoutWeight(1); if (!d.revoked_at) { Text('解绑').fontSize(12).fontColor('#BA887E').onClick(() => this.confirm('解绑设备', d.name + ' 将无法继续使用云端账号。', async () => { await this.cloud.request('/devices/' + d.id, http.RequestMethod.DELETE); if (d.id === this.cloud.session.deviceId) { await Vault.clear(); this.loggedIn = false; this.page = ''; } else { await this.loadAccount(); } })) } }.padding(17).backgroundColor(this.surface()).borderRadius(16).margin({ bottom: 10 }) }, (d: Device) => d.id)
  TextInput({ text: this.renameDeviceName, placeholder: '点设备名称后修改名称' }).onChange((v: string) => { this.renameDeviceName = v; })
  Button('保存设备名称').backgroundColor('#E7EDF6').fontColor('#7B95AE').margin({ top: 10, bottom: 18 }).onClick(() => this.run(async () => { if (!this.renameDeviceId) { throw new Error('请先点选要重命名的设备'); } const body: FamilyName = new FamilyName(); body.name = this.renameDeviceName; await this.cloud.request('/devices/' + this.renameDeviceId, http.RequestMethod.PUT, body); await this.loadAccount(); }))
   }else if(this.accountSection==='family'){
   Text('家庭共享').fontSize(24).fontColor('#354F46').margin({bottom:16})
  ForEach(this.families, (f: Family) => { Row() { Column({ space: 5 }) { Text(f.name).fontSize(17).fontColor('#536473').onClick(() => this.run(async () => { await this.openFamily(f); })); Text(f.role === 'admin' ? '管理员' : '成员').fontSize(11).fontColor('#A2AAB0') }.alignItems(HorizontalAlign.Start).layoutWeight(1); if (f.role === 'admin') { Text('解散').fontSize(12).fontColor('#BA887E').onClick(() => this.confirm('解散家庭', '所有成员将失去共享空间访问权限。', async () => { await this.cloud.request('/families/' + f.id, http.RequestMethod.DELETE); await this.loadAccount(); })) } }.padding(17).backgroundColor('#FFFAF0').borderRadius(16).margin({ bottom: 10 }) }, (f: Family) => f.id)
  Text('点家庭名称可查看成员与管理权限').fontSize(11).fontColor('#A799AF').margin({ bottom: 10 })
  TextInput({ text: this.familyName, placeholder: '给家庭起个名字' }).onChange((v: string) => { this.familyName = v; })
  Button('创建家庭').backgroundColor('#E9E2F4').fontColor('#8876A2').margin({ top: 10, bottom: 18 }).onClick(() => this.run(async () => { const body: FamilyName = new FamilyName(); body.name = this.familyName; const f: Family = JSON.parse(await this.cloud.request('/families', http.RequestMethod.POST, body)) as Family; this.inviteCode = f.inviteCode; await this.loadAccount(); this.toast('家庭已创建，下方显示邀请码'); }))
  TextInput({ text: this.inviteCode, placeholder: '输入家庭邀请码' }).onChange((v: string) => { this.inviteCode = v; })
  Button('确认加入家庭').backgroundColor('#E2EDF6').fontColor('#6B8EAA').margin({ top: 10 }).onClick(() => this.confirm('加入家庭空间', '加入后可访问家庭共享内容，示例主体记录仍保持私有。', async () => { const body: InviteCode = new InviteCode(); body.inviteCode = this.inviteCode; await this.cloud.request('/families/join', http.RequestMethod.POST, body); await this.loadAccount(); }))   }else if(this.accountSection==='password'){
  this.smallLabel('修改密码（保存后需重新登录所有设备）')
  TextInput({ text: this.passwordCurrent, placeholder: '当前密码' }).type(InputType.Password).onChange((v: string) => { this.passwordCurrent = v; })
  TextInput({ text: this.passwordNew, placeholder: '新密码，至少6位字母和数字' }).type(InputType.Password).onChange((v: string) => { this.passwordNew = v; })
  Button('修改密码').backgroundColor('#F6E7DF').fontColor('#AF8A74').margin({ top: 10, bottom: 20 }).onClick(() => this.confirm('修改密码并退出所有设备', '本地记录不受影响。', async () => { const invalid:string=newPasswordError(this.passwordNew);if(invalid){throw new Error(invalid);}const body: PasswordRequest = new PasswordRequest(); body.currentPassword = this.passwordCurrent; body.newPassword = this.passwordNew; await this.cloud.request('/auth/password', http.RequestMethod.POST, body); await Vault.clear(); this.cloud.session = new Session(); this.loggedIn = false; this.passwordCurrent = ''; this.passwordNew = ''; this.page = ''; }))
   }
  }else{
   Column({space:6}){Text('账号').fontSize(26).fontWeight(FontWeight.Bold).fontColor('#354F46');Text(this.profile.displayName||this.email||'已登录账号').fontSize(14).fontColor('#7A8074')}.alignItems(HorizontalAlign.Start).width('100%').margin({top:4,bottom:20})
   Column({space:0}){
    Row({space:12}){Column({space:4}){Text(this.store.state.changes.length?'待同步 '+this.store.state.changes.length+' 条':'记录已保存').fontSize(16).fontWeight(FontWeight.Medium).fontColor('#354F46');Text(this.lastSync?'上次同步 '+this.lastSync:'尚未同步到云端').fontSize(12).fontColor('#7A8074').maxLines(2)}.layoutWeight(1).alignItems(HorizontalAlign.Start);Button(this.busy?'同步中…':'立即同步',{type:ButtonType.Normal}).height(44).fontSize(14).fontColor('#35584B').backgroundColor('#DFE9DE').borderRadius(12).enabled(!this.busy).onClick(()=>this.run(async()=>{await this.synchronize();}))}.width('100%').padding({top:16,bottom:16})
    Divider().color('#EEE8DD')
    Row(){Text('自动同步').layoutWeight(1).fontSize(15).fontColor('#354F46');Toggle({type:ToggleType.Switch,isOn:this.autoSync}).enabled(!this.busy).onChange((value:boolean)=>this.run(async()=>{await this.store.setting('autoSync',String(value));this.autoSync=value;}))}.width('100%').height(56)
    Divider().color('#EEE8DD')
    Row(){Text('仅在 Wi-Fi 下同步').layoutWeight(1).fontSize(15).fontColor('#354F46');Toggle({type:ToggleType.Switch,isOn:this.wifiOnly}).enabled(!this.busy).onChange((value:boolean)=>this.run(async()=>{await this.store.setting('wifiOnly',String(value));this.wifiOnly=value;}))}.width('100%').height(56)
    Divider().color('#EEE8DD')
    Button({type:ButtonType.Normal}){Row(){Text('同步详情'+(this.conflicts.length?' · '+this.conflicts.length+' 项待处理':'')).fontSize(15).fontColor('#354F46').layoutWeight(1);Text('›').fontSize(22).fontColor('#98998A')}.width('100%')}.height(56).width('100%').padding(0).backgroundColor(Color.Transparent).onClick(()=>{this.flowSection='同步';this.page='daily-flow';})
   }.width('100%').padding({left:16,right:16}).backgroundColor('#FFFDF6').border({width:1,color:'#E5DFD0'}).borderRadius(16).margin({bottom:16})
   Column({space:0}){this.accountRow('示例主体资料','profile');Divider().color('#EEE8DD');this.accountRow('账号安全','security');Divider().color('#EEE8DD');this.accountRow('登录设备','devices');Divider().color('#EEE8DD');this.accountRow('家庭共享','family');Divider().color('#EEE8DD');this.accountRow('修改密码','password')}.width('100%').padding({left:16,right:16}).backgroundColor('#FFFDF6').border({width:1,color:'#E5DFD0'}).borderRadius(16)
   Button('退出登录',{type:ButtonType.Normal}).width('100%').height(48).fontSize(15).fontColor('#FFFFFF').backgroundColor('#A33E38').borderRadius(12).margin({top:20}).onClick(()=>this.confirm('退出登录？','本机记录会保留。',async()=>{this.clearAssistant();await this.cloud.logout();this.clearCommunitySearch();this.loggedIn=false;this.password='';this.accountSection='';this.profile=new UserProfile();this.profileAvatarUrl='';}))
  }
 }
 @Builder sectionHeader(index: string, title: string, hint: string, tint: string) {
  Row({ space: 9 }) { Text(index).fontSize(11).fontWeight(FontWeight.Bold).fontColor('#5D6770').width(25).height(25).textAlign(TextAlign.Center).backgroundColor(tint).border({ width: 0.6, color: '#B7AC94' }).borderRadius(6); Text(title).fontFamily('HarmonyOS Sans SC').fontSize(20).fontWeight(FontWeight.Bold).fontColor('#263E46').maxLines(1).minFontSize(16).maxFontSize(20).layoutWeight(1) }.width('100%').margin({ bottom: 14 })
 }
 @Builder foodForm() {
  Button('常买几样 · 批量录入').height(48).width('100%').margin({bottom:12}).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.openFlow('常买');}))
  Row({ space: 8 }) { Text('1 选食材').fontSize(12).fontColor(this.formStep === 0 ? '#C67C3A' : '#7C8F7A').padding(8).backgroundColor('#FFF0DF').borderRadius(10); Text('—').fontColor('#D1D5D4'); Text('2 整理信息').fontSize(12).fontColor(this.formStep === 1 ? '#4E7DA0' : '#A4ADB0').padding(8).backgroundColor(this.formStep === 1 ? '#E4EFF9' : '#F0F2F2').borderRadius(10) }.margin({ bottom: 18, top: 8 })
  if (this.formStep === 0) {
   Text('今天，添点什么？').fontFamily('HarmonyOS Sans SC').fontSize(31).fontWeight(FontWeight.Bold).fontColor('#344450')
   Text('选一份熟悉的食材，帮你填好常用信息').fontSize(13).fontColor('#8F989F').margin({ top: 8, bottom: 22 })
   Row({ space: 10 }) { TextInput({ text: this.formName, placeholder: '搜索或输入其他食材' }).height(46).backgroundColor(this.surface()).borderRadius(14).layoutWeight(1).onChange((v: string) => { this.formName = v; }); Button('扫码').fontSize(13).height(46).backgroundColor('#E7ECF9').fontColor('#657DA2').borderRadius(14).onClick(() => this.run(async () => { await this.scanFood(); })) }.margin({ bottom: 20 })
   Text('输入包装条码查询  ›').fontSize(12).fontColor('#8E93AF').margin({ bottom: 13 }).onClick(() => { this.showCodeEntry = !this.showCodeEntry; })
   if (this.showCodeEntry) { Row({ space: 8 }) { TextInput({ text: this.manualCode, placeholder: 'EAN / UPC，不查询外部商品库' }).type(InputType.Number).layoutWeight(1).onChange((v: string) => { this.manualCode = v; }); Button('查找').fontSize(12).backgroundColor('#E4EBF7').fontColor('#7B8FA9').onClick(() => this.run(async () => { await this.lookupBarcode(this.manualCode); })) }.margin({ bottom: 13 }) }
   Grid() {
    ForEach(TEMPLATES.filter((t: Template) => !this.formName || t.name.includes(this.formName)), (t: Template) => {
     GridItem() {
      Column({ space: 8 }) { Image(this.foodImage(t.name, t.category)).width(76).height(67).objectFit(ImageFit.Contain).borderRadius(13); Text(t.name).fontFamily('HarmonyOS Sans SC').fontSize(18).fontWeight(FontWeight.Medium).fontColor('#43515A'); Text(`${t.location} · ${t.days}天`).fontSize(10).fontColor('#8A9295') }.width('100%').height('100%').justifyContent(FlexAlign.Center).backgroundColor(this.categoryTint(t.category)).border({ width: 0.5, color: '#C4BCAB' }).borderRadius({ topLeft: 8, topRight: 18, bottomLeft: 15, bottomRight: 8 })
     }.height(122).onClick(() => this.useTemplate(t))
    }, (t: Template) => t.name)
   }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).columnsTemplate('1fr 1fr 1fr').columnsGap(11).rowsGap(11).height(this.formName ? 268 : 390).width('100%')
   if (this.formName.trim()) { Button(`用“${this.formName.trim()}”继续 →`).width('100%').height(48).backgroundColor('#E69A62').fontColor('#FFFFFF').margin({ top: 14 }).onClick(() => { this.formStep = 1; }) }
   Row({ space: 10 }) { Text('✦').fontSize(20).fontColor('#C5935F'); Text('散装、自制食材也能记录。\n所有预填信息都可以修改。').fontSize(12).fontColor('#A18B76').lineHeight(21) }.width('100%').padding(17).backgroundColor('#FFF4E8').borderRadius(17).margin({ top: 20 })
  } else {
   Row({ space: 14 }) {
    Image(this.foodImage(this.formName, this.formCategory)).width(72).height(72).objectFit(ImageFit.Cover).borderRadius(20)
    Column({ space: 5 }) { Text(this.formName || '未命名食材').fontFamily('HarmonyOS Sans SC').fontSize(29).fontWeight(FontWeight.Bold).fontColor('#344450'); Text(this.editing.id ? '整理一下，继续好好保存' : '已经帮你填好，按实际情况调整').fontSize(11).fontColor('#929A9F') }.alignItems(HorizontalAlign.Start).layoutWeight(1)
    Text('更换').fontSize(12).fontColor('#B5845E').padding(10).backgroundColor('#FBEDDF').borderRadius(12).onClick(() => { this.formStep = 0; })
   }.width('100%').margin({ bottom: 20 })
   Column() {
    this.sectionHeader('01', '还有多少', '点选或调整', '#FFF0D2')
    Row({ space: 10 }) {
     Button('−').padding(0).width(43).height(43).fontSize(23).backgroundColor('#FFF2DB').fontColor('#B68639').borderRadius(13).onClick(() => this.changeQuantity(this.formUnit === 'g' ? -50 : -1))
     TextInput({ text: this.formQuantity }).type(InputType.Number).height(46).fontSize(24).fontWeight(FontWeight.Bold).textAlign(TextAlign.Center).backgroundColor('#FFFAF0').borderRadius(13).layoutWeight(1).onChange((v: string) => { this.formQuantity = v; })
     Button('＋').padding(0).width(43).height(43).fontSize(23).backgroundColor('#FFF2DB').fontColor('#B68639').borderRadius(13).onClick(() => this.changeQuantity(this.formUnit === 'g' ? 50 : 1))
    }
    Flex({ wrap: FlexWrap.Wrap, space: { main: LengthMetrics.vp(7), cross: LengthMetrics.vp(8) } }) {
     ForEach(UNITS, (u: string) => { Column() { ChoiceChip({ label: u, selected: this.formUnit === u, tint: '#FFF0D2', ink: '#AF8139' }) }.onClick(() => { this.formUnit = u; }) })
    }.margin({ top: 13 })
    Text(this.packageOpen?'收起包装换算 ↑':'按包装计算总量 ↓').fontSize(17).padding(12).fontColor('#426B5B').onClick(()=>{this.packageOpen=!this.packageOpen;})
    if(this.packageOpen){TextInput({text:this.packageCount,placeholder:'买了几包'}).type(InputType.Number).accessibilityText('包装数量').onChange((v:string)=>{this.packageCount=v;});TextInput({text:this.packageNet,placeholder:'每包净量（'+this.formUnit+'）'}).type(InputType.Number).accessibilityText('每包净量').onChange((v:string)=>{this.packageNet=v;});Button('应用实际总量').height(48).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{const quantity:number=Number(this.packageCount)*Number(this.packageNet);if(!Number.isFinite(quantity)||quantity<=0){this.toast('请填写有效包装数和每包净量');return;}this.formQuantity=String(Math.round(quantity*1000)/1000);});Text('总价填写本批全部包装的合计').fontSize(16).fontColor('#68776E')}
    Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([1, 2, 5, 10], (n: number) => { Text(this.formUnit === 'g' ? String(n * 100) : String(n)).fontSize(12).fontColor('#B09468').padding({ left: 15, right: 15, top: 7, bottom: 7 }).backgroundColor('#FAF6EC').borderRadius(10).onClick(() => { this.formQuantity = String(this.formUnit === 'g' ? n * 100 : n); }) }) }.width('100%').margin({ top: 10 })
   }.alignItems(HorizontalAlign.Start).padding(18).width('100%').backgroundColor(this.surface()).border({ width: 0.5, color: '#C4BCAB' }).borderRadius({ topLeft: 8, topRight: 20, bottomLeft: 14, bottomRight: 7 }).margin({ bottom: 14 })
   Column() {
    this.sectionHeader('02', '放在哪里', '可在设置中添加', '#DDEEF9')
    Flex({ wrap: FlexWrap.Wrap, space: { main: LengthMetrics.vp(8), cross: LengthMetrics.vp(9) } }) { ForEach(this.locations, (v: string) => { Column() { ChoiceChip({ label: (v.includes('冷冻') ? '❄ ' : v.includes('冷藏') ? '▦ ' : v.includes('阳台') ? '☀ ' : '▤ ') + v, selected: this.formLocation === v, tint: '#E0EFF9', ink: '#5885A5' }) }.onClick(() => { this.formLocation = v; }) }) }
   }.padding(18).width('100%').backgroundColor(this.surface()).border({ width: 0.5, color: '#C4BCAB' }).borderRadius({ topLeft: 8, topRight: 20, bottomLeft: 14, bottomRight: 7 }).margin({ bottom: 14 })
   Column() {
    this.sectionHeader('03', '什么时候到期', '按包装信息调整', '#F9E2DF')
    Row() { Text('购入日').fontSize(12).fontColor('#969C9F').layoutWeight(1); Text(this.formPurchased === dateString(new Date()) ? '今天  ›' : this.formPurchased + '  ›').fontSize(13).fontColor('#7E929F').onClick(() => this.chooseDate(false)) }.width('100%').margin({ bottom: 12 })
    Row() { Text('到期日期').fontSize(14).fontColor('#AC746B').layoutWeight(1); Text(this.formExpiry + '  ▦').fontSize(18).fontWeight(FontWeight.Medium).fontColor('#B27264') }.width('100%').padding(14).backgroundColor('#FFF0EB').borderRadius(13).onClick(() => this.chooseDate(true))
    Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([3,7,14,30], (n: number) => { Text(`${n}天`).fontSize(12).fontColor('#B58B79').padding({ left: 13, right: 13, top: 10, bottom: 10 }).backgroundColor('#FAF2EC').borderRadius(12).onClick(() => this.expiryAfter(n)) }) }.margin({ top: 12 })
   }.padding(18).width('100%').backgroundColor(this.surface()).border({ width: 0.5, color: '#C4BCAB' }).borderRadius({ topLeft: 8, topRight: 20, bottomLeft: 14, bottomRight: 7 }).margin({ bottom: 14 })
   Column({ space: 12 }) {
    Row() { Text('再补充一点').fontSize(15).fontWeight(FontWeight.Medium).fontColor('#82749C').layoutWeight(1); Text(this.moreDetails ? '收起 −' : '选填 ＋').fontSize(12).fontColor('#A193B4') }.width('100%').onClick(() => { this.moreDetails = !this.moreDetails; })
    if (this.moreDetails) {
     this.smallLabel('所属空间'); Row({ space: 8 }) { Column() { ChoiceChip({ label: '仅自己', selected: !this.formFamily, tint: '#E7E2F4', ink: '#8E79A8' }) }.onClick(() => { if (!this.editing.id) { this.formFamily = ''; } }); ForEach(this.families, (f: Family) => { Column() { ChoiceChip({ label: f.name, selected: this.formFamily === f.id, tint: '#E1EEF7', ink: '#6C91AA' }) }.onClick(() => { if (!this.editing.id) { this.formFamily = f.id; } else { this.toast('现有记录的所属空间不变，可新建共享记录'); } }) }, (f: Family) => f.id) }
     Row() { Text('关闭这份食材的提醒').fontSize(13).fontColor('#927FA4').layoutWeight(1); Toggle({ type: ToggleType.Switch, isOn: this.formMuted }).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v: boolean) => { this.formMuted = v; }) }.constraintSize({minHeight:44})
     this.smallLabel('名称'); TextInput({ text: this.formName }).onChange((v: string) => { this.formName = v; })
     this.smallLabel('分类'); Flex({ wrap: FlexWrap.Wrap, space: { main: LengthMetrics.vp(7), cross: LengthMetrics.vp(8) } }) { ForEach(CATEGORIES, (c: string) => { Column() { ChoiceChip({ label: c, selected: this.formCategory === c, tint: this.categoryTint(c), ink: this.categoryInk(c) }) }.onClick(() => { this.formCategory = c; this.run(async () => { const days: number = Number(await this.store.getSetting('shelf:' + c, c === '干货' || c === '调味品' ? '180' : '7')); this.expiryAfter(days); this.formLocation = c === '干货' || c === '调味品' ? '橱柜' : '冷藏室'; }); }) }) }
     this.smallLabel('购买价格（估算）'); TextInput({ text: this.formPrice, placeholder: '可以不填' }).type(InputType.Number).onChange((v: string) => { this.formPrice = v; })
     this.smallLabel('常用标签'); Flex({ wrap: FlexWrap.Wrap, space: { main: LengthMetrics.vp(7), cross: LengthMetrics.vp(8) } }) { ForEach(['新鲜购入','已开封','自制','家常','煲汤','冷冻保存'], (tag: string) => { Column() { ChoiceChip({ label: tag, selected: this.formTags.split('、').includes(tag), tint: '#EDE4F7', ink: '#8D75AA' }) }.onClick(() => this.toggleTag(tag)) }) }
     TextInput({ text: this.formTags, placeholder: '也可自定义标签' }).onChange((v: string) => { this.formTags = v; })
     this.smallLabel('批次号'); TextInput({ text: this.formBatch, placeholder: '选填' }).onChange((v: string) => { this.formBatch = v; })
     TextArea({ text: this.formNotes, placeholder: '保存小贴士、备注…' }).height(80).onChange((v: string) => { this.formNotes = v; })
     this.smallLabel('EAN / UPC条码'); TextInput({ text: this.barcode, placeholder: '选填' }).type(InputType.Number).onChange((v: string) => { this.barcode = v; })
     Row() { Text('存为我的条码模板').fontSize(13).layoutWeight(1); Toggle({ type: ToggleType.Switch, isOn: this.saveBarcode }).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v: boolean) => { this.saveBarcode = v; }) }.constraintSize({minHeight:44})
    }
   }.padding(18).width('100%').backgroundColor('#F0EAF7').borderRadius(20)
   if (this.editing.id) {
    Row({ space: 12 }) {
     Button('记录丢弃').layoutWeight(1).backgroundColor('#F8E6D7').fontColor('#B28554').onClick(() => this.confirm('记录丢弃', '归档并计入浪费估算。', async () => { await this.store.consume(this.editing, this.editing.quantity, true); this.page = ''; }))
     Button('删除').layoutWeight(1).backgroundColor('#F8E3E2').fontColor('#B37572').onClick(() => this.confirm('删除食材', '确认删除这份食材？', async () => { await this.store.deleteFood(this.editing); this.page = ''; }))
    }.margin({ top: 18 })
   }
  }
 }
 private preparationItems(group:string):Ingredient[]{return this.selectedRecipe.ingredients.filter((i:Ingredient)=>(i.optional||/^(食盐|盐|白糖|白砂糖|冰糖|生抽|老抽|酱油|食用油|植物油|香油|蚝油|料酒|陈醋|白醋|米醋|胡椒粉|鸡精|味精|淀粉|八角|桂皮)$/.test(i.name))===(group==='调味料'));}
 private togglePrepared(name:string):void{this.getUIContext().animateTo({duration:this.reducedMotion?0:180},()=>{this.preparedIngredients=this.preparedIngredients.includes(name)?this.preparedIngredients.filter((n:string)=>n!==name):this.preparedIngredients.concat([name]);});this.saveCookProgress();}
 @Builder recipeLearningIntro(){
  Row({space:8}){Text('准备什么').fontSize(22).fontColor('#304F52').layoutWeight(1);Text((this.selectedRecipe.people||2)+'人份').fontSize(14).fontColor('#7C7561');Text(this.toolsOpen?'工具 ↑':'工具 ↓').fontSize(14).fontColor('#7D7059').constraintSize({minHeight:44}).padding({left:10,right:10}).onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:220},()=>{this.toolsOpen=!this.toolsOpen;});})}.width('100%').margin({top:4,bottom:8})
  if(this.toolsOpen){Text(this.guide().equipment.join(' / ')).fontSize(15).lineHeight(25).fontColor('#6E7765').margin({bottom:12}).transition(TransitionEffect.OPACITY)}
  ForEach(['食材','调味料'],(group:string,index:number)=>{
   if(this.preparationItems(group).length){
    Row({space:10}){Image(uiIcon(index===0?'storage':'taste')).width(28).height(28).flexShrink(0).objectFit(ImageFit.Contain);Text(group).fontSize(18).fontColor('#446254').layoutWeight(1);Text(this.preparationItems(group).length+'项  '+(this.prepGroup===group?'↑':'↓')).fontSize(15).fontColor('#957253')}.width('100%').constraintSize({minHeight:48}).padding({left:12,right:12,top:8,bottom:8}).backgroundColor(index===0?'#85E3EBD9':'#85EDDEC4').borderRadius({topLeft:10,topRight:23,bottomLeft:19,bottomRight:9}).margin({bottom:9}).onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:220},()=>{this.prepGroup=this.prepGroup===group?'':group;this.prepIngredient='';});})
    if(this.prepGroup===group){ForEach(this.preparationItems(group),(i:Ingredient)=>{
     Column({space:9}){Row(){Text((this.preparedIngredients.includes(i.name)?'✓  ':'')+i.name).fontSize(17).fontColor('#426354').layoutWeight(1);Text(this.prepIngredient===i.name?'收起 ↑':'展开 ↓').fontSize(14).fontColor('#8A775B')}.width('100%').padding({top:10,bottom:10}).onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:180},()=>{this.prepIngredient=this.prepIngredient===i.name?'':i.name;});});if(this.prepIngredient===i.name){Text(i.quantity>0?'参考总量 '+i.quantity+i.unit:'推荐量待确认，按口味少量添加').fontSize(16).fontColor('#7D6950');Row({space:9}){Button(this.preparedIngredients.includes(i.name)?'已备好 ✓':'备好了',{type:ButtonType.Normal}).fontSize(15).backgroundColor('#E0E8D8').fontColor('#4A7058').onClick(()=>this.togglePrepared(i.name));if(knowledgeFor(i.name).length){Text('品类与替换 ›').fontSize(15).fontColor('#98704D').padding(10).onClick(()=>this.openKnowledge(i.name))}}}}.width('100%').alignItems(HorizontalAlign.Start).padding({left:15,right:15,bottom:8}).backgroundColor('#70FFFFFF').borderRadius(12).margin({bottom:7})
    },(i:Ingredient)=>i.name)}
   }
  })
 }

 @Builder recipeVariantPicker(){
  if(this.recipeVariants(this.selectedRecipe).length>1){
   Text('同一道菜，不同做法').fontFamily('ShikuHand').fontSize(22).fontColor('#635074').margin({top:4,bottom:10})
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(7),cross:LengthMetrics.vp(7)}}){ForEach(this.recipeVariants(this.selectedRecipe),(variant:Recipe,index:number)=>{Column(){ChoiceChip({label:variant.variantLabel||variant.name+' · '+(recipeCuisineGroup(variant)||variant.region||'家常'),selected:variant.id===this.selectedRecipe.id,ink:'#946D8D'})}.id('recipe-variant-'+variant.id).onClick(()=>{if(variant.id!==this.selectedRecipe.id){this.openRecipe(variant);}})},(variant:Recipe)=>variant.id)}
  }
 }
 private async toggleRecipeFavorite(recipeId:string='',withUndo:boolean=true):Promise<void>{
  if(this.busy&&withUndo){return;}const id:string=recipeId||this.selectedRecipe.id;const before:boolean=this.favorites.some((f:Favorite)=>f.recipeId===id);
  const stableRows:Recommendation[]=!this.page&&this.tab===3&&!this.favoritesOnly?this.recommendations().slice():[];
  this.busy=true;
  try{await this.store.favorite(id);if(stableRows.length){this.recipeResumeRows=stableRows;this.recipeResumeKey=this.recipeViewKey();}this.favorites=this.store.state.favorites.slice();}
  catch(e){this.toast((e as Error).message||'收藏未完成，请重试');}
  finally{if(withUndo){this.busy=false;}}
  const after:boolean=this.favorites.some((f:Favorite)=>f.recipeId===id);if(before===after){return;}if(withUndo){this.offerUndo(after?'已收藏':'已取消收藏',async()=>{if(this.favorites.some((f:Favorite)=>f.recipeId===id)!==after){throw new Error('收藏状态已变化');}await this.toggleRecipeFavorite(id,false);this.undoNotice='';},4000);}if(COMMUNITY_ENABLED&&this.loggedIn){try{await this.cloud.request('/discovery/favorites/'+encodeURIComponent(id),http.RequestMethod.PUT,new FavoriteUpdate(after));await this.refreshDiscovery();}catch(_){this.toast('本机收藏已保存，社区计数暂未更新');}}
  this.favoriteRecipeId=id;this.heartRevision++;this.heartPhase(id,this.heartRevision,0,after);
 }
 private heartPhase(id:string,revision:number,phase:number,selected:boolean):void{
  if(revision!==this.heartRevision||this.favoriteRecipeId!==id){return;}
  if(this.reducedMotion){this.favoriteScale=1;this.favoriteAngle=0;return;}
  const scales:number[]=selected?[0.88,1.38,0.96,1]:[0.93,1.15,0.96,1];const angles:number[]=selected?[4,-12,3,0]:[-3,7,-2,0];const durations:number[]=[75,135,170,110];
  this.getUIContext().animateTo({duration:durations[phase],curve:curves.cubicBezierCurve(0.22,0.7,0.25,1),onFinish:()=>{if(phase<3){this.heartPhase(id,revision,phase+1,selected);}}},()=>{this.favoriteScale=scales[phase];this.favoriteAngle=angles[phase];});
 }
 @Builder paperHeart(selected:boolean,id:string=''){Image($r('app.media.experience_favorite')).width(31).height(31).objectFit(ImageFit.Contain).opacity(selected?1:0.43).rotate({angle:this.favoriteRecipeId===id?this.favoriteAngle:0}).scale({x:!this.reducedMotion&&this.favoriteRecipeId===id?this.favoriteScale:1,y:!this.reducedMotion&&this.favoriteRecipeId===id?this.favoriteScale:1})}
 @Builder recipeTopBar(){
  Row({space:8}){
   Text('‹').fontSize(30).fontColor('#527347').width(44).height(48).textAlign(TextAlign.Center).accessibilityText('返回').id('recipe-back').onClick(()=>this.run(async()=>{await this.navigateBack();}))
   Text(this.selectedRecipe.name).id('recipe-toolbar-title').gesture(TapGesture({count:2}).onAction(()=>{this.pageScroller.scrollTo({xOffset:0,yOffset:0,animation:{duration:this.reducedMotion?0:280,curve:Curve.EaseOut}});})).fontFamily('ShikuHand').fontSize(24).lineHeight(30).lineBreakStrategy(LineBreakStrategy.BALANCED).maxLines(this.contentWidth()<300?2:1).textOverflow({overflow:TextOverflow.Ellipsis}).fontColor('#304F52').layoutWeight(1)
   Button({type:ButtonType.Normal}){this.paperHeart(this.favorites.some((f:Favorite)=>f.recipeId===this.selectedRecipe.id),this.selectedRecipe.id)}.id('recipe-favorite').width(48).height(48).padding(0).backgroundColor(Color.Transparent).clip(false).accessibilityText(this.favorites.some((f:Favorite)=>f.recipeId===this.selectedRecipe.id)?'取消收藏':'收藏菜谱').enabled(!this.busy).onClick(()=>this.toggleRecipeFavorite())
  }.width('100%').padding({left:this.pageGutter()-4,right:this.pageGutter()-4,top:4,bottom:4}).backgroundColor('#EFFFF9ED')
 }
 private nutrition():NutritionEstimate{let ingredients:Ingredient[]=this.selectedRecipe.ingredients;if(this.nutritionOil.trim()&&Number.isFinite(Number(this.nutritionOil))&&Number(this.nutritionOil)>=0&&Number(this.nutritionOil)<=500){ingredients=ingredients.filter((i:Ingredient)=>!/^(食用油|植物油|花生油|菜籽油|橄榄油|玉米油|大豆油)$/.test(i.name));if(Number(this.nutritionOil)>0){ingredients=ingredients.concat([new Ingredient('食用油',Number(this.nutritionOil),'g')]);}}return estimateNutrition(ingredients,this.selectedRecipe.people||2);}
 @Builder recipeNutrition(){
  Row(){Text('营养参考').fontSize(17).fontColor('#657A64').layoutWeight(1);Text(this.nutritionOpen?'收起 ↑':'展开 ↓').fontSize(15).fontColor('#8B795F').padding(12)}.width('100%').onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:180},()=>{this.nutritionOpen=!this.nutritionOpen;});})
  if(this.nutritionOpen){Column({space:8}){
   if(this.nutrition().matched>0){Text((this.nutrition().complete?'每份约 ':'已识别部分每份约 ')+this.nutrition().perServingKcal+' kcal · 蛋白质 '+this.nutrition().perServingProtein+'g').fontSize(16).fontColor('#4A6C5B')}
   if(!this.nutrition().complete){Text('尚缺：'+this.nutrition().missing.join('、')+'；不代表整道菜热量。').fontSize(14).lineHeight(22).fontColor('#987451')}
   Row({space:8}){Text('本次用油').fontSize(15).fontColor('#426B5B');TextInput({text:this.nutritionOil,placeholder:'整道菜克数，可选'}).type(InputType.Number).layoutWeight(1).onChange((v:string)=>{this.nutritionOil=v;});Text('g').fontSize(16).fontColor('#426B5B')}.width('100%')
   if(this.nutritionOil.trim()&&(!Number.isFinite(Number(this.nutritionOil))||Number(this.nutritionOil)<0||Number(this.nutritionOil)>500)){Text('请输入0至500克').fontSize(14).fontColor('#9A6548')}
   Text(this.nutrition().reference+'，按'+(this.selectedRecipe.people||2)+'人均分；油脂吸收与实际分量会影响结果。').fontSize(13).lineHeight(21).fontColor('#7F8777')
  }.width('100%').alignItems(HorizontalAlign.Start).padding(14).backgroundColor('#C9E2E9D9').borderRadius({topLeft:12,topRight:21,bottomLeft:18,bottomRight:10}).margin({bottom:14})}
 }
 @Builder recipeDetail() {
  this.recipeVariantPicker()
  Row({space:12}){Image(recipeCover(this.selectedRecipe)).geometryTransition('experience-recipe-'+this.selectedRecipe.id).width(94).height(94).objectFit(ImageFit.Contain).flexShrink(0);Column({space:7}){Text(this.timeText(this.selectedRecipe)).fontSize(21).lineHeight(28).fontWeight(FontWeight.Bold).fontColor('#304F52');Text(this.timeBreakdown(this.selectedRecipe).replace('\n',' · ')).fontSize(13).fontColor('#6C766C');Text((displayCost(this.selectedRecipe,this.selectedRecipe.people||2).basis==='同类估算'?'同类估算 ¥':'预估 ¥')+displayCost(this.selectedRecipe,this.selectedRecipe.people||2).total+' / '+(this.selectedRecipe.people||2)+'人份').fontSize(16).lineHeight(24).constraintSize({minHeight:44}).fontColor('#946346').onClick(()=>this.toast(displayCost(this.selectedRecipe,this.selectedRecipe.people||2).basis+'，按常见食材价格粗估；城市、季节和规格会影响实际花费。'));Text((this.selectedRecipe.region||'家常')+' · '+(this.selectedRecipe.category||'家常菜')).fontSize(13).fontColor('#6C766C')}.alignItems(HorizontalAlign.Start).layoutWeight(1)}.width('100%').padding({top:8,bottom:12}).margin({bottom:8})
  this.recipeUtilityActions()
  if(COMMUNITY_ENABLED&&this.trialEvidenceLoaded){Text(this.trialEvidence.participants?'用户自报试做 '+this.trialEvidence.participants+'人 · 成功 '+this.trialEvidence.success+' · 待改进 '+this.trialEvidence.needs_improvement:'暂无真实用户公开试做记录').fontSize(15).fontColor('#68776E').margin({bottom:10});if(this.trialEvidence.average_minutes>0){Text('自报平均 '+this.trialEvidence.average_minutes+'分钟 · 非实测认证').fontSize(14).fontColor('#87694B').margin({bottom:12})}}
  Row(){Text('收藏夹').fontSize(15).fontColor('#7C637E').constraintSize({minHeight:44}).padding({left:4,right:14}).onClick(()=>{this.collectionReturn='recipe';this.page='collections';});Blank();Text(this.recipeActionsOpen?'收起 ↑':'更多 ⋯').id('recipe-more-actions').fontSize(15).fontColor('#7F7868').constraintSize({minHeight:44}).padding({left:10,right:10}).onClick(()=>{this.getUIContext().animateTo({duration:this.reducedMotion?0:180},()=>{this.recipeActionsOpen=!this.recipeActionsOpen;});})}.width('100%')
  if(this.recipeActionsOpen){
  Text(recipeQuality(this.selectedRecipe).label+' ›').constraintSize({minHeight:44}).fontSize(16).fontColor('#87694B').padding(10).onClick(()=>this.toast(recipeQuality(this.selectedRecipe).issues.join(' · ')||'来源与用量字段较完整；仍按实际情况核对'))
  Button('撤销最近推荐反馈').height(44).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.undoFeedback();}))
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(6)}}){
    Text('为什么推荐').fontSize(14).fontColor('#6E8564').padding(12).onClick(()=>{const row:Recommendation|undefined=this.recommendations().find((r:Recommendation)=>r.recipe.id===this.selectedRecipe.id);this.toast(row&&row.reasons.length?row.reasons.join(' · '):'按当前搜索与筛选展示；未进行个性化排序');})
    Text(this.drawDisliked.includes(this.selectedRecipe.id)?'恢复抽取':'不再抽到').fontSize(14).fontColor('#946452').padding(12).onClick(()=>this.run(async()=>{await this.toggleDrawDislike(this.selectedRecipe.id);}))
    if(this.store.state.recipes.some((r:Recipe)=>r.id===this.selectedRecipe.id)){Text('编辑菜谱').fontSize(14).fontColor('#8B78A7').padding(12).onClick(()=>{this.recipeDraft=JSON.parse(JSON.stringify(this.selectedRecipe)) as Recipe;this.page='recipe-edit';})}
   }.width('100%').transition(TransitionEffect.OPACITY)
  }
  this.recipeLearningIntro()
  Row() { Text('做法 · ' + this.guide().steps.length + ' 步').fontSize(21).fontWeight(FontWeight.Bold).fontColor('#263E46').layoutWeight(1) }.width('100%').margin({ bottom: 14 })
  if (this.guide().steps.length === 0) { Text('做法尚待补充，请先完善后再制作。').fontSize(14).fontColor('#A16E50') }
  ForEach(this.guide().steps,(step:GuideStep,index:number)=>{this.guideStepCard(step,index)})
  Text(this.toolsOpen?'收起建议 ↑':'更多建议 ↓').fontSize(15).fontColor('#6C766C').constraintSize({minHeight:44}).onClick(()=>this.foldContent(()=>{this.toolsOpen=!this.toolsOpen;}))
  if(this.toolsOpen){
  Button('问问小怪这道菜',{type:ButtonType.Normal}).height(44).fontColor('#42614E').backgroundColor('#DDE8DC').onClick(()=>{this.openContextAssistant([this.selectedRecipe.id]);})
  ForEach(techniqueAdvice(this.selectedRecipe),(tip:string)=>{Text('操作要点 · '+tip).fontSize(15).lineHeight(26).fontColor('#85684E').padding(14).width('100%').backgroundColor('#80EAD8BF').borderRadius(16).margin({bottom:12})})
  if (this.selectedRecipe.tips) { Text('小提示 · ' + this.selectedRecipe.tips).fontSize(15).lineHeight(24).fontColor('#81664D').padding(14).width('100%').backgroundColor('#90EEDDC4').borderRadius(14).margin({ bottom: 16 }) }

  Text(this.checklistOpen?'收起备料与易错点 ↑':'备料与易错点 ↓').fontSize(15).fontColor('#426B5B').padding(12).onClick(()=>this.foldContent(()=>{this.checklistOpen=!this.checklistOpen;}))
  if(this.checklistOpen){ForEach(buildCookingChecklist(this.selectedRecipe).preparation,(v:string)=>{Text(v).fontSize(15).lineHeight(25).fontColor('#38584D').padding({bottom:8})});ForEach(buildCookingChecklist(this.selectedRecipe).pitfalls,(v:string)=>{Text(v).fontSize(15).lineHeight(24).fontColor('#8B634B').padding({bottom:8})})}
  this.recipeNutrition()
  Text('缺料替代 · 保存示例主体版本 ↓').fontSize(15).fontColor('#426B5B').padding(12).onClick(()=>this.foldContent(()=>{this.flowSection=this.flowSection==='替代'?'':'替代';}))
  if(this.flowSection==='替代'){ForEach(this.selectedRecipe.ingredients,(i:Ingredient)=>{ForEach(substituteOptions(i.name,this.excluded.split(/[,，、]/).concat(householdExclusions(this.household))),(option:SubstituteOption)=>{Text(option.original+' → '+option.replacement+' · '+option.note).fontSize(15).lineHeight(28).fontColor('#87694B').padding(12).onClick(()=>this.run(async()=>{await this.saveSubstitute(option);}))})})}

  Text(this.exclusionOpen?'收起长期忌口 ↑':'长期不吃某种食材 ↓').fontSize(15).padding(12).fontColor('#85684E').onClick(()=>this.foldContent(()=>{this.exclusionOpen=!this.exclusionOpen;}))
  if(this.exclusionOpen){Flex({wrap:FlexWrap.Wrap}){ForEach(this.selectedRecipe.ingredients,(ingredient:Ingredient)=>{Button(ingredient.name).height(46).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.excludeIngredient(ingredient.name);}))})}}
  Row({space:8}){Button('今天先不吃').height(46).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{await this.skipToday(this.selectedRecipe);}));Button('做法有问题？').height(46).fontColor('#85684E').backgroundColor('#EAD8BF').onClick(()=>{this.page='recipe-correction';})}.width('100%').margin({bottom:14})
  Row() { Text(this.portionOpen ? '用量与采购 ↑' : '用量与采购 ↓').fontSize(17).fontWeight(FontWeight.Medium).fontColor('#304F52'); Blank(); Text(this.portionPeople+'人').fontSize(15).fontColor('#6F7667').flexShrink(0) }.width('100%').padding(16).backgroundColor('#90FFFFFF').border({ width: 0.7,color: '#D8D4C9' }).borderRadius(13).margin({ bottom: 16 }).onClick(() => { this.getUIContext().animateTo({duration:this.reducedMotion?0:220},()=>{this.portionOpen = !this.portionOpen;}); })
  if (this.portionOpen) {
  Column({ space: 17 }) {
   Row({space:8}){Image(uiIcon('people')).width(30).height(30).objectFit(ImageFit.Contain).flexShrink(0);Text('人数与口味').fontFamily('ShikuHand').fontSize(23).fontColor('#36564D')}.width('100%').constraintSize({minHeight:44})
   Row() { Column({ space: 4 }) { Text('用餐人数').fontSize(15).fontWeight(FontWeight.Medium).fontColor('#263E46') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Row({ space: 12 }) { Button('－',{ type: ButtonType.Normal }).width(44).height(44).padding(0).fontSize(19).backgroundColor('#B0FFFFFF').fontColor('#37524F').borderRadius(10).onClick(() => { this.portionPeople = Math.max(1,this.portionPeople - 1); }); Text(String(this.portionPeople) + ' 人').fontSize(19).fontWeight(FontWeight.Medium).fontColor('#263E46').constraintSize({minWidth:52}).textAlign(TextAlign.Center).flexShrink(0); Button('＋',{ type: ButtonType.Normal }).width(44).height(44).padding(0).fontSize(19).backgroundColor('#B0FFFFFF').fontColor('#37524F').borderRadius(10).onClick(() => { this.portionPeople = Math.min(20,this.portionPeople + 1); }) }.padding(5).backgroundColor('#90EDE9DF').borderRadius(12) }.width('100%')
   Button('家庭食量 · '+householdPeople(this.household)+' 成人份').constraintSize({minHeight:46}).padding({left:12,right:12,top:10,bottom:10}).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.useHouseholdPortions())
   Column({ space: 9 }) { Text('食量').fontSize(12).fontColor('#6C766C'); Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([0.75,1,1.25],(value: number) => { Column() { ChoiceChip({ label: value === 0.75 ? '小食量' : value === 1 ? '正常' : '大食量',selected: this.portionAppetite === value,tint: '#DDE8DF' }) }.onClick(() => { this.portionAppetite = value; }) }) } }.alignItems(HorizontalAlign.Start).width('100%')
   Column({ space: 9 }) { Text('咸淡 / 浓淡').fontSize(12).fontColor('#6C766C'); Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['清淡','标准','浓郁'],(value: string) => { Column() { ChoiceChip({ label: value,selected: this.portionSeasoning === value,tint: '#EEDFD1' }) }.onClick(() => { this.portionSeasoning = value; }) }) } }.alignItems(HorizontalAlign.Start).width('100%')
   Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['原方','不辣','微辣','重辣'],(value: string) => { Column() { ChoiceChip({ label: value,selected: this.portionSpice === value,tint: '#E9D8D1' }) }.onClick(() => { this.portionSpice = value; }) }) }
   Divider().color('#D8D3C5').strokeWidth(0.6)
   Row() { Text('这次的推荐用量').fontSize(15).fontWeight(FontWeight.Medium).fontColor('#263E46').layoutWeight(1); Text(this.portionEvidence ? '收起依据 ↑' : '换算依据 ↓').fontSize(11).fontColor('#967253').onClick(() => { this.portionEvidence = !this.portionEvidence; }) }.width('100%')
   ForEach(this.portionPreview(),(amount: PortionAmount) => { Column({ space: 7 }) { Row() { Text(amount.name + (amount.optional ? ' · 调味' : '')).fontSize(14).fontColor('#4C5A57').layoutWeight(1); Text(amount.quantity > 0 ? '约 ' + amount.quantity + ' ' + amount.unit : amount.optional ? '按口味 / 可不加' : '待补充').fontSize(15).fontWeight(FontWeight.Medium).fontColor('#304F52') }.width('100%'); if (this.portionEvidence) { Text(amount.quantitySource + ' · ' + amount.quantityBasis + (amount.amountText ? '\n原文：' + amount.amountText : '')).fontSize(11).lineHeight(18).fontColor('#6F7667') } }.width('100%').alignItems(HorizontalAlign.Start) })
   Text('均为推荐量，可随实际食材与同餐菜数再调整。').fontSize(11).lineHeight(19).fontColor('#878A7D')
   Button('应用推荐到本次制作',{ type: ButtonType.Normal }).fontSize(15).fontColor('#FFFFFF').width('100%').height(46).linearGradient({ angle: 110,colors: [['#385D59',0],['#263F49',1]] }).borderRadius(12).onClick(() => { this.applyPortions(); })
  }.width('100%').alignItems(HorizontalAlign.Start).padding(17).backgroundColor('#FBF8F0').backgroundImage($r('app.media.crayon_paper_tile'),ImageRepeat.XY).backgroundImageSize({ width: 320,height: 320 }).border({ width: 0.7,color: '#D9D3C7' }).borderRadius(20).shadow({ radius: 16,color: '#154A4333',offsetY: 5 }).margin({ bottom: 24 })
  Text('准备食材 · 可调整实际用量').fontSize(19).fontWeight(FontWeight.Bold).fontColor('#3C573C').margin({ bottom: 12 })
  ForEach(this.selectedRecipe.ingredients.filter((i: Ingredient) => !i.optional), (i: Ingredient) => { Row() { Text(i.name).layoutWeight(1); TextInput({ text: String(i.quantity) }).width(74).height(35).type(InputType.Number).onChange((v: string) => { const ingredients: Ingredient[] = this.selectedRecipe.ingredients.map((original: Ingredient) => { const item: Ingredient = JSON.parse(JSON.stringify(original)) as Ingredient; if (original === i) { item.quantity = Number(v); item.quantitySource = '用户实际调整'; } return item; }); const recipe: Recipe = JSON.parse(JSON.stringify(this.selectedRecipe)) as Recipe; recipe.ingredients = ingredients; this.selectedRecipe = recipe; }); Text(i.unit).fontColor('#8A957D') }.padding(12).backgroundColor(this.surface()).borderRadius(12).margin({ bottom: 7 }) })
  Text('主料按上方实际数量扣库存；用量为0的来源项请先补齐。调味料单独列出，不自动扣减。').fontSize(12).fontColor('#8A795C').lineHeight(22).margin({ top: 9,bottom: 9 })
  ForEach(this.selectedRecipe.ingredients.filter((i: Ingredient) => i.optional),(i: Ingredient) => { Text('调味 · ' + i.name + ' · ' + (i.quantity > 0 ? '约' + i.quantity + i.unit : i.amountText || '按口味')).fontSize(12).fontColor('#686258').lineHeight(21) })
  Button('确认添加缺少食材到采购').width('100%').backgroundColor('#E8ECDC').fontColor('#5E7A4E').margin({ top: 10, bottom: 25 }).onClick(() => this.confirm('补齐食材', '仅将缺少的食材加入采购清单，已有库存不会改变。', async () => { await this.addMissing(this.selectedRecipe); }))
  Button('确认制作 · 扣库存并记一餐').width('100%').height(50).backgroundColor('#285C54').margin({ top: 20 }).onClick(()=>this.run(async()=>{await this.openDeduction();}))
  }
  }
  if(COMMUNITY_ENABLED){this.recipeWorks()}
 }
 @Builder cookGuide() {
  this.title('',this.selectedRecipe.name,'')
  Row(){Text('做饭时保持亮屏').fontSize(16).layoutWeight(1);Toggle({type:ToggleType.Switch,isOn:this.cookKeepOn}).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v:boolean)=>this.run(async()=>{await this.cookScreen(v);}))}.constraintSize({minHeight:44}).width('100%').margin({bottom:12})
  Row(){Text('大字步骤').fontSize(17).layoutWeight(1);Toggle({type:ToggleType.Switch,isOn:this.cookLarge}).responseRegion({x:-4,y:-12,width:44,height:44}).onChange((v:boolean)=>{this.cookLarge=v;})}.constraintSize({minHeight:44}).width('100%').margin({bottom:12})
  Row() { Text('步骤 ' + Math.min(this.cookStep + 1,this.guide().steps.length) + ' / ' + this.guide().steps.length).fontSize(15).fontColor('#A16E50').layoutWeight(1); Text(this.timeText(this.selectedRecipe)).fontSize(13).fontColor('#6C7D70') }.width('100%').margin({ bottom: 12 })
  Progress({ value: this.cookStep + 1,total: Math.max(1,this.guide().steps.length),type: ProgressType.Linear }).width('100%').color('#6D8A7B').backgroundColor('#E3E1D6').margin({ bottom: 24 })
  if(this.guide().steps.length){Column(){ForEach([this.cookStep],(index:number)=>{this.guideStepCard(this.guide().steps[index],index)},(index:number)=>this.selectedRecipe.id+':'+String(index))}.opacity(this.stepFade).translate({x:this.stepShift}).gesture(PanGesture({direction:PanDirection.Horizontal,distance:30}).onActionEnd((event:GestureEvent)=>{if(Math.abs(event.offsetX)>60){const delta:number=event.offsetX<0?1:-1;if(this.cookStep+delta>=0&&this.cookStep+delta<this.guide().steps.length){this.moveCookStep(delta);}}}))}
  if(this.cookedToday(new Date())){
   Row(){Text('已加入今日'+this.cookingMeal(new Date())).layoutWeight(1);Button('撤销').height(44).onClick(()=>this.run(()=>this.undoGuideDish(this.cookedToday(new Date()))))}.width('100%').padding(10).backgroundColor('#EAF0E4').borderRadius(12)
  }
  this.activeTimer()
  Button('重置本菜进度').fontSize(14).fontColor('#806D59').backgroundColor(Color.Transparent).onClick(()=>this.confirm('重新开始这道菜？','清除步骤和备料勾选，食材库存不变。',async()=>{this.cookStep=0;this.completedSteps=[];this.preparedIngredients=[];this.saveCookProgress();}))
 }
 @Builder mealDishEditor() {
  Text('这一餐，吃了什么').id('meal-dishes-heading').fontSize(21).fontWeight(FontWeight.Medium).fontColor('#263E46').maxLines(1).width('100%').margin({bottom:12})
  if (this.recentDishes().length > 0) { Text('最近吃过').fontSize(13).fontColor('#6C766C').margin({ bottom: 8 }); Scroll() { Row({ space: 8 }) { ForEach(this.recentDishes(),(item: MealItem) => { Text(item.name + ' ＋').fontSize(14).fontColor('#426B5B').constraintSize({minHeight:44}).padding({left:12,right:12}).backgroundColor('#DDE8DF').borderRadius(10).onClick(() => this.useRecentDish(item)) }) } }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).margin({ bottom: 14 }) }
  Text(this.mealRecipePicker ? '收起菜谱 ↑' : '从菜谱选 ↓').fontSize(14).fontColor('#946346').constraintSize({minHeight:44}).padding({left:4,right:10}).onClick(() => { this.mealRecipePicker = !this.mealRecipePicker; })
  if (this.mealRecipePicker) {
  Scroll() { Row({ space: 8 }) { ForEach(this.recipes.slice(0, 24), (r: Recipe) => { Row({ space: 7 }) { Image(this.recipeImage(r.id)).width(38).height(38).objectFit(ImageFit.Contain).flexShrink(0); Text(r.name).fontSize(12).fontColor('#9B819F') }.padding(7).backgroundColor('#F4EAF7').borderRadius(13).onClick(() => this.addMealDish(r)) }) } }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).margin({ bottom: 14 })
  }
  ForEach(this.mealDishes, (item: MealItem,index: number) => { Row() { Column({ space: 5 }) { Text(item.name).fontSize(16).fontColor('#826B94'); Text(item.category + ' · ¥' + item.estimatedCost.toFixed(2) + '（估算）').fontSize(11).fontColor('#A591AD') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Text('编辑').fontSize(14).fontColor('#59778A').constraintSize({minHeight:44}).padding({left:10,right:10}).flexShrink(0).onClick(() => { this.editingDish = index; this.dishName = item.name; this.dishCost = String(item.estimatedCost); this.dishCategory = item.category; }); Text('移除').fontSize(14).fontColor('#926956').constraintSize({minHeight:44}).padding({left:10,right:4}).flexShrink(0).onClick(() => { this.mealDishes = this.mealDishes.filter((_i: MealItem,n: number) => n !== index); this.mealCost = String(totalMealCost(this.mealDishes)); this.editingDish = -1; this.dishName = ''; }) }.padding(15).backgroundColor(this.surface()).borderRadius(15).margin({ bottom: 8 }) })
  this.smallLabel('也可以自己添一道')
  Row({ space: 8 }) { TextInput({ text: this.dishName, placeholder: '菜名或餐食' }).id('meal-dish-name').height(46).layoutWeight(1).onChange((v: string) => { this.dishName = v; });Row({space:2}){Text('¥').fontSize(17).fontColor('#8C684D').flexShrink(0);TextInput({ text: this.dishCost, placeholder: '金额' }).id('meal-dish-cost').height(46).layoutWeight(1).padding({left:4,right:6}).type(InputType.Number).backgroundColor(Color.Transparent).onChange((v: string) => { this.dishCost = v; })}.width(92).padding({left:10,right:2}).backgroundColor('#70EADFC9').borderRadius(14).flexShrink(0)}.width('100%')
  Flex({ wrap: FlexWrap.Wrap, space: { main: LengthMetrics.vp(7), cross: LengthMetrics.vp(7) } }) { ForEach(['家常','素菜','荤菜','汤羹','主食','外卖'], (v: string) => { Column() { ChoiceChip({ label: v, selected: this.dishCategory === v, tint: '#E5EDF7', ink: '#7596AC' }) }.onClick(() => { this.dishCategory = v; }) }) }.margin({ top: 9 })
  Button(this.editingDish >= 0 ? '更新这道菜' : '加入这道菜').backgroundColor('#EAE1F3').fontColor('#977FAA').margin({ top: 12, bottom: 17 }).onClick(() => this.addMealDish())
 }
 private async composeMealPhotos():Promise<void>{if(!this.composePhotos.length){return;}this.mealPhoto=await NativeMedia.compose(this.getUIContext().getHostContext() as common.UIAbilityContext,this.composePhotos,this.composeCover,this.composeKey+'-'+String(Date.now()));this.composeTemps.push(this.mealPhoto.compressed);}
 @Builder photoCollageTools(){
  if(this.mealPhoto.compressed){
   Row({space:8}){
    Button('＋ 拼图照片').height(44).fontColor('#685178').backgroundColor('#E9DFEE').enabled(this.composePhotos.length<4).onClick(()=>this.run(async()=>{
     if(!this.composePhotos.length){this.composePhotos=[this.mealPhoto.compressed];}
     const selected:LocalPhoto=await NativeMedia.select(this.getUIContext().getHostContext() as common.UIAbilityContext,false);
     this.composePhotos=this.composePhotos.concat([selected.compressed]).slice(0,4);await this.composeMealPhotos();
    }))
    Button(this.composeCover?'完整显示':'居中裁切').height(44).fontColor('#85684E').backgroundColor('#EEE0C7').onClick(()=>this.run(async()=>{
     if(!this.composePhotos.length){this.composePhotos=[this.mealPhoto.compressed];}this.composeCover=!this.composeCover;await this.composeMealPhotos();
    }))
   }.width('100%')
   if(this.composePhotos.length>1){
    Scroll(){
     Row({space:8}){
      ForEach(this.composePhotos,(path:string,index:number)=>{
       Column({space:4}){
        Image('file://'+path).width(72).height(64).objectFit(ImageFit.Contain)
        Row(){
         Button('←').height(44).width(44).enabled(index>0).accessibilityText('照片前移').onClick(()=>this.run(async()=>{
          const rows:string[]=this.composePhotos.slice();const previous:string=rows[index-1];rows[index-1]=rows[index];rows[index]=previous;this.composePhotos=rows;await this.composeMealPhotos();
         }))
         Button('×').height(44).width(44).accessibilityText('移除拼图照片').onClick(()=>this.run(async()=>{
          this.composePhotos=this.composePhotos.filter((v:string)=>v!==path);await this.composeMealPhotos();
         }))
        }
       }
      },(path:string)=>path)
     }
    }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).width('100%')
   }
  }
 }
 @Builder mealPhotoControls(){
  Column({space:8}){
   Row({space:6}){Text('照片').fontSize(16).fontColor('#304F52').layoutWeight(1);Button({type:ButtonType.Normal}){Row({space:4}){Image(uiIcon('camera')).width(24).height(24).objectFit(ImageFit.Contain);Text('拍照').fontSize(14)}}.height(44).padding({left:8,right:8}).fontColor('#8E6646').backgroundColor(Color.Transparent).enabled(!this.busy).onClick(()=>this.run(async()=>{await this.attachPhoto(true);}));Button({type:ButtonType.Normal}){Row({space:4}){Image(uiIcon('album')).width(24).height(24).objectFit(ImageFit.Contain);Text('相册').fontSize(14)}}.height(44).padding({left:8,right:8}).fontColor('#5C7893').backgroundColor(Color.Transparent).enabled(!this.busy).onClick(()=>this.run(async()=>{await this.attachPhoto(false);}));if(this.mealPhoto.compressed || this.editingMeal.cloudPhoto){Text('移除').fontSize(14).fontColor('#986956').constraintSize({minHeight:44}).padding({left:8,right:8}).onClick(()=>{this.mealPhoto=new LocalPhoto();this.editingMeal.cloudPhoto='';this.editingMeal.photoId='';})}}.width('100%')
   if(this.mealPhoto.compressed){Image('file://'+this.mealPhoto.compressed).width('100%').height(210).objectFit(ImageFit.Contain).borderRadius(18).transition(TransitionEffect.OPACITY)}else if(this.editingMeal.cloudPhoto){Text('已有照片，可替换').fontSize(14).fontColor('#63786D')}
  }.id('meal-photo-area').width('100%').padding({left:12,right:8,top:4,bottom:4}).backgroundColor('#70E8E9DC').borderRadius({topLeft:8,topRight:19,bottomLeft:15,bottomRight:7}).margin({bottom:8})
 }
 private ownWorks():Meal[]{return this.meals.filter((m:Meal)=>(m.localPhoto||m.photoId)&&mealItems(m).some((i:MealItem)=>i.recipeId===this.selectedRecipe.id)).slice().sort((a:Meal,b:Meal)=>b.date.localeCompare(a.date));}
 private async createRecipeWork(camera:boolean):Promise<void>{const r:Recipe=this.selectedRecipe;this.startMeal();this.addMealDish(r);this.photoReturnRecipe=r.id;this.mealTags='我的成品';await this.attachPhoto(camera);}
 private async loadRecipeWorks(more:boolean=false):Promise<void>{
  if(this.worksLoading){return;}if(!this.loggedIn){this.toast('登录后查看大家的成品，我的成品可离线查看');return;}const id:string=this.selectedRecipe.id;const owner:string=this.cloud.session.userId;const request:number=++this.worksRequest;this.worksLoading=true;this.worksError='';
  try{const result:CommunityPage=JSON.parse(await this.cloud.request('/community/recipes/'+encodeURIComponent(id)+'/works/page'+(more&&this.worksCursor?'?cursor='+encodeURIComponent(this.worksCursor):''),http.RequestMethod.GET)) as CommunityPage;if(this.selectedRecipe.id!==id||owner!==this.cloud.session.userId){return;}this.works=(more?this.works:[]).concat(result.items).filter((p:CommunityPost,index:number,items:CommunityPost[])=>items.findIndex((v:CommunityPost)=>v.id===p.id)===index).slice(-60);this.worksCursor=result.nextCursor||'';this.worksMore=result.hasMore;const images:Map<string,string>=new Map();for(const p of this.works){const previous:string|undefined=this.worksPhotos.get(p.id);if(previous){images.set(p.id,previous);}}this.worksPhotos=images;const targets:GalleryPhoto[]=result.items.filter((p:CommunityPost)=>Boolean(p.payload.photoId)).map((p:CommunityPost)=>new GalleryPhoto(p.id,p.payload.photoId));for(const m of this.ownWorks().slice(this.ownWorksPage*12,(this.ownWorksPage+1)*12).filter((m:Meal)=>!m.localPhoto&&Boolean(m.photoId))){targets.push(new GalleryPhoto(m.id,m.photoId,true));}this.hydrateWorksPhotos(targets,id,owner,request).catch(()=>{});}catch(_){if(this.selectedRecipe.id===id){this.worksError='成品暂未加载，点刷新重试';}}finally{this.worksLoading=false;}
 }
 @Builder recipeWorks(){
  Column({space:14}){
   Row(){Text('这道菜的成品墙').fontSize(23).fontWeight(FontWeight.Medium).fontColor('#304F52').layoutWeight(1);Text('刷新').fontSize(15).fontColor('#638295').padding(10).onClick(()=>this.run(async()=>{await this.loadRecipeWorks();}))}.width('100%')
   Row({space:10}){Button({type:ButtonType.Normal}){Row({space:5}){Image(uiIcon('camera')).width(30).height(30).objectFit(ImageFit.Contain);Text('拍成品').fontSize(14)}}.layoutWeight(1).height(48).fontColor('#916944').backgroundColor('#F1DFC6').onClick(()=>this.run(async()=>{await this.createRecipeWork(true);}));Button({type:ButtonType.Normal}){Row({space:5}){Image(uiIcon('album')).width(30).height(30).objectFit(ImageFit.Contain);Text('传成品').fontSize(14)}}.layoutWeight(1).height(48).fontColor('#5F7E91').backgroundColor('#DCE9EF').onClick(()=>this.run(async()=>{await this.createRecipeWork(false);}))}.width('100%')
   Text('我的成品 · '+this.ownWorks().length).fontSize(17).fontColor('#7A695C')
   if(!this.ownWorks().length){Text('做好了就晒一张，记住你的拿手味道').fontSize(14).fontColor('#728073')}
   ForEach(this.ownWorks().slice(this.ownWorksPage*12,(this.ownWorksPage+1)*12),(m:Meal)=>{Column({space:10}){if(m.localPhoto){Image('file://'+m.localPhoto).width('100%').height(210).objectFit(ImageFit.Contain).borderRadius(16)}else if(this.ownPhotoUrls.has(m.id)){Image(this.ownPhotoUrls.get(m.id)||'').width('100%').height(210).objectFit(ImageFit.Contain).borderRadius(16)}Text(m.date.slice(0,10)+(m.notes?' · '+m.notes:'')).fontSize(15).fontColor('#5C7168');Row({space:12}){Button('编辑这次成品').fontColor('#6E7B92').backgroundColor('#E2E7EF').onClick(()=>{this.startMeal(m);this.photoReturnRecipe=this.selectedRecipe.id;});Button('分享成品').fontColor('#9C6A7B').backgroundColor('#F0DFE7').onClick(()=>this.run(async()=>{await this.choosePublish(m);}))}}.width('100%').padding(15).backgroundColor('#F1E3CF').borderRadius(18)},(m:Meal)=>m.id)
   if(this.ownWorks().length>12){Row({space:8}){Button('上一页').height(44).enabled(this.ownWorksPage>0).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{this.ownWorksPage--;this.ownPhotoUrls=new Map();await this.loadRecipeWorks();}));Text(String(this.ownWorksPage+1)+' / '+Math.ceil(this.ownWorks().length/12)).fontSize(16).layoutWeight(1).textAlign(TextAlign.Center);Button('下一页').height(44).enabled((this.ownWorksPage+1)*12<this.ownWorks().length).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>this.run(async()=>{this.ownWorksPage++;this.ownPhotoUrls=new Map();await this.loadRecipeWorks();}))}.width('100%')}
   Text('大家的成品').fontSize(18).fontColor('#7A695C')
   if(this.worksLoading){LoadingProgress().width(36).height(36)}else if(this.worksError){Text(this.worksError).fontSize(15).fontColor('#946C55')}else if(!this.works.length){Text(this.loggedIn?'点刷新看看大家的做法，也欢迎分享你的成品':'登录后看看大家做得怎么样').fontSize(14).fontColor('#728073')}
   ForEach(this.works,(p:CommunityPost)=>{Column({space:9}){if(this.worksPhotos.has(p.id)){Image(this.worksPhotos.get(p.id)||'').width('100%').height(220).objectFit(ImageFit.Contain).autoResize(true).borderRadius(18)}Text((p.author_name||'小怪朋友')+(p.demo_data?' · 演示':'')+' · '+p.payload.name).fontSize(16).fontColor('#304F52');Text('看心得与留言 →').fontSize(14).fontColor('#95724F')}.width('100%').padding(15).backgroundColor('#E4E8DD').borderRadius(19).onClick(()=>this.run(async()=>{await this.openPost(p);}))},(p:CommunityPost)=>p.id)
  if(this.worksMore){Button(this.worksLoading?'加载中…':'更多成品').height(48).width('100%').fontColor('#426B5B').backgroundColor('#DCE8D7').enabled(!this.worksLoading).onClick(()=>this.run(async()=>{await this.loadRecipeWorks(true);}))}
  }.width('100%').alignItems(HorizontalAlign.Start).margin({top:24,bottom:18})
 }
 @Builder mealForm() {
  this.title('', '今天吃了什么', '')
  this.mealPhotoControls()
  this.photoCollageTools()
  Row({space:8}){Row({space:6}){Image(uiIcon('today')).width(24).height(24).objectFit(ImageFit.Contain).flexShrink(0);Text(this.mealDate+' ▾').fontSize(14).fontColor('#74617F')}.layoutWeight(1.3).constraintSize({minHeight:44}).onClick(()=>this.pickMealDate(false));Row({space:6}){Image(uiIcon('time')).width(24).height(24).objectFit(ImageFit.Contain).flexShrink(0);Text(this.mealTime+' ▾').fontSize(15).fontColor('#74617F')}.layoutWeight(1).constraintSize({minHeight:44}).onClick(()=>this.pickMealTime())}.width('100%').padding({left:6,right:6}).margin({bottom:8})
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(8)}}) { ForEach(['在家做','外卖','餐馆','食堂','外食'],(value: string) => { Button(value).fontSize(13).backgroundColor(this.mealDining === value ? '#BCD2C3' : '#FFF3CD').fontColor('#263E46').onClick(() => { this.mealDining = value; }) }) }.margin({ bottom: 12 })
  this.mealDishEditor()
  Row({space:6}){ForEach(['half','normal','large'],(size:string)=>{Column(){ChoiceChip({label:size==='half'?'半份':size==='large'?'大份':'常规份',selected:this.mealPortion===size})}.onClick(()=>{this.mealPortion=size;})})}.width('100%').margin({bottom:10})
  Text(this.mealFinanceOpen?'收起费用分摊 ↑':'配送、优惠与示例主体分摊 ↓').fontSize(17).padding(12).fontColor('#426B5B').onClick(()=>{this.mealFinanceOpen=!this.mealFinanceOpen;})
  if(this.mealFinanceOpen){TextInput({text:this.mealDelivery,placeholder:'配送费'}).type(InputType.Number).accessibilityText('配送费').onChange((v:string)=>{this.mealDelivery=v;});TextInput({text:this.mealDiscount,placeholder:'优惠'}).type(InputType.Number).accessibilityText('优惠金额').onChange((v:string)=>{this.mealDiscount=v;});TextInput({text:this.mealSplit,placeholder:'共同分摊人数'}).type(InputType.Number).accessibilityText('共同分摊人数').onChange((v:string)=>{this.mealSplit=v;});TextInput({text:this.mealShares,placeholder:'我承担几份'}).type(InputType.Number).accessibilityText('我承担份数').onChange((v:string)=>{this.mealShares=v;});Text(this.financeLabel()).fontSize(19).fontColor('#87694B').margin({top:12,bottom:12})}
  this.smallLabel('餐次'); Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(8),cross:LengthMetrics.vp(8)}}) { ForEach(['早餐','午餐','晚餐','加餐'], (v: string,index: number) => { Column() { ChoiceChip({ label: v, selected: this.mealType === v, tint: ['#FFF0D7','#E1EEF8','#EEE2F5','#F9E1E7'][index], ink: ['#B08D54','#6D90AB','#9378AD','#B77D8C'][index] }) }.onClick(() => { this.mealType = v; }) }) }
  Scroll(){Row({space:6}){ForEach(QUICK_AMOUNTS,(amount:number)=>{Button('¥'+amount).height(44).fontColor('#85624B').backgroundColor('#EEDFC5').onClick(()=>{if(this.dishName.trim()){this.dishCost=String(amount);}else{this.toast('先选择或填写菜名');}})})}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).width('100%')
  Text('菜品合计 ¥' + Number(this.mealCost).toFixed(2) + '（' + this.mealCostType + '）').fontSize(21).fontColor('#997CAA').margin({ top: 18, bottom: 12 })
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(4),cross:LengthMetrics.vp(4)}}) { ForEach(['家常','煲汤','外卖','聚餐','减脂'], (v: string) => { Column() { ChoiceChip({ label: v, selected: this.mealTags.split('、').includes(v), tint: '#FBE7E0', ink: '#B38A7B' }) }.onClick(() => { const tags: string[] = this.mealTags.split('、').filter((t: string) => t.length > 0); this.mealTags = tags.includes(v) ? tags.filter((t: string) => t !== v).join('、') : tags.concat([v]).join('、'); }) }) }.margin({ top: 15, bottom: 10 })
  Row({ space: 10 }) { ForEach(['估算','实付'],(value: string) => { Button(value).fontSize(13).backgroundColor(this.mealCostType === value ? '#E8C993' : '#FFF9E8').fontColor('#263E46').onClick(() => { this.mealCostType = value; }) }) }.margin({ top: 12,bottom: 12 })
  Text(this.mealDetailsOpen ? '收起用餐详情 ↑' : '评分、营养等选填 ↓').fontSize(14).fontColor('#426B5B').padding(14).width('100%').backgroundColor('#90FFFFFF').borderRadius(12).onClick(() => { this.getUIContext().animateTo({duration:this.reducedMotion?0:220},()=>{this.mealDetailsOpen = !this.mealDetailsOpen;}); })
  if (this.mealDetailsOpen) {
  if(['餐馆','食堂','外卖','外食'].includes(this.mealDining)){
  Scroll(){Row(){ForEach(this.recentPlaces(),(place:string)=>{Button(place).height(44).fontColor('#426B5B').backgroundColor('#DCE8D7').onClick(()=>{this.mealPlace=place;})})}}.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).margin({bottom:10})
  TextInput({ text: this.mealPlace,placeholder: '店名 / 地点（可选）' }).id('meal-place').onChange((value: string) => { this.mealPlace = value; }).margin({ bottom: 14 })
  }
  Text(this.mealRating>0?TASTE_FEELINGS[this.mealRating-1]:'这餐感觉如何').fontSize(16).fontColor('#686258')
  Row() { ForEach([1,2,3,4,5],(value: number) => { Text(this.mealRating >= value ? '★' : '☆').id('meal-rating-' + value).accessibilityText(TASTE_FEELINGS[value-1]+'，'+value+'星').height(44).layoutWeight(1).textAlign(TextAlign.Center).fontSize(28).fontColor('#D59327').scale({x:this.mealRating>=value?1.14:1,y:this.mealRating>=value?1.14:1}).animation({duration:this.reducedMotion?0:180}).onClick(() => { this.mealRating = this.mealRating === value ? 0 : value; }) }) }.width('100%').margin({ bottom: 12 })
  TextInput({ text: this.mealCalories,placeholder: '自己实际吃下的热量 kcal（可选）' }).type(InputType.Number).onChange((value: string) => { this.mealCalories = value; })
  Text(this.energyPreview()+' · '+this.energySource).fontSize(17).fontColor('#426B5B').padding({top:12,bottom:12})
  Text(this.energyOpen?'收起热量来源与份量 ↑':'热量来源与实际吃了多少 ↓').fontSize(16).fontColor('#85684E').padding(12).onClick(()=>{this.energyOpen=!this.energyOpen;})
  if(this.energyOpen){
   Flex({wrap:FlexWrap.Wrap}){ForEach(ENERGY_SOURCES,(source:string)=>{Column(){ChoiceChip({label:source,selected:this.energySource===source})}.onClick(()=>{this.energySource=source;})})}
   Text('上方输入所参考的整份热量，再选你吃下的比例').fontSize(15).fontColor('#68776E').margin({top:10})
   Flex({wrap:FlexWrap.Wrap}){ForEach([0.25,0.5,0.75,1],(fraction:number)=>{Column(){ChoiceChip({label:Math.round(fraction*100)+'%',selected:this.energyFraction===fraction})}.onClick(()=>{this.energyFraction=fraction;})})}
  }
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([300,500,700],(value: number) => { Button(String(value) + ' kcal').fontSize(12).backgroundColor('#E9E2F4').fontColor('#655176').onClick(() => { this.mealCalories = String(value); }) }) }.margin({ top: 8,bottom: 15 })
  Text('热量为示例主体记录 / 估算，未填写不会当作零热量。').fontSize(11).fontColor('#686258')
  Text('试做记录').fontSize(19).fontColor('#426B5B').margin({top:14,bottom:12})
  Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach(['未评价','成功','需改进'],(value:string)=>{Column(){ChoiceChip({label:value,selected:this.trialOutcome===value})}.onClick(()=>{this.trialOutcome=value;})})}
  TextInput({text:this.trialMinutes,placeholder:'实际分钟，可不填'}).type(InputType.Number).accessibilityText('实际做菜分钟').onChange((v:string)=>{this.trialMinutes=v;})
  TextInput({text:this.trialReplacement,placeholder:'换了哪些食材？'}).maxLength(200).onChange((v:string)=>{this.trialReplacement=v;})
  TextInput({text:this.trialFailure,placeholder:'成功经验或失败原因'}).maxLength(400).onChange((v:string)=>{this.trialFailure=v;})
  if(this.editingMeal.id){Text('安排剩菜 ↓').fontSize(17).padding(12).fontColor('#426B5B').onClick(()=>{this.leftoverOpen=!this.leftoverOpen;});if(this.leftoverOpen){TextInput({text:this.leftoverDate,placeholder:'食用日期 YYYY-MM-DD'}).onChange((v:string)=>{this.leftoverDate=v;});TextInput({text:this.leftoverCount,placeholder:'剩余份数'}).type(InputType.Number).accessibilityText('剩余份数').onChange((v:string)=>{this.leftoverCount=v;});TextInput({text:this.leftoverContainer,placeholder:'容器标签，如蓝色饭盒'}).maxLength(80).onChange((v:string)=>{this.leftoverContainer=v;});Row(){ForEach(['冷藏','冷冻'],(v:string)=>{Column(){ChoiceChip({label:v,selected:this.leftoverStorage===v})}.onClick(()=>{this.leftoverStorage=v;})})};TextInput({text:this.leftoverExpiry,placeholder:'手动标注食用截止 YYYY-MM-DD'}).onChange((v:string)=>{this.leftoverExpiry=v;});Button('存入剩菜盒').height(48).onClick(()=>this.run(async()=>{const b:LeftoverBatch=new LeftoverBatch();b.sourceMealId=this.editingMeal.id;b.name=this.editingMeal.name;b.total=Number(this.leftoverCount);b.remaining=b.total;b.preparedDate=dateString(new Date(this.editingMeal.date));b.expiryDate=this.leftoverExpiry;b.container=this.leftoverContainer;b.storage=this.leftoverStorage;await this.store.saveLeftover(b);this.refresh();this.page='leftovers';}));Button('关联原餐安排').height(48).onClick(()=>this.run(async()=>{await this.planLeftovers(this.editingMeal);}))}}
  this.smallLabel('心情与备注'); TextArea({ text: this.mealNotes, placeholder: '这顿饭，吃得怎么样？' }).height(120).onChange((v: string) => { this.mealNotes = v; })

  }
 }
 @Builder templates() {
  this.title('QUICK & SIMPLE', '熟悉的食材，一键预填', '散装也好录入，确认表单后才保存')
  ForEach(TEMPLATES, (t: Template) => { Row({ space: 15 }) { Text(t.name).fontSize(17).fontColor('#3F5B40').layoutWeight(1); Text(`${t.days} 天 · ${t.location}`).fontSize(12).fontColor('#8F9A80'); Text('＋').fontSize(23).fontColor('#537B50') }.padding(19).backgroundColor(this.surface()).borderRadius(16).margin({ bottom: 10 }).onClick(() => this.useTemplate(t)) })
 }
 @Builder bottomBar() {
  Row() { ForEach([0,3,4,1,5],(n: number) => { Column({ space: 3 }) { Image(this.navIcon(n)).width(32).height(32).objectFit(ImageFit.Contain).opacity(this.tab === n ? 1 : 0.74).scale({x:this.tab===n&&!this.reducedMotion?1.08:1,y:this.tab===n&&!this.reducedMotion?1.08:1}).animation({duration:this.reducedMotion?0:220,curve:Curve.EaseOut}); Text(n === 0 ? '今日' : n === 3 ? '菜谱' : n === 4 ? '记餐' : n === 1 ? '食材' : '我的').fontSize(12).fontWeight(this.tab === n ? FontWeight.Bold : FontWeight.Normal).fontColor(this.tab === n ? '#294B3E' : '#515E50'); Divider().width(18).strokeWidth(2).color(this.tab === n ? '#A86F50' : '#00000000') }.layoutWeight(1).constraintSize({minHeight:68}).padding({ top: 7,bottom: 6 }).backgroundColor(this.navPressed===n?'#DCE8D7':Color.Transparent).borderRadius(14).focusable(true).accessibilityText(n===0?'今日':n===3?'菜谱':n===4?'记餐':n===1?'食材':'我的').scale({x:this.navPressed===n&&!this.reducedMotion?0.96:1,y:this.navPressed===n&&!this.reducedMotion?0.96:1}).onTouch((event:TouchEvent)=>{this.navPressed=event.type===TouchType.Down?n:-1;}).animation({duration:this.reducedMotion?0:200,curve:Curve.EaseOut}).onClick(() => this.switchMainTab(n)) }) }.width('100%').padding({ left: 12,right: 12 }).backgroundColor('#F5FDFBF5').border({ width: { top: 0.5 },color: '#DAD9CF' })
 }
 @Builder launchView(){
  Stack({alignContent:Alignment.Center}){
   Stack({alignContent:Alignment.Center}){
    Image($r('app.media.crayon_ribbon_honey')).width(188).height(64).objectFit(ImageFit.Contain).translate({x:-20,y:65}).rotate({angle:-8})
    Image($r('app.media.crayon_ribbon_lilac')).width(144).height(54).objectFit(ImageFit.Contain).translate({x:28,y:83}).rotate({angle:7})
    Image($r('app.media.brand_monster')).id('launch-mascot').width(208).height(208).objectFit(ImageFit.Contain).scale({x:this.launchEntered||this.reducedMotion?1:0.98,y:this.launchEntered||this.reducedMotion?1:0.98}).translate({y:this.launchEntered||this.reducedMotion?0:2}).rotate({angle:this.launchEntered||this.reducedMotion?0:-1}).opacity(this.launchEntered||this.reducedMotion?1:0).animation({duration:this.reducedMotion?0:280,delay:this.reducedMotion?0:220,curve:Curve.EaseOut})
   }.width('100%').height(224)
   Column({space:12}){
   Text('开饭小怪').fontFamily('ShikuHand').fontSize(38).lineHeight(48).fontColor('#795782').letterSpacing(3).translate({y:this.launchEntered||this.reducedMotion?0:10}).opacity(this.launchEntered||this.reducedMotion?1:0.55).animation({duration:this.reducedMotion?0:320,delay:60,curve:Curve.EaseOut})
   if(this.error){Text(this.error).fontSize(15).lineHeight(24).fontColor('#916C47').textAlign(TextAlign.Center);Button('再试一次',{type:ButtonType.Normal}).height(48).padding({left:28,right:28}).backgroundColor('#DFE9D7').fontColor('#426452').borderRadius(18).onClick(()=>this.initialize())}
   else{Row({space:10}){ForEach([0,1,2],(n:number)=>{Text('●').fontSize(12).width(14).height(20).textAlign(TextAlign.Center).fontColor(n===0?'#83A383':n===1?'#D6A05C':'#AC83B8').scale({x:this.launchEntered||this.reducedMotion?1:0.3,y:this.launchEntered||this.reducedMotion?1:0.3}).animation({duration:this.reducedMotion?0:280,delay:100+n*70,curve:Curve.EaseOut})})}.height(24).justifyContent(FlexAlign.Center).accessibilityText('正在加载')}
   }.width('100%').translate({y:176})
   Text('把每一餐，过得有滋有味').fontFamily('ShikuHand').fontSize(18).fontColor('#72785E').width('100%').textAlign(TextAlign.Center).position({x:0,y:'91%'})
  }.id('launch-screen').width('100%').height('100%').padding({left:28,right:28,top:12,bottom:12}).backgroundColor('#FFF9ED').backgroundImage($r('app.media.crayon_paper_tile'),ImageRepeat.XY).backgroundImageSize({width:420,height:420}).opacity(this.launchOpacity).scale({x:this.launchExitScale,y:this.launchExitScale}).hitTestBehavior(this.ready?HitTestMode.None:HitTestMode.Default).onAppear(()=>this.beginLaunch())
 }
 onBackPress(): boolean { if(this.legalKey){this.legalKey='';return true;}if(!this.policyChosen){return false;} if(this.companionChatOpen){this.closeCompanion();return true;} if(this.lobbyVisible){if(this.lobbyDrawerOpen){this.lobbyBackTick++;return true;}return false;}if(!this.page&&this.displayMode==='3d'){this.openLobby();return true;} if (this.page) { this.navigateBack().catch(() => {}); return true; } return false; }
 build() {
  Stack({alignContent:Alignment.Center}) {
  if(this.legalKey){this.legalDocument()}else if(!this.policyLoaded){Text('正在读取隐私设置…').fontSize(16).fontColor('#527764')}else if(!this.policyChosen){this.privacyGate()}else{
  Column() {
   if (this.ready) {
    if(this.lobbyVisible){this.nativeLobby()}else{
    Column(){
    if(this.page==='ai-assistant'){this.assistantHeader()}else if(this.page==='recipe'||this.page==='cook-guide'){this.recipeTopBar()}else if (this.page) { Row() { Text('‹ 返回').fontSize(16).constraintSize({minHeight:44}).padding({right:16}).fontColor('#527347').onClick(() => this.run(async () => { await this.navigateBack(); })); Blank() }.padding({ left: 22, right: 22, top: 8, bottom: 4 }).width('100%') }
    if(this.page==='recipe-search'){this.searchInputBar()}
    if(this.page==='recipe-filters'){this.filterTabs()}
    Scroll(this.pageScroller) {
     Column() {
      if(socialRoute(this.page)||this.page==='profile'){this.empty('功能暂未开放','');}
      else if(this.page==='ai-assistant'){this.assistantPage()}
      else if(this.page==='assistant-shopping'){this.experienceShoppingPreview()}
      else if(this.page==='account-recovery'||this.page==='account-security'){this.accountRecoveryPage()}
      else if(this.page==='recipe-search'){this.recipeSearchPage()}
      else if(this.page==='community-search'){this.communitySearchPage()}
      else if(this.page==='ingredient-recipes'){this.ingredientRecipesPage()}
      else if(this.page==='daily-flow'){this.dailyFlow()}
      else if(this.page==='workspace'){this.workspacePage()}
      else if(this.page==='recipe-correction'){this.correctionPage()}
      else if(this.page==='deduction'){this.deductionPage()}
      else if(this.page==='catalog-update'){this.catalogUpdatePage()}
      else if(this.page==='collections'){this.collectionsPage()}
      else if(this.page==='procurement'){this.procurementPage()}
      else if(this.page==='leftovers'){this.leftoverPage()}
      else if(this.page==='trash'){this.trashPage()}
      else if(this.page==='dining-places'){this.diningPlacesPage()}
      else if(this.page==='meal-plan'){this.mealPlanPage()}
      else if(this.page==='compare'){this.comparePage()}
      else if(this.page==='recent-recipes'){this.recentPage()}
      else if(this.page==='quickstart'){this.gettingStarted()}
      else if(this.page==='stock-history'){this.stockHistory()}
      else if(this.page==='stock-detail'){this.stockDetail()}
      else if(this.page==='draw'){this.menuDraw()}
      else if(this.page==='draw-result'){this.drawMenuResult()}
      else if(this.page==='recipe-filters'){this.recipeFilterPanel()}
      else if(this.page==='about-support'){this.aboutSupport()}
      else if(this.page==='settings-detail'){this.settingsDetail()}
      else if(this.page==='draw-dislikes'){this.drawDislikesPage()}
      else if(this.page==='ingredient-knowledge'){this.knowledgePage()}
      else if (this.page === 'consume') {
       this.title('USE JUST ENOUGH', '记录实际消耗', `${this.editing.name} · 当前 ${this.editing.quantity}${this.editing.unit}`)
       Flex({wrap:FlexWrap.Wrap,space:{main:LengthMetrics.vp(6),cross:LengthMetrics.vp(6)}}){ForEach([0.25,0.5,1],(ratio:number)=>{Button(ratio===1?'全部':ratio===0.5?'一半':'四分之一').fontSize(14).backgroundColor('#E6DDBD').fontColor('#304F52').onClick(()=>{this.consumeAmount=String(Math.round(this.editing.quantity*ratio*1000)/1000);})})}.margin({top:12,bottom:12})
       TextInput({ text: this.consumeAmount }).type(InputType.Number).onChange((v: string) => { this.consumeAmount = v; })
       Button('确认消耗').backgroundColor('#638C80').fontColor('#FFFFFF').height(48).width('100%').margin({ top: 20 }).borderRadius(15).onClick(() => this.confirm('消耗库存', `确认消耗 ${this.consumeAmount}${this.editing.unit}？`, async () => { await this.store.consume(this.editing, Number(this.consumeAmount)); this.page = ''; }))
      }
      else if (this.page === 'merge') { this.mergePage() }
      else if (this.page === 'taste') { this.tastePreferences() }
      else if (this.page === 'stats') { this.statisticsPage() }
      else if (this.page === 'recipe-edit') { this.recipeEditPage() }
      else if (this.page === 'public-recipes') { this.publicRecipePage() }
      else if (this.page === 'replenishment') { this.replenishmentPage() }
      else if(this.page==='notifications'){this.notificationsPage()}
      else if (this.page === 'community') { this.communityPage() }
      else if (this.page === 'profile') { this.title('AT THEIR TABLE', '公开的餐桌日常', '这里只展示已经审核通过的公开内容'); if (this.profilePosts.length === 0) { this.empty('还没有公开内容', '私有和家庭内容不会出现在这里。') } ForEach(this.profilePosts, (p: CommunityPost) => { Text(p.payload.name).fontSize(19).fontColor('#8D779C').padding(22).width('100%').backgroundColor(this.surface()).border({ width: 0.5, color: '#C4BCAB' }).borderRadius({ topLeft: 8, topRight: 20, bottomLeft: 14, bottomRight: 7 }).margin({ bottom: 12 }).onClick(() => this.run(async () => { await this.openPost(p); })) }) }
      else if (this.page === 'post') { this.postPage() }
      else if (this.page === 'publish') { this.publishPage() }
      else if (this.page === 'barcodes') { this.barcodePage() }
      else if (this.page === 'family-members') { this.familyMembersPage() }
      else if (this.page === 'auth') { this.authPage() }
      else if (this.page === 'my-profile') { this.myProfilePage() }
      else if (this.page === 'region-picker') { this.profileRegionPage() }
      else if (this.page === 'account') { this.accountPage() }
      else if (this.page === 'food') { this.foodForm() }
      else if(this.page==='recipe-works'){if(COMMUNITY_ENABLED){this.recipeWorks()}}
      else if (this.page === 'recipe') { this.recipeDetail() }
      else if (this.page === 'cook-guide') { this.cookGuide() }
      else if (this.page === 'shopping') { this.shoppingPage() }
      else if (this.page === 'meal') { this.mealForm() }
      else if (this.page === 'templates') { this.templates() }
      else if (this.tab === 0) { this.dashboard() }
      else if (this.tab === 1) { this.inventory() }
      else if (this.tab === 2) { this.shoppingPage() }
      else if (this.tab === 3) { this.recipePage() }
      else if (this.tab === 4) { this.diary() }
      else { this.settings() }
     }.id('adaptive-reading-column').width('100%').constraintSize({maxWidth:760}).alignItems(HorizontalAlign.Start).padding({ left: this.pageGutter(), right: this.pageGutter(), top: 10, bottom: 30 }).opacity(this.pageFade).translate({y:this.pageShift,x:this.routeX}).scale({x:this.routeScale,y:this.routeScale}).onAreaChange(()=>{if(this.page==='ai-assistant'&&this.assistantQuestion&&this.assistantBusy&&this.assistantFollowLatest){this.pageScroller.scrollEdge(Edge.Bottom);}})
    }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).layoutWeight(1).scrollBar(BarState.Off).width('100%').align(Alignment.Top).onWillScroll((x:number,y:number,state:ScrollState,source:ScrollSource)=>{if(this.page==='ai-assistant'&&(source===ScrollSource.DRAG||source===ScrollSource.FLING||source===ScrollSource.OTHER_USER_INPUT||source===ScrollSource.SCROLL_BAR||source===ScrollSource.SCROLL_BAR_FLING)){if(y<0){this.assistantFollowLatest=false;}if(Math.abs(y)>0){this.assistantContextOpen=false;}}}).onScroll((x:number,y:number)=>{if(this.page==='ai-assistant'){this.assistantReadingY=(this.pageScroller.currentOffset()?.yOffset || 0);}}).onReachEnd(()=>{this.recipeBrowseEnd();if(this.page==='ai-assistant'){this.assistantFollowLatest=true;}}).transition(TransitionEffect.OPACITY.animation({duration:this.reducedMotion?0:260}))
    if(!this.page&&(this.tab===1||this.tab===4)){Button(this.tab===1?'小怪帮我用库存':'一句话记一餐',{type:ButtonType.Normal}).height(46).fontColor('#76577D').backgroundColor('#F0E7EE').onClick(()=>{this.assistantLauncherScene=this.tab===1?'inventory':'meals';this.assistantLauncherOpen=true;})}
    if(this.page==='cook-guide'){
     Column({space:8}){
      if(this.cookClockOpen){
       Text('锅边计时').fontFamily('ShikuHand').fontSize(20).fontColor('#38584D')
       Row({space:6}){ForEach([5,10,15],(m:number)=>{Button(m+' 分钟').layoutWeight(1).height(44).fontColor('#594B30').backgroundColor('#F0E4C9').onClick(()=>this.run(()=>this.startDockTimer(m)))})}.width('100%')
       Row({space:8}){TextInput({text:this.timerMinutes,placeholder:'自定义分钟'}).accessibilityText('自定义计时分钟').type(InputType.Number).layoutWeight(1).onChange((v:string)=>{this.timerMinutes=v;});Button('开始计时').height(44).backgroundColor('#426653').onClick(()=>this.run(()=>this.startDockTimer(Number(this.timerMinutes))))}.width('100%')
      }
      Row({space:6}){
       Button('上一步').layoutWeight(1).height(46).fontColor('#547763').backgroundColor('#E9EFE5').enabled(this.cookStep>0).onClick(()=>this.moveCookStep(-1))
       Button({type:ButtonType.Normal}){Row({space:3}){Image($r('app.media.experience_timer')).width(23).height(23);Text(this.cookClockOpen?'收起':'计时器').fontSize(15).fontColor('#594B30')}}.layoutWeight(1).height(46).padding(3).borderRadius(12).backgroundColor('#EFE4C9').onClick(()=>{this.cookClockOpen=!this.cookClockOpen;})
       if(this.cookStep+1<this.guide().steps.length){Button('下一步').layoutWeight(1.2).height(46).backgroundColor('#426653').onClick(()=>this.moveCookStep(1))}
       else{Button(this.cookedToday(new Date())?'已出锅':'完成这道菜').id('finish-guide-dish').layoutWeight(1.2).height(46).padding(4).fontSize(15).backgroundColor('#426653').enabled(this.guide().steps.length>0&&!this.busy&&!this.cookedToday(new Date())).onClick(()=>this.run(()=>this.finishGuideDish()))}
      }.width('100%')
     }.width('100%').padding(9).backgroundColor('#FFFAF0').border({width:1,color:'#D8CAAE'}).borderRadius(16)
    }
    if(this.page==='ai-assistant'){this.assistantComposer()}
    if (this.page === 'food' && this.formStep === 1) {
     Row({ space: 15 }) { Column({ space: 4 }) { Text(`${this.formQuantity}${this.formUnit} · ${this.formLocation}`).fontSize(13).fontColor('#4F6370');  }.alignItems(HorizontalAlign.Start).layoutWeight(1); Button(this.busy ? '保存中…' : '确认存入库存 ✓').height(47).fontFamily('HarmonyOS Sans SC').fontSize(17).fontColor('#263E46').backgroundColor('#BCD2C3').border({ width: 0.6, color: '#B7AC94' }).borderRadius(10).enabled(!this.busy).onClick(() => this.run(async () => { await this.saveFood(); })) }.padding({ left: 22, right: 22, top: 13, bottom: 13 }).width('100%').backgroundColor(this.surface())
    }
    if(this.page==='draw'||this.page==='draw-result'){this.drawActionBar()}
    if(this.page==='recipe-filters'){this.filterActionBar()}
    if (this.page === 'meal') {
     Row({ space: 12 }) { Column({ space: 4 }) { Text((this.mealDishes.length + (this.dishName && this.editingDish < 0 ? 1 : 0)) + ' 道菜 · ¥' + this.draftMealCost()).fontSize(14).fontColor('#304F52'); Text(this.mealCostType + ' · ' + this.mealDining + ' · 仅自己').fontSize(10).fontColor('#6C766C') }.alignItems(HorizontalAlign.Start).layoutWeight(1); Button({ type: ButtonType.Normal }){Text(this.busy ? '保存中…' : '保存私有记录').fontSize(15).maxLines(2).textAlign(TextAlign.Center)}.layoutWeight(1).constraintSize({minHeight:48}).padding({left:8,right:8,top:10,bottom:10}).fontColor('#FFFFFF').backgroundColor('#385D59').borderRadius(12).enabled(!this.busy).onClick(() => this.run(async () => { await this.saveMealForm(); })) }.width('100%').padding({ left: 22,right: 22,top: 12,bottom: 13 }).backgroundColor('#FFFDFA').border({ width: { top: 0.5 },color: '#D8D4C9' })
    }
    if(this.undoNotice){Row({space:12}){Text(this.undoNotice).fontSize(14).lineHeight(22).fontColor('#354F46').layoutWeight(1);Button('撤销',{type:ButtonType.Normal}).height(44).constraintSize({minWidth:60}).padding({left:12,right:12}).fontSize(14).fontWeight(FontWeight.Medium).fontColor('#42674F').backgroundColor(Color.Transparent).borderRadius(10).enabled(!this.busy).onClick(()=>this.run(async()=>{await this.undoTask();}))}.width('92%').constraintSize({maxWidth:380,minHeight:52}).padding({left:16,right:6,top:4,bottom:4}).backgroundColor('#EDF2E7').border({width:1,color:'#D7DFCF'}).borderRadius(16).margin({top:8,bottom:8}).shadow({radius:8,color:'#14354F46',offsetY:3})}
    if (!this.page) { this.bottomBar() }
    }.width('100%').height('100%').gesture(
   PanGesture({direction:PanDirection.Horizontal,distance:24})
    .onActionStart((event:GestureEvent)=>{if(this.lobbyVisible){return;}this.swipeStartX=event.fingerList.length?event.fingerList[0].localX-event.offsetX:999;})
    .onActionUpdate((event:GestureEvent)=>{if(this.page&&this.swipeStartX<28&&event.offsetX>0&&!this.busy&&!this.reducedMotion){this.routeX=Math.min(72,event.offsetX*0.35);}})
    .onActionEnd((event:GestureEvent)=>{if(!this.lobbyVisible){this.handlePageSwipe(event.offsetX,event.offsetY);}})
    .onActionCancel(()=>{this.swipeStartX=999;this.settleSwipe();})
  )
    }
   }
  }.width('100%').height('100%').blur(this.companionChatOpen?8:0).enabled(!this.companionChatOpen)
  if(this.operationPending){
   Column(){Blank();Row({space:8}){LoadingProgress().width(20).height(20).color('#FFFDF6');Text('正在处理，请稍候…').fontSize(14).fontColor('#FFFDF6')}.padding({left:16,right:16,top:12,bottom:12}).backgroundColor('#354F46').borderRadius(16).accessibilityText('正在处理，请稍候').margin({bottom:96})}.width('100%').height('100%').hitTestBehavior(HitTestMode.None)
  }
  this.companionPet()
  if(this.companionChatOpen){this.companionDialog()}
  if(this.launchVisible){this.launchView()}
  }
  }.width('100%').height('100%').bindSheet($$this.assistantLauncherOpen,this.experienceLauncher(),{height:SheetSize.MEDIUM,showClose:true,backgroundColor:'#FCF8EF'}).onAreaChange((_oldArea:Area,newArea:Area)=>{const height:number=Number(newArea.height);if(Number.isFinite(height)&&height>0){this.viewportHeight=height;}const width:number=Number(newArea.width);if(Number.isFinite(width)&&width>0&&Math.abs(this.viewportWidth-width)>0.5){this.viewportWidth=width;}}).backgroundColor(this.backdrop()).backgroundImage($r('app.media.crayon_paper_tile'),ImageRepeat.XY).backgroundImageSize({ width: 420,height: 420 })
 }
}
