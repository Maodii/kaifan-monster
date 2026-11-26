package com.kaifan.monster;
import android.app.*;import android.appwidget.*;import android.content.*;import android.widget.RemoteViews;
public class PantryWidget extends AppWidgetProvider {
 public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids){RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.pantry_widget);v.setTextViewText(R.id.widget_text,c.getSharedPreferences("widgets",0).getString("snapshot","打开小怪，记录第一份食材"));Intent i=new Intent(c,MainActivity.class).putExtra("route","shopping");PendingIntent p=PendingIntent.getActivity(c,id,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);v.setOnClickPendingIntent(R.id.widget_open,p);m.updateAppWidget(id,v);}}
 static void refresh(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);new PantryWidget().onUpdate(c,m,m.getAppWidgetIds(new ComponentName(c,PantryWidget.class)));}
}
