import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HistoryScreen } from "../screens/HistoryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ScanScreen } from "../screens/ScanScreen";

type AuthContext = {
  onLogin: (email: string) => void;
  onLogout: () => void;
  userEmail: string;
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
        options={{ title: "Image Scan" }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: "Nutrient History" }}
      />
      <Tab.Screen name="Profile">
        {() => (
          <ProfileScreen
            userEmail={authContext.userEmail}
            onLogout={authContext.onLogout}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
