/**
 * ?HTML ? * ?Blob URL ?iframe
 * ? */

export const GAME_ID = 'snake'
export const GAME_NAME = '\u8d2a\u5403\u86c7'
export const GAME_ICON = '\u{1f40d}'

/** VG data URI?*/
export const GAME_COVER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" shape-rendering="crispEdges">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0f0f23"/>
      <stop offset="0.5" stop-color="#1a1a2e"/>
      <stop offset="1" stop-color="#16213e"/>
    </linearGradient>
  </defs>
  <!-- pixel art -->
  <rect width="300" height="180" fill="url(#bg)"/>

  <!-- pixel art -->
  <rect x="20" y="15" width="2" height="2" fill="#fff" opacity="0.8"/>
  <rect x="60" y="35" width="2" height="2" fill="#fff" opacity="0.6"/>
  <rect x="150" y="20" width="3" height="3" fill="#fff" opacity="0.7"/>
  <rect x="220" y="40" width="2" height="2" fill="#fff" opacity="0.5"/>
  <rect x="270" y="25" width="2" height="2" fill="#fff" opacity="0.8"/>
  <rect x="40" y="55" width="2" height="2" fill="#fff" opacity="0.4"/>
  <rect x="180" y="50" width="2" height="2" fill="#fff" opacity="0.6"/>
  <rect x="250" y="60" width="2" height="2" fill="#fff" opacity="0.5"/>

  <!-- pixel art -->
  <line x1="0" y1="60" x2="300" y2="60" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <line x1="0" y1="120" x2="300" y2="120" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <line x1="60" y1="0" x2="60" y2="180" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <line x1="120" y1="0" x2="120" y2="180" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <line x1="180" y1="0" x2="180" y2="180" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <line x1="240" y1="0" x2="240" y2="180" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>

  <!-- pixel art -->
  <!-- pixel art -->
  <rect x="120" y="60" width="16" height="16" fill="#7cfc9b"/>
  <rect x="122" y="62" width="12" height="12" fill="#98ffd0"/>
  <!-- pixel art -->
  <rect x="128" y="64" width="3" height="3" fill="#1a1a2e"/>
  <rect x="128" y="70" width="3" height="3" fill="#1a1a2e"/>
  <rect x="129" y="65" width="1" height="1" fill="#fff"/>
  <rect x="129" y="71" width="1" height="1" fill="#fff"/>

  <!-- pixel art -->
  <rect x="104" y="60" width="16" height="16" fill="#4ade80"/>
  <rect x="106" y="62" width="12" height="12" fill="#22c55e"/>

  <!-- pixel art -->
  <rect x="88" y="60" width="16" height="16" fill="#22c55e"/>
  <rect x="90" y="62" width="12" height="12" fill="#15803d"/>

  <!-- pixel art -->
  <rect x="88" y="76" width="16" height="16" fill="#4ade80"/>
  <rect x="90" y="78" width="12" height="12" fill="#22c55e"/>

  <!-- pixel art -->
  <rect x="88" y="92" width="16" height="16" fill="#22c55e"/>
  <rect x="90" y="94" width="12" height="12" fill="#15803d"/>

  <!-- pixel art -->
  <rect x="104" y="92" width="16" height="16" fill="#4ade80"/>
  <rect x="106" y="94" width="12" height="12" fill="#22c55e"/>

  <!-- pixel art -->
  <rect x="120" y="92" width="16" height="16" fill="#22c55e"/>
  <rect x="122" y="94" width="12" height="12" fill="#15803d"/>

  <!-- pixel art -->
  <rect x="200" y="80" width="12" height="12" fill="#ff6b6b"/>
  <rect x="202" y="82" width="8" height="8" fill="#ff8e8e"/>

  <!-- pixel art -->
  <rect x="240" y="60" width="12" height="12" fill="#ffd75e"/>
  <rect x="242" y="62" width="8" height="8" fill="#ffe680"/>
  <rect x="245" y="64" width="2" height="4" fill="#fff"/>
  <rect x="243" y="66" width="6" height="2" fill="#fff"/>

  <!-- pixel art -->
  <rect x="180" y="120" width="12" height="12" fill="#7cfc9b"/>
  <rect x="182" y="122" width="8" height="8" fill="#98ffd0"/>
  <rect x="184" y="124" width="4" height="4" fill="#fff"/>

  <!-- pixel art -->
  <rect x="210" y="85" width="3" height="3" fill="#ff6b6b" opacity="0.6"/>
  <rect x="215" y="82" width="2" height="2" fill="#ff6b6b" opacity="0.4"/>
  <rect x="208" y="88" width="2" height="2" fill="#ff6b6b" opacity="0.5"/>

  <!-- pixel art -->
  <rect x="130" y="130" width="40" height="16" fill="rgba(0,0,0,0.5)"/>
  <text x="150" y="142" font-family="monospace" font-size="12" font-weight="bold" fill="#7cfc9b" text-anchor="middle">120</text>

  <!-- pixel art -->
  <rect x="130" y="150" width="40" height="12" fill="rgba(0,0,0,0.3)"/>
  <text x="150" y="159" font-family="monospace" font-size="8" fill="#7c8a96" text-anchor="middle">LV.3</text>
