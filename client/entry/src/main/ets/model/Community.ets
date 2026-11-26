export class CommunityContent {trialOutcome:string='';actualMinutes:number=0;trialSubstitution:string='';trialFailure:string=''; name: string = ''; notes: string = ''; tags: string = ''; date: string = ''; estimatedCost: number = 0; photoId: string = ''; recipeId: string = ''; }
export class CommunityPost { demo_data:boolean=false; favorite_count:number=0;favorited:boolean=false; author_name:string='小怪朋友';author_avatar:string='tomato';like_count:number=0;liked:boolean=false;comment_count:number=0;created_at:string=''; id: string = ''; user_id: string = ''; kind: string = ''; status: string = ''; visibility: string = ''; show_price: boolean = false; payload: CommunityContent = new CommunityContent(); }
export class CommunityComment { id: string = ''; body: string = ''; parent_id: string = ''; user_id: string = ''; }
export class PublishRequest { sourceId: string = ''; kind: string = 'meal'; visibility: string = 'public'; showPrice: boolean = false; confirmed: boolean = true; familyId: string = ''; }
export class CommentRequest { body: string = ''; parentId?: string; }
export class ReportRequest { reason: string = ''; }
export class PhotoRead { url: string = ''; }

export class CommunityRelationship {following:boolean=false;followers:number=0;following_count:number=0;}
export class CommunityNotification {id:string='';kind:string='';actor_id:string='';actor_name:string='';post_id:string='';read_at:string='';created_at:string='';}
export class CommunityInbox {items:CommunityNotification[]=[];unreadCount:number=0;}

export class CommunityPage {items:CommunityPost[]=[];hasMore:boolean=false;nextCursor:string='';pageSize:number=20;}
export class ShoppingClaim {shoppingId:string='';familyId:string='';claimed:boolean=false;claimantId:string='';claimantName:string='';claimedAt:string='';mine:boolean=false;}
export class ShoppingClaims {items:ShoppingClaim[]=[];}
