package main

import (
 "encoding/binary"
 "encoding/json"
 "fmt"
 "io"
 "net/http"
 "os"
 "time"
)

const port=8765
const callback="https://expxqynyrafienedsmuw.supabase.co/functions/v1/connections?action=lovable_callback"

type Msg struct{Action string `json:"action"`}
type Resp struct{Ok bool `json:"ok"`;Error string `json:"error,omitempty"`;Port int `json:"port,omitempty"`}

func writeNative(v any) error{
 b,e:=json.Marshal(v);if e!=nil{return e}
 var h [4]byte;binary.LittleEndian.PutUint32(h[:],uint32(len(b)))
 if _,e=os.Stdout.Write(h[:]);e!=nil{return e};_,e=os.Stdout.Write(b);return e
}
func readNative()([]byte,error){
 var h [4]byte;if _,e:=io.ReadFull(os.Stdin,h[:]);e!=nil{return nil,e}
 n:=binary.LittleEndian.Uint32(h[:]);if n>1<<20{return nil,fmt.Errorf("message too large")}
 b:=make([]byte,n);_,e:=io.ReadFull(os.Stdin,b);return b,e
}
func startServer(){
 mux:=http.NewServeMux()
 mux.HandleFunc("/callback",func(w http.ResponseWriter,r *http.Request){
  target:=callback;if r.URL.RawQuery!=""{target+="&"+r.URL.RawQuery};http.Redirect(w,r,target,http.StatusFound)
 })
 mux.HandleFunc("/health",func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("Content-Type","application/json");_,_=w.Write([]byte(`{"ok":true}`))
 })
 go func(){_ = (&http.Server{Addr:fmt.Sprintf("127.0.0.1:%d",port),Handler:mux,ReadHeaderTimeout:5*time.Second}).ListenAndServe()}()
}
func main(){
 b,e:=readNative();if e!=nil{return}
 var m Msg;_=json.Unmarshal(b,&m)
 if m.Action=="ensure_server"||m.Action==""{
  startServer()
  time.Sleep(100*time.Millisecond)
  _=writeNative(Resp{Ok:true,Port:port})
  for{if _,e:=readNative();e!=nil{return}}
 }
 _=writeNative(Resp{Ok:false,Error:"unknown_action"})
}
