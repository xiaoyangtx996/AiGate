package apikey

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net"
	"net/http"
	"strings"
)

var ErrForbiddenIP = errors.New("API key is not allowed from this IP")

type Principal struct {
	KeyID, TenantID, OrganizationID, UserID string
	AllowedCIDRs                            []string
}

func Generate() (plain, prefix, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", "", err
	}
	plain = "ak_" + base64.RawURLEncoding.EncodeToString(b)
	prefix = plain[:11]
	hash = Hash(plain)
	return
}

func Hash(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

func Bearer(r *http.Request) string {
	v := r.Header.Get("Authorization")
	if !strings.HasPrefix(v, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(v, "Bearer "))
}

func ClientIP(r *http.Request, trustedProxyCIDRs []string) net.IP {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	remote := net.ParseIP(host)
	if remote == nil || !inCIDRs(remote, trustedProxyCIDRs) {
		return remote
	}
	parts := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
	for i := len(parts) - 1; i >= 0; i-- {
		ip := net.ParseIP(strings.TrimSpace(parts[i]))
		if ip != nil && !inCIDRs(ip, trustedProxyCIDRs) {
			return ip
		}
	}
	return remote
}

func CheckIP(ip net.IP, allowedCIDRs []string) error {
	if len(allowedCIDRs) == 0 {
		return nil
	}
	if ip == nil || !inCIDRs(ip, allowedCIDRs) {
		return ErrForbiddenIP
	}
	return nil
}

func inCIDRs(ip net.IP, cidrs []string) bool {
	for _, raw := range cidrs {
		_, network, err := net.ParseCIDR(strings.TrimSpace(raw))
		if err == nil && network.Contains(ip) {
			return true
		}
	}
	return false
}
