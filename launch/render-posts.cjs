const { chromium } = require('playwright');
const fs=require('fs');const G='';const D=f=>'data:image/png;base64,'+fs.readFileSync('/home/user/filemite/launch/gallery/'+f).toString('base64');
const slides=[
 ['01-hero','25 tools for images & PDFs','Free. No sign-up. Nothing stored.','01-home.png','#f97316'],
 ['02-private','Your PDFs never leave your device','Merge, split, sign and redact run in your browser.','05-pdf-sign.png','#2563eb'],
 ['03-compress','Shrink images without the wait','PNG, JPEG, WebP, HEIC — batches of 10.','03-image-compress.png','#f97316'],
 ['04-merge','Merge PDFs in seconds','Drag to reorder. Bookmarks kept.','04-pdf-merge.png','#2563eb'],
 ['05-beautify','Make screenshots look good','Gradient, padding, shadow, window bar.','06-screenshot-beautifier.png','#a855f7'],
];
const html=(t,s,img,c,w,h,sq)=>`<html><body style="margin:0;width:${w}px;height:${h}px;background:linear-gradient(135deg,#faf7f2,${c}33);font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;overflow:hidden">
<div style="padding:${sq?70:44}px 40px 0;text-align:center"><div style="font:600 18px monospace;letter-spacing:3px;color:${c}">FILEMITE.COM</div>
<h1 style="font-size:${sq?64:52}px;margin:12px 0 8px;color:#1c1917;letter-spacing:-1.5px;line-height:1.05">${t}</h1>
<p style="font-size:${sq?28:24}px;margin:0;color:#57534e">${s}</p></div>
<img src="${D(img)}" style="margin-top:${sq?50:34}px;width:${sq?88:80}%;border-radius:16px;border:3px solid #1c1917;box-shadow:12px 12px 0 #1c1917"></body></html>`;
(async()=>{const b=await chromium.launch();
for(const [n,t,s,img,c] of slides){
 for(const [suf,w,h,sq] of [['ph',1270,760,0],['square',1080,1080,1]]){
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2});
  await p.setContent(html(t,s,img,c,w,h,sq),{waitUntil:'load'});
  await p.screenshot({path:`/home/user/filemite/launch/post/${n}-${suf}.png`});await p.close();}}
await b.close();})();
