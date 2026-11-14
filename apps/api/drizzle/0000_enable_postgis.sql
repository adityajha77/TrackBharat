-- Custom migration (drizzle-kit can't generate extensions).
-- PostGIS adds geometry types and spatial indexes. Phase 1 uses it to answer
-- "which constituency boundary contains this PIN code's location?" with ST_Contains.
CREATE EXTENSION IF NOT EXISTS postgis;
