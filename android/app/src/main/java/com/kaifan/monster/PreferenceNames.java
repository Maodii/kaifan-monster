package com.kaifan.monster;
/** Native bridge preference allowlist. Privacy consent is the only non-shiku namespace. */
public final class PreferenceNames {
 private PreferenceNames() {}
 public static boolean allowed(String name) {
  return name != null && (name.equals("kaifan_privacy") || name.matches("shiku_[a-zA-Z0-9_-]+"));
 }
}
