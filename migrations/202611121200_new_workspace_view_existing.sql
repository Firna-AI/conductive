INSERT INTO user_preferences (user_id, new_workspace_view, updated_at)
SELECT id, 'page', CAST(unixepoch('subsec') * 1000 AS INTEGER) FROM users WHERE true
ON CONFLICT(user_id) DO UPDATE SET new_workspace_view = 'page'
WHERE user_preferences.new_workspace_view IS NULL;
