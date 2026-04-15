import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { fetchTodaysMacros, type MacroTotals } from "../services/foodScan";

// ---------------------------------------------------------------------------
// Static targets & colours
// ---------------------------------------------------------------------------

const TARGETS = {
  calories: { target: 2000, unit: "kcal" },
  protein:  { target: 50,   unit: "g" },
  carbs:    { target: 275,  unit: "g" },
  fat:      { target: 78,   unit: "g" },
};

const MACRO_COLORS = {
  calories: "#ef4444",
  protein:  "#2563eb",
  carbs:    "#f59e0b",
  fat:      "#10b981",
};

const projections = [
  { nutrient: "Fiber",     avg: 18,  target: 28,   projectedDays: 12 },
  { nutrient: "Vitamin C", avg: 76,  target: 90,   projectedDays: 8  },
  { nutrient: "Calcium",   avg: 690, target: 1000, projectedDays: 20 },
];

// ---------------------------------------------------------------------------
// DonutChart
// ---------------------------------------------------------------------------

type DonutProps = {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
};

function DonutChart({ label, current, target, unit, color }: DonutProps) {
  const size = 108;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / target, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const pct = Math.round((current / target) * 100);

  return (
    <View style={styles.donutCard}>
      <View style={styles.donutWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.pctText}>{pct}%</Text>
        </View>
      </View>
      <Text style={styles.donutLabel}>{label}</Text>
      <Text style={styles.donutValue}>
        {current}/{target} {unit}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function HistoryScreen() {
  const [totals, setTotals] = useState<MacroTotals | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      fetchTodaysMacros()
        .then((data) => { if (!cancelled) { setTotals(data); setLoading(false); } })
        .catch(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [])
  );

  const macroRows: Array<{ key: keyof typeof TARGETS; label: string }> = [
    { key: "calories", label: "CALORIES" },
    { key: "protein",  label: "PROTEIN"  },
    { key: "carbs",    label: "CARBS"    },
    { key: "fat",      label: "FAT"      },
  ];

  const currentValues = {
    calories: totals?.calories  ?? 0,
    protein:  totals?.protein_g ?? 0,
    carbs:    totals?.carbs_g   ?? 0,
    fat:      totals?.fat_g     ?? 0,
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>History &amp; Projections</Text>

      {/* Macro progress */}
      <View style={styles.highlightCard}>
        <Text style={styles.cardTitle}>Today: Macro Progress</Text>
        <Text style={styles.subtitle}>
          Visual rings show how close you are to your daily targets.
        </Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loadingText}>Calculating today's totals…</Text>
          </View>
        ) : (
          <View style={styles.donutGrid}>
            {macroRows.map(({ key, label }) => (
              <DonutChart
                key={key}
                label={label}
                current={currentValues[key]}
                target={TARGETS[key].target}
                unit={TARGETS[key].unit}
                color={MACRO_COLORS[key]}
              />
            ))}
          </View>
        )}

        {/* Numeric summary bar */}
        {!loading && totals && (
          <View style={styles.summaryBar}>
            <SummaryItem label="Calories" value={`${currentValues.calories} kcal`} color="#ef4444" />
            <SummaryItem label="Protein"  value={`${currentValues.protein} g`}    color="#2563eb" />
            <SummaryItem label="Carbs"    value={`${currentValues.carbs} g`}      color="#f59e0b" />
            <SummaryItem label="Fat"      value={`${currentValues.fat} g`}        color="#10b981" />
          </View>
        )}
      </View>

      {/* 7-day forecast */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Forecast (7-day trend)</Text>
        <Text style={styles.subtitle}>
          Based on regulatory averages in your baseline profile.
        </Text>
        {projections.map((item) => (
          <View key={item.nutrient} style={styles.row}>
            <Text style={styles.rowLabel}>{item.nutrient}</Text>
            <Text style={styles.rowValue}>
              avg {item.avg} → target {item.target} ({item.projectedDays}d)
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function SummaryItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <View style={[styles.summaryDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f3f7ff",
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  highlightCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbeafe",
    padding: 14,
    gap: 10,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 2,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  donutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  donutCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  donutWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  pctText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  donutLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  donutValue: {
    marginTop: 2,
    fontSize: 12,
    color: "#475569",
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#edf2f7",
    paddingTop: 8,
  },
  rowLabel: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  rowValue: {
    fontSize: 13,
    color: "#334155",
  },
});
