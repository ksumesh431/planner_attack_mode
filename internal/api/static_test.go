package api

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"testing/fstest"

	"github.com/gin-gonic/gin"
)

func newStaticTestRouter(t *testing.T) *gin.Engine {
	t.Helper()

	gin.SetMode(gin.TestMode)

	assets := fstest.MapFS{
		"index.html":           {Data: []byte("<!doctype html><title>Attack Mode</title>")},
		"app-123.js":           {Data: []byte("console.log('plain')")},
		"app-123.js.br":        {Data: []byte("brotli-bytes")},
		"app-123.js.gz":        {Data: []byte("gzip-bytes")},
		"app-123.css":          {Data: []byte("body{}")},
		"manifest.webmanifest": {Data: []byte(`{"name":"Attack Mode"}`)},
		"sw.js":                {Data: []byte("self.addEventListener('fetch', () => {})")},
		"register-sw.js":       {Data: []byte("navigator.serviceWorker.register('/sw.js')")},
		"icons/icon-192.png":   {Data: []byte("png")},
	}

	router := gin.New()
	router.NoRoute(func(c *gin.Context) {
		serveSPA(c, assets, true)
	})
	return router
}

func TestStaticEncodingNegotiation(t *testing.T) {
	router := newStaticTestRouter(t)

	cases := []struct {
		name     string
		accept   string
		encoding string
		body     string
	}{
		{name: "prefers brotli", accept: "gzip, deflate, br", encoding: "br", body: "brotli-bytes"},
		{name: "uses gzip", accept: "gzip, deflate", encoding: "gzip", body: "gzip-bytes"},
		{name: "falls back to identity", accept: "", encoding: "", body: "console.log('plain')"},
		{name: "falls back when brotli missing", accept: "br", encoding: "", body: "body{}"},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			path := "/app-123.js"
			if testCase.name == "falls back when brotli missing" {
				path = "/app-123.css"
			}

			request := httptest.NewRequest(http.MethodGet, path, nil)
			if testCase.accept != "" {
				request.Header.Set("Accept-Encoding", testCase.accept)
			}
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, request)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
			}
			if got := recorder.Header().Get("Content-Encoding"); got != testCase.encoding {
				t.Fatalf("Content-Encoding = %q, want %q", got, testCase.encoding)
			}
			if got := recorder.Header().Get("Vary"); got != "Accept-Encoding" {
				t.Fatalf("Vary = %q, want Accept-Encoding", got)
			}
			if got := recorder.Body.String(); got != testCase.body {
				t.Fatalf("body = %q, want %q", got, testCase.body)
			}
			if got, want := recorder.Header().Get("Content-Length"), strconv.Itoa(recorder.Body.Len()); got != want {
				t.Fatalf("Content-Length = %q, want %q", got, want)
			}
		})
	}
}

func TestPublicAssetHeaders(t *testing.T) {
	router := newStaticTestRouter(t)

	cases := []struct {
		path        string
		cache       string
		contentType string
	}{
		{path: "/manifest.webmanifest", cache: "no-cache", contentType: "application/manifest+json"},
		{path: "/sw.js", cache: "no-cache", contentType: "text/javascript; charset=utf-8"},
		{path: "/register-sw.js", cache: "no-cache", contentType: "text/javascript; charset=utf-8"},
		{path: "/icons/icon-192.png", cache: "public, max-age=86400", contentType: "image/png"},
		{path: "/app-123.js", cache: "public, max-age=31536000, immutable", contentType: ""},
	}

	for _, testCase := range cases {
		t.Run(testCase.path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, testCase.path, nil)
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, request)

			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d", recorder.Code)
			}
			if got := recorder.Header().Get("Cache-Control"); got != testCase.cache {
				t.Fatalf("Cache-Control = %q, want %q", got, testCase.cache)
			}
			if testCase.contentType != "" {
				if got := recorder.Header().Get("Content-Type"); got != testCase.contentType {
					t.Fatalf("Content-Type = %q, want %q", got, testCase.contentType)
				}
			}
		})
	}
}

func TestStaticServing(t *testing.T) {
	router := newStaticTestRouter(t)

	deepLink := httptest.NewRequest(http.MethodGet, "/day/2026-10-23", nil)
	deepLinkRecorder := httptest.NewRecorder()
	router.ServeHTTP(deepLinkRecorder, deepLink)
	if deepLinkRecorder.Code != http.StatusOK {
		t.Fatalf("deep link status = %d", deepLinkRecorder.Code)
	}
	if got := deepLinkRecorder.Body.String(); got != "<!doctype html><title>Attack Mode</title>" {
		t.Fatalf("deep link body = %q", got)
	}
	if got := deepLinkRecorder.Header().Get("Cache-Control"); got != "no-cache" {
		t.Fatalf("deep link Cache-Control = %q", got)
	}

	precompressed := httptest.NewRequest(http.MethodGet, "/app-123.js.br", nil)
	precompressedRecorder := httptest.NewRecorder()
	router.ServeHTTP(precompressedRecorder, precompressed)
	if precompressedRecorder.Code != http.StatusNotFound {
		t.Fatalf("direct precompressed request status = %d, want 404", precompressedRecorder.Code)
	}

	missing := httptest.NewRequest(http.MethodGet, "/missing-file.js", nil)
	missingRecorder := httptest.NewRecorder()
	router.ServeHTTP(missingRecorder, missing)
	if missingRecorder.Code != http.StatusNotFound {
		t.Fatalf("missing static status = %d, want 404", missingRecorder.Code)
	}
}

func TestAcceptedEncodings(t *testing.T) {
	cases := []struct {
		header string
		want   []string
	}{
		{header: "", want: []string{}},
		{header: "gzip", want: []string{"gzip"}},
		{header: "gzip, deflate, br", want: []string{"br", "gzip"}},
		{header: "br;q=1.0, gzip;q=0.8", want: []string{"br", "gzip"}},
		{header: "identity", want: []string{}},
	}

	for _, testCase := range cases {
		got := acceptedEncodings(testCase.header)
		if len(got) != len(testCase.want) {
			t.Fatalf("acceptedEncodings(%q) = %v, want %v", testCase.header, got, testCase.want)
		}
		for index := range got {
			if got[index] != testCase.want[index] {
				t.Fatalf("acceptedEncodings(%q) = %v, want %v", testCase.header, got, testCase.want)
			}
		}
	}
}
