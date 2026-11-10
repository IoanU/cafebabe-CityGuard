const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../build'),prefix='/cafebabe-CityGuard/';
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith(prefix)){res.writeHead(404);return res.end();}
  const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(e,data)=>{
    if(e){res.writeHead(404);return res.end();}
    const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);
  });
}).listen(4173,'127.0.0.1');
