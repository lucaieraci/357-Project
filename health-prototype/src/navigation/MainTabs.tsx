import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HistoryScreen } from "../screens/HistoryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ScanScreen } from "../screens/ScanScreen";
import { SleepNavigator } from "./SleepNavigator";

type AuthContext = {
  onLogin: (email: string) => void;
  onLogout: () => void;
  userEmail: string;
  userId?: string;
};

const Tab = createBottomTabNavigator();

type MainTabsProps = {
  authContext: AuthContext;
};

export function MainTabs({ authContext }: MainTabsProps) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: "Image Scan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Sleep"
        options={{
          title: "Sleep",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="moon-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <SleepNavigator userId={authContext.userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: "Nutrient History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      >
        {() => (
          <ProfileScreen
            userEmail={authContext.userEmail}
            userId={authContext.userId}
            onLogout={authContext.onLogout}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
