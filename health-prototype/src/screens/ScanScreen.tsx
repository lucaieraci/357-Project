import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchMealItems,
  fetchRecentScans,
  runFoodScan,
  type ParsedFoodItem,
} from "../services/foodScan";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecentScan = {
  id: string;
  item: string;
  calories: number;
  confidence: number;
  eatenAt: string;
};

// ---------------------------------------------------------------------------
// Micro-nutrient display helpers
// ---------------------------------------------------------------------------

const MICRO_LABELS: Record<string, string> = {
  fiber_g: "Fiber",
  sugar_g: "Sugar",
  vitamin_c_mg: "Vitamin C",
  vitamin_a_ug: "Vitamin A",
  vitamin_d_ug: "Vitamin D",
  vitamin_e_mg: "Vitamin E",
  vitamin_k_ug: "Vitamin K",
  thiamin_mg: "Thiamin (B1)",
  riboflavin_mg: "Riboflavin (B2)",
  niacin_mg: "Niacin (B3)",
  vitamin_b6_mg: "Vitamin B6",
  folate_ug: "Folate",
  vitamin_b12_ug: "Vitamin B12",
  calcium_mg: "Calcium",
  iron_mg: "Iron",
  magnesium_mg: "Magnesium",
  potassium_mg: "Potassium",
  sodium_mg: "Sodium",
  zinc_mg: "Zinc",
};

function microUnit(key: string): string {
  if (key.endsWith("_ug")) return "μg";
  if (key.endsWith("_mg")) return "mg";
  if (key.endsWith("_g")) return "g";
  return "";
}

