import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
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
  const [status, setStatus] = useState("Ready to scan.");
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
      setStatus("Uploading photo and scanning...");
      setPreviewUri(uri);

      const result = await runFoodScan(uri);
      setStatus(
        `Saved scan with ${result.items.length} item(s) into meal ${result.mealId.slice(
          0,
          8
        )}...`
      );

      await loadRecent();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Scan failed. Please try again.";
      setStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickFromLibrary = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus("Photo library permission is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setStatus("Could not read selected image.");
      return;
    }

    await processImage(asset.uri);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatus("Camera permission is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setStatus("Could not read captured photo.");
      return;
    }

    await processImage(asset.uri);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.scanCard}>
        <Text style={styles.heading}>Food Image Scan</Text>
        <Text style={styles.body}>
          Capture a meal photo and parse foods into nutrient entries.
        </Text>
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleTakePhoto}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Take Photo</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handlePickFromLibrary}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>Upload Photo</Text>
          </Pressable>
        </View>
        {isSubmitting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#0f766e" />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : (
          <Text style={styles.statusText}>{status}</Text>
        )}
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.previewImage} />
        ) : null}
        <Text style={styles.hintText}>
          If no scan API key is set, mock nutrition parsing is used.
        </Text>
      </View>

      <View style={styles.envCard}>
        <Text style={styles.envTitle}>Optional API setup</Text>
        <Text style={styles.envText}>
          Add `EXPO_PUBLIC_CALORIEMAMA_API_URL` and
          `EXPO_PUBLIC_CALORIEMAMA_API_KEY` in `.env` to use a live food scan API.
          Without them, this screen stores photos and inserts mock parsed items.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        {recentScans.length === 0 ? (
          <View style={styles.rowCard}>
            <Text style={styles.rowMeta}>No saved scans yet.</Text>
          </View>
        ) : (
          recentScans.map((scan) => (
            <View key={scan.id} style={styles.rowCard}>
              <Text style={styles.rowTitle}>{scan.item}</Text>
              <Text style={styles.rowMeta}>
                {Math.round(scan.calories)} kcal | confidence{" "}
                {Math.round(scan.confidence * 100)}%
              </Text>
              <Text style={styles.rowTime}>
                {new Date(scan.eatenAt).toLocaleString()}
              </Text>
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
    gap: 14,
  },
  scanCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    color: "#4b5563",
  },
  buttonRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    flex: 1,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#0f766e",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    flex: 1,
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    marginTop: 12,
    fontSize: 13,
    color: "#334155",
  },
  previewImage: {
    marginTop: 12,
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748b",
  },
  envCard: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 12,
  },
  envTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e3a8a",
    marginBottom: 4,
  },
  envText: {
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  rowCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  rowMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#4b5563",
  },
  rowTime: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748b",
  },
});
