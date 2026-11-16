(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id),W=960,H=540,AS='assets/';
const imgCache={};function img(path){if(!imgCache[path]){const i=new Image();i.src=AS+path;imgCache[path]=i;}return imgCache[path]}
const paths={hero:'personagens/heroi/',boss:'personagens/chefao/',red:'personagens/inimigo-vermelho/',purple:'personagens/inimigo-roxo/'};
const load=(p)=>img(p);
const frames={idle:['parado-01.png','parado-02.png'],run:['correr-01.png','correr-02.png','correr-03.png','correr-04.png'],jump:['salto-01.png','salto-02.png'],double:['salto-duplo-01.png','salto-duplo-02.png','salto-duplo-03.png'],attack:['machado-01.png','machado-02.png','machado-03.png'],hurt:['dano-01.png'],throw:['arremesso-01.png','arremesso-02.png','arremesso-03.png']};
const phaseNames=['Floresta dos Começos','Vila dos Lenhadores','Ponte do Fiorde','Ruínas Antigas','Caverna dos Ecos','Montanha Gelada','Costa dos Dracares','Pântano Sombrio','Fortaleza de Pedra','Vale dos Trolls','Campos de Batalha','Mina dos Anões','Templo Esquecido','Castelo do Norte','Trono do Chefão'];
let state='menu',phase=1,lives=5,coins=0,score=0,power='NENHUM',camera=0,last=0,elapsed=0,keys={},touch={},player,platforms=[],coinList=[],enemies=[],projectiles=[],boss,particles=[],levelWidth=2600;
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function frame(path,x,y,w,h,flip=false,alpha=1){const im=load(path);if(!im.complete||!im.naturalWidth)return;ctx.save();ctx.globalAlpha=alpha;if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h)}else ctx.drawImage(im,x,y,w,h);ctx.restore()}
function spriteAnim(folder,arr,t,rate=8){return folder+arr[Math.floor(t*rate)%arr.length]}
function setHud(){ $('fase').textContent=phase+'/15';$('vidas').textContent=lives;$('moedas').textContent=coins;$('pontos').textContent=score;$('poder').textContent=power;$('bossFill').style.width=(boss?Math.max(0,boss.hp/boss.max*100):100)+'%';$('bossUI').style.display=boss?'block':'none';}
function newLevel(){levelWidth=2350+phase*95;camera=0;elapsed=0;player={x:65,y:300,w:76,h:82,vx:0,vy:0,ground:false,face:1,jumps:0,inv:0,anim:0,attack:0,throwCD:0};platforms=[{x:0,y:450,w:levelWidth,h:100,kind:'ground'}];
 let count=10+phase;for(let i=0;i<count;i++){let x=230+i*175+rand(-25,30),y=rand(285,405),w=rand(125,190);platforms.push({x,y,w,h:35,kind:'platform'});if(i%3===1)platforms.push({x:x+40,y:y-65,w:58,h:58,kind:'box'});}
 // scenic stepping stones and a safe landing near the end
 platforms.push({x:levelWidth-450,y:385,w:180,h:35,kind:'platform'});
 coinList=[];for(let i=0;i<Math.max(18,phase+12);i++){let p=platforms[1+(i%(platforms.length-2))];coinList.push({x:p.x+rand(20,p.w-20),y:p.y-rand(38,85),got:false,spin:rand(0,6)});}
 enemies=[];for(let i=0;i<4+Math.min(phase,5);i++){let p=platforms[1+(i*2%(platforms.length-2))];enemies.push({x:p.x+30,y:p.y-64,w:60,h:58,vx:rand(.5,1.1)*(i%2?1:-1),min:p.x,max:p.x+p.w-55,hp:1,dead:false,type:i%2?'purple':'red',anim:rand(0,2)});}
 projectiles=[];particles=[];boss={x:levelWidth-210,y:322,w:125,h:128,hp:phase===15?12:6+Math.floor(phase/3),max:phase===15?12:6+Math.floor(phase/3),vx:-.6,attack:0,dead:false};setHud();}
