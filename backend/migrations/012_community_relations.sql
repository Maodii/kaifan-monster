CREATE TABLE social_favorite (
 post_id uuid NOT NULL REFERENCES social_post(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(post_id,user_id)
);
CREATE INDEX social_favorite_owner ON social_favorite(user_id,created_at DESC);
CREATE TABLE social_follow (
 follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(follower_id<>following_id), PRIMARY KEY(follower_id,following_id)
);
CREATE INDEX social_follow_following ON social_follow(following_id);
CREATE TABLE social_notification (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('like','comment','reply','follow','new-post')),
 post_id uuid REFERENCES social_post(id) ON DELETE CASCADE,
 comment_id uuid REFERENCES social_comment(id) ON DELETE CASCADE,
 event_key text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,event_key)
);
CREATE INDEX social_notification_owner ON social_notification(user_id,created_at DESC);
