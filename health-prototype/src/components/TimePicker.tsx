import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type TimePickerProps = {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  label?: string;
};

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [isVisible, setIsVisible] = useState(false);

  const [hours, setHours] = useState(parseInt(value.split(":")[0]) || 0);
  const [minutes, setMinutes] = useState(parseInt(value.split(":")[1]) || 0);

  const handleConfirm = () => {
    const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    onChange(formattedTime);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setHours(parseInt(value.split(":")[0]) || 0);
    setMinutes(parseInt(value.split(":")[1]) || 0);
    setIsVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        style={styles.button}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.buttonText}>{value}</Text>
      </Pressable>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.wheelContainer}>
                <Text style={styles.label}>Hours</Text>
                <ScrollView
                  style={styles.wheel}
                  snapToAlignment="center"
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={(event) => {
                    const y = event.nativeEvent.contentOffset.y;
                    const index = Math.round(y / 40);
                    setHours(Math.max(0, Math.min(23, index)));
                  }}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <Pressable
                      key={i}
                      style={[
                        styles.wheelItem,
                        i === hours && styles.wheelItemSelected,
                      ]}
                      onPress={() => setHours(i)}
                    >
                      <Text
                        style={[
                          styles.wheelItemText,
                          i === hours && styles.wheelItemTextSelected,
                        ]}
                      >
                        {String(i).padStart(2, "0")}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.wheelContainer}>
                <Text style={styles.label}>Minutes</Text>
                <ScrollView
                  style={styles.wheel}
                  snapToAlignment="center"
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={(event) => {
                    const y = event.nativeEvent.contentOffset.y;
                    const index = Math.round(y / 40);
                    setMinutes(Math.max(0, Math.min(59, index)));
                  }}
                >
                  {Array.from({ length: 60 }).map((_, i) => (
                    <Pressable
                      key={i}
                      style={[
                        styles.wheelItem,
                        i === minutes && styles.wheelItemSelected,
                      ]}
                      onPress={() => setMinutes(i)}
                    >
                      <Text
                        style={[
                          styles.wheelItemText,
                          i === minutes && styles.wheelItemTextSelected,
                        ]}
                      >
                        {String(i).padStart(2, "0")}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  button: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  pickerContainer: {
    flexDirection: "row",
    height: 280,
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  wheelContainer: {
    flex: 1,
    alignItems: "center",
  },
  wheel: {
    flex: 1,
    width: "100%",
  },
  wheelItem: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  wheelItemSelected: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
  },
  wheelItemText: {
    fontSize: 18,
    color: "#9ca3af",
    fontWeight: "500",
  },
  wheelItemTextSelected: {
    color: "#0f766e",
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "700",
    fontSize: 15,
  },
  confirmButton: {
    backgroundColor: "#0f766e",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
