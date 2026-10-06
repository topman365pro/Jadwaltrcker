CREATE TABLE IF NOT EXISTS dayline_meta (
  id smallint PRIMARY KEY CHECK (id = 1),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dayline_teachers (
  code varchar(2) PRIMARY KEY CHECK (code ~ '^[0-9]{2}$' AND code <> '00'),
  teacher varchar(200) NOT NULL CHECK (length(trim(teacher)) > 0),
  subject varchar(200) NOT NULL CHECK (length(trim(subject)) > 0)
);
CREATE TABLE IF NOT EXISTS dayline_classes (
  name varchar(60) PRIMARY KEY CHECK (length(trim(name)) > 0)
);
CREATE TABLE IF NOT EXISTS dayline_timetable (
  class_name varchar(60) NOT NULL REFERENCES dayline_classes(name) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 5),
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 10 AND (weekday <> 5 OR slot <= 8)),
  entry varchar(200) NOT NULL DEFAULT '',
  PRIMARY KEY (class_name, weekday, slot)
);
-- Entry retains source codes and activities, including unmapped or multiple codes.
-- The composite primary key indexes timetable lookup by class and weekday.
