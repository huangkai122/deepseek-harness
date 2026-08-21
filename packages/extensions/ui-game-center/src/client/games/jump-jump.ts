/**
 * 跳一跳游戏 HTML 内容（像素风）
 * 作为字符串嵌入，通过 Blob URL 加载到 iframe
 */

export const GAME_ID = 'jump-jump'
export const GAME_NAME = '跳一跳'
export const GAME_ICON = '🦘'

/** 像素风封面图（SVG data URI） */
export const GAME_COVER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" shape-rendering="crispEdges"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1a1a3a"/><stop offset="0.5" stop-color="#1f1f42"/><stop offset="1" stop-color="#241f3a"/></linearGradient></defs><rect width="300" height="180" fill="url(#s)"/><rect x="24" y="22" width="3" height="3" fill="#fff" opacity="0.8"/><rect x="66" y="40" width="3" height="3" fill="#fff" opacity="0.5"/><rect x="120" y="18" width="2" height="2" fill="#fff" opacity="0.7"/><rect x="180" y="30" width="3" height="3" fill="#fff" opacity="0.6"/><rect x="240" y="14" width="2" height="2" fill="#fff" opacity="0.8"/><rect x="276" y="44" width="3" height="3" fill="#fff" opacity="0.5"/><rect x="48" y="66" width="2" height="2" fill="#fff" opacity="0.5"/><rect x="208" y="60" width="2" height="2" fill="#fff" opacity="0.6"/><rect x="256" y="80" width="2" height="2" fill="#fff" opacity="0.5"/><rect x="30" y="86" width="2" height="2" fill="#fff" opacity="0.5"/><rect x="12" y="115" width="60" height="50" fill="#4a2f1a"/><rect x="16" y="119" width="52" height="42" fill="#8b5a2b"/><rect x="16" y="119" width="52" height="6" fill="#a0522d"/><rect x="16" y="130" width="52" height="4" fill="#6b4423"/><rect x="16" y="139" width="52" height="4" fill="#6b4423"/><rect x="16" y="148" width="52" height="4" fill="#6b4423"/><rect x="38" y="124" width="8" height="30" fill="#4a2f1a"/><rect x="80" y="95" width="60" height="70" fill="#5c1a1a"/><rect x="84" y="99" width="52" height="62" fill="#b22222"/><rect x="84" y="99" width="52" height="6" fill="#cd5c5c"/><rect x="84" y="112" width="52" height="3" fill="#8b0000"/><rect x="84" y="122" width="52" height="3" fill="#8b0000"/><rect x="84" y="132" width="52" height="3" fill="#8b0000"/><rect x="84" y="142" width="52" height="3" fill="#8b0000"/><rect x="108" y="105" width="3" height="7" fill="#8b0000"/><rect x="96" y="115" width="3" height="7" fill="#8b0000"/><rect x="108" y="125" width="3" height="7" fill="#8b0000"/><rect x="96" y="135" width="3" height="7" fill="#8b0000"/><rect x="108" y="145" width="3" height="7" fill="#8b0000"/><rect x="150" y="105" width="60" height="60" fill="#4a2a0a"/><rect x="154" y="109" width="52" height="52" fill="#8b5a2b"/><rect x="154" y="109" width="52" height="16" fill="#228b22"/><rect x="154" y="109" width="52" height="7" fill="#32cd32"/><rect x="160" y="114" width="5" height="5" fill="#006400"/><rect x="176" y="114" width="5" height="5" fill="#006400"/><rect x="192" y="114" width="5" height="5" fill="#006400"/><rect x="154" y="130" width="52" height="4" fill="#6b4423"/><rect x="154" y="140" width="52" height="4" fill="#6b4423"/><rect x="154" y="150" width="52" height="4" fill="#6b4423"/><rect x="220" y="110" width="55" height="55" fill="#4a4a4a"/><rect x="224" y="114" width="47" height="47" fill="#808080"/><rect x="224" y="114" width="47" height="6" fill="#a9a9a9"/><rect x="230" y="126" width="10" height="4" fill="#696969"/><rect x="246" y="146" width="12" height="3" fill="#696969"/><rect x="136" y="52" width="24" height="24" fill="#3a1a00"/><rect x="139" y="55" width="18" height="18" fill="#ff9d3c"/><rect x="139" y="55" width="18" height="6" fill="#ffb45e"/><rect x="142" y="61" width="5" height="5" fill="#1a1a2e"/><rect x="151" y="61" width="5" height="5" fill="#1a1a2e"/><rect x="143" y="62" width="2" height="2" fill="#fff"/><rect x="152" y="62" width="2" height="2" fill="#fff"/><rect x="120" y="70" width="3" height="3" fill="#fff" opacity="0.4"/><rect x="126" y="62" width="3" height="3" fill="#fff" opacity="0.5"/><rect x="131" y="55" width="3" height="3" fill="#fff" opacity="0.6"/><rect x="150" y="105" width="20" height="3" fill="#000" opacity="0.25"/></svg>')

