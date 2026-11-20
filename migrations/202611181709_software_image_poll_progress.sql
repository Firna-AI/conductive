CREATE TABLE software_image_operations (
  image_id TEXT PRIMARY KEY REFERENCES software_images(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  revision INTEGER NOT NULL,
  operation TEXT NOT NULL
);

CREATE TABLE software_image_output (
  image_id TEXT NOT NULL REFERENCES software_images(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  part INTEGER NOT NULL,
  output TEXT NOT NULL,
  PRIMARY KEY (image_id, revision, part)
);

CREATE TABLE software_image_deploys (
  token_digest TEXT PRIMARY KEY,
  image_id TEXT NOT NULL REFERENCES software_images(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX software_image_deploys_image ON software_image_deploys(image_id);
