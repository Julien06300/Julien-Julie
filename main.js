const W = 900, H = 510;
let cursors, leftDown = false, rightDown = false, jumpDown = false;
let score = 0, scoreEl, statusEl;

window.addEventListener('load', () => {
  scoreEl = document.getElementById('score');
  statusEl = document.getElementById('status');

  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#5EC8F8',
    physics: { default: 'arcade', arcade: { gravity: { y: 1000 }, debug: false } },
    scene: { preload, create, update }
  };
  new Phaser.Game(config);

  // Touch controls
  const l = document.getElementById('left');
  const r = document.getElementById('right');
  const j = document.getElementById('jump');
  const press = (el, setter) => {
    const on = (e)=>{ e.preventDefault(); setter(true); };
    const off= (e)=>{ e.preventDefault(); setter(false); };
    el.addEventListener('touchstart', on, {passive:false});
    el.addEventListener('touchend', off, {passive:false});
    el.addEventListener('touchcancel', off, {passive:false});
    el.addEventListener('mousedown', on);
    document.addEventListener('mouseup', off);
  };
  press(l, v=>leftDown=v);
  press(r, v=>rightDown=v);
  press(j, v=>jumpDown=v);
});

function preload(){
  // Textures générées (pas d’assets externes)
  this.textures.generate('block', { data: [
    '999999','966669','966669','966669','966669','999999',
  ], pixelWidth: 8, palette: { '9':'#8B5A2B', '6':'#B8743B' }});

  this.textures.generate('coin', { data: [
    '....33....','...3333...','..322223..','.32222223.','.32222223.','.32222223.','..322223..','...3333...','....33....'
  ], pixelWidth: 5, palette: { '2':'#FFD54A', '3':'#C08F2A', '.':'rgba(0,0,0,0)' }});

  this.textures.generate('flag', { data: [
    '7777','7..7','7..7','7..7','7..7','7777'
  ], pixelWidth: 8, palette: { '7':'#2ECC71', '.':'rgba(0,0,0,0)' }});

  this.textures.generate('enemy', { data: [
    '....5555....','..55555555..','.5555555555.','.5555555555.','..55.55.55..','....5555....'
  ], pixelWidth: 5, palette: { '5':'#8E2DE2', '.':'rgba(0,0,0,0)' }});

  this.textures.generate('player', { data: [
    '..44..','.4444.','444444','446644','466664','46..64'
  ], pixelWidth: 8, palette: { '4':'#ff5a5f', '6':'#222' }});
}

let player, platforms, coins, enemies, flag;
let canDouble = false, jumpCount = 0;

function create(){
  const width = 4000;
  this.cameras.main.setBounds(0, 0, width, H);
  this.physics.world.setBounds(0, 0, width, H);

  const g = this.add.graphics();
  g.fillGradientStyle(0x5EC8F8, 0x5EC8F8, 0xB8E9FF, 0xB8E9FF, 1);
  g.fillRect(0,0,width,H);

  // Sol
  platforms = this.physics.add.staticGroup();
  for(let x=0; x<width; x+=64){
    const b = platforms.create(x, H-16, 'block').setOrigin(0,1).refreshBody();
    b.setScale(1,1).refreshBody();
  }
  const plats = [
    {x:300,y:420},{x:500,y:360},{x:700,y:300},
    {x:1000,y:420},{x:1200,y:360},{x:1450,y:300},
    {x:1750,y:420},{x:2000,y:360},{x:2250,y:300},
    {x:2600,y:420},{x:2850,y:360},{x:3150,y:300},
  ];
  plats.forEach(p=>platforms.create(p.x, p.y, 'block').setOrigin(0,1).refreshBody());

  // Joueur
  player = this.physics.add.sprite(100, H-100, 'player').setCollideWorldBounds(true);
  this.physics.add.collider(player, platforms);

  // Pièces
  coins = this.physics.add.group();
  for(let i=0;i<25;i++){
    const x = 300 + i*140 + Phaser.Math.Between(-10, 10);
    const y = Phaser.Math.Between(160, 360);
    const c = coins.create(x, y, 'coin');
    c.body.allowGravity = false;
    c.setBounce(0.3);
  }
  this.physics.add.overlap(player, coins, (_, c) => {
    score += 1; scoreEl.textContent = `Pièces: ${score}`; c.destroy();
  });

  // Ennemis
  enemies = this.physics.add.group();
  for(let i=0;i<8;i++){
    const x = 800 + i*400;
    const e = enemies.create(x, H-60, 'enemy');
    e.setBounce(1,0); e.setCollideWorldBounds(true);
    e.setVelocityX(Phaser.Math.Between(-100,-60));
  }
  this.physics.add.collider(enemies, platforms);
  this.physics.add.collider(enemies, enemies);
  this.physics.add.overlap(player, enemies, (p, e)=>{
    if (p.body.velocity.y > 150) { e.destroy(); p.setVelocityY(-350); statusEl.textContent = 'Stomp!'; setTimeout(()=>statusEl.textContent='',600); }
    else { gameOver(this); }
  });

  // Drapeau
  flag = this.physics.add.staticSprite(3800, H-80, 'flag');
  this.physics.add.overlap(player, flag, ()=>{
    statusEl.textContent = '✨ Gagné !';
  });

  // Clavier
  cursors = this.input.keyboard.createCursorKeys();

  // Caméra
  this.cameras.main.startFollow(player, true, 0.1, 0.1);

  // Tips
  statusEl.textContent = '← → pour bouger, bouton à droite pour sauter';
  setTimeout(()=>statusEl.textContent='',2500);
}

function update(){
  const onGround = player.body.blocked.down;
  const left  = cursors.left.isDown  || leftDown;
  const right = cursors.right.isDown || rightDown;

  if (left) { player.setVelocityX(-220); player.setFlipX(true); }
  else if (right) { player.setVelocityX(220); player.setFlipX(false); }
  else { player.setVelocityX(0); }

  if (onGround) { jumpCount = 0; canDouble = true; }

  const wantJump = Phaser.Input.Keyboard.JustDown(cursors.up) || jumpDown;
  if (wantJump){
    if (onGround){ player.setVelocityY(-430); jumpCount = 1; }
    else if (canDouble && jumpCount < 2){ player.setVelocityY(-380); canDouble = false; jumpCount = 2; }
  }
}

function gameOver(scene){
  statusEl.textContent = '💀 Oups ! Touchez pour recommencer';
  scene.physics.pause();
  scene.input.once('pointerdown', ()=>{
    scene.scene.restart(); score=0; scoreEl.textContent = 'Pièces: 0'; statusEl.textContent='';
  });
}
