package api

import (
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func serveSPA(c *gin.Context, assets fs.FS, hasAssets bool) {
	if strings.HasPrefix(c.Request.URL.Path, "/api/") || c.Request.URL.Path == "/api" {
		respondError(c, http.StatusNotFound, "not_found", "API route not found.")
		return
	}

	if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
		c.Status(http.StatusMethodNotAllowed)
		return
	}

	if !hasAssets || assets == nil {
		c.String(http.StatusNotFound, "Frontend assets are not built. Run `bun run build` first.")
		return
	}

	clean := strings.TrimPrefix(path.Clean("/"+c.Request.URL.Path), "/")
	if clean == "" || clean == "." {
		clean = "index.html"
	}

	if clean != "index.html" {
		// Precompressed variants are an implementation detail; never serve them
		// directly as if they were the asset.
		if strings.HasSuffix(clean, ".br") || strings.HasSuffix(clean, ".gz") {
			c.Status(http.StatusNotFound)
			return
		}

		if file, err := assets.Open(clean); err == nil {
			info, statErr := file.Stat()
			_ = file.Close()
			if statErr == nil && !info.IsDir() {
				c.Header("Cache-Control", assetCacheControl(clean))
				serveAsset(c, assets, clean)
				return
			}
		}

		// Do not fall back to the SPA for a missing static file.
		if path.Ext(clean) != "" {
			c.Status(http.StatusNotFound)
			return
		}
	}

	c.Header("Cache-Control", "no-cache")
	http.ServeFileFS(c.Writer, c.Request, assets, "index.html")
}

// serveAsset serves a hashed static file, preferring the precompressed brotli
// or gzip copy produced at build time.
func serveAsset(c *gin.Context, assets fs.FS, name string) {
	c.Header("Vary", "Accept-Encoding")
	if contentType := assetContentType(name); contentType != "" {
		c.Header("Content-Type", contentType)
	}

	encoding, compressed := negotiateEncoding(c.GetHeader("Accept-Encoding"), assets, name)
	if compressed == "" {
		http.ServeFileFS(c.Writer, c.Request, assets, name)
		return
	}

	c.Header("Content-Encoding", encoding)
	// ServeContent deliberately skips Content-Length for encoded responses, but
	// the size is known here. Do not set it for range requests, where the
	// partial length is computed by ServeContent.
	if c.GetHeader("Range") == "" {
		if info, err := fs.Stat(assets, compressed); err == nil && !info.IsDir() {
			c.Header("Content-Length", strconv.FormatInt(info.Size(), 10))
		}
	}
	http.ServeFileFS(c.Writer, c.Request, assets, compressed)
}

// assetContentType covers public files whose extension is not in Go's built-in
// MIME table (important on the scratch image, which has no /etc/mime.types).
func assetContentType(name string) string {
	if strings.HasSuffix(name, ".webmanifest") {
		return "application/manifest+json"
	}
	if name == "sw.js" {
		return "text/javascript; charset=utf-8"
	}
	return mime.TypeByExtension(path.Ext(name))
}

// assetCacheControl keeps unhashed PWA files revalidated while hashed bundles
// remain immutable.
func assetCacheControl(name string) string {
	switch {
	case name == "sw.js" || name == "register-sw.js" || strings.HasSuffix(name, ".webmanifest"):
		return "no-cache"
	case strings.HasPrefix(name, "icons/"):
		return "public, max-age=86400"
	default:
		return "public, max-age=31536000, immutable"
	}
}

func negotiateEncoding(acceptEncoding string, assets fs.FS, name string) (string, string) {
	for _, encoding := range acceptedEncodings(acceptEncoding) {
		extension := encoding
		if encoding == "gzip" {
			extension = "gz"
		}
		candidate := name + "." + extension
		if info, err := fs.Stat(assets, candidate); err == nil && !info.IsDir() {
			return encoding, candidate
		}
	}
	return "", ""
}

// acceptedEncodings returns the supported encodings in preference order.
func acceptedEncodings(header string) []string {
	var brotli, gzip bool

	for _, part := range strings.Split(header, ",") {
		token := strings.TrimSpace(part)
		if index := strings.IndexByte(token, ';'); index >= 0 {
			token = token[:index]
		}
		switch strings.ToLower(strings.TrimSpace(token)) {
		case "br":
			brotli = true
		case "gzip":
			gzip = true
		}
	}

	encodings := make([]string, 0, 2)
	if brotli {
		encodings = append(encodings, "br")
	}
	if gzip {
		encodings = append(encodings, "gzip")
	}
	return encodings
}
