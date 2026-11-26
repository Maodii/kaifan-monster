# 社区分页、真实热度与家庭采购认领

## 社区分页

旧数组接口保持兼容，新增：

- `GET /api/v1/community/posts/page?scope=public&cursor=`，scope支持public/family/private/mine/following/favorites。
- `GET /api/v1/community/recipes/:recipeId/works/page?cursor=`。

返回 `{items: CommunityPost[], hasMore:boolean, nextCursor:string, pageSize:20}`。没有下一页时nextCursor为空字符串。单个动态新增`demo_data:boolean`，其他字段保持旧结构。

游标保留PostgreSQL微秒时间和UUID，以`created_at DESC,id DESC`稳定翻页；游标绑定分区或具体菜谱，跨分区复用返回400。每页重新检查当前可见性、审核状态和家庭成员资格。成品页还要求对应照片已上传、源用餐未删除。公开内容仍对非作者隐藏未公开价格。

## 真实和演示热度

`GET /discovery/summary`：

- `favorites`每项仍有`recipeId,count`，兼容总收藏数；新增`realCount,demoCount`。列表优先按realCount排序。
- `hotSearches`仅统计当前有效真实账号，保持至少三个不同真实用户的阈值。
- `demoHotSearches`单独给出演示用户热搜；不能用于真实用户热度。
- `rankingBasis:'real-users'`。`demoData`保留，用于说明当前存在演示内容。
- `PUT /discovery/favorites/:id`返回新增realCount/demoCount，原count保留。

## 家庭采购认领

认领是服务器拥有的协作元数据，使用独立shopping_claim表；不会把认领者写进可被离线编辑覆盖的shopping_list.payload，也不会伪造记录版本或同步日志。

- `GET /shopping/claims?familyId=<uuid>`：返回`{items:[{shoppingId,familyId,claimed:true,claimantId,claimantName,claimedAt,mine}],syncMode:'server-metadata'}`，最多500条；仅包含未购买、未删除且认领者仍在家庭中的记录。
- `GET /shopping/:id/claim`：单项状态。
- `POST /shopping/:id/claim`：无须body，认领者始终取当前登录用户；别人已认领返回409，相同用户重复认领幂等。
- `DELETE /shopping/:id/claim`：取消自己的认领；重复取消幂等，不能替别人取消。

单项响应：`{shoppingId,familyId,purchased,claimed,claimantId,claimantName,claimedAt,mine,syncMode:'server-metadata'}`；无人认领时ID和名称为空字符串、claimedAt为null。

私人采购不提供认领，只有共享记录且当前仍为家庭成员才能访问。操作使用与同步及家庭变更相同的事务锁顺序；购买/删除触发器在原同步事务中清除认领，恢复未购买状态不会复活旧认领。移除成员时复合外键自动清除其认领。

原生端应在进入共享采购页、同步完成及认领变更后刷新状态；断网时保留普通离线购物清单，认领标为未确认，不能显示认领成功。独立元数据当前没有实时推送。

迁移：019_shopping_claims_and_feed.sql。

验证：work/reports/social-pagination-claims.json（7组真实PostgreSQL和Nest HTTP）；既有community-relations与discovery-catalog隔离回归分别7组和6组通过。测试schema已移除，现有真实用户、帖子、采购项未改动。未启动模拟器或前台窗口。
