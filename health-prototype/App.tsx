import { useMemo, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { MainTabs } from "./src/navigation/MainTabs";
import { LoginScreen } from "./src/screens/LoginScreen";
import { supabase } from "./supabase";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  const authContext = useMemo(
    () => ({
      onLogin: async (email: string) => {
        try {
          const trimmedEmail = email.trim().toLowerCase();
          
          // Try anonymous sign-in (works without password)
          const { data: anonData, error: anonErr } =
            await supabase.auth.signInAnonymously();

          if (anonErr) {
            throw new Error(`Auth failed: ${anonErr.message}`);
          }

          if (!anonData.user?.id) {
            throw new Error("No user ID returned from authentication");
          }

          console.log("Successfully authenticated with user ID:", anonData.user.id);
          setUserEmail(trimmedEmail);
          setUserId(anonData.user.id); // Use actual UUID from Supabase
          setIsLoggedIn(true);
        } catch (err) {
          console.error("Login error:", err);
          throw err;
        }
      },
      onLogout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.error("Logout error:", err);
        }
        setUserEmail("");
        setUserId("");
        setIsLoggedIn(false);
      },
      userEmail,
      userId,
    }),
    [userEmail, userId]
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
