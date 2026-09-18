package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"path"
	"strings"
	"syscall"
	"unsafe"
)

//go:embed payload/*
var payloadFS embed.FS

const extensionID = "jinndnfkecgpmefehdbcjcjponabkhlc"
const hostName = "com.lovinfinity.oauth"

func main() {
	local := os.Getenv("LOCALAPPDATA")
	if local == "" { fail("Não foi possível localizar a pasta LocalAppData do Windows.") }
	root := filepath.Join(local, "LovInfinity")
	extDir := filepath.Join(root, "Extension")
	if err := os.MkdirAll(extDir, 0755); err != nil { fail("Não foi possível criar a pasta do LovInfinity: " + err.Error()) }
	if err := copyDir("payload", extDir); err != nil { fail("Não foi possível instalar os arquivos da extensão: " + err.Error()) }

	exeDst := filepath.Join(root, "LovInfinityHost.exe")
	// The native host may still be running when the installer is launched again.
	// Stop it before replacing the executable so Windows does not lock the file.
	_ = exec.Command("taskkill", "/F", "/T", "/IM", "LovInfinityHost.exe").Run()
	data, err := payloadFS.ReadFile("payload/LovInfinityHost.exe")
	if err != nil { fail("Componente local não encontrado no instalador.") }
	if err := os.WriteFile(exeDst, data, 0755); err != nil { fail("Não foi possível instalar o componente local: " + err.Error()) }

	manifestPath := filepath.Join(root, hostName+".json")
	manifest := map[string]any{
		"name": hostName,
		"description": "LovInfinity local OAuth helper",
		"path": exeDst,
		"type": "stdio",
		"allowed_origins": []string{"chrome-extension://" + extensionID + "/"},
	}
	b, _ := json.MarshalIndent(manifest, "", "  ")
	if err := os.WriteFile(manifestPath, b, 0644); err != nil { fail("Não foi possível criar a configuração do Chrome: " + err.Error()) }
	if err := registerNativeHost(manifestPath); err != nil { fail(err.Error()) }

	_ = exec.Command("cmd", "/c", "start", "", "chrome://extensions/").Run()
	_ = exec.Command("explorer.exe", extDir).Start()
	messageBox("LovInfinity instalado com sucesso.\n\nA pasta da extensão foi aberta no Explorer.\n\nNo Chrome, com o Modo do desenvolvedor ativado, clique em 'Carregar sem compactação' e selecione a pasta aberta.\n\nDepois disso, o LovInfinity estará pronto para usar.", "LovInfinity")
}

func registerNativeHost(manifestPath string) error {
	key := "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\" + hostName
	cmd := exec.Command("reg", "add", key, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.CombinedOutput()
	if err != nil { return fmt.Errorf("Não foi possível configurar o Native Messaging do Chrome: %s", strings.TrimSpace(string(out))) }
	return nil
}

func copyDir(src, dst string) error {
	entries, err := payloadFS.ReadDir(src)
	if err != nil { return err }
	for _, entry := range entries {
		if entry.Name() == ".keep" { continue }
		srcPath := path.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())
		if entry.IsDir() {
			if err := os.MkdirAll(dstPath, 0755); err != nil { return err }
			if err := copyDir(srcPath, dstPath); err != nil { return err }
			continue
		}
		data, err := payloadFS.ReadFile(srcPath)
		if err != nil { return err }
		if err := os.WriteFile(dstPath, data, 0644); err != nil { return err }
	}
	return nil
}

func messageBox(text, title string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	proc := user32.NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString(text)
	c, _ := syscall.UTF16PtrFromString(title)
	_, _, _ = proc.Call(0, uintptr(unsafe.Pointer(t)), uintptr(unsafe.Pointer(c)), 0x40)
}

func fail(text string) {
	messageBox(text, "LovInfinity")
	os.Exit(1)
}
