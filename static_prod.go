//go:build !dev

package main

import (
	"embed"
	"io/fs"
)

//go:embed all:web/dist
var embeddedWeb embed.FS

func webAssets() (fs.FS, bool) {
	sub, err := fs.Sub(embeddedWeb, "web/dist")
	if err != nil {
		return nil, false
	}
	if _, err := fs.Stat(sub, "index.html"); err != nil {
		return nil, false
	}
	return sub, true
}
