/**
 * 坦克大战游戏 HTML 内容（像素风）
 * 作为字符串嵌入，通过 Blob URL 加载到 iframe
 * 经典坦克大战，带音效
 */

export const GAME_ID = 'battle-city'
export const GAME_NAME = '坦克大战'
export const GAME_ICON = '🎮'

/** 像素风封面图（SVG data URI） */
export const GAME_COVER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" shape-rendering="crispEdges"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1a1a2e"/><stop offset="0.5" stop-color="#16213e"/><stop offset="1" stop-color="#0f3460"/></linearGradient></defs><rect width="300" height="180" fill="url(#s)"/><rect x="24" y="22" width="3" height="3" fill="#fff" opacity="0.8"/><rect x="66" y="40" width="3" height="3" fill="#fff" opacity="0.5"/><rect x="120" y="18" width="2" height="2" fill="#fff" opacity="0.7"/><rect x="180" y="30" width="3" height="3" fill="#fff" opacity="0.6"/><rect x="240" y="14" width="2" height="2" fill="#fff" opacity="0.8"/><rect x="276" y="44" width="3" height="3" fill="#fff" opacity="0.5"/><rect x="48" y="66" width="2" height="2" fill="#fff" opacity="0.5"/><rect x="208" y="60" width="2" height="2" fill="#fff" opacity="0.6"/><rect x="256" y="80" width="2" height="2" fill="#fff" opacity="0.5"/><rect x="30" y="86" width="2" height="2" fill="#fff" opacity="0.5"/><rect x="100" y="60" width="100" height="60" fill="#555"/><rect x="110" y="65" width="80" height="50" fill="#777"/><rect x="140" y="55" width="20" height="10" fill="#888"/><rect x="120" y="75" width="40" height="20" fill="#666"/><rect x="130" y="80" width="20" height="10" fill="#999"/></svg>')

