CREATE OR REPLACE FUNCTION find_best_booking_match(
  input_name TEXT,
  input_phone TEXT,
  input_branch TEXT,
  input_service TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  best RECORD;
  best_score NUMERIC := 0;
  
  -- Calculation Variables
  name_score NUMERIC;
  phone_score NUMERIC;
  branch_score NUMERIC;
  service_score NUMERIC;
  final_score NUMERIC;

  -- Normalization Variables
  norm_input_phone TEXT;
  norm_db_phone TEXT;
  
  -- Response Variables
  match_status TEXT;
  action_taken TEXT;
BEGIN
  -- 1. Pre-normalize input phone once
  norm_input_phone := normalize_phone(input_phone);

  -- 2. Loop through recent bookings
  FOR rec IN
    SELECT * FROM bookings
    WHERE booked_date >= NOW() - INTERVAL '3 days'
    AND status != 'completed' -- Only try to match open bookings
  LOOP

    -- Calculate Name Score (Weighted 70%)
    name_score := compare_name(input_name, rec.customer_name) * 0.7;

    -- Initialize support scores
    phone_score := 0;
    branch_score := 0;
    service_score := 0;

    -- Normalize DB phone for comparison
    norm_db_phone := normalize_phone(rec.phonenumber);

    -- Phone Match (20%)
    IF norm_input_phone <> '' AND norm_input_phone = norm_db_phone THEN
      phone_score := 0.20;
    END IF;

    -- Branch Match (5%)
    IF lower(input_branch) = lower(rec.branch) THEN
      branch_score := 0.05;
    END IF;

    -- Service Match (5%)
    IF lower(input_service) = lower(rec.service) THEN
      service_score := 0.05;
    END IF;

    final_score := name_score + phone_score + branch_score + service_score;

    -- Gatekeeper rule: If name is a total mismatch, penalize the support scores
    IF name_score = 0 THEN
      final_score := (phone_score + branch_score + service_score) * 0.5;
    END IF;

    -- Track the highest score found
    IF final_score > best_score THEN
      best_score := final_score;
      best := rec;
    END IF;

  END LOOP;

  -- 3. Handle NO MATCH scenario
  IF best IS NULL OR best_score < 0.3 THEN
    RETURN json_build_object(
      'status', 'unmatched',
      'score', 0,
      'booking_id', NULL,
      'match_name', NULL,
      'action_taken', 'none'
    );
  END IF;

  -- 4. Categorize the Match
  match_status := CASE
    WHEN best_score >= 0.8 THEN 'confirmed-match'
    WHEN best_score >= 0.5 THEN 'possible-match'
    ELSE 'manual-verification'
  END;

  -- 5. PERFORM UPDATE on confirmed match
  action_taken := 'flagged_for_review';
  
  IF match_status = 'confirmed-match' THEN
    UPDATE bookings 
    SET status = 'completed' 
    WHERE id = best.id;
    
    action_taken := 'updated_to_completed';
  END IF;

  -- 6. Return Consistent Response
  RETURN json_build_object(
    'status', match_status,
    'score', ROUND(best_score, 2),
    'booking_id', best.id,
    'match_name', best.customer_name,
    'match_phone', best.phonenumber,
    'branch', best.branch,
    'action_taken', action_taken
  );

END;
$$;