package wa

import (
	"encoding/base64"
	"fmt"
	"github.com/google/uuid"
	_ "github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow/types"
	"log"
	"strings"
)

func QRCode(code string) string {
	image, _ := qrcode.Encode(code, qrcode.Medium, 256)
	base64qrcode := "data:image/png;base64," + base64.StdEncoding.EncodeToString(image)

	return base64qrcode
}

func parseJID(arg string) (types.JID, bool) {
	if arg[0] == '+' {
		arg = arg[1:]
	}
	if !strings.ContainsRune(arg, '@') {
		return types.NewJID(arg, types.DefaultUserServer), true
	} else {
		recipient, err := types.ParseJID(arg)
		if err != nil {
			log.Printf("Invalid JID: %s", err.Error())
			return recipient, false
		} else if recipient.User == "" {
			log.Printf("Invalid JID no server specified %s", err.Error())
			return recipient, false
		}
		return recipient, true
	}
}

func getJID(recipient string) (types.JID, error) {
	if strings.ContainsRune(recipient, '@') {
		jid, err := types.ParseJID(recipient)
		if err != nil {
			return types.JID{}, fmt.Errorf("failed to parse jid: %v", err)
		}
		return jid, nil
	}
	formatJID := fmt.Sprintf("%s@s.whatsapp.net", recipient)
	jid, err := types.ParseJID(formatJID)
	if err != nil {
		return types.JID{}, fmt.Errorf("failed to parse jid: %v", err)
	}

	return jid, nil
}

func UUID2String(pgUUID pgtype.UUID) string {
	u, _ := uuid.FromBytes(pgUUID.Bytes[:])
	return u.String()
}

func String2PgUUID(uuidStr string) (pgtype.UUID, error) {
	u, err := uuid.Parse(uuidStr)
	if err != nil {
		return pgtype.UUID{}, err
	}

	var pgUUID pgtype.UUID
	copy(pgUUID.Bytes[:], u[:])
	pgUUID.Valid = true

	return pgUUID, nil
}
