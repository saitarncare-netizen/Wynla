# Live database schema snapshot (PostgREST OpenAPI, 2026-09-23)

Ground truth for the Supabase project as of 2026-09-23. Regenerate with: GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ using the service key. Tables not listed here do NOT exist yet (e.g. cron_runs, resort_stations, prediction_log, resort_pass_access, trips.start_date).


## data_review_queue

- `id` bigint (pk)
- `table_name` text
- `resort_id` bigint
- `field` text
- `proposed_value` jsonb
- `agent_outputs` jsonb
- `reason` text
- `status` text
- `flagged_at` timestamp
- `resolved_at` timestamp
- `resolution` text

## digest_subscriptions

- `id` bigint (pk)
- `user_id` uuid
- `email` text
- `frequency` text
- `threshold_in` integer
- `last_sent_at` timestamp
- `enabled` boolean
- `created_at` timestamp

## drive_time_cache

- `id` bigint (pk)
- `resort_id` bigint
- `origin_name` text
- `origin_lat` numeric
- `origin_lon` numeric
- `duration_seconds` integer
- `distance_meters` integer
- `computed_at` timestamp

## favorites

- `user_id` uuid (pk)
- `resort_id` bigint (pk)
- `created_at` timestamp

## feedback

- `id` bigint (pk)
- `body` text
- `email` text
- `user_id` uuid
- `page_url` text
- `user_agent` text
- `status` text
- `created_at` timestamp

## lift_status_daily

- `id` bigint (pk)
- `resort_id` bigint
- `observed_date` date
- `lifts_open_count` integer
- `lifts_total_count` integer
- `lift_detail` jsonb
- `confidence` text
- `fetched_at` timestamp

## nearby_activities

- `id` bigint (pk)
- `resort_id` integer
- `name` text
- `category` text
- `description` text
- `distance_km` numeric
- `drive_minutes` integer
- `latitude` numeric
- `longitude` numeric
- `osm_id` bigint
- `website_url` text
- `source` text
- `confidence_score` numeric
- `verified_at` timestamp
- `created_at` timestamp
- `updated_at` timestamp
- `google_place_id` text
- `rating` numeric
- `user_ratings_total` integer
- `top_review` text
- `is_recommended` boolean
- `rating_updated_at` timestamp

## nearby_restaurants

- `id` bigint (pk)
- `resort_id` integer
- `name` text
- `category` text
- `description` text
- `distance_km` numeric
- `drive_minutes` integer
- `latitude` numeric
- `longitude` numeric
- `price_level` text
- `osm_id` bigint
- `google_place_id` text
- `yelp_id` text
- `website_url` text
- `source` text
- `confidence_score` numeric
- `verified_at` timestamp
- `created_at` timestamp
- `updated_at` timestamp
- `rating` numeric
- `user_ratings_total` integer
- `top_review` text
- `is_recommended` boolean
- `rating_updated_at` timestamp

## pro_subscriptions

- `id` bigint (pk)
- `user_id` uuid
- `stripe_customer_id` text
- `stripe_subscription_id` text
- `status` text
- `price_id` text
- `cancel_at` timestamp
- `current_period_end` timestamp
- `created_at` timestamp
- `updated_at` timestamp

## pro_waitlist

- `id` bigint (pk)
- `email` text
- `source` text
- `user_id` uuid
- `created_at` timestamp

## profiles

- `id` uuid (pk)
- `display_name` text
- `preferred_origin` text
- `created_at` timestamp
- `updated_at` timestamp

## push_subscriptions

- `id` bigint (pk)
- `user_id` uuid
- `endpoint` text
- `p256dh` text
- `auth` text
- `user_agent` text
- `created_at` timestamp
- `last_seen_at` timestamp

## resort_reviews

- `id` bigint (pk)
- `resort_id` bigint
- `user_id` uuid
- `rating` smallint
- `body` text
- `created_at` timestamp
- `updated_at` timestamp

## resorts

