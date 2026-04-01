import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { getSleepLogs, deleteSleepLog, getSleepStats } from "../services/sleepService";
import { supabase } from "../../supabase";

type SleepLog = {
  id: string;
  user_id: string;
  sleep_start: string;
  sleep_end: string;
  quality: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type SleepHistoryScreenProps = {
  userId?: string;
};

export function SleepHistoryScreen({ userId: propUserId }: SleepHistoryScreenProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<{
    avgQuality: number;
    avgDuration: number;
    totalNights: number;
  } | null>(null);

  // Validate and set userId on mount
  useFocusEffect(
    useCallback(() => {
      const ensureValidUserId = async () => {
        try {
          // Prefer prop userId if it's a valid UUID
          if (propUserId && isValidUUID(propUserId)) {
            setUserId(propUserId);
            return;
          }

          // Otherwise get from Supabase auth
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          
          if (!userErr && userData.user?.id) {
            setUserId(userData.user.id);
            return;
          }

          // Last resort: anonymous sign-in
          const { data: anonData, error: anonErr } =
            await supabase.auth.signInAnonymously();

          if (!anonErr && anonData.user?.id) {
            setUserId(anonData.user.id);
            return;
          }

          setError("Unable to establish user session");
          setLoading(false);
        } catch (err) {
          console.error("Error establishing user ID:", err);
          setError("Authentication error");
          setLoading(false);
        }
      };

      ensureValidUserId();
    }, [propUserId])
  );

  // Load logs when userId is set
  useFocusEffect(
    useCallback(() => {
      const loadLogs = async () => {
        if (!userId) {
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError("");
          const fetchedLogs = await getSleepLogs(userId, 50, 0);
          setLogs(fetchedLogs);

          const fetchedStats = await getSleepStats(userId, 30);
          setStats(fetchedStats);
        } catch (err) {
          console.error("Error loading sleep logs:", err);
          setError("Failed to load sleep history");
        } finally {
          setLoading(false);
        }
      };

      loadLogs();
    }, [userId])
  );

  // Helper function to validate UUID format
  function isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  const handleDelete = (logId: string) => {
    Alert.alert("Delete Sleep Log", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSleepLog(logId);
            setLogs((prev) => prev.filter((log) => log.id !== logId));
          } catch (err) {
            console.error("Error deleting sleep log:", err);
            setError("Failed to delete sleep log");
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const calculateDuration = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const minutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getQualityColor = (quality: number | null): string => {
    if (!quality) return "#9ca3af";
    if (quality >= 4) return "#108935"; // Green
    if (quality === 3) return "#d97706"; // Amber
    return "#dc2626"; // Red
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Loading sleep history...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error ? (
        <View style={styles.card}>
          <Text style={styles.errorMsg}>{error}</Text>
        </View>
      ) : null}

      {stats && stats.totalNights > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sleep Statistics (Last 30 Days)</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Nights</Text>
              <Text style={styles.statValue}>{stats.totalNights}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Duration</Text>
              <Text style={styles.statValue}>
                {Math.floor(stats.avgDuration / 60)}h {Math.round(stats.avgDuration % 60)}m
              </Text>
            </View>
            {stats.avgQuality > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Avg Quality</Text>
                <Text style={styles.statValue}>{stats.avgQuality.toFixed(1)}/5</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {logs.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No sleep logs yet. Start by logging your sleep!</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Sleep Logs</Text>
          <View style={styles.logsContainer}>
            {logs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <View style={styles.logTitleSection}>
                    <Text style={styles.logDate}>{formatDate(log.sleep_start)}</Text>
                    <Text style={styles.logTime}>
                      {formatTime(log.sleep_start)} - {formatTime(log.sleep_end)}
                    </Text>
                  </View>
                  {log.quality && (
                    <View style={[styles.qualityBadge, { backgroundColor: getQualityColor(log.quality) }]}>
                      <Text style={styles.qualityText}>{log.quality}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.logDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>
                      {calculateDuration(log.sleep_start, log.sleep_end)}
                    </Text>
                  </View>
                  {log.quality && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Quality</Text>
                      <Text style={[styles.detailValue, { color: getQualityColor(log.quality) }]}>
                        {log.quality}/5 {getQualityEmoji(log.quality)}
                      </Text>
                    </View>
                  )}
                </View>

                {log.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesText}>{log.notes}</Text>
                  </View>
                )}

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(log.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function getQualityEmoji(quality: number): string {
  if (quality === 5) return "😴";
  if (quality === 4) return "😊";
  if (quality === 3) return "😐";
  if (quality === 2) return "😕";
  return "😞";
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9fafb",
    gap: 14,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#4b5563",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  statLabel: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 6,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f766e",
  },
  emptyText: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    paddingVertical: 20,
  },
  errorMsg: {
    fontSize: 13,
    color: "#991b1b",
  },
  logsContainer: {
    gap: 12,
  },
  logItem: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    gap: 10,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logTitleSection: {
    flex: 1,
  },
  logDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  logTime: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 2,
  },
  qualityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  qualityText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  logDetails: {
    flexDirection: "row",
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  notesSection: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#0f766e",
    gap: 4,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  notesText: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 18,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 6,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
  },
});
