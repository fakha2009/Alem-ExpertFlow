CREATE INDEX IF NOT EXISTS experts_type_idx ON experts(type);
CREATE INDEX IF NOT EXISTS experts_matching_idx ON experts(is_available, rating, current_load);
CREATE INDEX IF NOT EXISTS requests_category_idx ON requests(category);
CREATE INDEX IF NOT EXISTS requests_status_created_at_idx ON requests(status, created_at);