function fmt(val: number | undefined): string {
  if (val == null) return "—";
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MacroPill({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value?: number;
  unit: string;
  color: string;
}) {
  return (
    <View
      style={[
        ms.pill,
        { borderColor: color + "44", backgroundColor: color + "14" },
      ]}
    >
      <Text style={[ms.pillValue, { color }]}>
        {fmt(value)}
        <Text style={ms.pillUnit}> {unit}</Text>
      </Text>
      <Text style={ms.pillLabel}>{label}</Text>
    </View>
  );
}

function TotalBadge({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={ms.totalBadge}>
      <Text style={[ms.totalValue, { color }]}>
        {fmt(value)}
        <Text style={ms.totalUnit}>{unit}</Text>
      </Text>
      <Text style={ms.totalLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Meal detail bottom-sheet modal
// ---------------------------------------------------------------------------

type MealDetailModalProps = {
  visible: boolean;
  items: ParsedFoodItem[] | null;
  loading: boolean;
  onClose: () => void;
};

function MealDetailModal({
  visible,
  items,
  loading,
  onClose,
}: MealDetailModalProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (idx: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const totals = items?.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein_g: acc.protein_g + (item.protein_g ?? 0),
      carbs_g: acc.carbs_g + (item.carbs_g ?? 0),
      fat_g: acc.fat_g + (item.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* Header */}
          <View style={ms.header}>
            <Text style={ms.headerTitle}>Meal Breakdown</Text>
            <Pressable onPress={onClose} style={ms.closeBtn}>
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>

          {loading ? (
            <View style={ms.centerBox}>
              <ActivityIndicator size="large" color="#0f766e" />
              <Text style={ms.centerText}>Loading details…</Text>
            </View>
          ) : !items || items.length === 0 ? (
            <View style={ms.centerBox}>
              <Ionicons
                name="alert-circle-outline"
                size={36}
                color="#cbd5e1"
              />
              <Text style={ms.centerText}>No items found</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={ms.scrollContent}
            >
              {items.map((item, idx) => {
                const micros = item.micros ?? {};
                const microEntries = Object.entries(micros).filter(
                  ([, v]) => v > 0
                );
                const hasMicros = microEntries.length > 0;
                const isExpanded = expanded.has(idx);

                return (
                  <View key={idx} style={ms.itemCard}>
                    {/* Item name + weight */}
                    <View style={ms.itemHeader}>
                      <View style={ms.itemIconWrap}>
                        <Ionicons
                          name="fast-food-outline"
                          size={18}
                          color="#0f766e"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ms.itemName}>{item.food_name}</Text>
                        <Text style={ms.itemMeta}>
                          {item.grams != null ? `${item.grams} g` : ""}
                          {item.grams != null && item.confidence != null
                            ? "  ·  "
                            : ""}
                          {item.confidence != null
                            ? `${Math.round(item.confidence * 100)}% confidence`
                            : ""}
                        </Text>
                      </View>
                    </View>

                    {/* Macro pills */}
                    <View style={ms.macroPills}>
                      <MacroPill
                        label="Calories"
                        value={item.calories}
                        unit="kcal"
                        color="#ef4444"
                      />
                      <MacroPill
                        label="Protein"
                        value={item.protein_g}
                        unit="g"
                        color="#2563eb"
                      />
                      <MacroPill
                        label="Carbs"
                        value={item.carbs_g}
                        unit="g"
                        color="#f59e0b"
                      />
                      <MacroPill
                        label="Fat"
                        value={item.fat_g}
                        unit="g"
                        color="#10b981"
                      />
                    </View>

                    {/* Micros toggle */}
                    {hasMicros && (
                      <>
                        <TouchableOpacity
                          style={ms.microsToggle}
                          onPress={() => toggle(idx)}
                          activeOpacity={0.7}
                        >
                          <Text style={ms.microsToggleText}>
                            Vitamins &amp; Minerals
                          </Text>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={15}
                            color="#6b7280"
                          />
                        </TouchableOpacity>
                        {isExpanded && (
                          <View style={ms.microsGrid}>
                            {microEntries.map(([key, val]) => (
                              <View key={key} style={ms.microRow}>
                                <Text style={ms.microLabel}>
                                  {MICRO_LABELS[key] ?? key}
                                </Text>
                                <Text style={ms.microValue}>
                                  {fmt(val)} {microUnit(key)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                );
              })}

              {/* Totals */}
              {totals && (
                <View style={ms.totalsCard}>
                  <Text style={ms.totalsTitle}>Meal Total</Text>
                  <View style={ms.totalsRow}>
                    <TotalBadge
                      label="Calories"
                      value={Math.round(totals.calories)}
                      unit=" kcal"
                      color="#fca5a5"
                    />
                    <TotalBadge
                      label="Protein"
                      value={
                        Math.round(totals.protein_g * 10) / 10
                      }
                      unit=" g"
                      color="#93c5fd"
                    />
                    <TotalBadge
                      label="Carbs"
                      value={Math.round(totals.carbs_g * 10) / 10}
                      unit=" g"
                      color="#fcd34d"
                    />
                    <TotalBadge
                      label="Fat"
                      value={Math.round(totals.fat_g * 10) / 10}
                      unit=" g"
                      color="#6ee7b7"
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ScanScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ text: string; isError: boolean }>({
    text: "Take or upload a photo of your meal to get started.",
    isError: false,
  });
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalItems, setModalItems] = useState<ParsedFoodItem[] | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

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

  // Open the detail modal; if items are already in memory, show them immediately.
  // Otherwise fetch from Supabase.
  const openDetail = async (
    mealId: string,
    preloadedItems?: ParsedFoodItem[]
  ) => {
    if (preloadedItems) {
      setModalItems(preloadedItems);
      setModalLoading(false);
    } else {
      setModalItems(null);
      setModalLoading(true);
    }
    setModalVisible(true);

    if (!preloadedItems) {
      try {
        const items = await fetchMealItems(mealId);
        setModalItems(items);
      } catch (err) {
        console.error("Failed loading meal items:", err);
        setModalItems([]);
      } finally {
        setModalLoading(false);
      }
    }
  };

  const processImage = async (uri: string) => {
    try {
      setIsSubmitting(true);
      setStatus({ text: "Analysing your meal…", isError: false });
      setPreviewUri(uri);

      const result = await runFoodScan(uri);
      setStatus({
        text: `Found ${result.items.length} item${result.items.length !== 1 ? "s" : ""}`,
        isError: false,
      });

      // Auto-open breakdown immediately with the items we already have
      openDetail(result.mealId, result.items);

      setTimeout(() => void loadRecent(), 500);
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
      setStatus({
        text: "Photo library permission is required.",
        isError: true,
      });
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
    <>
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
              style={[
                styles.primaryButton,
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleTakePhoto}
              disabled={isSubmitting}
            >
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Camera</Text>
            </Pressable>
            <Pressable
              style={[
                styles.secondaryButton,
                isSubmitting && styles.buttonDisabled,
              ]}
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
                name={
                  status.isError
                    ? "alert-circle-outline"
                    : "information-circle-outline"
                }
                size={16}
                color={status.isError ? "#dc2626" : "#64748b"}
              />
              <Text
                style={[
                  styles.statusText,
                  status.isError && styles.statusError,
                ]}
              >
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
              <Pressable
                key={scan.id}
                style={({ pressed }) => [
                  styles.rowCard,
                  pressed && styles.rowCardPressed,
                ]}
                onPress={() => openDetail(scan.id)}
              >
                <View style={styles.rowIcon}>
                  <Ionicons
                    name="fast-food-outline"
                    size={20}
                    color="#0f766e"
                  />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{scan.item}</Text>
                  <Text style={styles.rowMeta}>
                    {Math.round(scan.calories)} kcal ·{" "}
                    {Math.round(scan.confidence * 100)}% confidence
                  </Text>
                  <Text style={styles.rowTime}>
                    {new Date(scan.eatenAt).toLocaleString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <MealDetailModal
        visible={modalVisible}
        items={modalItems}
        loading={modalLoading}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles — screen
// ---------------------------------------------------------------------------

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
  rowCardPressed: {
    backgroundColor: "#f0fdf9",
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

// ---------------------------------------------------------------------------
// Styles — modal
// ---------------------------------------------------------------------------

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 4,
  },
  itemCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f0fdf9",
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    textTransform: "capitalize",
  },
  itemMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  macroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 72,
  },
  pillValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  pillUnit: {
    fontSize: 11,
    fontWeight: "400",
  },
  pillLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },
  microsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  microsToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  microsGrid: {
    gap: 2,
    marginTop: 4,
  },
  microRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  microLabel: {
    fontSize: 12,
    color: "#374151",
  },
  microValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },
  totalsCard: {
    backgroundColor: "#0f766e",
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    gap: 12,
  },
  totalsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ccfbf1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  totalBadge: {
    alignItems: "center",
    gap: 2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  totalUnit: {
    fontSize: 11,
    fontWeight: "400",
  },
  totalLabel: {
    fontSize: 11,
    color: "#99f6e4",
  },
});
