import com.kaifan.monster.BackupCrypto;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/** Host protocol test driver, never packaged in the application. */
public class BackupCryptoHarness {
    private static final String[] KEYS = {"format", "version", "algorithm", "kdf", "iterations", "salt", "iv", "ciphertext"};
    private static String decode(String value) {
        return new String(Base64.getDecoder().decode(value), StandardCharsets.UTF_8);
    }
    public static void main(String[] args) throws Exception {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        try {
            String mode = in.readLine(), password = decode(in.readLine());
            if ("encrypt".equals(mode)) {
                Map<String, Object> envelope = BackupCrypto.encrypt(decode(in.readLine()), password);
                StringBuilder out = new StringBuilder("OK");
                for (String key : KEYS) out.append('\t').append(envelope.get(key));
                System.out.println(out);
            } else {
                Map<String, Object> envelope = new LinkedHashMap<>();
                for (String key : KEYS) {
                    String value = decode(in.readLine());
                    envelope.put(key, key.equals("version") || key.equals("iterations") ? Integer.valueOf(value) : value);
                }
                System.out.println("OK\t" + Base64.getEncoder().encodeToString(
                        BackupCrypto.decrypt(envelope, password).getBytes(StandardCharsets.UTF_8)));
            }
        } catch (Exception error) {
            System.out.println("ERROR\t" + error.getMessage());
        }
    }
}