export const gameHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>坦克大战</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{background:#111;overflow:hidden;touch-action:none;user-select:none}
canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges;position:absolute;top:0;left:0}
.ui{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10}
.hud{position:absolute;top:10px;left:10px;font-family:'Courier New',monospace;font-size:16px;color:#fff;text-shadow:2px 2px 0 #000;display:flex;gap:20px}
.lives{position:absolute;top:10px;right:10px;font-family:'Courier New',monospace;font-size:16px;color:#ffcc00;text-shadow:2px 2px 0 #000}
.overlay{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.88);pointer-events:auto;z-index:20}
.overlay.hide{display:none}
.title{font-family:'Courier New',monospace;font-size:40px;font-weight:900;color:#ffcc00;text-shadow:4px 4px 0 #aa6600;margin-bottom:14px;letter-spacing:4px}
.sub{font-family:'Courier New',monospace;font-size:15px;color:#9db4c0;margin-bottom:32px;letter-spacing:1px}
.final{font-family:'Courier New',monospace;font-size:68px;font-weight:900;color:#ff6600;text-shadow:4px 4px 0 #aa3300;margin-bottom:10px}
.best{font-family:'Courier New',monospace;font-size:15px;color:#9db4c0;margin-bottom:30px}
.stats{font-family:'Courier New',monospace;font-size:13px;color:#aaa;margin-bottom:20px;display:flex;gap:20px}
.btn{padding:14px 40px;font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#000;background:#ffcc00;border:3px solid #aa6600;border-radius:0;cursor:pointer;pointer-events:auto;transition:transform .1s;box-shadow:4px 4px 0 #aa6600;letter-spacing:2px}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #aa6600}
.btn:active{transform:translate(2px,2px);box-shadow:2px 2px 0 #aa6600}
.exit{position:absolute;top:16px;right:16px;padding:6px 14px;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#9db4c0;background:#1a1a2e;border:2px solid #3a4a5a;border-radius:0;cursor:pointer;pointer-events:auto;z-index:30}
.exit:hover{color:#ffcc00;border-color:#ffcc00}
.controls{position:absolute;bottom:20px;right:20px;display:grid;grid-template-columns:60px 60px 60px;grid-template-rows:60px 60px 60px;gap:4px;pointer-events:auto}
.ctrl-btn{width:60px;height:60px;font-size:24px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.25);border-radius:8px;color:#fff;cursor:pointer;-webkit-user-select:none;user-select:none}
.ctrl-btn:active{background:rgba(255,255,255,0.35)}
.ctrl-fire{background:rgba(255,100,0,0.25);border-color:rgba(255,100,0,0.5)}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div class="ui">
<div class="hud">
<span id="score">得分: 0</span>
<span id="level">关卡: 1</span>
</div>
<div id="lives" class="lives">❤️ 3</div>
<button class="exit" onclick="exit()">✕ 退出</button>
<div id="start" class="overlay">
<div class="title">坦克大战</div>
<div class="sub">WASD移动 · 空格射击</div>
<div class="stats">
<span id="stat-games">游戏次数: 0</span>
<span id="stat-kills">消灭坦克: 0</span>
</div>
<button class="btn" onclick="start()">开始游戏</button>
</div>
<div id="over" class="overlay hide">
<div class="title">游戏结束</div>
<div id="final" class="final">0</div>
<div id="best" class="best">最高分: 0</div>
<div class="stats">
<span id="over-kills">消灭坦克: 0</span>
<span id="over-level">到达关卡: 1</span>
</div>
<button class="btn" onclick="start()">再来一次</button>
</div>
<div id="next" class="overlay hide">
<div class="title">关卡通过！</div>
<div id="next-score" class="final">0</div>
<button class="btn" onclick="nextLevel()">下一关</button>
</div>
<div class="controls">
<div></div>
<div class="ctrl-btn" ontouchstart="handleCtrl(0,-1);return false" onmousedown="handleCtrl(0,-1)">↑</div>
<div></div>
<div class="ctrl-btn" ontouchstart="handleCtrl(-1,0);return false" onmousedown="handleCtrl(-1,0)">←</div>
<div class="ctrl-btn ctrl-fire" ontouchstart="handleFire();return false" onmousedown="handleFire()">🔥</div>
<div class="ctrl-btn" ontouchstart="handleCtrl(1,0);return false" onmousedown="handleCtrl(1,0)">→</div>
<div></div>
<div class="ctrl-btn" ontouchstart="handleCtrl(0,1);return false" onmousedown="handleCtrl(0,1)">↓</div>
<div></div>
</div>
</div>
<script>
// === Canvas Setup ===
const C=document.getElementById('c'),X=C.getContext('2d');
X.imageSmoothingEnabled=false;

// Game world size (fixed)
const GW=13,GH=13,TS=32; // grid 13x13, tile 32px
const WORLD_W=GW*TS,WORLD_H=GH*TS; // 416x416

// Screen scale
let scale=1,offX=0,offY=0;

function resize(){
C.width=innerWidth;C.height=innerHeight;
scale=Math.min(C.width/WORLD_W,C.height/WORLD_H);
offX=(C.width-WORLD_W*scale)/2;
offY=(C.height-WORLD_H*scale)/2;
}
addEventListener('resize',resize);resize();

// === Audio ===
const AudioCtx=window.AudioContext||window.webkitAudioContext;
let audioCtx=null;

function initAudio(){
try{if(!audioCtx)audioCtx=new AudioCtx()}catch(e){}
}

function playSound(type){
if(!audioCtx)return;
try{
const t=audioCtx.currentTime;
const o=audioCtx.createOscillator();
const g=audioCtx.createGain();
o.connect(g);g.connect(audioCtx.destination);
switch(type){
case 'shoot':
  o.frequency.setValueAtTime(800,t);o.frequency.exponentialRampToValueAtTime(200,t+0.1);
  g.gain.setValueAtTime(0.3,t);g.gain.exponentialRampToValueAtTime(0.01,t+0.1);
  o.start(t);o.stop(t+0.1);break;
case 'hit':
  o.frequency.setValueAtTime(100,t);o.frequency.exponentialRampToValueAtTime(50,t+0.15);
  g.gain.setValueAtTime(0.25,t);g.gain.exponentialRampToValueAtTime(0.01,t+0.15);
  o.start(t);o.stop(t+0.15);break;
case 'explode':
  o.type='sawtooth';
  o.frequency.setValueAtTime(200,t);o.frequency.exponentialRampToValueAtTime(30,t+0.4);
  g.gain.setValueAtTime(0.4,t);g.gain.exponentialRampToValueAtTime(0.01,t+0.4);
  o.start(t);o.stop(t+0.4);break;
case 'gameover':
  o.type='sawtooth';
  o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(50,t+0.8);
  g.gain.setValueAtTime(0.35,t);g.gain.exponentialRampToValueAtTime(0.01,t+0.8);
  o.start(t);o.stop(t+0.8);break;
case 'levelup':
  o.frequency.setValueAtTime(500,t);o.frequency.linearRampToValueAtTime(900,t+0.15);
  o.frequency.linearRampToValueAtTime(500,t+0.3);o.frequency.linearRampToValueAtTime(900,t+0.45);
  g.gain.setValueAtTime(0.3,t);g.gain.exponentialRampToValueAtTime(0.01,t+0.5);
  o.start(t);o.stop(t+0.5);break;
}
}catch(e){}
}

// === Storage ===
const SK='battle-city-v2';
const def={best:0,games:0,kills:0};
function loadD(){try{const s=localStorage.getItem(SK);if(s)return{...def,...JSON.parse(s)}}catch(e){}return{...def}}
function saveD(d){try{localStorage.setItem(SK,JSON.stringify(d))}catch(e){}}
let D=loadD();

function showStats(){
document.getElementById('stat-games').textContent='游戏次数: '+D.games;
document.getElementById('stat-kills').textContent='消灭坦克: '+D.kills;
}
showStats();

// === Game State ===
let state='menu',score=0,lives=3,level=1,kills=0;
let map=[],player=null,enemies=[],bullets=[],explosions=[];

// === Input ===
const keys={};
let moveDir=null;

document.addEventListener('keydown',e=>{
keys[e.key]=true;
if(state!=='playing')return;
if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){moveDir={x:0,y:-1};e.preventDefault()}
if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){moveDir={x:0,y:1};e.preventDefault()}
if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){moveDir={x:-1,y:0};e.preventDefault()}
if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){moveDir={x:1,y:0};e.preventDefault()}
if(e.key===' '){playerShoot();e.preventDefault()}
});
document.addEventListener('keyup',e=>{keys[e.key]=false});

function handleCtrl(dx,dy){
if(state!=='playing')return;
moveDir={x:dx,y:dy};
}
function handleFire(){
if(state!=='playing')return;
playerShoot();
}

function playerShoot(){
if(!player||!player.alive||player.cooldown>0)return;
bullets.push({x:player.x+TS/2-3,y:player.y+TS/2-3,dx:player.dir.x*5,dy:player.dir.y*5,isPlayer:true});
player.cooldown=20;
playSound('shoot');
}

// === Map ===
function genMap(){
map=[];
for(let y=0;y<GH;y++){
map[y]=[];
for(let x=0;x<GW;x++){
if(x===0||x===GW-1||y===0||y===GH-1)map[y][x]=2; // steel wall
else if(Math.random()<0.28)map[y][x]=1; // brick
else map[y][x]=0;
}
}
// clear around spawn
map[GH-2][6]=0;map[GH-3][6]=0;map[GH-2][5]=0;map[GH-2][7]=0;
// clear enemy spawns
map[1][1]=0;map[1][5]=0;map[1][9]=0;
// clear base area
const bx=Math.floor(GW/2);
map[GH-2][bx]=0;map[GH-2][bx-1]=0;map[GH-2][bx+1]=0;
map[GH-3][bx]=0;map[GH-3][bx-1]=0;map[GH-3][bx+1]=0;
}

function drawMap(){
for(let y=0;y<GH;y++){
for(let x=0;x<GW;x++){
const px=x*TS,py=y*TS;
if(map[y][x]===1){
X.fillStyle='#8B4513';X.fillRect(px,py,TS,TS);
X.fillStyle='#A0522D';X.fillRect(px+2,py+2,TS-4,TS-4);
X.fillStyle='#6B3410';X.fillRect(px+4,py+TS-6,TS-8,4);
}else if(map[y][x]===2){
X.fillStyle='#888';X.fillRect(px,py,TS,TS);
X.fillStyle='#aaa';X.fillRect(px+2,py+2,TS-4,TS-4);
X.fillStyle='#777';X.fillRect(px+4,py+4,TS-8,TS-8);
}
}
}
// base (eagle)
const bx=Math.floor(GW/2)*TS,by=(GH-2)*TS;
X.fillStyle='#333';X.fillRect(bx-2,by-2,TS+4,TS+4);
X.fillStyle='#ffcc00';X.fillRect(bx,by,TS,TS);
X.fillStyle='#cc0000';X.fillRect(bx+6,by+4,TS-12,TS-8);
X.fillStyle='#ff3333';X.fillRect(bx+8,by+6,TS-16,TS-12);
}

// === Tank Drawing ===
function drawTank(x,y,dir,color,isPlayer){
const cx=x+TS/2,cy=y+TS/2;
// body
X.fillStyle=color;
X.fillRect(x+4,y+4,TS-8,TS-8);
// lighter center
X.fillStyle=isPlayer?'#ffe066':'#ff6666';
X.fillRect(x+8,y+8,TS-16,TS-16);
// tracks
X.fillStyle='#333';
X.fillRect(x,y+2,5,TS-4);
X.fillRect(x+TS-5,y+2,5,TS-4);
// track detail
X.fillStyle='#555';
for(let i=0;i<4;i++){
X.fillRect(x+1,y+4+i*7,3,4);
X.fillRect(x+TS-4,y+4+i*7,3,4);
}
// barrel
X.fillStyle=isPlayer?'#ffcc00':'#ff4444';
if(dir.y===-1){X.fillRect(cx-3,y-2,6,10)}
else if(dir.y===1){X.fillRect(cx-3,y+TS-8,6,10)}
else if(dir.x===-1){X.fillRect(x-2,cy-3,10,6)}
else{X.fillRect(x+TS-8,cy-3,10,6)}
}

// === Game Logic ===
function start(){
initAudio();
state='playing';score=0;lives=3;level=1;kills=0;
genMap();
player={x:6*TS,y:(GH-2)*TS,dir:{x:0,y:-1},alive:true,cooldown:0,shield:180,speed:3};
enemies=[];bullets=[];explosions=[];
spawnEnemies();
document.getElementById('start').classList.add('hide');
document.getElementById('over').classList.add('hide');
document.getElementById('next').classList.add('hide');
updHUD();
}

function spawnEnemies(){
const spots=[[1,1],[5,1],[9,1]];
for(let i=0;i<Math.min(3+Math.floor(level/2),5);i++){
const s=spots[i%spots.length];
enemies.push({x:s[0]*TS,y:s[1]*TS,dir:{x:0,y:1},alive:true,cooldown:0,speed:1+level*0.1,aiTimer:0,type:i<2?'normal':'fast'});
}
}

function nextLevel(){
level++;
genMap();
player.x=6*TS;player.y=(GH-2)*TS;player.dir={x:0,y:-1};player.shield=120;
enemies=[];bullets=[];explosions=[];
spawnEnemies();
document.getElementById('next').classList.add('hide');
updHUD();
}

function updHUD(){
document.getElementById('score').textContent='得分: '+score;
document.getElementById('level').textContent='关卡: '+level;
document.getElementById('lives').textContent='❤️ '+lives;
}

// === Collision ===
function hitsWall(px,py,pw,ph){
const x1=Math.floor(px/TS),y1=Math.floor(py/TS);
const x2=Math.floor((px+pw-1)/TS),y2=Math.floor((py+ph-1)/TS);
for(let ty=y1;ty<=y2;ty++){
for(let tx=x1;tx<=x2;tx++){
if(tx<0||tx>=GW||ty<0||ty>=GH)return true;
if(map[ty][tx]>0)return true;
}
}
return false;
}

function canMove(tank,dx,dy){
const nx=tank.x+dx*tank.speed;
const ny=tank.y+dy*tank.speed;
if(nx<0||ny<0||nx+TS>WORLD_W||ny+TS>WORLD_H)return false;
return !hitsWall(nx,ny,TS,TS);
}

// === Game Loop ===
let lastTime=0;
function loop(time){
const dt=time-lastTime;lastTime=time;
if(dt<200){update(dt)}
render();
requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt){
if(state!=='playing'||!player)return;

// player movement
if(moveDir){
if(canMove(player,moveDir.x,moveDir.y)){
player.x+=moveDir.x*player.speed;
player.y+=moveDir.y*player.speed;
player.dir={x:moveDir.x,y:moveDir.y};
}
}
if(player.cooldown>0)player.cooldown--;
if(player.shield>0)player.shield--;

// enemy updates
enemies.forEach(e=>{
if(!e.alive)return;
if(e.cooldown>0)e.cooldown--;
e.aiTimer--;
if(e.aiTimer<=0){
// random direction change
const r=Math.random();
if(r<0.25)e.dir={x:0,y:-1};
else if(r<0.5)e.dir={x:0,y:1};
else if(r<0.75)e.dir={x:-1,y:0};
else e.dir={x:1,y:0};
e.aiTimer=40+Math.floor(Math.random()*60);
}
if(canMove(e,e.dir.x,e.dir.y)){
e.x+=e.dir.x*e.speed;
e.y+=e.dir.y*e.speed;
}else{
e.aiTimer=0; // change direction immediately on wall hit
}
// shoot
if(Math.random()<0.015&&e.cooldown<=0){
bullets.push({x:e.x+TS/2-3,y:e.y+TS/2-3,dx:e.dir.x*4,dy:e.dir.y*4,isPlayer:false});
e.cooldown=40;
}
});

// update bullets
for(let i=bullets.length-1;i>=0;i--){
const b=bullets[i];
b.x+=b.dx;b.y+=b.dy;

// out of bounds
if(b.x<-6||b.y<-6||b.x>WORLD_W||b.y>WORLD_H){bullets.splice(i,1);continue}

// wall hit
const hx=Math.floor((b.x+3)/TS),hy=Math.floor((b.y+3)/TS);
if(hx>=0&&hx<GW&&hy>=0&&hy<GH&&map[hy][hx]===1){
map[hy][hx]=0;
bullets.splice(i,1);playSound('hit');continue;
}
if(hx>=0&&hx<GW&&hy>=0&&hy<GH&&map[hy][hx]===2){
bullets.splice(i,1);playSound('hit');continue;
}

// bullet vs enemy
if(b.isPlayer){
for(let j=0;j<enemies.length;j++){
const e=enemies[j];
if(e.alive&&b.x+6>e.x&&b.x<e.x+TS&&b.y+6>e.y&&b.y<e.y+TS){
e.alive=false;score+=100;kills++;
playSound('explode');addExplosion(e.x+TS/2,e.y+TS/2);
bullets.splice(i,1);updHUD();break;
}
}
}else{
// bullet vs player
if(player.alive&&player.shield<=0&&b.x+6>player.x&&b.x<player.x+TS&&b.y+6>player.y&&b.y<player.y+TS){
lives--;playSound('explode');addExplosion(player.x+TS/2,player.y+TS/2);
bullets.splice(i,1);updHUD();
if(lives<=0){gameOver();return}
player.x=6*TS;player.y=(GH-2)*TS;player.shield=120;player.dir={x:0,y:-1};
continue;
}
}
}

// spawn enemies
const aliveEnemies=enemies.filter(e=>e.alive).length;
if(aliveEnemies<2&&enemies.filter(e=>!e.alive).length>0){
const spots=[[1,1],[5,1],[9,1]];
const spot=spots[Math.floor(Math.random()*spots.length)];
if(!hitsWall(spot[0]*TS,spot[1]*TS,TS,TS)){
enemies.push({x:spot[0]*TS,y:spot[1]*TS,dir:{x:0,y:1},alive:true,cooldown:0,speed:1+level*0.1,aiTimer:30,type:'normal'});
}
}

// check level clear
if(enemies.every(e=>!e.alive)){
playSound('levelup');
document.getElementById('next-score').textContent=score;
document.getElementById('next').classList.remove('hide');
state='next';
}

// check game over
if(lives<=0)gameOver();
}

function addExplosion(x,y){
for(let i=0;i<8;i++){
const angle=Math.PI*2/8*i;
explosions.push({x,y,vx:Math.cos(angle)*(1+Math.random()*2),vy:Math.sin(angle)*(1+Math.random()*2),life:20+Math.floor(Math.random()*10)});
}
}

function gameOver(){
state='gameover';
D.games++;D.kills+=kills;
if(score>D.best)D.best=score;
saveD(D);
document.getElementById('final').textContent=score;
document.getElementById('best').textContent='最高分: '+D.best;
document.getElementById('over-kills').textContent='消灭坦克: '+kills;
document.getElementById('over-level').textContent='到达关卡: '+level;
document.getElementById('over').classList.remove('hide');
}

function exit(){window.parent.postMessage({type:'game-exit'},'*')}

// === Render ===
function render(){
const cw=C.width,ch=C.height;
// clear
X.fillStyle='#111';X.fillRect(0,0,cw,ch);

// transform to game world
X.save();
X.translate(offX,offY);
X.scale(scale,scale);

// game background
X.fillStyle='#000';X.fillRect(0,0,WORLD_W,WORLD_H);

if(state==='menu'){
X.restore();
return;
}

// draw map
drawMap();

// draw explosions
for(let i=explosions.length-1;i>=0;i--){
const e=explosions[i];
e.x+=e.vx;e.y+=e.vy;e.life--;
if(e.life<=0){explosions.splice(i,1);continue}
const s=4*(e.life/30);
X.globalAlpha=e.life/30;
X.fillStyle=e.life>15?'#ff6600':'#ffcc00';
X.fillRect(e.x-s,e.y-s,s*2,s*2);
}
X.globalAlpha=1;

// draw enemies
enemies.forEach(e=>{
if(!e.alive)return;
drawTank(e.x,e.y,e.dir,e.type==='fast'?'#ff4444':'#cc0000',false);
});

// draw player
if(player&&player.alive){
if(player.shield<=0||Math.floor(player.shield/4)%2===0){
drawTank(player.x,player.y,player.dir,'#22aa22',true);
}
// shield glow
if(player.shield>0){
X.strokeStyle='#66ffff';
X.lineWidth=2;
X.globalAlpha=0.5+0.3*Math.sin(player.shield*0.3);
X.strokeRect(player.x-3,player.y-3,TS+6,TS+6);
X.globalAlpha=1;
}
}

// draw bullets
X.fillStyle='#ffcc00';
bullets.forEach(b=>{
if(b.isPlayer){X.fillStyle='#ffee55'}else{X.fillStyle='#ff6644'}
X.fillRect(b.x,b.y,6,6);
// bullet glow
X.globalAlpha=0.3;
X.fillStyle=b.isPlayer?'#ffee55':'#ff6644';
X.fillRect(b.x-2,b.y-2,10,10);
X.globalAlpha=1;
});

X.restore();
}

window.parent.postMessage({type:'game-ready',gameId:'battle-city'},'*');
</script>
</body>
</html>`
