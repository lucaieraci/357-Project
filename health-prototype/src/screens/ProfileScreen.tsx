import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { TimePicker } from "../components/TimePicker";
import { getSleepSchedule, saveSleepSchedule, getSleepStats } from "../services/sleepService";
import { supabase } from "../../supabase";

type ProfileScreenProps = {
  userEmail: string;
  onLogout: () => void;
  userId?: string;
};

export function ProfileScreen({ userEmail, onLogout, userId: propUserId }: ProfileScreenProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [sleepStart, setSleepStart] = useState("23:00");
  const [sleepEnd, setSleepEnd] = useState("07:00");
  const [savedMsg, setSavedMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sleepStats, setSleepStats] = useState<{
    avgQuality: number;
    avgDuration: number;
    totalNights: number;
  } | null>(null);

  // Helper function to validate UUID format
  function isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Validate and set userId on mount
  useEffect(() => {
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
      } catch (err) {
        console.error("Error establishing user ID:", err);
        setError("Authentication error");
      }
    };

    ensureValidUserId();
  }, [propUserId]);

  // Load sleep schedule and stats when userId is set
  useEffect(() => {
    if (!userId) return;
    
    const loadData = async () => {
      try {
        const schedule = await getSleepSchedule(userId);
        if (schedule) {
          setSleepStart(schedule.sleep_start_time);
          setSleepEnd(schedule.sleep_end_time);
        }
        
        const stats = await getSleepStats(userId, 7);
        setSleepStats(stats);
      } catch (err) {
        console.error("Error loading sleep data:", err);
        setError("Failed to load sleep data");
      }
    };

    loadData();
  }, [userId]);

  const validateTimes = (): boolean => {
    const startHour = parseInt(sleepStart.split(":")[0]);
    const startMin = parseInt(sleepStart.split(":")[1]);
    const endHour = parseInt(sleepEnd.split(":")[0]);
    const endMin = parseInt(sleepEnd.split(":")[1]);

    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;

    // Allow sleeping past midnight
    if (startTotalMin <= endTotalMin) {
      return true; // Same day (e.g., 6:00 to 7:00)
    }
    return true; // Crosses midnight (e.g., 23:00 to 7:00)
  };

  const handleSave = async () => {
    if (!userId) {
      setError("User ID not available");
      return;
    }

    if (!validateTimes()) {
      setError("Invalid sleep times");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await saveSleepSchedule(userId, sleepStart, sleepEnd);
      setSavedMsg(`Sleep schedule saved: ${sleepStart} - ${sleepEnd}`);
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err) {
      console.error("Error saving sleep schedule:", err);
      setError("Failed to save sleep schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{userEmail}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sleep Schedule</Text>
        <TimePicker
          label="Sleep Start Time"
          value={sleepStart}
          onChange={setSleepStart}
        />
        <TimePicker
          label="Sleep End Time"
          value={sleepEnd}
          onChange={setSleepEnd}
        />
        <Pressable
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save Sleep Schedule</Text>
          )}
        </Pressable>
        {error ? <Text style={styles.errorMsg}>{error}</Text> : null}
        {savedMsg ? <Text style={styles.savedMsg}>{savedMsg}</Text> : null}
      </View>

      {sleepStats && sleepStats.totalNights > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sleep Statistics (Last 7 Days)</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Nights Tracked</Text>
              <Text style={styles.statValue}>{sleepStats.totalNights}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Duration</Text>
              <Text style={styles.statValue}>{sleepStats.avgDuration.toFixed(1)} min</Text>
            </View>
            {sleepStats.avgQuality > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Avg Quality</Text>
                <Text style={styles.statValue}>{sleepStats.avgQuality.toFixed(1)}/5</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9fafb",
    gap: 14,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  email: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    color: "#111827",
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 11,
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  savedMsg: {
    marginTop: 10,
    fontSize: 13,
    color: "#166534",
  },
  errorMsg: {
    marginTop: 10,
    fontSize: 13,
    color: "#991b1b",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
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
  logoutButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 11,
  },
  logoutButtonText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 15,
  },
});
