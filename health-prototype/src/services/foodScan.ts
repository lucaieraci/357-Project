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
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (userData.user) return userData.user.id;

  const { data: anonData, error: anonErr } =
    await supabase.auth.signInAnonymously();
  if (anonErr) throw anonErr;
  if (!anonData.user) {
    throw new Error("Anonymous auth did not return a user.");
  }
  return anonData.user.id;
}

async function uploadPhotoToSupabase(
  userId: string,
  imageUri: string
): Promise<string> {
  const extension = imageUri.split(".").pop() || "jpg";
  const filePath = `${userId}/${Date.now()}.${extension}`;
  const fileBlob = await fetch(imageUri).then((res) => res.blob());

  const { error: uploadError } = await supabase.storage
    .from(SCAN_BUCKET)
    .upload(filePath, fileBlob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(SCAN_BUCKET)
    .getPublicUrl(filePath);

  if (!publicUrlData.publicUrl) {
    throw new Error("Failed to build public image URL.");
  }

  return publicUrlData.publicUrl;
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
  const userId = await ensureAuthenticatedUserId();
  const photoUrl = await uploadPhotoToSupabase(userId, imageUri);
  const items = await parseImageWithApiOrMock(photoUrl);
  const mealId = await saveMealAndItems(userId, photoUrl, items);

  return { mealId, photoUrl, items };
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
