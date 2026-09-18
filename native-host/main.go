package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"syscall"
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

func writeNative(v any) error {
	b, err := json.Marshal(v)
	if err != nil { return err }
	var h [4]byte
	binary.LittleEndian.PutUint32(h[:], uint32(len(b)))
	if _, err = os.Stdout.Write(h[:]); err != nil { return err }
	_, err = os.Stdout.Write(b)
	return err
}

func readNative() ([]byte, error) {
	var h [4]byte
	if _, err := io.ReadFull(os.Stdin, h[:]); err != nil { return nil, err }
	n := binary.LittleEndian.Uint32(h[:])
	if n > 1<<20 { return nil, fmt.Errorf("message too large") }
	b := make([]byte, n)
	_, err := io.ReadFull(os.Stdin, b)
	return b, err
}

func running() bool {
	r, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/health", port))
	if err != nil { return false }
	defer r.Body.Close()
	return r.StatusCode == http.StatusOK
}

func spawnServer() error {
	if running() { return nil }

	exe, err := os.Executable()
	if err != nil { return err }

	cmd := exec.Command(exe, "--server")
	// The OAuth callback server must survive after Chrome closes the
	// native-messaging process. Run it as an independent Windows process.
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: 0x08000000 | 0x00000200, // CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP
	}
	if err := cmd.Start(); err != nil { return err }

	// Verify that the child actually bound the port.
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if running() { return nil }
		time.Sleep(50 * time.Millisecond)
	}
	return fmt.Errorf("loopback_server_not_started")
}

func server() {
	mux := http.NewServeMux()
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		target := callback
		if r.URL.RawQuery != "" { target += "&" + r.URL.RawQuery }
		http.Redirect(w, r, target, http.StatusFound)
	})
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	_ = (&http.Server{
		Addr: fmt.Sprintf("127.0.0.1:%d", port),
		Handler: mux,
		ReadHeaderTimeout: 5 * time.Second,
	}).ListenAndServe()
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--server" {
		server()
		return
	}

	b, err := readNative()
	if err != nil { return }

	var m Msg
	_ = json.Unmarshal(b, &m)

	if m.Action == "ensure_server" || m.Action == "" {
		if err := spawnServer(); err != nil {
			_ = writeNative(Resp{Ok: false, Error: err.Error()})
			return
		}
		_ = writeNative(Resp{Ok: true, Port: port})
		return
	}

	_ = writeNative(Resp{Ok: false, Error: "unknown_action"})
}