export const gameHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>跳一跳</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{background:#0f0f1f;overflow:hidden;touch-action:none;user-select:none}
canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.ui{position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:10}
.score{position:absolute;top:20px;left:50%;transform:translateX(-50%);font-family:'Courier New',monospace;font-size:44px;font-weight:900;color:#ffd75e;text-shadow:3px 3px 0 #7a4a00;opacity:0;transition:opacity .3s;letter-spacing:2px}
.score.show{opacity:1}
.combo{position:absolute;top:78px;left:50%;transform:translateX(-50%);font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#7cfc9b;text-shadow:2px 2px 0 #1a5c2a;opacity:0;transition:opacity .3s}
.combo.show{opacity:1}
.hud-best{position:absolute;top:100px;left:50%;transform:translateX(-50%);font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:#c89b4a;text-shadow:2px 2px 0 #5a3a00;opacity:0;transition:opacity .3s;letter-spacing:1px;white-space:nowrap}
.hud-best.show{opacity:1}
.hud-best.new-record{color:#7cfc9b;text-shadow:2px 2px 0 #1a5c2a;animation:celebrate .6s ease-in-out 3}
.start-best{font-family:'Courier New',monospace;font-size:16px;font-weight:700;color:#c89b4a;text-shadow:2px 2px 0 #5a3a00;margin-bottom:20px;letter-spacing:1px}
.start-best.none{color:#5a6a7a;text-shadow:none;font-weight:400;font-size:14px}
@keyframes celebrate{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.15)}}
.overlay{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,10,25,.92);pointer-events:auto;z-index:20}
.overlay.hide{display:none}
.title{font-family:'Courier New',monospace;font-size:40px;font-weight:900;color:#ffd75e;text-shadow:4px 4px 0 #7a4a00;margin-bottom:14px;letter-spacing:4px}
.sub{font-family:'Courier New',monospace;font-size:15px;color:#9db4c0;margin-bottom:32px;letter-spacing:1px}
.final{font-family:'Courier New',monospace;font-size:68px;font-weight:900;color:#7cfc9b;text-shadow:4px 4px 0 #1a5c2a;margin-bottom:10px}
.best{font-family:'Courier New',monospace;font-size:15px;color:#9db4c0;margin-bottom:30px}
.btn{padding:14px 40px;font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#1a1a2e;background:#ffd75e;border:3px solid #7a4a00;border-radius:0;cursor:pointer;pointer-events:auto;transition:transform .1s;box-shadow:4px 4px 0 #7a4a00;letter-spacing:2px}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #7a4a00}
.btn:active{transform:translate(2px,2px);box-shadow:2px 2px 0 #7a4a00}
.exit{position:absolute;top:16px;right:16px;padding:6px 14px;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#9db4c0;background:#1a1a2e;border:2px solid #3a4a5a;border-radius:0;cursor:pointer;pointer-events:auto;z-index:30}
.exit:hover{color:#ffd75e;border-color:#ffd75e}
.hint{position:absolute;bottom:70px;left:50%;transform:translateX(-50%);font-family:'Courier New',monospace;font-size:13px;color:#9db4c0;animation:pulse 2s infinite;letter-spacing:1px}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div class="ui">
<div id="score" class="score">0</div>
<div id="combo" class="combo"></div>
<div id="hud-best" class="hud-best"></div>
<button class="exit" onclick="exit()">✕ 退出</button>
<div id="start" class="overlay">
<div class="title">跳一跳</div>
<div class="sub">按住蓄力，松开跳跃</div>
<div id="start-best" class="start-best"></div>
<button class="btn" onclick="start()">开始游戏</button>
</div>
<div id="over" class="overlay hide">
<div class="title">游戏结束</div>
<div id="final" class="final">0</div>
<div id="best" class="best">最高分: 0</div>
<button class="btn" onclick="start()">再来一次</button>
</div>
<div id="hint" class="hint hide">按住蓄力，松开跳跃</div>
</div>
<script>
const C=document.getElementById('c'),X=C.getContext('2d');
X.imageSmoothingEnabled=false;
let W,H,state='menu',score=0,combo=0,best=+(localStorage.getItem('jj-best')||0);
if(best>0){document.getElementById('start-best').textContent='🏆 最高分: '+best}
else{document.getElementById('start-best').textContent='暂无记录';document.getElementById('start-best').classList.add('none')}
let cam={x:0,y:0,tx:0,ty:0};
let pl={x:0,y:0,vx:0,vy:0,w:26,h:26,sx:1,sy:1,charge:0,charging:false};
let pts=[],ci=0,parts=[],stars=[];

// 像素风平台类型
const PTYPES=[
 {type:'wood', w:70,h:46},
 {type:'stone', w:60,h:38},
 {type:'brick', w:82,h:58},
 {type:'grass', w:68,h:44},
 {type:'ice', w:62,h:36}
];

function resize(){W=C.width=innerWidth;H=C.height=innerHeight;makeStars()}
addEventListener('resize',resize);resize();

function makeStars(){stars=[];for(let i=0;i<60;i++)stars.push({x:Math.random()*2000,y:Math.random()*1200,s:1+Math.floor(Math.random()*2)})}

function start(){
state='playing';score=0;combo=0;parts=[];
pl.x=W/2;pl.y=H*.6;pl.vx=0;pl.vy=0;pl.sx=1;pl.sy=1;pl.charge=0;pl.charging=false;
pts=[];genInit();
pl.x=pts[0].x;pl.y=pts[0].y-pl.h/2;ci=0;
cam.x=pl.x-W/2;cam.y=pl.y-H*.6;cam.tx=cam.x;cam.ty=cam.y;
updScore();
document.getElementById('start').classList.add('hide');
document.getElementById('over').classList.add('hide');
document.getElementById('score').classList.add('show');
document.getElementById('hint').classList.remove('hide');
updBestHUD();
}

function genInit(){
pts.push({x:W/2,y:H*.6,w:90,h:50,type:'grass'});
for(let i=0;i<5;i++)genNext();
}

function genNext(){
const l=pts[pts.length-1];
const gap=90+Math.random()*110;
const dy=20+Math.random()*30;
const t=PTYPES[Math.floor(Math.random()*PTYPES.length)];
pts.push({x:l.x+gap,y:l.y-dy,w:t.w,h:t.h,type:t.type});
}

function dn(e){e.preventDefault();if(state!=='playing')return;pl.charging=true;pl.charge=0;document.getElementById('hint').classList.add('hide')}
function up(e){e.preventDefault();if(!pl.charging||state!=='playing')return;pl.charging=false;
if(pl.charge<8){return}
const p=Math.min(pl.charge*.02,1);
pl.vx=1.5+p*8;
pl.vy=-8;
pl.sx=.75;pl.sy=1.25;
state='jumping';jumpP(pl.x,pl.y+pl.h/2)}

C.addEventListener('mousedown',dn);C.addEventListener('mouseup',up);
C.addEventListener('touchstart',dn,{passive:false});C.addEventListener('touchend',up,{passive:false});

function loop(){update();render();requestAnimationFrame(loop)}
requestAnimationFrame(loop);

function update(){
if(state==='playing'){
if(pl.charging){pl.charge++;const s=Math.min(pl.charge*.02*.4,.4);pl.sx=1+s*.4;pl.sy=1-s}
}else if(state==='jumping'){
pl.vy+=.5;pl.x+=pl.vx;pl.y+=pl.vy;
if(pl.vy<0){pl.sx=.85;pl.sy=1.15}else{pl.sx=1.1;pl.sy=.9}
checkLand();
if(pl.y>cam.y+H+120)gameOver();
}else if(state==='landing'){
pl.sx+=(1-pl.sx)*.15;pl.sy+=(1-pl.sy)*.15;
if(Math.abs(pl.sx-1)<.01){pl.sx=1;pl.sy=1;state='playing';document.getElementById('hint').classList.remove('hide')}
}
cam.tx=pl.x-W/2;cam.ty=pl.y-H*.6;
cam.x+=(cam.tx-cam.x)*.08;cam.y+=(cam.ty-cam.y)*.08;
for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.1;p.life-=p.decay;if(p.life<=0)parts.splice(i,1)}
}

function checkLand(){
const ni=ci+1;if(ni>=pts.length)return;
const pt=pts[ni];
const pb=pl.y+pl.h/2,pc=pl.x;
if(pb>=pt.y-16&&pb<=pt.y+16&&pc>=pt.x-pt.w/2-8&&pc<=pt.x+pt.w/2+8&&pl.vy>0){
pl.y=pt.y-pl.h/2;pl.vx=0;pl.vy=0;ci=ni;
pl.sx=1.25;pl.sy=.75;state='landing';
const d=Math.abs(pc-pt.x);
if(d<14){combo++;score+=2+Math.floor(combo*.5);ctrP(pt.x,pt.y);if(combo>1)showCombo(combo)}
else{combo=0;score++}
landP(pl.x,pl.y+pl.h/2);updScore();genNext();
if(ci>3){pts.splice(0,1);ci--}}
}

function gameOver(){
state='gameover';
if(score>best){best=score;localStorage.setItem('jj-best',best)}
document.getElementById('final').textContent=score;
document.getElementById('best').textContent='最高分: '+best;
document.getElementById('over').classList.remove('hide');
document.getElementById('score').classList.remove('show');
document.getElementById('combo').classList.remove('show');
document.getElementById('hud-best').classList.remove('show');
window.parent.postMessage({type:'game-over',score,best},'*');
}

function exit(){window.parent.postMessage({type:'game-exit'},'*')}

function jumpP(x,y){for(let i=0;i<8;i++)parts.push({x,y,vx:(Math.random()-.5)*4,vy:Math.random()*-3-1,s:Math.random()*4+2,c:'#ffd75e',life:1,decay:.03+Math.random()*.02})}
function landP(x,y){for(let i=0;i<10;i++)parts.push({x,y,vx:(Math.random()-.5)*6,vy:Math.random()*-4-2,s:Math.random()*5+2,c:'#c8b46a',life:1,decay:.02+Math.random()*.02})}
function ctrP(x,y){for(let i=0;i<15;i++){const a=Math.PI*2/15*i;parts.push({x,y,vx:Math.cos(a)*(3+Math.random()*3),vy:Math.sin(a)*(3+Math.random()*3),s:Math.random()*5+3,c:['#7cfc9b','#ffd75e','#7cd4fc'][i%3],life:1,decay:.015+Math.random()*.01})}}

function render(){
// 像素天空渐变
const sky=X.createLinearGradient(0,0,0,H);
sky.addColorStop(0,'#1a1a3a');sky.addColorStop(.5,'#1f1f42');sky.addColorStop(1,'#241f3a');
X.fillStyle=sky;X.fillRect(0,0,W,H);
X.save();X.translate(-cam.x,-cam.y);
// 像素星星
X.fillStyle='#ffffff';
stars.forEach(st=>{X.globalAlpha=.3+((st.x*7)%10)/20;X.fillRect(st.x,st.y,st.s,st.s)});
X.globalAlpha=1;
// 平台
pts.forEach(p=>drawPlatform(p));
// 玩家
drawPlayer();
// 粒子
parts.forEach(p=>{X.globalAlpha=p.life;X.fillStyle=p.c;X.fillRect(p.x,p.y,p.s,p.s)});
X.globalAlpha=1;X.restore();
}

function drawPlatform(p){
const x=p.x-p.w/2,y=p.y,w=p.w,h=p.h;
// 阴影
X.fillStyle='rgba(0,0,0,.3)';X.fillRect(x+4,y+5,w,h);
if(p.type==='wood'){drawWood(x,y,w,h)}
else if(p.type==='stone'){drawStone(x,y,w,h)}
else if(p.type==='brick'){drawBrick(x,y,w,h)}
else if(p.type==='grass'){drawGrass(x,y,w,h)}
else{drawIce(x,y,w,h)}
}

function drawWood(x,y,w,h){
X.fillStyle='#4a2f1a';X.fillRect(x,y,w,h);
X.fillStyle='#8b5a2b';X.fillRect(x+3,y+3,w-6,h-6);
X.fillStyle='#6b4423';
for(let i=8;i<h-3;i+=10)X.fillRect(x+3,y+i,w-6,3);
X.strokeStyle='#4a2f1a';X.lineWidth=4;
X.beginPath();X.moveTo(x+5,y+5);X.lineTo(x+w-5,y+h-5);X.stroke();
X.beginPath();X.moveTo(x+w-5,y+5);X.lineTo(x+5,y+h-5);X.stroke();
X.fillStyle='#a0522d';X.fillRect(x+3,y+3,w-6,4);
}

function drawStone(x,y,w,h){
X.fillStyle='#4a4a4a';X.fillRect(x,y,w,h);
X.fillStyle='#808080';X.fillRect(x+3,y+3,w-6,h-6);
X.fillStyle='#696969';
X.fillRect(x+6,y+10,w-14,4);
X.fillRect(x+10,y+h-12,w-16,3);
X.fillStyle='#a9a9a9';X.fillRect(x+3,y+3,w-6,4);
X.fillStyle='#5a5a5a';X.fillRect(x+4,y+5,4,4);X.fillRect(x+w-8,y+8,4,4);
}

function drawBrick(x,y,w,h){
X.fillStyle='#5c1a1a';X.fillRect(x,y,w,h);
X.fillStyle='#b22222';X.fillRect(x+3,y+3,w-6,h-6);
X.fillStyle='#8b0000';
const bh=8;
for(let r=0;r<Math.floor((h-6)/bh);r++){
const ry=y+3+r*bh;
X.fillRect(x+3,ry,w-6,2);
const off=(r%2)*12;
for(let bx=x+3+off;bx<x+w-6;bx+=24)X.fillRect(bx,ry,2,bh);
}
X.fillStyle='#cd5c5c';X.fillRect(x+3,y+3,w-6,4);
}

function drawGrass(x,y,w,h){
X.fillStyle='#4a2a0a';X.fillRect(x,y,w,h);
X.fillStyle='#8b5a2b';X.fillRect(x+3,y+3,w-6,h-6);
X.fillStyle='#6b4423';
for(let i=12;i<h-3;i+=10)X.fillRect(x+3,y+i,w-6,3);
X.fillStyle='#228b22';X.fillRect(x+3,y+3,w-6,12);
X.fillStyle='#32cd32';X.fillRect(x+3,y+3,w-6,5);
X.fillStyle='#006400';
for(let gx=x+5;gx<x+w-6;gx+=10)X.fillRect(gx,y+8,3,3);
}

function drawIce(x,y,w,h){
X.fillStyle='#1a4a5a';X.fillRect(x,y,w,h);
X.fillStyle='#87ceeb';X.fillRect(x+3,y+3,w-6,h-6);
X.fillStyle='#5aaed0';X.fillRect(x+5,y+h-8,w-10,4);
X.fillStyle='#e0f7ff';X.fillRect(x+3,y+3,w-6,4);X.fillRect(x+6,y+8,5,5);
X.fillStyle='#ffffff';X.fillRect(x+w-12,y+6,3,3);
}

function drawPlayer(){
X.save();X.translate(pl.x,pl.y);X.scale(pl.sx,pl.sy);
// 影子
X.fillStyle='rgba(0,0,0,.35)';X.fillRect(-pl.w/2+3,pl.h/2+2,pl.w-6,4);
// 身体（像素方块小人）
const x=-pl.w/2,y=-pl.h/2,w=pl.w,h=pl.h;
X.fillStyle='#3a1a00';X.fillRect(x,y,w,h);
X.fillStyle='#ff9d3c';X.fillRect(x+3,y+3,w-6,h-6);
X.fillStyle='#ffb45e';X.fillRect(x+3,y+3,w-6,5);
// 像素眼睛
X.fillStyle='#1a1a2e';X.fillRect(x+5,y+8,5,5);X.fillRect(x+w-10,y+8,5,5);
X.fillStyle='#ffffff';X.fillRect(x+6,y+9,2,2);X.fillRect(x+w-9,y+9,2,2);
// 蓄力条
if(pl.charging){
const p=Math.min(pl.charge*.02,1),bw=36,bh=6,bx=-bw/2,by=-pl.h/2-14;
X.fillStyle='#1a1a2e';X.fillRect(bx-2,by-2,bw+4,bh+4);
X.fillStyle=p<.5?'#7cfc9b':p<.85?'#ffd75e':'#ff6b6b';
X.fillRect(bx,by,Math.floor(bw*p),bh);
}
X.restore();
}

function updScore(){document.getElementById('score').textContent=score;updBestHUD()}
function updBestHUD(){
const el=document.getElementById('hud-best');
if(best>0){el.textContent='🏆 最高分: '+best;el.classList.add('show')}
if(score>best&&best>0){el.textContent='🆕 新纪录!';el.classList.add('new-record')}
else{el.classList.remove('new-record')}
}
function showCombo(n){const e=document.getElementById('combo');e.textContent=n+' 连击!';e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1500)}

window.parent.postMessage({type:'game-ready',gameId:'jump-jump'},'*');
</script>
</body>
</html>`
