insert into daily_reports (
  report_date,
  sales_total,
  num_transactions,
  top_items,
  reviews_new,
  reviews_sentiment,
  inventory_status,
  labor_forecast,
  food_cost_pct,
  notes
)
values (
  current_date,
  1843.50,
  96,
  '[{"name":"Chicken Shawarma","qty":34,"revenue":476.00},{"name":"Hummus Plate","qty":28,"revenue":252.00}]'::jsonb,
  4,
  'positive',
  '[{"item":"Hummus","qty":15,"par_level":100,"status":"low"},{"item":"Chicken","qty":42,"par_level":120,"status":"warning"}]'::jsonb,
  '[{"time_slot":"12-2 PM","suggested_staff":4,"actual_staff":3},{"time_slot":"6-8 PM","suggested_staff":5,"actual_staff":4}]'::jsonb,
  28.5,
  'Lunch remained steady and dinner volume is trending above normal.'
)
on conflict (report_date) do nothing;

insert into suggestions (suggestion_type, content, data)
values
  (
    'staffing',
    'Schedule 1 additional staff Friday 6-8 PM.',
    '{"confidence":0.92,"reason":"Peak demand in historical dinner window","day":"Friday","time_slot":"6-8 PM"}'::jsonb
  ),
  (
    'reorder',
    'Reorder hummus and chicken before tomorrow lunch prep.',
    '{"confidence":0.88,"items":["Hummus","Chicken"],"reason":"Inventory dropped below target threshold"}'::jsonb
  );

insert into agent_logs (action_type, status, data)
values
  ('daily_report', 'success', '{"message":"Daily summary generated","source":"seed"}'::jsonb),
  ('inventory_alert', 'success', '{"message":"Hummus below par level","item":"Hummus","current":15,"par":100}'::jsonb),
  ('review_scan', 'success', '{"message":"4 new reviews detected","source":"Google Business"}'::jsonb);