</svg>`)

export const gameHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>\u8d2a\u5403\u86c7</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{background:#0f0f23;overflow:hidden;touch-action:none;user-select:none}
canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.ui{position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:10}
.score{position:absolute;top:20px;left:50%;transform:translateX(-50%);font-family:'Courier New',monospace;font-size:44px;font-weight:900;color:#7cfc9b;text-shadow:3px 3px 0 #1a5c2a;opacity:0;transition:opacity .3s;letter-spacing:2px}
.score.show{opacity:1}
.combo{position:absolute;top:78px;left:50%;transform:translateX(-50%);font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#ffd75e;text-shadow:2px 2px 0 #7a4a00;opacity:0;transition:opacity .3s}
.combo.show{opacity:1}
.hud-best{position:absolute;top:100px;left:50%;transform:translateX(-50%);font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:#c89b4a;text-shadow:2px 2px 0 #5a3a00;opacity:0;transition:opacity .3s;letter-spacing:1px;white-space:nowrap}
.hud-best.show{opacity:1}
.hud-best.new-record{color:#7cfc9b;text-shadow:2px 2px 0 #1a5c2a;animation:celebrate .6s ease-in-out 3}
.start-best{font-family:'Courier New',monospace;font-size:16px;font-weight:700;color:#c89b4a;text-shadow:2px 2px 0 #5a3a00;margin-bottom:20px;letter-spacing:1px}
.start-best.none{color:#5a6a7a;text-shadow:none;font-weight:400;font-size:14px}
@keyframes celebrate{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.15)}}
.overlay{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,10,25,.92);pointer-events:auto;z-index:20}
.overlay.hide{display:none}
.title{font-family:'Courier New',monospace;font-size:40px;font-weight:900;color:#7cfc9b;text-shadow:4px 4px 0 #1a5c2a;margin-bottom:14px;letter-spacing:4px}
.sub{font-family:'Courier New',monospace;font-size:15px;color:#9db4c0;margin-bottom:32px;letter-spacing:1px}
.final{font-family:'Courier New',monospace;font-size:68px;font-weight:900;color:#ffd75e;text-shadow:4px 4px 0 #7a4a00;margin-bottom:10px}
.best{font-family:'Courier New',monospace;font-size:15px;color:#9db4c0;margin-bottom:30px}
.stats{font-family:'Courier New',monospace;font-size:13px;color:#7c8a96;margin-bottom:20px;display:flex;gap:20px}
.stats span{text-shadow:1px 1px 0 #1a2a3a}
.btn{padding:14px 40px;font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#1a1a2e;background:#7cfc9b;border:3px solid #1a5c2a;border-radius:0;cursor:pointer;pointer-events:auto;transition:transform .1s;box-shadow:4px 4px 0 #1a5c2a;letter-spacing:2px}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #1a5c2a}
.btn:active{transform:translate(2px,2px);box-shadow:2px 2px 0 #1a5c2a}
.exit{position:absolute;top:16px;right:16px;padding:6px 14px;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#9db4c0;background:#1a1a2e;border:2px solid #3a4a5a;border-radius:0;cursor:pointer;pointer-events:auto;z-index:30}
.exit:hover{color:#7cfc9b;border-color:#7cfc9b}
.hint{position:absolute;bottom:70px;left:50%;transform:translateX(-50%);font-family:'Courier New',monospace;font-size:13px;color:#9db4c0;animation:pulse 2s infinite;letter-spacing:1px}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
.level{position:absolute;top:130px;left:50%;transform:translateX(-50%);font-family:'Courier New',monospace;font-size:12px;color:#7c8a96;opacity:0;transition:opacity .3s;letter-spacing:1px}
.level.show{opacity:1}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div class="ui">
<div id="score" class="score">0</div>
<div id="combo" class="combo"></div>
<div id="hud-best" class="hud-best"></div>
<div id="level" class="level">LV.1</div>
<button class="exit" onclick="exit()">\u9000\u51fa</button>
<div id="start" class="overlay">
<div class="title">\u8d2a\u5403\u86c7</div>
<div class="sub">\u65b9\u5411\u952e\u6216 WASD \u63a7\u5236\u79fb\u52a8</div>
<div id="start-best" class="start-best"></div>
<div class="stats">
<span id="stat-games">\u6e38\u620f\u6b21\u6570: 0</span>
<span id="stat-food">\u603b\u98df\u7269: 0</span>
<span id="stat-time">\u603b\u65f6\u95f4: 0s</span>
</div>
<button class="btn" onclick="start()">\u5f00\u59cb\u6e38\u620f</button>
</div>
<div id="over" class="overlay hide">
<div class="title">\u6e38\u620f\u7ed3\u675f</div>
<div id="final" class="final">0</div>
<div id="best" class="best">\u95c1\u54c4\u7243\u934b\u64b3\u0394\u934c\u6d62\ue048\u5d39? 0</div>
<div class="stats">
<span id="over-length">\u86c7\u8eab\u957f\u5ea6: 0</span>
<span id="over-time">\u5b58\u6d3b\u65f6\u95f4: 0s</span>
</div>
<button class="btn" onclick="start()">\u518d\u6765\u4e00\u5c40</button>
</div>
<div id="hint" class="hint hide">\u5403\u6389\u98df\u7269, \u907f\u514d\u649e\u5230\u81ea\u5df1</div>
</div>
<script>
const C=document.getElementById('c'),X=C.getContext('2d');
X.imageSmoothingEnabled=false;
let W,H,state='menu',score=0,gameStartTime=0,gameEndTime=0;

// game logic
const STORAGE_KEY='snake-pixel-data';
const defaultData={
  best:0,
  gamesPlayed:0,
  totalFood:0,
  totalTime:0,
  lastPlayed:0,
  maxLevel:1,
  totalScore:0
};

function loadData(){
  try{
    const saved=localStorage.getItem(STORAGE_KEY);
    if(saved){
      const data=JSON.parse(saved);
      return {...defaultData,...data};
    }
  }catch(e){}
  return {...defaultData};
}

function saveData(data){
  try{
    data.lastPlayed=Date.now();
    localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
  }catch(e){}
}

let gameData=loadData();
let best=gameData.best;

// game logic
function updateStats(){
  document.getElementById('stat-games').textContent='\u5a75\u70b4\u6338\u93b2\uffe0\u5d39\u5a06\u5fca\u678e\u95b3\u2541\u556f\u5a08? '+gameData.gamesPlayed;
  document.getElementById('stat-food').textContent='\u603b\u98df\u7269: '+gameData.totalFood;
  document.getElementById('stat-time').textContent='\u603b\u65f6\u95f4: '+Math.floor(gameData.totalTime)+'s';
}

// game logic

let snake=[],food={},dir={x:1,y:0},nextDir={x:1,y:0},gridSize=20,speed=150,lastTime=0,stars=[];
let parts=[]; // game logic
let currentLevel=1,foodEaten=0,comboCount=0,lastFoodTime=0;

function resize(){W=C.width=innerWidth;H=C.height=innerHeight;makeStars()}
addEventListener('resize',resize);resize();

function makeStars(){stars=[];for(let i=0;i<60;i++)stars.push({x:Math.random()*2000,y:Math.random()*1200,s:1+Math.floor(Math.random()*2)})}

function start(){
state='playing';score=0;snake=[];foodEaten=0;comboCount=0;currentLevel=1;
gameStartTime=performance.now();
const startX=Math.floor(W/2/gridSize)*gridSize;
const startY=Math.floor(H/2/gridSize)*gridSize;
for(let i=0;i<3;i++)snake.push({x:startX-i*gridSize,y:startY});
dir={x:1,y:0};nextDir={x:1,y:0};
speed=150;
placeFood();updScore();
document.getElementById('start').classList.add('hide');
document.getElementById('over').classList.add('hide');
document.getElementById('score').classList.add('show');
document.getElementById('level').classList.add('show');
document.getElementById('hint').classList.remove('hide');
updBestHUD();
updLevel();
lastTime=performance.now();
lastFoodTime=performance.now();
}

function placeFood(){
let valid=false;
while(!valid){
food={x:Math.floor(Math.random()*(W/gridSize))*gridSize,y:Math.floor(Math.random()*(H/gridSize))*gridSize};
valid=!snake.some(s=>s.x===food.x&&s.y===food.y);
}
// game logic
food.type=rand<0.7?'normal':rand<0.9?'double':'triple';
food.color=food.type==='normal'?'#ff6b6b':food.type==='double'?'#ffd75e':'#7cfc9b';
food.points=food.type==='normal'?10:food.type==='double'?20:30;
}

document.addEventListener('keydown',e=>{
if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){if(dir.y!==1)nextDir={x:0,y:-1}}
else if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){if(dir.y!==-1)nextDir={x:0,y:1}}
else if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){if(dir.x!==1)nextDir={x:-1,y:0}}
else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){if(dir.x!==-1)nextDir={x:1,y:0}}
});

// game logic
let touchStartX=0,touchStartY=0;
C.addEventListener('touchstart',e=>{
e.preventDefault();
touchStartX=e.touches[0].clientX;
touchStartY=e.touches[0].clientY;
},{passive:false});
C.addEventListener('touchend',e=>{
e.preventDefault();
const dx=e.changedTouches[0].clientX-touchStartX;
const dy=e.changedTouches[0].clientY-touchStartY;
if(Math.abs(dx)>Math.abs(dy)){
if(dx>0&&dir.x!==-1)nextDir={x:1,y:0}
else if(dx<0&&dir.x!==1)nextDir={x:-1,y:0}
}else{
if(dy>0&&dir.y!==-1)nextDir={x:0,y:1}
else if(dy<0&&dir.y!==1)nextDir={x:0,y:-1}
}
},{passive:false});

function loop(){update();render();requestAnimationFrame(loop)}
requestAnimationFrame(loop);

function update(){
if(state!=='playing')return;
const now=performance.now();

// game logic
updateParticles();

if(now-lastTime<speed)return;
lastTime=now;

dir=nextDir;
const head={x:snake[0].x+dir.x*gridSize,y:snake[0].y+dir.y*gridSize};

// game logic
if(head.x<0||head.x>=W||head.y<0||head.y>=H){gameOver();return}

// game logic
if(snake.some(s=>s.x===head.x&&s.y===head.y)){gameOver();return}

snake.unshift(head);

// game logic
if(head.x===food.x&&head.y===food.y){
  const timeSinceLastFood=(now-lastFoodTime)/1000;
  if(timeSinceLastFood<2){
    comboCount++;
    score+=food.points*(1+comboCount*0.5);
    showCombo(comboCount);
  }else{
    comboCount=0;
    score+=food.points;
  }
  lastFoodTime=now;
  foodEaten++;

  // game logic
  addParticles(food.x,food.y,food.color,8);

  // game logic
  const newLevel=Math.floor(foodEaten/5)+1;
  if(newLevel!==currentLevel){
    currentLevel=newLevel;
    updLevel();
    // game logic
    if(speed>80)speed-=3;
  }

  updScore();
  placeFood();
}else{
  snake.pop();
}
}

function gameOver(){
state='gameover';
gameEndTime=performance.now();
const gameTime=(gameEndTime-gameStartTime)/1000;

// game logic
gameData.gamesPlayed++;
gameData.totalFood+=foodEaten;
gameData.totalTime+=gameTime;
gameData.totalScore+=score;
if(currentLevel>gameData.maxLevel)gameData.maxLevel=currentLevel;

// game logic
  best=score;
  gameData.best=best;
}

// game logic
saveData(gameData);

document.getElementById('final').textContent=Math.floor(score);
document.getElementById('best').textContent='\u6700\u9ad8\u5206: '+best;
document.getElementById('over-length').textContent='\u86c7\u8eab\u957f\u5ea6: '+snake.length;
document.getElementById('over-time').textContent='\u5b58\u6d3b\u65f6\u95f4: '+Math.floor(gameTime)+'s';
document.getElementById('over').classList.remove('hide');
document.getElementById('score').classList.remove('show');
document.getElementById('combo').classList.remove('show');
document.getElementById('hud-best').classList.remove('show');
document.getElementById('level').classList.remove('show');
window.parent.postMessage({type:'game-over',score:Math.floor(score),best},'*');
}

function exit(){window.parent.postMessage({type:'game-exit'},'*')}

function render(){
// game logic
const sky=X.createLinearGradient(0,0,0,H);
sky.addColorStop(0,'#0f0f23');sky.addColorStop(.3,'#1a1a2e');sky.addColorStop(1,'#16213e');
X.fillStyle=sky;X.fillRect(0,0,W,H);

// game logic
X.fillStyle='#ffffff';
stars.forEach(st=>{X.globalAlpha=.3+((st.x*7)%10)/20;X.fillRect(st.x,st.y,st.s,st.s)});
X.globalAlpha=1;

// game logic
X.strokeStyle='rgba(255,255,255,0.02)';
X.lineWidth=1;
for(let x=0;x<W;x+=gridSize){X.beginPath();X.moveTo(x,0);X.lineTo(x,H);X.stroke()}
for(let y=0;y<H;y+=gridSize){X.beginPath();X.moveTo(0,y);X.lineTo(W,y);X.stroke()}

// game logic
drawFood();

// game logic
drawSnake();

// game logic
parts.forEach(p=>{X.globalAlpha=p.life;X.fillStyle=p.c;X.fillRect(p.x,p.y,p.s,p.s)});
X.globalAlpha=1;
}

function drawFood(){
const x=food.x,y=food.y,gs=gridSize;
const pulse=Math.sin(performance.now()/200)*0.1+0.9;

// game logic
X.fillStyle='rgba(0,0,0,0.3)';
X.fillRect(x+3,y+3,gs-2,gs-2);

// game logic
X.fillStyle=food.color;
X.fillRect(x+2,y+2,gs-4,gs-4);

// game logic
X.fillStyle='rgba(255,255,255,0.3)';
X.fillRect(x+4,y+4,gs-12,gs-12);

// game logic
if(food.type==='double'){
  X.fillStyle='#fff';
  X.fillRect(x+gs/2-2,y+gs/2-4,4,8);
  X.fillRect(x+gs/2-4,y+gs/2-2,8,4);
}else if(food.type==='triple'){
  X.fillStyle='#fff';
  X.fillRect(x+gs/2-3,y+gs/2-3,6,6);
  X.fillStyle=food.color;
  X.fillRect(x+gs/2-1,y+gs/2-1,2,2);
}

// game logic
X.globalAlpha=0.2*Math.sin(performance.now()/300);
X.fillStyle=food.color;
X.fillRect(x,y,gs,gs);
X.globalAlpha=1;
}

function drawSnake(){
snake.forEach((s,i)=>{
if(i===0){
// game logic
X.fillStyle='#7cfc9b';
X.fillRect(s.x+1,s.y+1,gridSize-2,gridSize-2);
X.fillStyle='#98ffd0';
X.fillRect(s.x+3,s.y+3,gridSize-6,gridSize-6);
// game logic
X.fillStyle='#1a1a2e';
if(dir.x===1){X.fillRect(s.x+gridSize-8,s.y+5,3,3);X.fillRect(s.x+gridSize-8,s.y+gridSize-8,3,3)}
else if(dir.x===-1){X.fillRect(s.x+5,s.y+5,3,3);X.fillRect(s.x+5,s.y+gridSize-8,3,3)}
else if(dir.y===-1){X.fillRect(s.x+5,s.y+5,3,3);X.fillRect(s.x+gridSize-8,s.y+5,3,3)}
else{X.fillRect(s.x+5,s.y+gridSize-8,3,3);X.fillRect(s.x+gridSize-8,s.y+gridSize-8,3,3)}
// game logic
X.fillStyle='#fff';
if(dir.x===1){X.fillRect(s.x+gridSize-7,s.y+6,1,1);X.fillRect(s.x+gridSize-7,s.y+gridSize-7,1,1)}
else if(dir.x===-1){X.fillRect(s.x+6,s.y+6,1,1);X.fillRect(s.x+6,s.y+gridSize-7,1,1)}
else if(dir.y===-1){X.fillRect(s.x+6,s.y+6,1,1);X.fillRect(s.x+gridSize-7,s.y+6,1,1)}
else{X.fillRect(s.x+6,s.y+gridSize-7,1,1);X.fillRect(s.x+gridSize-7,s.y+gridSize-7,1,1)}
}else{
// game logic
const bodyColor=i%2===0?'#4ade80':'#22c55e';
X.fillStyle=bodyColor;
X.fillRect(s.x+1,s.y+1,gridSize-2,gridSize-2);
X.fillStyle='#15803d';
X.fillRect(s.x+3,s.y+3,gridSize-6,gridSize-6);
// game logic
X.fillStyle='#166534';
if(i%3===0)X.fillRect(s.x+gridSize/2-2,s.y+gridSize/2-2,4,4);
}
});
}

// game logic
function addParticles(x,y,color,count){
for(let i=0;i<count;i++){
parts.push({
x:x+gridSize/2,
y:y+gridSize/2,
vx:(Math.random()-0.5)*4,
vy:(Math.random()-0.5)*4,
s:Math.random()*3+1,
c:color,
life:1,
decay:0.02+Math.random()*0.02
});
}
}

function updateParticles(){
for(let i=parts.length-1;i>=0;i--){
const p=parts[i];
p.x+=p.vx;
p.y+=p.vy;
p.life-=p.decay;
if(p.life<=0)parts.splice(i,1);
}
}

function updScore(){document.getElementById('score').textContent=Math.floor(score);updBestHUD()}
function updBestHUD(){
const el=document.getElementById('hud-best');
if(best>0){el.textContent='\u59ab\uff45\u556b\u59f9?\u95c1\u54c4\u7243\u934b\u64b3\u0394\u934c\u6d62\ue048\u5d39? '+best;el.classList.add('show')}
if(score>best&&best>0){el.textContent='\u{1f195} \u65b0\u7eaa\u5f55!';el.classList.add('new-record')}
else{el.classList.remove('new-record')}
}
function updLevel(){
document.getElementById('level').textContent='LV.'+currentLevel;
}
function showCombo(n){const e=document.getElementById('combo');e.textContent=n+' \u8fde\u51fb!';e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1500)}

window.parent.postMessage({type:'game-ready',gameId:'snake'},'*');
</script>
</body>
</html>`
