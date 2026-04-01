import { supabase } from "../../supabase";

export type SleepLog = {
  id: string;
  user_id: string;
  sleep_start: string;
  sleep_end: string;
  quality: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SleepSchedule = {
  id: string;
  user_id: string;
  sleep_start_time: string;
  sleep_end_time: string;
  created_at: string;
  updated_at: string;
};

// Get user's sleep schedule
export async function getSleepSchedule(userId: string): Promise<SleepSchedule | null> {
  try {
    const { data, error } = await supabase
      .from("sleep_schedule")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data || null;
  } catch (err) {
    console.error("Error fetching sleep schedule:", err);
    throw err;
  }
}

// Upsert sleep schedule
export async function saveSleepSchedule(
  userId: string,
  sleepStartTime: string,
  sleepEndTime: string
): Promise<SleepSchedule> {
  try {
    const { data, error } = await supabase
      .from("sleep_schedule")
      .upsert(
        {
          user_id: userId,
          sleep_start_time: sleepStartTime,
          sleep_end_time: sleepEndTime,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error saving sleep schedule:", err);
    throw err;
  }
}

// Create sleep log
export async function createSleepLog(
  userId: string,
  sleepStart: Date,
  sleepEnd: Date,
  quality?: number,
  notes?: string
): Promise<SleepLog> {
  try {
    const { data, error } = await supabase
      .from("sleep_logs")
      .insert({
        user_id: userId,
        sleep_start: sleepStart.toISOString(),
        sleep_end: sleepEnd.toISOString(),
        quality: quality || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error creating sleep log:", err);
    throw err;
  }
}

// Get sleep logs for a user (with pagination)
export async function getSleepLogs(
  userId: string,
  limit: number = 30,
  offset: number = 0
): Promise<SleepLog[]> {
  try {
    const { data, error } = await supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", userId)
      .order("sleep_start", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching sleep logs:", err);
    throw err;
  }
}

// Get sleep logs for a date range
export async function getSleepLogsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SleepLog[]> {
  try {
    const { data, error } = await supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("sleep_start", startDate.toISOString())
      .lte("sleep_start", endDate.toISOString())
      .order("sleep_start", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching sleep logs by date range:", err);
    throw err;
  }
}

// Update sleep log
export async function updateSleepLog(
  logId: string,
  quality?: number,
  notes?: string
): Promise<SleepLog> {
  try {
    const { data, error } = await supabase
      .from("sleep_logs")
      .update({
        quality: quality !== undefined ? quality : null,
        notes: notes !== undefined ? notes : null,
      })
      .eq("id", logId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error updating sleep log:", err);
    throw err;
  }
}

// Delete sleep log
export async function deleteSleepLog(logId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("sleep_logs")
      .delete()
      .eq("id", logId);

    if (error) throw error;
  } catch (err) {
    console.error("Error deleting sleep log:", err);
    throw err;
  }
}

// Calculate sleep statistics
export async function getSleepStats(
  userId: string,
  days: number = 7
): Promise<{ avgQuality: number; avgDuration: number; totalNights: number }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await getSleepLogsByDateRange(userId, startDate, new Date());

    if (logs.length === 0) {
      return { avgQuality: 0, avgDuration: 0, totalNights: 0 };
    }

    const qualities = logs.filter((log) => log.quality !== null).map((log) => log.quality as number);
    const durations = logs.map((log) => {
      const start = new Date(log.sleep_start);
      const end = new Date(log.sleep_end);
      return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    });

    const avgQuality = qualities.length > 0 ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    return {
      avgQuality: Math.round(avgQuality * 10) / 10,
      avgDuration: Math.round(avgDuration * 10) / 10,
      totalNights: logs.length,
    };
  } catch (err) {
    console.error("Error calculating sleep stats:", err);
    throw err;
  }
}
