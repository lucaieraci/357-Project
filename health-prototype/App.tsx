import { useMemo, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { MainTabs } from "./src/navigation/MainTabs";
import { LoginScreen } from "./src/screens/LoginScreen";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const authContext = useMemo(
    () => ({
      onLogin: (email: string) => {
        setUserEmail(email);
        setIsLoggedIn(true);
      },
      onLogout: () => {
        setUserEmail("");
        setIsLoggedIn(false);
      },
      userEmail,
    }),
    [userEmail]
  );

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <MainTabs authContext={authContext} />
      ) : (
        <LoginScreen onLogin={authContext.onLogin} />
      )}
    </NavigationContainer>
  );
}