function resetGame(){phase=1;lives=5;coins=0;score=0;power='NENHUM';newLevel();state='playing';$('overlay').classList.add('hidden');}
function nextLevel(){if(phase>=15){state='win';showOverlay('PARABÉNS!','Você zerou as 15 fases! Pontuação final: '+score,'JOGAR NOVAMENTE',resetGame);return;}phase++;newLevel();state='playing';}
function showOverlay(title,txt,btn,fn){$('overlayTitle').textContent=title;$('overlayText').textContent=txt;$('mainAction').textContent=btn;$('mainAction').onclick=fn;$('overlay').classList.remove('hidden');}
function hurt(){if(player.inv>0)return;lives--;player.inv=1.5;player.vy=-7;setHud();if(lives<=0){state='over';showOverlay('GAME OVER','Sua jornada terminou na fase '+phase+'. Pontuação: '+score,'TENTAR NOVAMENTE',resetGame);}}
function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function fire(){if(player.throwCD>0||state!=='playing')return;player.throwCD=.55;projectiles.push({x:player.x+player.w/2,y:player.y+35,vx:player.face*8,rot:0});}
function attack(){if(state!=='playing')return;player.attack=.28;for(const e of enemies){if(!e.dead&&Math.abs((e.x+e.w/2)-(player.x+player.w/2))<105&&Math.abs(e.y-player.y)<90){e.dead=true;score+=100;burst(e.x+25,e.y+20,'#ffdf55');}}if(boss&&!boss.dead&&Math.abs(boss.x-player.x)<145&&Math.abs(boss.y-player.y)<110){boss.hp--;score+=150;burst(boss.x+55,boss.y+40,'#ffb02e');if(boss.hp<=0){boss.dead=true;score+=500;}}setHud();}
function burst(x,y,color){for(let i=0;i<9;i++)particles.push({x,y,vx:rand(-2,2),vy:rand(-3,1),life:.5,color});}
function update(dt){if(state!=='playing')return;elapsed+=dt;player.anim+=dt;player.inv=Math.max(0,player.inv-dt);player.attack=Math.max(0,player.attack-dt);player.throwCD=Math.max(0,player.throwCD-dt);
 let left=keys.ArrowLeft||keys.KeyA||touch.ArrowLeft,right=keys.ArrowRight||keys.KeyD||touch.ArrowRight;
 player.vx=(right?1:0)-(left?1:0);player.vx*=3.7;if(player.vx)player.face=Math.sign(player.vx);player.x=clamp(player.x+player.vx,0,levelWidth-player.w);
 player.vy+=.55;player.y+=player.vy;player.ground=false;
 for(const p of platforms){if(player.vy>=0&&player.x+player.w-14>p.x&&player.x+14<p.x+p.w&&player.y+player.h>=p.y&&player.y+player.h-player.vy<=p.y+12){player.y=p.y-player.h;player.vy=0;player.ground=true;player.jumps=0;}}
 if(player.y>H+160){hurt();player.x=Math.max(50,player.x-150);player.y=220;player.vy=0;}
 for(const c of coinList){if(!c.got&&rectHit({x:player.x+20,y:player.y+12,w:player.w-35,h:player.h-20},{x:c.x-14,y:c.y-14,w:28,h:28})){c.got=true;coins++;score+=10;setHud();}}
 for(const e of enemies){if(e.dead)continue;e.x+=e.vx;e.anim+=dt;if(e.x<e.min||e.x>e.max)e.vx*=-1;if(rectHit(player,e)){if(player.vy>1&&player.y+player.h<e.y+30){e.dead=true;player.vy=-9;score+=100;}else hurt();}}
 if(boss&&!boss.dead){boss.x+=boss.vx;if(boss.x<levelWidth-390||boss.x>levelWidth-120)boss.vx*=-1;boss.attack+=dt;if(rectHit(player,boss)){if(player.vy>2&&player.y+player.h<boss.y+45){boss.hp--;player.vy=-11;if(boss.hp<=0)boss.dead=true;}else hurt();}}
 for(const q of projectiles){q.x+=q.vx;q.rot+=.25;let target=enemies.find(e=>!e.dead&&Math.abs(e.x-q.x)<42&&Math.abs(e.y-q.y)<45);if(target){target.dead=true;q.dead=true;score+=100;}if(boss&&!boss.dead&&Math.abs(boss.x+50-q.x)<65&&Math.abs(boss.y+55-q.y)<70){boss.hp--;q.dead=true;score+=150;if(boss.hp<=0)boss.dead=true;}if(q.x<camera-50||q.x>camera+W+100)q.dead=true;}projectiles=projectiles.filter(q=>!q.dead);
 particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.1;p.life-=dt});particles=particles.filter(p=>p.life>0);
 camera=clamp(player.x-W*.34,0,levelWidth-W);if(player.x>levelWidth-105&&(!boss||boss.dead)){nextLevel();}setHud();}
