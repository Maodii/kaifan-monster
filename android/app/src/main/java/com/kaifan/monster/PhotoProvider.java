package com.kaifan.monster;
import android.content.*;import android.database.Cursor;import android.net.Uri;import android.os.*;import java.io.*;
/** Grants camera access only to this application's named private photo file. */
public class PhotoProvider extends ContentProvider {
 public boolean onCreate(){return true;} private File resolve(Uri u)throws FileNotFoundException{String n=u.getLastPathSegment();if(n==null||!n.matches("[a-zA-Z0-9-]+\\.jpg"))throw new FileNotFoundException();File d=new File(getContext().getFilesDir(),"photos");d.mkdirs();return new File(d,n);}
 public ParcelFileDescriptor openFile(Uri u,String mode)throws FileNotFoundException{return ParcelFileDescriptor.open(resolve(u),mode.contains("w")?ParcelFileDescriptor.MODE_CREATE|ParcelFileDescriptor.MODE_TRUNCATE|ParcelFileDescriptor.MODE_READ_WRITE:ParcelFileDescriptor.MODE_READ_ONLY);}
 public String getType(Uri u){return "image/jpeg";}public Cursor query(Uri a,String[]b,String c,String[]d,String e){return null;}public Uri insert(Uri a,ContentValues b){throw new UnsupportedOperationException();}public int delete(Uri a,String b,String[]c){return 0;}public int update(Uri a,ContentValues b,String c,String[]d){return 0;}
}
