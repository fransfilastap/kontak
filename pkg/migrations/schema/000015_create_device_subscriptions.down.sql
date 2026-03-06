DROP TRIGGER IF EXISTS update_device_subscriptions_updated_at ON device_subscriptions;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS device_subscriptions;