function drawBackground(){let bg=load('cenario/fundo-reino.png');if(bg.complete&&bg.naturalWidth){let scale=H/bg.naturalHeight,bw=bg.naturalWidth*scale;ctx.drawImage(bg,-(camera*.22%bw),0,bw,H);ctx.drawImage(bg,-(camera*.22%bw)+bw,0,bw,H);}else{let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#55baf3');g.addColorStop(1,'#d9f3ff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}}
function drawPlatform(p){let x=p.x-camera;if(x+p.w<0||x>W)return;if(p.kind==='ground'){let tile=load('blocos/solo-grama.png');if(tile.complete&&tile.naturalWidth){for(let xx=x;xx<x+p.w;xx+=72)ctx.drawImage(tile,xx,p.y,74,90);}else{ctx.fillStyle='#7b4a24';ctx.fillRect(x,p.y,p.w,p.h);}ctx.fillStyle='#48b923';ctx.fillRect(x,p.y,p.w,13);ctx.fillStyle='#a1fa3d';ctx.fillRect(x,p.y,p.w,5);}else{let tile=load('blocos/plataforma-grama.png');if(tile.complete&&tile.naturalWidth){for(let xx=x;xx<x+p.w;xx+=64)ctx.drawImage(tile,xx,p.y,66,38);}else{ctx.fillStyle='#744321';ctx.fillRect(x,p.y,p.w,35);ctx.fillStyle='#59c72a';ctx.fillRect(x,p.y,p.w,9);}if(p.kind==='box')frame('blocos/bloco-interrogacao.png',x+p.w/2-27,p.y-58,54,58);}}
function draw(){ctx.clearRect(0,0,W,H);drawBackground();
 // scenery decorations in world coordinates
 for(let i=0;i<Math.ceil(levelWidth/360);i++){let x=i*360-camera*.72;if(x>-130&&x<W+80){frame('cenario/pinheiro.png',x,255+(i%3)*18,110,170);if(i%3===0)frame('cenario/barril.png',x+135,390,52,58);}}
 platforms.forEach(drawPlatform);
 coinList.forEach(c=>{if(!c.got){let f=['moeda-01.png','moeda-02.png','moeda-03.png','moeda-04.png'][Math.floor(elapsed*10+c.spin)%4];frame('objetos/'+f,c.x-camera-16,c.y-16,32,32);}});
 enemies.forEach(e=>{if(e.dead)return;let folder=paths[e.type],f=(Math.floor(e.anim*5)%2)+1;frame(folder+'mover-0'+f+'.png',e.x-camera-4,e.y-10,68,68,e.vx<0);});
 if(boss&&!boss.dead){let f=(Math.floor(elapsed*3)%2)+1;frame(paths.boss+'parado-0'+f+'.png',boss.x-camera-10,boss.y-12,boss.w+25,boss.h+15,boss.vx>0);}
 projectiles.forEach(q=>{ctx.save();ctx.translate(q.x-camera,q.y);ctx.rotate(q.rot);frame('objetos/machado-projetil/01.png',-23,-23,46,46);ctx.restore();});
 let moving=Math.abs(player.vx)>.2,arr=player.ground?(moving?frames.run:frames.idle):(player.jumps>1?frames.double:frames.jump);let path=spriteAnim(paths.hero,arr,elapsed,player.ground?10:7);if(player.attack>0)path=spriteAnim(paths.hero,frames.attack,elapsed,14);if(player.inv>0&&Math.floor(elapsed*14)%2===0){}else frame(path,player.x-camera-12,player.y-10,player.w+24,player.h+15,player.face<0);
 particles.forEach(p=>{ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x-camera,p.y,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;});
 // finish marker
 frame('cenario/estandarte.png',levelWidth-75-camera,325,58,115);
 // subtle level title
 ctx.fillStyle='#fff';ctx.font='900 17px Nunito';ctx.textAlign='left';ctx.shadowColor='#17321b';ctx.shadowBlur=4;ctx.fillText(phaseNames[phase-1],18,30);ctx.shadowBlur=0;
}
function loop(t){let dt=Math.min((t-last)/1000||0,.033);last=t;if(state==='playing')update(dt);draw();requestAnimationFrame(loop)}
function jump(){if(state!=='playing')return;if(player.jumps<2){player.vy=player.jumps===0?-12:-10;player.jumps++;player.ground=false;}}
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(e.code))e.preventDefault();if(!keys[e.code]){if(['Space','ArrowUp','KeyW'].includes(e.code))jump();if(e.code==='KeyF')attack();if(e.code==='KeyR')fire();}keys[e.code]=true;if(e.code==='Escape'&&state==='playing')pauseGame();});window.addEventListener('keyup',e=>keys[e.code]=false);
document.querySelectorAll('.mobile-controls button').forEach(b=>{const k=b.dataset.key;const on=e=>{e.preventDefault();touch[k]=true;if(k==='Space')jump();if(k==='KeyF')attack();if(k==='KeyR')fire();};const off=e=>{e.preventDefault();touch[k]=false;};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off);});
function pauseGame(){if(state==='playing'){state='paused';showOverlay('JOGO PAUSADO','Sua aventura está em pausa.','CONTINUAR',()=>{state='playing';$('overlay').classList.add('hidden');});}else if(state==='paused'){state='playing';$('overlay').classList.add('hidden');}}
$('mainAction').onclick=resetGame;$('pause').onclick=pauseGame;$('fullscreen').onclick=()=>{const el=document.querySelector('.game-shell');if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();};
newLevel();showOverlay('JORNADA VIKING','Guie o destemido guerreiro Viking através de 15 fases difíceis!','INICIAR AVENTURA',resetGame);requestAnimationFrame(loop);
})();