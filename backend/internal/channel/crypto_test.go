package channel

import "testing"

func TestCredentialRoundTrip(t *testing.T) {
	cipher, err := NewCipher([]byte("01234567890123456789012345678901"))
	if err != nil {
		t.Fatal(err)
	}
	encrypted, err := cipher.Encrypt("provider-secret")
	if err != nil {
		t.Fatal(err)
	}
	if encrypted == "provider-secret" {
		t.Fatal("credential stored as plaintext")
	}
	plain, err := cipher.Decrypt(encrypted)
	if err != nil || plain != "provider-secret" {
		t.Fatalf("plain=%q err=%v", plain, err)
	}
}
