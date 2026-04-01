import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";
import { SleepLogScreen } from "../screens/SleepLogScreen";
import { SleepHistoryScreen } from "../screens/SleepHistoryScreen";

type SleepNavigatorProps = {
  userId?: string;
};

const Stack = createNativeStackNavigator();

export function SleepNavigator({ userId }: SleepNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="SleepLog"
        options={{
          title: "Log Sleep",
        }}
      >
        {() => <SleepLogScreen userId={userId} />}
      </Stack.Screen>
      <Stack.Screen
        name="SleepHistory"
        options={{
          title: "Sleep History",
        }}
      >
        {() => <SleepHistoryScreen userId={userId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
