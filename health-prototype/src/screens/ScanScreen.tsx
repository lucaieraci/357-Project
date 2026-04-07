import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchRecentScans, runFoodScan } from "../services/foodScan";

type RecentScan = {
  id: string;
  item: string;
  calories: number;
  confidence: number;
  eatenAt: string;
};

export function ScanScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ text: string; isError: boolean }>({
    text: "Take or upload a photo of your meal to get started.",
    isError: false,
  });
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  const loadRecent = async () => {
    try {
      const rows = await fetchRecentScans();
      setRecentScans(rows);
    } catch (err) {
      console.error("Failed loading recent scans:", err);
    }
  };

  useEffect(() => {
    void loadRecent();
  }, []);

  const processImage = async (uri: string) => {
    try {
      setIsSubmitting(true);
      setStatus({ text: "Analysing your meal...", isError: false });
      setPreviewUri(uri);

      const result = await runFoodScan(uri);
      setStatus({
        text: `Found ${result.items.length} item${result.items.length !== 1 ? "s" : ""}`,
        isError: false,
      });

      setTimeout(() => loadRecent(), 500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Scan failed. Please try again.";
      console.error("Scan error:", message);
      setStatus({ text: message, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus({ text: "Photo library permission is required.", isError: true });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setStatus({ text: "Could not read selected image.", isError: true });
      return;
    }
    await processImage(asset.uri);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatus({ text: "Camera permission is required.", isError: true });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setStatus({ text: "Could not capture photo.", isError: true });
      return;
    }
    await processImage(asset.uri);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero scan card */}
      <View style={styles.heroCard}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="fast-food-outline" size={48} color="#9ca3af" />
            <Text style={styles.placeholderText}>No photo yet</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleTakePhoto}
            disabled={isSubmitting}
          >
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Camera</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handlePickFromLibrary}
            disabled={isSubmitting}
          >
            <Ionicons name="image-outline" size={18} color="#0f766e" />
            <Text style={styles.secondaryButtonText}>Upload</Text>
          </Pressable>
        </View>

        {isSubmitting ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color="#0f766e" />
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
        ) : (
          <View style={styles.statusRow}>
            <Ionicons
              name={status.isError ? "alert-circle-outline" : "information-circle-outline"}
              size={16}
              color={status.isError ? "#dc2626" : "#64748b"}
            />
            <Text style={[styles.statusText, status.isError && styles.statusError]}>
              {status.text}
            </Text>
          </View>
        )}
      </View>

      {/* Recent scans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        {recentScans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={28} color="#cbd5e1" />
            <Text style={styles.emptyText}>No scans yet</Text>
          </View>
        ) : (
          recentScans.map((scan) => (
            <View key={scan.id} style={styles.rowCard}>
              <View style={styles.rowIcon}>
                <Ionicons name="fast-food-outline" size={20} color="#0f766e" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{scan.item}</Text>
                <Text style={styles.rowMeta}>
                  {Math.round(scan.calories)} kcal · {Math.round(scan.confidence * 100)}% confidence
                </Text>
                <Text style={styles.rowTime}>
                  {new Date(scan.eatenAt).toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9fafb",
    gap: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  placeholder: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  previewImage: {
    width: "100%",
    height: 220,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingBottom: 0,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#0f766e",
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 14,
  },
  statusText: {
    fontSize: 13,
    color: "#64748b",
    flex: 1,
  },
  statusError: {
    color: "#dc2626",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  rowCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f0fdf9",
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  rowMeta: {
    marginTop: 2,
    fontSize: 13,
    color: "#4b5563",
  },
  rowTime: {
    marginTop: 2,
    fontSize: 12,
    color: "#94a3b8",
  },
});
