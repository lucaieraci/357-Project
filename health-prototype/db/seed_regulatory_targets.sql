-- Minimal prototype seed data for regulatory target baselines

insert into public.regulatory_targets
  (profile_key, nutrient_key, nutrient_name, unit, target_value, upper_limit_value, source)
values
  ('adult_general', 'calories', 'Calories', 'kcal', 2000, null, 'prototype_default'),
  ('adult_general', 'protein', 'Protein', 'g', 50, null, 'prototype_default'),
  ('adult_general', 'carbs', 'Carbohydrate', 'g', 275, null, 'prototype_default'),
  ('adult_general', 'fat', 'Fat', 'g', 78, null, 'prototype_default'),
  ('adult_general', 'fiber', 'Fiber', 'g', 28, null, 'prototype_default'),
  ('adult_general', 'sodium', 'Sodium', 'mg', 1500, 2300, 'prototype_default'),
  ('adult_general', 'vitamin_c', 'Vitamin C', 'mg', 90, 2000, 'prototype_default'),
  ('adult_general', 'calcium', 'Calcium', 'mg', 1000, 2500, 'prototype_default'),
  ('adult_general', 'iron', 'Iron', 'mg', 18, 45, 'prototype_default')
on conflict (profile_key, nutrient_key) do update
set
  nutrient_name = excluded.nutrient_name,
  unit = excluded.unit,
  target_value = excluded.target_value,
  upper_limit_value = excluded.upper_limit_value,
  source = excluded.source;

