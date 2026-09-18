package main

import (
 "bytes"
 "encoding/binary"
 "encoding/json"
 "fmt"
 "io"
 "net/http"
 "os"
 "os/exec"
 "path/filepath"
 "strings"
 "time"
)

const port=8765
const callback="https://expxqynyrafienedsmuw.supabase.co/functions/v1/connections?action=lovable_callback"

type Msg struct{Action string `json:"action"`; Prompt string `json:"prompt,omitempty"`}
type Resp struct{Ok bool `json:"ok"`;Error string `json:"error,omitempty"`;Port int `json:"port,omitempty"`;Output string `json:"output,omitempty"`;Installed bool `json:"installed,omitempty"`}

func writeNative(v any) error{b,e:=json.Marshal(v);if e!=nil{return e};var h [4]byte;binary.LittleEndian.PutUint32(h[:],uint32(len(b)));if _,e=os.Stdout.Write(h[:]);e!=nil{return e};_,e=os.Stdout.Write(b);return e}
func readNative()([]byte,error){var h [4]byte;if _,e:=io.ReadFull(os.Stdin,h[:]);e!=nil{return nil,e};n:=binary.LittleEndian.Uint32(h[:]);if n>4<<20{return nil,fmt.Errorf("message too large")};b:=make([]byte,n);_,e:=io.ReadFull(os.Stdin,b);return b,e}
func startServer(){mux:=http.NewServeMux();mux.HandleFunc("/callback",func(w http.ResponseWriter,r *http.Request){target:=callback;if r.URL.RawQuery!=""{target+="&"+r.URL.RawQuery};http.Redirect(w,r,target,http.StatusFound)});mux.HandleFunc("/health",func(w http.ResponseWriter,r *http.Request){w.Header().Set("Content-Type","application/json");_,_=w.Write([]byte(`{"ok":true}`))});go func(){_ = (&http.Server{Addr:fmt.Sprintf("127.0.0.1:%d",port),Handler:mux,ReadHeaderTimeout:5*time.Second}).ListenAndServe()}()}
func codexPath() string{if p,e:=exec.LookPath("codex");e==nil{return p};if p,e:=exec.LookPath("codex.exe");e==nil{return p};candidates:=[]string{filepath.Join(os.Getenv("LOCALAPPDATA"),"Programs","OpenAI","Codex","bin","codex.exe"),filepath.Join(os.Getenv("USERPROFILE"),".local","bin","codex.exe")};for _,p:=range candidates{if _,e:=os.Stat(p);e==nil{return p}};return ""}
func installCodex() error{if codexPath()!=""{return nil};ps:=`$env:CODEX_NON_INTERACTIVE="1"; irm https://chatgpt.com/codex/install.ps1 | iex`;cmd:=exec.Command("powershell.exe","-NoProfile","-ExecutionPolicy","Bypass","-Command",ps);var out bytes.Buffer;cmd.Stdout=&out;cmd.Stderr=&out;if e:=cmd.Run();e!=nil{return fmt.Errorf("codex_install_failed: %v %s",e,strings.TrimSpace(out.String()))};if codexPath()==""{return fmt.Errorf("codex_installed_but_not_found")};return nil}
func runCmd(bin string,args ...string)(string,error){cmd:=exec.Command(bin,args...);var out bytes.Buffer;cmd.Stdout=&out;cmd.Stderr=&out;e:=cmd.Run();s:=strings.TrimSpace(out.String());if e!=nil{return s,fmt.Errorf("%v%s",e,func()string{if s!=""{return ": "+s};return ""}())};return s,nil}
func ensureMcp(c string) error{list,err:=runCmd(c,"mcp","list");if err!=nil{return err};if !strings.Contains(list,"github"){if _,err=runCmd(c,"mcp","add","github","--url","https://api.githubcopilot.com/mcp/");err!=nil{return err}};if !strings.Contains(list,"lovable"){if _,err=runCmd(c,"mcp","add","lovable","--url","https://mcp.lovable.dev/");err!=nil{return err}};return nil}
func startLogin(c string,kind string) error{if err:=ensureMcp(c);err!=nil{return err};var cmd *exec.Cmd;if kind=="chatgpt"{cmd=exec.Command(c,"login")}else{cmd=exec.Command(c,"mcp","login",kind)};if err:=cmd.Start();err!=nil{return err};return nil}
func runCodex(prompt string)(string,error){c:=codexPath();if c==""{if err:=installCodex();err!=nil{return "",err};c=codexPath()};if err:=ensureMcp(c);err!=nil{return "",err};finalPrompt:=`You are LovInfinity, an AI coding agent authenticated through the user's ChatGPT/Codex subscription. Work only on accounts and repositories the user authorized through the MCP servers.

For coding requests: use the GitHub MCP server to discover the relevant repository, inspect the existing files before editing, make the requested changes directly, and verify the result. Do not merely describe a patch when the user asked you to implement it.

After a successful GitHub change, if a Lovable project is specified in the user context, use the Lovable MCP server to update/rebuild that project so its preview reflects the GitHub changes. The required sequence is GitHub change/commit first, then Lovable preview update.

Never claim that a change, commit, or preview update happened unless the corresponding MCP tool actually succeeded. Keep the final response concise and state what was actually completed.

USER REQUEST:
`+prompt;cmd:=exec.Command(c,"exec","--sandbox","danger-full-access","--skip-git-repo-check","--ephemeral",finalPrompt);var out bytes.Buffer;cmd.Stdout=&out;cmd.Stderr=&out;err:=cmd.Run();s:=strings.TrimSpace(out.String());if err!=nil{return s,fmt.Errorf("codex_error: %v%s",err,func()string{if s!=""{return ": "+s};return ""}())};return s,nil}
func main(){b,e:=readNative();if e!=nil{return};var m Msg;_=json.Unmarshal(b,&m);if m.Action=="ensure_server"||m.Action==""{startServer();time.Sleep(100*time.Millisecond);_=writeNative(Resp{Ok:true,Port:port});for{b,e=readNative();if e!=nil{return};var x Msg;if json.Unmarshal(b,&x)!=nil{_=writeNative(Resp{Ok:false,Error:"invalid_message"});continue};switch x.Action{case "codex_status":c:=codexPath();if c==""{_=writeNative(Resp{Ok:false,Error:"codex_not_installed"});continue};out,err:=runCmd(c,"login","status");if err!=nil{_=writeNative(Resp{Ok:false,Error:err.Error(),Output:out})}else{_=writeNative(Resp{Ok:true,Output:out})}
case "codex_install":err:=installCodex();if err!=nil{_=writeNative(Resp{Ok:false,Error:err.Error()})}else{_=writeNative(Resp{Ok:true,Installed:true})}
case "codex_login":c:=codexPath();if c==""{if err:=installCodex();err!=nil{_=writeNative(Resp{Ok:false,Error:err.Error()});continue};c=codexPath()};if err:=startLogin(c,"chatgpt");err!=nil{_=writeNative(Resp{Ok:false,Error:err.Error()})}else{_=writeNative(Resp{Ok:true,Output:"login_started"})}
case "codex_mcp_login":c:=codexPath();if c==""{_=writeNative(Resp{Ok:false,Error:"codex_not_installed"});continue};kind:=x.Prompt;if kind!="github"&&kind!="lovable"{_=writeNative(Resp{Ok:false,Error:"invalid_mcp_provider"});continue};if err:=startLogin(c,kind);err!=nil{_=writeNative(Resp{Ok:false,Error:err.Error()})}else{_=writeNative(Resp{Ok:true,Output:kind+"_login_started"})}
case "run_codex":if strings.TrimSpace(x.Prompt)==""{_=writeNative(Resp{Ok:false,Error:"missing_prompt"});continue};out,err:=runCodex(x.Prompt);if err!=nil{_=writeNative(Resp{Ok:false,Error:err.Error(),Output:out})}else{_=writeNative(Resp{Ok:true,Output:out})}
default:_=writeNative(Resp{Ok:false,Error:"unknown_action"})}}};_=writeNative(Resp{Ok:false,Error:"unknown_action"})}
