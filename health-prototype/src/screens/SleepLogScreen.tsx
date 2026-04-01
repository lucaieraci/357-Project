import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { TimePicker } from "../components/TimePicker";
import { createSleepLog } from "../services/sleepService";
import { supabase } from "../../supabase";

type SleepLogScreenProps = {
  userId?: string;
  onSuccess?: () => void;
};

export function SleepLogScreen({ userId: propUserId, onSuccess }: SleepLogScreenProps) {
  const navigation = useNavigation();
  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];
  const defaultStart = "22:00";
  const defaultEnd = "07:00";
  
  const [userId, setUserId] = useState<string | null>(null);
  const [sleepDate, setSleepDate] = useState(defaultDate);
  const [sleepStartTime, setSleepStartTime] = useState(defaultStart);
  const [sleepEndTime, setSleepEndTime] = useState(defaultEnd);
  const [quality, setQuality] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async () => {
    if (!userId) {
      setError("User authentication required. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Parse the date and time
      const [year, month, day] = sleepDate.split("-");
      const [startHour, startMin] = sleepStartTime.split(":");
      const [endHour, endMin] = sleepEndTime.split(":");

      const sleepStart = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(startHour),
        parseInt(startMin)
      );

      // Calculate end date (handle overnight sleep)
      const sleepEnd = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(endHour),
        parseInt(endMin)
      );

      // If end time is before start time, it's the next day
      if (sleepEnd <= sleepStart) {
        sleepEnd.setDate(sleepEnd.getDate() + 1);
      }

      await createSleepLog(
        userId,
        sleepStart,
        sleepEnd,
        quality || undefined,
        notes || undefined
      );

      setSuccess(true);
      // Reset form
      setSleepDate(new Date().toISOString().split("T")[0]);
      setSleepStartTime(defaultStart);
      setSleepEndTime(defaultEnd);
      setQuality(null);
      setNotes("");

      setTimeout(() => {
        setSuccess(false);
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      console.error("Error logging sleep:", err);
      setError("Failed to log sleep. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to validate UUID format
  function isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  const isValid = sleepDate && sleepStartTime && sleepEndTime;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerWithButton}>
          <View style={styles.headerTexts}>
            <Text style={styles.title}>Log Sleep</Text>
            <Text style={styles.description}>
              Record your sleep to track sleep patterns and quality.
            </Text>
          </View>
          <Pressable
            style={styles.historyButton}
            onPress={() => navigation.navigate("SleepHistory" as never)}
          >
            <Text style={styles.historyButtonText}>History</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sleep Details</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date</Text>
          <Pressable style={styles.input}>
            <Text style={styles.inputText}>{sleepDate}</Text>
          </Pressable>
        </View>

        <TimePicker
          label="Sleep Start Time"
          value={sleepStartTime}
          onChange={setSleepStartTime}
        />

        <TimePicker
          label="Wake Up Time"
          value={sleepEndTime}
          onChange={setSleepEndTime}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sleep Quality (Optional)</Text>
        <Text style={styles.label}>Rate your sleep: 1 = Poor, 5 = Excellent</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((rating) => (
            <Pressable
              key={rating}
              style={[
                styles.ratingButton,
                quality === rating && styles.ratingButtonSelected,
              ]}
              onPress={() => setQuality(quality === rating ? null : rating)}
            >
              <Text
                style={[
                  styles.ratingButtonText,
                  quality === rating && styles.ratingButtonTextSelected,
                ]}
              >
                {rating}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Add notes about your sleep (e.g., factors affecting sleep quality)"
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <Pressable
        style={[styles.submitButton, (!isValid || loading) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>Log Sleep</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.errorMsg}>{error}</Text> : null}
      {success ? (
        <Text style={styles.successMsg}>Sleep logged successfully! 🎉</Text>
      ) : null}
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
  headerWithButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 14,
  },
  historyButton: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#0284c7",
  },
  historyButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0284c7",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#ffffff",
    justifyContent: "center",
  },
  inputText: {
    fontSize: 16,
    color: "#111827",
  },
  ratingContainer: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 12,
  },
  ratingButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingButtonSelected: {
    borderColor: "#0f766e",
    backgroundColor: "#f0fdf4",
  },
  ratingButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9ca3af",
  },
  ratingButtonTextSelected: {
    color: "#0f766e",
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#ffffff",
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  errorMsg: {
    marginHorizontal: 16,
    marginTop: 12,
    fontSize: 13,
    color: "#991b1b",
    textAlign: "center",
  },
  successMsg: {
    marginHorizontal: 16,
    marginTop: 12,
    fontSize: 13,
    color: "#166534",
    textAlign: "center",
    fontWeight: "600",
  },
});
