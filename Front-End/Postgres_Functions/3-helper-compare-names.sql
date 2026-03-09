CREATE OR REPLACE FUNCTION compare_name(n1 TEXT, n2 TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  c1 TEXT;
  c2 TEXT;
  dist INT;
  maxlen INT;
  score NUMERIC;
BEGIN
  IF n1 IS NULL OR n2 IS NULL THEN
    RETURN 0;
  END IF;

  c1 := lower(regexp_replace(n1,'[^a-z0-9 ]','','g'));
  c2 := lower(regexp_replace(n2,'[^a-z0-9 ]','','g'));

  IF c1 = c2 THEN
    RETURN 1;
  END IF;

  dist := levenshtein(c1,c2);
  maxlen := greatest(length(c1),length(c2));

  score := (maxlen - dist)::NUMERIC / maxlen;

  IF score > 0.7 THEN
    RETURN score;
  END IF;

  RETURN 0;
END;
$$;
