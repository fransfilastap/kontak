package wa

import (
	"context"
	"sync"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/jackc/pgx/v5/pgtype"
)

type SubscriptionStore struct {
	mu            sync.RWMutex
	subscriptions map[string]map[string]bool
	dbQueries     db.Querier
}

func NewSubscriptionStore(dbQueries db.Querier) *SubscriptionStore {
	return &SubscriptionStore{
		subscriptions: make(map[string]map[string]bool),
		dbQueries:     dbQueries,
	}
}

func (s *SubscriptionStore) Load(ctx context.Context) error {
	subs, err := s.dbQueries.GetAllDeviceSubscriptions(ctx)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.subscriptions = make(map[string]map[string]bool)
	for _, sub := range subs {
		deviceID := sub.DeviceID
		eventType := sub.EventType
		enabled := sub.Enabled.Bool

		if s.subscriptions[deviceID] == nil {
			s.subscriptions[deviceID] = make(map[string]bool)
		}
		s.subscriptions[deviceID][eventType] = enabled
	}

	return nil
}

func (s *SubscriptionStore) IsEnabled(deviceID, eventType string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if deviceSubs, ok := s.subscriptions[deviceID]; ok {
		if enabled, ok := deviceSubs[eventType]; ok {
			return enabled
		}
	}
	return true
}

func (s *SubscriptionStore) GetDeviceSubscriptions(deviceID string) map[string]bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make(map[string]bool)
	if deviceSubs, ok := s.subscriptions[deviceID]; ok {
		for k, v := range deviceSubs {
			result[k] = v
		}
	}
	return result
}

func (s *SubscriptionStore) SetSubscription(ctx context.Context, deviceID, eventType string, enabled bool) error {
	_, err := s.dbQueries.CreateDeviceSubscription(ctx, db.CreateDeviceSubscriptionParams{
		DeviceID:  deviceID,
		EventType: eventType,
		Enabled: pgtype.Bool{
			Bool:  enabled,
			Valid: true,
		},
	})
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.subscriptions[deviceID] == nil {
		s.subscriptions[deviceID] = make(map[string]bool)
	}
	s.subscriptions[deviceID][eventType] = enabled

	return nil
}

func (s *SubscriptionStore) SetDeviceSubscriptions(ctx context.Context, deviceID string, subscriptions map[string]bool) error {
	for eventType, enabled := range subscriptions {
		err := s.SetSubscription(ctx, deviceID, eventType, enabled)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *SubscriptionStore) DeleteDeviceSubscriptions(ctx context.Context, deviceID string) error {
	err := s.dbQueries.DeleteAllDeviceSubscriptions(ctx, deviceID)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.subscriptions, deviceID)

	return nil
}

var DefaultEventTypes = []string{
	"message",
	"fb_message",
	"receipt",
	"chat_presence",
	"presence",
	"undecryptable_message",
	"history_sync",
	"media_retry",
	"qr",
	"pair_success",
	"pair_error",
	"connected",
	"disconnected",
	"logged_out",
	"stream_replaced",
	"connect_failure",
	"client_outdated",
	"joined_group",
	"group_info",
	"picture",
	"user_about",
	"identity_change",
	"privacy_settings",
	"offline_sync_preview",
	"offline_sync_completed",
	"blocklist",
	"newsletter_join",
	"newsletter_leave",
	"newsletter_live_update",
	"keep_alive_timeout",
	"keep_alive_restored",
	"permanent_disconnect",
	"temp_ban",
}
