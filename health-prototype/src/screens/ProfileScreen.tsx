import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type ProfileScreenProps = {
  userEmail: string;
  onLogout: () => void;
};

export function ProfileScreen({ userEmail, onLogout }: ProfileScreenProps) {
  const [sleepStart, setSleepStart] = useState("23:00");
  const [sleepEnd, setSleepEnd] = useState("07:00");
  const [savedMsg, setSavedMsg] = useState("");

  const handleSave = () => {
    setSavedMsg(`Saved sleep schedule: ${sleepStart} -> ${sleepEnd}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{userEmail}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sleep Schedule</Text>
        <TextInput
          placeholder="Start (HH:MM)"
          value={sleepStart}
          onChangeText={setSleepStart}
          style={styles.input}
        />
        <TextInput
          placeholder="End (HH:MM)"
          value={sleepEnd}
          onChangeText={setSleepEnd}
          style={styles.input}
        />
        <Pressable style={styles.primaryButton} onPress={handleSave}>
          <Text style={styles.primaryButtonText}>Save Sleep Schedule</Text>
        </Pressable>
        {savedMsg ? <Text style={styles.savedMsg}>{savedMsg}</Text> : null}
      </View>

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
