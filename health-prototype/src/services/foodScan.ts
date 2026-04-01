import { supabase } from "../../supabase";

export type ParsedFoodItem = {
  food_name: string;
  grams?: number;
  confidence?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

export type ScanResult = {
  mealId: string;
  photoUrl: string;
  items: ParsedFoodItem[];
};

const SCAN_BUCKET = "meal-photos";

type ApiFoodItem = {
  name?: string;
  food_name?: string;
  grams?: number;
  serving_grams?: number;
  confidence?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

function buildMockItems(): ParsedFoodItem[] {
  return [
    {
      food_name: "Grilled chicken breast",
      grams: 140,
      confidence: 0.86,
      calories: 231,
      protein_g: 43.1,
      carbs_g: 0,
      fat_g: 5,
    },
    {
      food_name: "Brown rice",
      grams: 160,
      confidence: 0.79,
      calories: 178,
      protein_g: 4.1,
      carbs_g: 36.8,
      fat_g: 1.4,
    },
    {
      food_name: "Steamed broccoli",
      grams: 90,
      confidence: 0.77,
      calories: 31,
      protein_g: 2.6,
      carbs_g: 6,
      fat_g: 0.3,
    },
  ];
}

async function ensureAuthenticatedUserId() {
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    
    if (userErr) {
      console.warn("Error getting current user:", userErr);
    }
    
    if (userData.user?.id) {
      console.log("Using authenticated user:", userData.user.id);
      return userData.user.id;
    }

    console.log("No authenticated user, attempting anonymous sign-in...");
    const { data: anonData, error: anonErr } =
      await supabase.auth.signInAnonymously();
    
    if (anonErr) {
      throw new Error(
        `Anonymous auth failed: ${anonErr.message}. Make sure authentication is enabled in Supabase.`
      );
    }
    
    if (!anonData.user?.id) {
      throw new Error("Anonymous auth did not return a valid user ID");
    }

    console.log("Signed in anonymously:", anonData.user.id);
    return anonData.user.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    throw new Error(`User authentication error: ${message}`);
  }
}

async function uploadPhotoToSupabase(
  userId: string,
  imageUri: string
): Promise<string> {
  try {
    // Extract file extension from URI
    const uriParts = imageUri.split('.');
    const extension = uriParts[uriParts.length - 1] || "jpg";
    const filePath = `${userId}/${Date.now()}.${extension}`;

    let fileBlob: Blob;

    try {
      // Try standard fetch first (works on web and some native platforms)
      const response = await fetch(imageUri);
      fileBlob = await response.blob();
    } catch (fetchErr) {
      // If fetch fails, try reading as base64 for mobile platforms
      console.warn("Standard fetch failed, trying base64 conversion:", fetchErr);
      
      try {
        // For expo native, we may need to read the file differently
        const base64Data = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => {
            const arr = new Uint8Array(xhr.response).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            );
            resolve(btoa(arr));
          };
          xhr.onerror = reject;
          xhr.open("GET", imageUri);
          xhr.responseType = "arraybuffer";
          xhr.send();
        });

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileBlob = new Blob([bytes], { type: "image/jpeg" });
      } catch (base64Err) {
        throw new Error(
          `Failed to convert image: ${base64Err instanceof Error ? base64Err.message : "unknown error"}`
        );
      }
    }

    if (!fileBlob || fileBlob.size === 0) {
      throw new Error("Image conversion resulted in empty blob");
    }

    console.log(`Uploading image: ${filePath} (${fileBlob.size} bytes)`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(SCAN_BUCKET)
      .upload(filePath, fileBlob, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Storage upload failed: ${uploadError.message}. Make sure the meal-photos bucket exists and storage.sql has been run.`
      );
    }

    if (!uploadData) {
      throw new Error("Upload returned no data");
    }

    const { data: publicUrlData } = supabase.storage
      .from(SCAN_BUCKET)
      .getPublicUrl(filePath);

    if (!publicUrlData.publicUrl) {
      throw new Error("Failed to generate public image URL");
    }

    console.log(`Image uploaded successfully: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image upload failed";
    throw new Error(`Photo upload error: ${message}`);
  }
}

async function parseImageWithApiOrMock(
  photoUrl: string
): Promise<ParsedFoodItem[]> {
  const apiUrl = process.env.EXPO_PUBLIC_CALORIEMAMA_API_URL;
  const apiKey = process.env.EXPO_PUBLIC_CALORIEMAMA_API_KEY;

  if (!apiUrl || !apiKey) {
    return buildMockItems();
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ image_url: photoUrl }),
  });

  if (!response.ok) {
    throw new Error(`Food scan API failed with status ${response.status}`);
  }

  const data = await response.json();
  const apiItems = (data.foods || data.items || []) as ApiFoodItem[];

  const normalized = apiItems
    .map((item): ParsedFoodItem => {
      const name = item.food_name || item.name || "Unknown food";
      return {
        food_name: name,
        grams: item.grams ?? item.serving_grams,
        confidence: item.confidence,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      };
    })
    .filter((item) => item.food_name.trim().length > 0);

  if (normalized.length === 0) {
    return buildMockItems();
  }

  return normalized;
}

async function saveMealAndItems(
  userId: string,
  photoUrl: string,
  items: ParsedFoodItem[]
): Promise<string> {
  const { data: meal, error: mealErr } = await supabase
    .from("meals")
    .insert({
      user_id: userId,
      photo_url: photoUrl,
      source: "photo_scan",
    })
    .select("id")
    .single();

  if (mealErr) throw mealErr;

  const rows = items.map((item) => ({
    meal_id: meal.id,
    user_id: userId,
    food_name: item.food_name,
    grams: item.grams ?? null,
    confidence: item.confidence ?? null,
    calories: item.calories ?? null,
    protein_g: item.protein_g ?? null,
    carbs_g: item.carbs_g ?? null,
    fat_g: item.fat_g ?? null,
  }));

  const { error: itemErr } = await supabase.from("meal_items").insert(rows);
  if (itemErr) throw itemErr;

  return meal.id;
}

export async function runFoodScan(imageUri: string): Promise<ScanResult> {
  try {
    console.log("Starting food scan with image:", imageUri);
    
    const userId = await ensureAuthenticatedUserId();
    console.log("User ID:", userId);
    
    const photoUrl = await uploadPhotoToSupabase(userId, imageUri);
    console.log("Photo uploaded to:", photoUrl);
    
    const items = await parseImageWithApiOrMock(photoUrl);
    console.log("Parsed items:", items.length);
    
    const mealId = await saveMealAndItems(userId, photoUrl, items);
    console.log("Saved meal with ID:", mealId);

    return { mealId, photoUrl, items };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Food scan failed:", message);
    throw new Error(`Food scan failed: ${message}`);
  }
}

export async function fetchRecentScans(limit = 8) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("meals")
    .select("id, eaten_at, photo_url, meal_items(food_name, calories, confidence)")
    .order("eaten_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((meal) => {
    const firstItem = Array.isArray(meal.meal_items) ? meal.meal_items[0] : null;
    return {
      id: meal.id,
      item: firstItem?.food_name || "Scanned meal",
      calories: firstItem?.calories ?? 0,
      confidence: firstItem?.confidence ?? 0,
      eatenAt: meal.eaten_at,
    };
  });
}
