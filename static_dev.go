//go:build dev

package main

import "io/fs"

func webAssets() (fs.FS, bool) {
	return nil, false
}