- `id` bigint (pk)
- `slug` text
- `name` text
- `state` text
- `region` text
- `city` text
- `address` text
- `latitude` numeric
- `longitude` numeric
- `elevation_base` integer
- `elevation_summit` integer
- `pass_access_type` text
- `typical_season_start` text
- `typical_season_end` text
- `weekday_hours` text
- `weekend_hours` text
- `has_night_skiing` boolean
- `night_skiing_hours` text
- `vertical_drop` integer
- `total_acres` integer
- `total_trails` integer
- `trails_beginner` integer
- `trails_intermediate` integer
- `trails_advanced` integer
- `trails_expert` integer
- `total_lifts` integer
- `longest_run_miles` numeric
- `trail_width_profile` text
- `has_terrain_park` boolean
- `terrain_park_count` integer
- `has_halfpipe` boolean
- `has_glades` boolean
- `glades_acreage` integer
- `beginner_area_size` text
- `has_dedicated_lessons` boolean
- `website_url` text
- `trail_map_url` text
- `webcam_url` text
- `ticket_booking_url` text
- `ticket_affiliate_url` text
- `hotel_affiliate_url` text
- `hero_image_url` text
- `hero_image_credit` text
- `active` boolean
- `created_at` timestamp
- `updated_at` timestamp
- `passes` text[]
- `tier` text
- `operating_status` text
- `hero_image_source` text
- `hero_image_alt` text
- `last_verified_at` timestamp
- `difficulty_pct_beginner` smallint
- `difficulty_pct_intermediate` smallint
- `difficulty_pct_advanced` smallint
- `difficulty_pct_expert` smallint
- `high_speed_lifts` smallint
- `base_elevation_ft` integer
- `summit_elevation_ft` integer
- `annual_snowfall_in` integer
- `season_open_text` text
- `season_close_text` text
- `snowmaking_pct` smallint
- `has_tubing` boolean
- `has_lessons` boolean
- `has_rentals` boolean
- `has_lodging_on_mountain` boolean
- `has_xc_skiing` boolean
- `has_backcountry_access` boolean
- `closest_airport_iata` text
- `closest_airport_distance_mi` smallint
- `hero_image_attribution` text
- `hero_image_verified_winter` boolean
- `snow_base_depth_in` smallint
- `snow_new_24h_in` smallint
- `snow_new_48h_in` smallint
- `snow_new_7d_in` smallint
- `trails_open_today` smallint
- `lifts_open_today` smallint
- `snow_report_status` text
- `snow_report_updated_at` timestamp
- `ticket_price_adult_min` integer
- `ticket_price_adult_max` integer
- `ticket_price_currency` text
- `ticket_price_updated_at` timestamp
- `onthesnow_url` text
- `onthesnow_url_verified_at` timestamp
- `onthesnow_last_404_at` timestamp
- `daily_note` text
- `daily_note_updated_at` timestamp
- `allows_snowboards` boolean
- `lift_types` jsonb
- `wind_hold_mph_chair` integer
- `wind_hold_mph_gondola` integer
- `currently_open` boolean
- `season_end_date` date
- `terrain_park_features` integer
- `avalanche_zone_id` text
- `current_surface_class` text
- `current_surface_updated_at` timestamp
- `has_adaptive_program` boolean

## snow_alerts

- `id` bigint (pk)
- `user_id` uuid
- `resort_id` bigint
- `threshold_in` smallint
- `enabled` boolean
- `last_alerted_at` timestamp
- `created_at` timestamp

## trail_status_daily

- `id` bigint (pk)
- `resort_id` bigint
- `observed_date` date
- `trails_open_count` integer
- `trails_total_count` integer
- `confidence` text
- `fetched_at` timestamp

## trip_shares

- `id` bigint (pk)
- `trip_id` uuid
- `share_token` text
- `created_by` uuid
- `created_at` timestamp
- `view_count` integer

## trips

- `id` uuid (pk)
- `user_id` uuid
- `name` text
- `origin_lat` double
- `origin_lng` double
- `origin_label` text
- `resort_slugs` text[]
- `lodging_mode` text
- `total_days` integer
- `started_at` timestamp
- `current_day` integer
- `completed_days` integer[]
- `created_at` timestamp
- `updated_at` timestamp
- `days_per_resort` integer[]
- `day_plans` jsonb

## weather_cache

- `resort_id` integer (pk)
- `nws_grid_office` text
- `nws_grid_x` integer
- `nws_grid_y` integer
- `temp_high_f` integer
- `temp_low_f` integer
- `conditions_short` text
- `conditions_long` text
- `precip_chance` integer
- `snow_24h_in` numeric
- `snow_48h_in` numeric
- `wind_mph_avg` integer
- `wind_mph_gust` integer
- `wind_dir_deg` integer
- `wind_dir_short` text
- `forecast_for_date` date
- `fetched_at` timestamp
- `fetch_source` text
- `fetch_error` text
- `forecast_json` jsonb

## weather_history

- `id` bigint (pk)
- `resort_id` bigint
- `observed_date` date
- `temp_high_f` integer
- `temp_low_f` integer
- `snow_24h_in` numeric
- `rain_24h_in` numeric
- `precip_24h_in` numeric
- `wind_mph_avg` numeric
- `wind_dir_short` text
- `conditions_short` text
- `fetched_at` timestamp