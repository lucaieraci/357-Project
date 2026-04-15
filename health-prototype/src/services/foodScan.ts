import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../../supabase";

export type ParsedFoodItem = {
  food_name: string;
  grams?: number;
  confidence?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  micros?: Record<string, number>;
};

export type ScanResult = {
  mealId: string;
  photoUrl: string;
  items: ParsedFoodItem[];
};

const SCAN_BUCKET = "meal-photos";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function ensureAuthenticatedUserId(): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) console.warn("Error getting current user:", userErr);

  if (userData.user?.id) return userData.user.id;

  const { data: anonData, error: anonErr } =
    await supabase.auth.signInAnonymously();
  if (anonErr)
    throw new Error(
      `Anonymous auth failed: ${anonErr.message}. Make sure authentication is enabled in Supabase.`
    );
  if (!anonData.user?.id)
    throw new Error("Anonymous auth did not return a valid user ID");

  return anonData.user.id;
}

// ---------------------------------------------------------------------------
// Photo upload
// ---------------------------------------------------------------------------

async function uploadPhotoToSupabase(
  userId: string,
  imageUri: string
): Promise<string> {
  const uriParts = imageUri.split(".");
  const extension = uriParts[uriParts.length - 1] || "jpg";
  const filePath = `${userId}/${Date.now()}.${extension}`;

  let fileBlob: Blob;
  try {
    const response = await fetch(imageUri);
    fileBlob = await response.blob();
  } catch {
    // Fallback for platforms where fetch on a local URI fails
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: "base64",
    });
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    fileBlob = new Blob([bytes], { type: "image/jpeg" });
  }

  if (!fileBlob || fileBlob.size === 0)
    throw new Error("Image conversion resulted in empty blob");

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(SCAN_BUCKET)
    .upload(filePath, fileBlob, { contentType: "image/jpeg", upsert: false });

  if (uploadError)
    throw new Error(
      `Storage upload failed: ${uploadError.message}. Make sure the meal-photos bucket exists and storage.sql has been run.`
    );
  if (!uploadData) throw new Error("Upload returned no data");

  const { data: publicUrlData } = supabase.storage
    .from(SCAN_BUCKET)
    .getPublicUrl(filePath);

  if (!publicUrlData.publicUrl)
    throw new Error("Failed to generate public image URL");

  return publicUrlData.publicUrl;
}

// ---------------------------------------------------------------------------
// Step 1: Claude Vision — identify foods + estimate portions
// ---------------------------------------------------------------------------

type ClaudeFoodItem = { name: string; grams: number; confidence: number };

