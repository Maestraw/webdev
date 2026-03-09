CREATE OR REPLACE FUNCTION normalize_phone(p TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF p IS NULL THEN
    RETURN '';
  END IF;

  cleaned := regexp_replace(p, '\D', '', 'g');

  IF cleaned LIKE '263%' THEN
    cleaned := '0' || substr(cleaned, 4);
  END IF;

  RETURN cleaned;
END;
$$;
