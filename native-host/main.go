package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"
)

const port = 8765
const callback = "https://expxqynyrafienedsmuw.supabase.co/functions/v1/connections?action=lovable_callback"

type Msg struct {
	Action string `json:"action"`
}

type Resp struct {
	Ok    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
	Port  int    `json:"port,omitempty"`
}

var serverOnce sync.Once

func writeNative(v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	var h [4]byte
	binary.LittleEndian.PutUint32(h[:], uint32(len(b)))
	if _, err = os.Stdout.Write(h[:]); err != nil {
		return err
	}
	_, err = os.Stdout.Write(b)
	return err
}

func readNative() ([]byte, error) {
	var h [4]byte
	if _, err := io.ReadFull(os.Stdin, h[:]); err != nil {
		return nil, err
	}
	n := binary.LittleEndian.Uint32(h[:])
	if n > 1<<20 {
		return nil, fmt.Errorf("message too large")
	}
	b := make([]byte, n)
	_, err := io.ReadFull(os.Stdin, b)
	return b, err
}

func startServer() {
	serverOnce.Do(func() {
		go func() {
			mux := http.NewServeMux()

			mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
				target := callback
				if r.URL.RawQuery != "" {
					target += "&" + r.URL.RawQuery
				}
				http.Redirect(w, r, target, http.StatusFound)
			})

			mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Access-Control-Allow-Origin", "*")
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"ok":true}`))
			})

			server := &http.Server{
				Addr:              fmt.Sprintf("127.0.0.1:%d", port),
				Handler:           mux,
				ReadHeaderTimeout: 5 * time.Second,
			}

			_ = server.ListenAndServe()
		}()

		// Give the listener a moment to bind before answering the extension.
		time.Sleep(100 * time.Millisecond)
	})
}

func main() {
	// The native host itself owns the loopback server. Keeping this process
	// alive is important: Chrome may terminate child processes spawned by a
	// short-lived native host.
	b, err := readNative()
	if err != nil {
		return
	}

	var m Msg
	_ = json.Unmarshal(b, &m)

	if m.Action == "ensure_server" || m.Action == "" {
		startServer()
		_ = writeNative(Resp{Ok: true, Port: port})

		// Stay alive while Chrome keeps the native messaging pipe open.
		for {
			if _, err := readNative(); err != nil {
				return
			}
		}
	}

	_ = writeNative(Resp{Ok: false, Error: "unknown_action"})
}
