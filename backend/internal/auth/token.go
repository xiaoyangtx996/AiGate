package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var ErrInvalidToken = errors.New("invalid token")

type Identity struct {
	TenantID    string   `json:"tenant_id"`
	UserID      string   `json:"sub"`
	Roles       []string `json:"roles"`
	Platform    bool     `json:"platform,omitempty"`
	DisplayName string   `json:"display_name,omitempty"`
	Expires     int64    `json:"exp"`
}

func (i Identity) HasRole(role string) bool {
	for _, current := range i.Roles {
		if current == role {
			return true
		}
	}
	return false
}

type TokenManager struct {
	secret []byte
	now    func() time.Time
}

func NewTokenManager(secret string) (*TokenManager, error) {
	if len(secret) < 32 {
		return nil, errors.New("JWT secret must be at least 32 bytes")
	}
	return &TokenManager{secret: []byte(secret), now: time.Now}, nil
}

func (m *TokenManager) Issue(identity Identity, ttl time.Duration) (string, error) {
	header, _ := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	identity.Expires = m.now().Add(ttl).Unix()
	payload, err := json.Marshal(identity)
	if err != nil {
		return "", err
	}
	unsigned := encode(header) + "." + encode(payload)
	return unsigned + "." + encode(m.sign(unsigned)), nil
}

func (m *TokenManager) Parse(token string) (Identity, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Identity{}, ErrInvalidToken
	}
	unsigned := parts[0] + "." + parts[1]
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !hmac.Equal(signature, m.sign(unsigned)) {
		return Identity{}, ErrInvalidToken
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Identity{}, ErrInvalidToken
	}
	var identity Identity
	if json.Unmarshal(payload, &identity) != nil || identity.TenantID == "" || identity.UserID == "" || identity.Expires <= m.now().Unix() {
		return Identity{}, ErrInvalidToken
	}
	return identity, nil
}

func (m *TokenManager) sign(value string) []byte {
	mac := hmac.New(sha256.New, m.secret)
	_, _ = mac.Write([]byte(value))
	return mac.Sum(nil)
}

func encode(value []byte) string { return base64.RawURLEncoding.EncodeToString(value) }
