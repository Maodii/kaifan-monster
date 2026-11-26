package com.kaifan.monster;

import android.app.Activity;
import android.app.Dialog;
import android.content.res.ColorStateList;
import android.graphics.*;
import android.graphics.drawable.*;
import android.os.Build;
import android.view.*;
import android.widget.*;
import java.io.InputStream;
import java.util.concurrent.atomic.AtomicBoolean;

/** Native confirmation surface: keeps synchronous WebView confirmation semantics. */
final class BrandedDialog {
 interface Answer { void finish(boolean accepted, String text); }
 static Dialog show(Activity activity, String message, String initial, Answer answer) {
  return show(activity,message,initial,false,answer);
 }
 static Dialog showAlert(Activity activity,String message,Answer answer){return show(activity,message,null,true,answer);}
 private static Dialog show(Activity activity,String message,String initial,boolean notice,Answer answer){
  Dialog dialog=new Dialog(activity);dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
  AtomicBoolean finished=new AtomicBoolean(false);
  final EditText[] field={null};
  java.util.function.Consumer<Boolean> settle=accepted->{
   if(!finished.compareAndSet(false,true))return;
   dialog.dismiss();answer.finish(accepted,field[0]==null?"":field[0].getText().toString());
  };
  LinearLayout paper=new LinearLayout(activity);paper.setOrientation(LinearLayout.VERTICAL);
  paper.setPadding(dp(activity,22),dp(activity,20),dp(activity,22),dp(activity,20));
  paper.setBackground(new Paper(activity));
  String title=message,detail="";boolean shopping=message.matches("确认添加[ ]*[0-9]+项[？?]");
  if(shopping){title="加入采购清单？";detail="这批缺少的食材会加入待采购，已有库存不会减少。";}else{int end=message.indexOf('？');if(end>=0&&end<36&&end+1<message.length()){title=message.substring(0,end+1);detail=message.substring(end+1).trim();}else if(message.length()>48){title=notice?"小怪提醒":initial!=null?"填写信息":"确认操作";detail=message;}}
  LinearLayout header=new LinearLayout(activity);header.setGravity(Gravity.CENTER_VERTICAL);
  TextView heading=text(activity,title,22,0xff354f46);heading.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));heading.setLineSpacing(dp(activity,3),1);header.addView(heading,new LinearLayout.LayoutParams(0,-2,1));
  ImageView mascot=new ImageView(activity);mascot.setScaleType(ImageView.ScaleType.FIT_CENTER);mascot.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
  try(InputStream in=activity.getAssets().open("media/experience_assistant.png")){BitmapFactory.Options o=new BitmapFactory.Options();o.inSampleSize=4;mascot.setImageBitmap(BitmapFactory.decodeStream(in,null,o));}catch(Exception ignored){}
  LinearLayout.LayoutParams mascotSize=new LinearLayout.LayoutParams(dp(activity,38),dp(activity,38));mascotSize.leftMargin=dp(activity,12);header.addView(mascot,mascotSize);paper.addView(header);
  ScrollView scroll=new ScrollView(activity);scroll.setFillViewport(false);scroll.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);scroll.setVerticalScrollBarEnabled(false);
  LinearLayout body=new LinearLayout(activity);body.setOrientation(LinearLayout.VERTICAL);body.setPadding(0,dp(activity,16),0,dp(activity,16));
  if(!detail.isEmpty()){TextView description=text(activity,detail,15,0xff747768);description.setLineSpacing(dp(activity,5),1);description.setPadding(0,0,0,dp(activity,12));body.addView(description);}
  if(initial!=null){field[0]=new EditText(activity);field[0].setText(initial);field[0].setTextSize(16);field[0].setTextColor(0xff354f46);field[0].setSingleLine(false);field[0].setMaxLines(4);field[0].setPadding(dp(activity,14),dp(activity,8),dp(activity,14),dp(activity,8));field[0].setBackground(fill(0xfff0eadf,dp(activity,14)));body.addView(field[0]);}
  scroll.addView(body);paper.addView(scroll,new LinearLayout.LayoutParams(-1,-2));
  LinearLayout buttons=new LinearLayout(activity);buttons.setOrientation(LinearLayout.HORIZONTAL);buttons.setPadding(0,dp(activity,4),0,0);
  Button cancel=button(activity,"取消",false),yes=button(activity,shopping?"加入采购":"确认",true);
  LinearLayout.LayoutParams left=new LinearLayout.LayoutParams(0,-2,1);left.rightMargin=dp(activity,6);
  LinearLayout.LayoutParams right=new LinearLayout.LayoutParams(0,-2,1);right.leftMargin=dp(activity,6);
  if(!notice)buttons.addView(cancel,left);else right.leftMargin=0;buttons.addView(yes,right);if(notice)yes.setText("知道了");paper.addView(buttons);
  cancel.setOnClickListener(v->settle.accept(false));yes.setOnClickListener(v->{yes.setEnabled(false);settle.accept(true);});
  dialog.setContentView(paper);dialog.setCanceledOnTouchOutside(false);dialog.setOnCancelListener(d->settle.accept(false));dialog.setOnDismissListener(d->{if(finished.compareAndSet(false,true))answer.finish(false,"");});
  if(activity.isFinishing()||activity.isDestroyed()){settle.accept(false);return dialog;}
  dialog.show();Window window=dialog.getWindow();window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);window.setDimAmount(.30f);window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
  WindowManager.LayoutParams layout=window.getAttributes();layout.width=Math.min(activity.getResources().getDisplayMetrics().widthPixels-dp(activity,40),dp(activity,440));layout.height=-2;layout.gravity=Gravity.CENTER;layout.windowAnimations=R.style.BrandedDialogMotion;window.setAttributes(layout);
  paper.getViewTreeObserver().addOnGlobalLayoutListener(()->{if(!dialog.isShowing())return;Rect visible=new Rect();window.getDecorView().getWindowVisibleDisplayFrame(visible);int available=visible.height()>0?visible.height():activity.getResources().getDisplayMetrics().heightPixels;int cap=Math.max(dp(activity,64),available-header.getHeight()-buttons.getHeight()-paper.getPaddingTop()-paper.getPaddingBottom()-dp(activity,48));int desired=body.getHeight()>cap?cap:-2;LinearLayout.LayoutParams size=(LinearLayout.LayoutParams)scroll.getLayoutParams();if(size.height!=desired){size.height=desired;scroll.setLayoutParams(size);}});
  if(notice)yes.requestFocus();else cancel.requestFocus();return dialog;
 }
 private static Button button(Activity a,String title,boolean primary){Button b=new Button(a);b.setText(title);b.setAllCaps(false);b.setTextSize(15);b.setTextColor(primary?0xfffffdf6:0xff637563);b.setGravity(Gravity.CENTER);b.setMinHeight(dp(a,48));b.setMinimumWidth(0);b.setMinWidth(0);b.setPadding(dp(a,8),dp(a,10),dp(a,8),dp(a,10));b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x226d7961),fill(primary?0xff56745e:0xffeaeadd,dp(a,14)),null));return b;}
 private static TextView text(Activity a,String t,int size,int color){TextView v=new TextView(a);v.setText(t);v.setTextSize(size);v.setTextColor(color);v.setIncludeFontPadding(false);return v;}
 private static GradientDrawable fill(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(radius);return d;}
 private static int dp(Activity a,float value){return Math.round(value*a.getResources().getDisplayMetrics().density);}
 private static final class Paper extends Drawable{
  final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);final float density;
  Paper(Activity a){density=a.getResources().getDisplayMetrics().density;}
  public void draw(Canvas c){Rect b=getBounds();RectF r=new RectF(b.left+1,b.top+1,b.right-1,b.bottom-1);Path p=new Path();p.addRoundRect(r,new float[]{24*density,24*density,30*density,30*density,22*density,22*density,28*density,28*density},Path.Direction.CW);paint.setStyle(Paint.Style.FILL);paint.setColor(0xfffffaf0);c.drawPath(p,paint);c.save();c.clipPath(p);paint.setColor(0x18c6a1d5);c.drawOval(new RectF(b.right-120*density,-70*density,b.right+45*density,70*density),paint);paint.setColor(0x22b6c8a4);c.drawOval(new RectF(-80*density,b.bottom-55*density,140*density,b.bottom+65*density),paint);paint.setColor(0x12a58a60);for(int y=5;y<b.height();y+=11*density){float x=(y*17)%Math.max(1,b.width());c.drawCircle(x,y,.45f*density,paint);}c.restore();paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(density*.7f);paint.setColor(0xffdfd4be);c.drawPath(p,paint);}
  public void setAlpha(int alpha){}public void setColorFilter(ColorFilter filter){}public int getOpacity(){return PixelFormat.TRANSLUCENT;}
 }
}
