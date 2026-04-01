import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../supabase";

type LoginScreenProps = {
  onLogin: (email: string) => void | Promise<void>;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validatePassword = (pwd: string): boolean => {
    // Password must be at least 6 characters
    if (pwd.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!email.trim()) {
      setError("Please enter an email");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (!validatePassword(password)) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Register with Supabase auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError("Registration failed");
        return;
      }

      setSuccess("Registration successful! Logging you in...");
      
      // Auto-login after registration
      setTimeout(() => {
        onLogin(email.trim().toLowerCase());
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("Please enter an email");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      // For demo mode: allow anonymous login or password-based
      if (password) {
        // Try password-based login
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });

        if (loginError) {
          setError(loginError.message);
          setLoading(false);
          return;
        }

        if (!data.user?.id) {
          setError("Login failed");
          setLoading(false);
          return;
        }
      }

      // Proceed with app login
      await onLogin(email.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.page}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Health Prototype</Text>
        <Text style={styles.subtitle}>
          {isRegister ? "Create your account" : "Sign in to continue"}
        </Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        
        <TextInput
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#6b7280"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {isRegister && (
          <TextInput
            secureTextEntry
            placeholder="Confirm Password"
            placeholderTextColor="#6b7280"
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />
        )}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={isRegister ? handleRegister : handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              {isRegister ? "Create Account" : "Login"}
            </Text>
          )}
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <Pressable onPress={() => {
          setIsRegister(!isRegister);
          setError("");
          setSuccess("");
        }}>
          <Text style={styles.toggleText}>
            {isRegister
              ? "Already have an account? Sign In"
              : "Don't have an account? Register"}
          </Text>
        </Pressable>

        <Text style={styles.helper}>
          {isRegister
            ? "Password must be at least 6 characters"
            : "Prototype mode: Any email/password works"}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
    color: "#4b5563",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    color: "#111827",
  },
  button: {
    marginTop: 4,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: "#dc2626",
    textAlign: "center",
  },
  successText: {
    marginTop: 12,
    fontSize: 13,
    color: "#166534",
    textAlign: "center",
    fontWeight: "600",
  },
  toggleText: {
    marginTop: 14,
    fontSize: 13,
    color: "#0284c7",
    textAlign: "center",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  helper: {
    marginTop: 12,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
});
