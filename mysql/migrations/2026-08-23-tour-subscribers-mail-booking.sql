-- NOVAWORKS unified workflow update
-- Safe on MySQL 8 versions that do not accept ADD COLUMN IF NOT EXISTS.
SET @db = DATABASE();
SET @q = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='users' AND column_name='email_notifications_enabled')=0,
 'ALTER TABLE users ADD COLUMN email_notifications_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER active','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='communication_threads' AND column_name='unread_count')=0,
 'ALTER TABLE communication_threads ADD COLUMN unread_count INT NOT NULL DEFAULT 0 AFTER status','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='communication_threads' AND column_name='last_read_at')=0,
 'ALTER TABLE communication_threads ADD COLUMN last_read_at DATETIME NULL AFTER unread_count','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
SET @q = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='luxury_access_requests' AND column_name='property_slug')=0,
 'ALTER TABLE luxury_access_requests ADD COLUMN property_slug VARCHAR(220) NULL AFTER message','SELECT 1'); PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