async function identifyFoodsWithClaude(
  imageUri: string
): Promise<ClaudeFoodItem[] | null> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: "base64",
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64 },
            },
            {
              type: "text",
              text: `Identify all food items visible in this meal photo. For each item, estimate the portion size in grams and your confidence (0–1).

Return ONLY a valid JSON array — no markdown, no explanation:
[{"name": "grilled chicken breast", "grams": 150, "confidence": 0.85}]

Use specific food names suitable for a nutrition database lookup (e.g. "brown rice" not "rice", "steamed broccoli" not "vegetables"). If no food is visible, return [].`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude Vision API error: ${response.status}`);
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    return JSON.parse(match[0]) as ClaudeFoodItem[];
  } catch {
    console.warn("Failed to parse Claude response as JSON:", text);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Step 2: USDA FoodData Central — full nutrition per food item
// ---------------------------------------------------------------------------

// Nutrient numbers used by USDA (per 100 g in Foundation / SR Legacy data)
const USDA_NUTRIENT_MAP: Record<string, string> = {
  calories: "208",
  protein_g: "203",
  fat_g: "204",
  carbs_g: "205",
  fiber_g: "291",
  sugar_g: "269",
  vitamin_c_mg: "401",
  vitamin_a_ug: "320",
  vitamin_d_ug: "328",
  vitamin_e_mg: "323",
  vitamin_k_ug: "430",
  thiamin_mg: "404",
  riboflavin_mg: "405",
  niacin_mg: "406",
  vitamin_b6_mg: "415",
  folate_ug: "431",
  vitamin_b12_ug: "418",
  calcium_mg: "301",
  iron_mg: "303",
  magnesium_mg: "304",
  potassium_mg: "306",
  sodium_mg: "307",
  zinc_mg: "309",
};

type UsdaFoodNutrient = {
  nutrientNumber: string;
  value: number;
};

async function lookupNutritionFromUSDA(
  foodName: string,
  grams: number,
  confidence: number
): Promise<ParsedFoodItem> {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY ?? "DEMO_KEY";
  const scale = grams / 100;

  try {
    const url =
      `https://api.nal.usda.gov/fdc/v1/foods/search` +
      `?query=${encodeURIComponent(foodName)}` +
      `&dataType=Foundation,SR%20Legacy` +
      `&pageSize=1` +
      `&api_key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`USDA API ${response.status}`);

    const data = await response.json();
    const food = data.foods?.[0];

    if (!food) {
      console.warn(`USDA: no results for "${foodName}", using zeros`);
      return { food_name: foodName, grams, confidence };
    }

    const nutrients: UsdaFoodNutrient[] = food.foodNutrients ?? [];
    const get = (number: string): number | undefined => {
      const n = nutrients.find((x) => x.nutrientNumber === number);
      return n != null ? Math.round(n.value * scale * 100) / 100 : undefined;
    };

    const micros: Record<string, number> = {};
    for (const [key, number] of Object.entries(USDA_NUTRIENT_MAP)) {
      if (["calories", "protein_g", "fat_g", "carbs_g"].includes(key)) continue;
      const val = get(number);
      if (val != null && val > 0) micros[key] = val;
    }

    return {
      food_name: foodName,
      grams,
      confidence,
      calories: get(USDA_NUTRIENT_MAP.calories),
      protein_g: get(USDA_NUTRIENT_MAP.protein_g),
      carbs_g: get(USDA_NUTRIENT_MAP.carbs_g),
      fat_g: get(USDA_NUTRIENT_MAP.fat_g),
      micros,
    };
  } catch (err) {
    console.warn(`USDA lookup failed for "${foodName}":`, err);
    return { food_name: foodName, grams, confidence };
  }
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

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
      micros: {
        vitamin_b6_mg: 1.16,
        niacin_mg: 14.8,
        potassium_mg: 448,
        sodium_mg: 104,
        iron_mg: 1.26,
        magnesium_mg: 42,
        zinc_mg: 2.66,
      },
    },
    {
      food_name: "Brown rice",
      grams: 160,
      confidence: 0.79,
      calories: 178,
      protein_g: 4.1,
      carbs_g: 36.8,
      fat_g: 1.4,
      micros: {
        fiber_g: 2.9,
        thiamin_mg: 0.24,
        magnesium_mg: 84,
        potassium_mg: 130,
        zinc_mg: 1.5,
      },
    },
    {
      food_name: "Steamed broccoli",
      grams: 90,
      confidence: 0.77,
      calories: 31,
      protein_g: 2.6,
      carbs_g: 6,
      fat_g: 0.3,
      micros: {
        fiber_g: 2.4,
        vitamin_c_mg: 81,
        vitamin_k_ug: 102,
        folate_ug: 63,
        calcium_mg: 47,
        potassium_mg: 288,
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function parseImageToNutrition(
  imageUri: string
): Promise<ParsedFoodItem[]> {
  const claudeItems = await identifyFoodsWithClaude(imageUri);

  if (!claudeItems) {
    console.log("No Anthropic API key — using mock data");
    return buildMockItems();
  }

  if (claudeItems.length === 0) {
    console.log("Claude found no food items in image");
    return [];
  }

  console.log(`Claude identified ${claudeItems.length} food item(s), looking up USDA nutrition...`);

  const results = await Promise.all(
    claudeItems.map((item) =>
      lookupNutritionFromUSDA(item.name, item.grams, item.confidence)
    )
  );

  return results;
}

// ---------------------------------------------------------------------------
// Save to Supabase
// ---------------------------------------------------------------------------

async function saveMealAndItems(
  userId: string,
  photoUrl: string,
  items: ParsedFoodItem[]
): Promise<string> {
  const { data: meal, error: mealErr } = await supabase
    .from("meals")
    .insert({ user_id: userId, photo_url: photoUrl, source: "photo_scan" })
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
    micros: item.micros ?? {},
  }));

  const { error: itemErr } = await supabase.from("meal_items").insert(rows);
  if (itemErr) throw itemErr;

  return meal.id;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runFoodScan(imageUri: string): Promise<ScanResult> {
  console.log("Starting food scan:", imageUri);

  const userId = await ensureAuthenticatedUserId();
  console.log("User ID:", userId);

  // Run photo upload and food identification in parallel
  const [photoUrl, items] = await Promise.all([
    uploadPhotoToSupabase(userId, imageUri),
    parseImageToNutrition(imageUri),
  ]);

  console.log(`Photo uploaded, ${items.length} item(s) identified`);

  const mealId = await saveMealAndItems(userId, photoUrl, items);
  console.log("Saved meal:", mealId);

  return { mealId, photoUrl, items };
}

// ---------------------------------------------------------------------------
// Fetch full items for a single meal
// ---------------------------------------------------------------------------

export async function fetchMealItems(mealId: string): Promise<ParsedFoodItem[]> {
  const { data, error } = await supabase
    .from("meal_items")
    .select("food_name, grams, confidence, calories, protein_g, carbs_g, fat_g, micros")
    .eq("meal_id", mealId);
  if (error) throw error;
  return (data ?? []) as ParsedFoodItem[];
}

// ---------------------------------------------------------------------------
// Sum today's macros across all meals
// ---------------------------------------------------------------------------

export type MacroTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export async function fetchTodaysMacros(): Promise<MacroTotals> {
  const zero: MacroTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return zero;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: meals } = await supabase
    .from("meals")
    .select("id")
    .eq("user_id", userData.user.id)
    .gte("eaten_at", today.toISOString())
    .lt("eaten_at", tomorrow.toISOString());

  if (!meals?.length) return zero;

  const { data: items } = await supabase
    .from("meal_items")
    .select("calories, protein_g, carbs_g, fat_g")
    .in("meal_id", meals.map((m) => m.id));

  if (!items?.length) return zero;

  return items.reduce(
    (acc, item) => ({
      calories: Math.round(acc.calories + (item.calories ?? 0)),
      protein_g: Math.round((acc.protein_g + (item.protein_g ?? 0)) * 10) / 10,
      carbs_g: Math.round((acc.carbs_g + (item.carbs_g ?? 0)) * 10) / 10,
      fat_g: Math.round((acc.fat_g + (item.fat_g ?? 0)) * 10) / 10,
    }),
    zero
  );
}

// ---------------------------------------------------------------------------

export async function fetchRecentScans(limit = 8) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("meals")
    .select(
      "id, eaten_at, photo_url, meal_items(food_name, calories, confidence)"
    )
    .order("eaten_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((meal) => {
    const firstItem = Array.isArray(meal.meal_items)
      ? meal.meal_items[0]
      : null;
    return {
      id: meal.id,
      item: firstItem?.food_name ?? "Scanned meal",
      calories: firstItem?.calories ?? 0,
      confidence: firstItem?.confidence ?? 0,
      eatenAt: meal.eaten_at,
    };
  });
}
