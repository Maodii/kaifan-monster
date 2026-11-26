package com.kaifan.monster;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/** Portable backup encryption. No Android Keystore dependency: the password enables device migration. */
public final class BackupCrypto {
    private static final int ITERATIONS = 210000;
    public static final int MAX_ENVELOPE_CHARS = 16 * 1024 * 1024;
    private static final int MAX_PLAINTEXT_BYTES = 12 * 1024 * 1024 - 1024;
    private static final byte[] AAD = "kaifan-backup:v1".getBytes(StandardCharsets.UTF_8);
    private static final SecureRandom RANDOM = new SecureRandom();

    private BackupCrypto() {}

    private static void passwordCheck(String password) {
        if (password == null || password.length() < 8 || password.length() > 128)
            throw new IllegalArgumentException("备份密码请设为8至128个字符");
    }

    private static byte[] derive(String password, byte[] salt) throws GeneralSecurityException {
        char[] chars = password.toCharArray();
        PBEKeySpec spec = new PBEKeySpec(chars, salt, ITERATIONS, 256);
        Arrays.fill(chars, '\0');
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } finally {
            spec.clearPassword();
        }
    }

    private static byte[] transform(int mode, byte[] input, String password, byte[] salt, byte[] iv)
            throws GeneralSecurityException {
        byte[] derived = derive(password, salt);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, new SecretKeySpec(derived, "AES"), new GCMParameterSpec(128, iv));
            cipher.updateAAD(AAD);
            return cipher.doFinal(input);
        } finally {
            Arrays.fill(derived, (byte) 0);
        }
    }

    public static Map<String, Object> encrypt(String content, String password) throws GeneralSecurityException {
        passwordCheck(password);
        if (content == null || content.isEmpty()) throw new IllegalArgumentException("备份内容为空");
        if (content.length() > MAX_PLAINTEXT_BYTES) throw new IllegalArgumentException("备份过大");
        byte[] plaintext = content.getBytes(StandardCharsets.UTF_8);
        if (plaintext.length > MAX_PLAINTEXT_BYTES) throw new IllegalArgumentException("备份过大");
        byte[] salt = new byte[16], iv = new byte[12];
        RANDOM.nextBytes(salt);
        RANDOM.nextBytes(iv);
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("format", "kaifan-backup");
        envelope.put("version", 1);
        envelope.put("algorithm", "AES-256-GCM");
        envelope.put("kdf", "PBKDF2-SHA256");
        envelope.put("iterations", ITERATIONS);
        envelope.put("salt", Base64.getEncoder().encodeToString(salt));
        envelope.put("iv", Base64.getEncoder().encodeToString(iv));
        try {
            envelope.put("ciphertext", Base64.getEncoder().encodeToString(
                    transform(Cipher.ENCRYPT_MODE, plaintext, password, salt, iv)));
        } finally {
            Arrays.fill(plaintext, (byte) 0);
        }
        return envelope;
    }

    private static byte[] decode(Object value, int expectedLength) {
        if (!(value instanceof String)) throw new IllegalArgumentException("备份编码无效");
        String text = (String) value;
        if (text.length() > MAX_ENVELOPE_CHARS || text.length() % 4 != 0
                || !text.matches("[A-Za-z0-9+/]*={0,2}"))
            throw new IllegalArgumentException("备份编码无效");
        byte[] data = Base64.getDecoder().decode(text);
        if (!Base64.getEncoder().encodeToString(data).equals(text))
            throw new IllegalArgumentException("备份编码无效");
        if (expectedLength > 0 && data.length != expectedLength)
            throw new IllegalArgumentException("备份参数长度无效");
        return data;
    }

    private static boolean numberIs(Object value, int expected) {
        return value instanceof Number && ((Number) value).doubleValue() == expected;
    }

    public static String decrypt(Map<String, Object> envelope, String password) throws GeneralSecurityException {
        passwordCheck(password);
        if (!"kaifan-backup".equals(envelope.get("format")) || !numberIs(envelope.get("version"), 1)
                || !"AES-256-GCM".equals(envelope.get("algorithm"))
                || !"PBKDF2-SHA256".equals(envelope.get("kdf"))
                || !numberIs(envelope.get("iterations"), ITERATIONS))
            throw new IllegalArgumentException("不支持的加密备份格式");
        byte[] salt = decode(envelope.get("salt"), 16), iv = decode(envelope.get("iv"), 12);
        byte[] ciphertext = decode(envelope.get("ciphertext"), 0);
        if (ciphertext.length < 17 || ciphertext.length > MAX_PLAINTEXT_BYTES + 16)
            throw new IllegalArgumentException("备份内容不完整或过大");
        byte[] plaintext;
        try {
            plaintext = transform(Cipher.DECRYPT_MODE, ciphertext, password, salt, iv);
        } catch (GeneralSecurityException error) {
            throw new GeneralSecurityException("密码错误或备份已损坏，未导入任何记录");
        }
        try {
            return new String(plaintext, StandardCharsets.UTF_8);
        } finally {
            Arrays.fill(plaintext, (byte) 0);
        }
    }
}
