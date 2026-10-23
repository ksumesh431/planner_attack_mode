package config

import (
	"slices"
	"testing"
)

func TestParseTrustedProxies(t *testing.T) {
	cases := []struct {
		name    string
		input   string
		want    []string
		wantErr bool
	}{
		{name: "empty", input: "", want: nil},
		{name: "single ip", input: "127.0.0.1", want: []string{"127.0.0.1"}},
		{
			name:  "mixed list",
			input: " 172.18.0.0/16 , 2001:db8::/32 , ",
			want:  []string{"172.18.0.0/16", "2001:db8::/32"},
		},
		{name: "ipv6", input: "::1", want: []string{"::1"}},
		{name: "invalid", input: "not-an-ip", wantErr: true},
		{name: "invalid cidr", input: "10.0.0.0/33", wantErr: true},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			got, err := parseTrustedProxies(testCase.input)
			if testCase.wantErr {
				if err == nil {
					t.Fatalf("expected an error for %q", testCase.input)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !slices.Equal(got, testCase.want) {
				t.Fatalf("got %v, want %v", got, testCase.want)
			}
		})
	}
}
