const W = 900, H = 510;
let cursors, leftDown = false, rightDown = false, jumpDown = false;
let score = 0, scoreEl, statusEl;

window.addEventListener('load', () => {
  scoreEl = document.getElementById('score');
  scoreEl.textContent = 'Os: 0';
  statusEl = document.getElementById('status');

  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#9BD2FF',
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
  // Sky gradient background via Graphics in create()

  // Generate pixel-art textures for Mimi (Yorkshire), bone, and cat
  // Mimi (side view dog with brown/gray fur and pink scarf)
  this.textures.generate('mimi', { data: [
    '........6666......',
    '......66666666....',
    '.....6688888866...',
    '....668888888866..',
    '...6688888888886..',
    '..6688aa8888aa86..',
    '..6888aaa88aaa86..',
    '..68888888888886..',
    '..66888899988866..',
    '...668899999866...',
    '....6669888966....',
    '......668866......',
    '.....66.66.66.....',
    '....66..66..66....',
    '...66........66...',
    '..66..........66..'
  ], pixelWidth: 3, palette: {
    '6':'#6b4f32', // dark fur
    '8':'#b08968', // light fur
    '9':'#3a2f25', // shadow
    'a':'#deb887', // tan
    '.':'rgba(0,0,0,0)'
  }});

  // Bone
  this.textures.generate('bone', { data: [
    '....3333....',
    '..33333333..',
    '.3322222233.',
    '332222222233',
    '332222222233',
    '.3322222233.',
    '..33333333..',
    '....3333....'
  ], pixelWidth: 4, palette: {
    '2':'#F5F0DC', // bone light
    '3':'#C9C3AA', // bone edge
    '.':'rgba(0,0,0,0)'
  }});

  // Cat enemy (purple cat blob with ears)
  this.textures.generate('cat', { data: [
    '....55....55....',
    '...555..5555....',
    '..55555555555...',
    '.5555555555555..',
    '.5555ee55ee555..',
    '.5555555555555..',
    '..55555ff5555...',
    '...555555555....',
    '....55....55....'
  ], pixelWidth: 4, palette: {
    '5':'#7e57c2', // cat body
    'e':'#f2e7fe', // eyes white
    'f':'#222222', // eyes pupil
    '.':'rgba(0,0,0,0)'
  }});

  // Flag (finish)
  this.textures.generate('flag', { data: ['7777','7..7','7..7','7..7','7..7','7777'],
    pixelWidth: 8, palette: { '7':'#2ECC71', '.':'rgba(0,0,0,0)' }});

  // Ground block
  this.textures.generate('ground', { data: [
    '99999999',
    '96666669',
    '96666669',
    '96666669',
    '96666669',
    '99999999'
  ], pixelWidth: 8, palette: { '9':'#8B5A2B', '6':'#B8743B' }});
}

let player, platforms, bones, cats, flag, nameText;

function create(){
  // World size
  const width = 3600;
  this.cameras.main.setBounds(0, 0, width, H);
  this.physics.world.setBounds(0, 0, width, H);

  // Sky gradient
  const g = this.add.graphics();
  g.fillGradientStyle(0x9BD2FF, 0x9BD2FF, 0xE9F6FF, 0xE9F6FF, 1);
  g.fillRect(0,0,width,H);

  // Flat ground
  platforms = this.physics.add.staticGroup();
  for(let x=0; x<width; x+=64){
    platforms.create(x, H-16, 'ground').setOrigin(0,1).refreshBody();
  }

  // Player (Mimi) + name label
  player = this.physics.add.sprite(100, H-120, 'mimi').setCollideWorldBounds(true);
  player.setScale(1.1);
  this.physics.add.collider(player, platforms);

  nameText = this.add.text(player.x, player.y - player.displayHeight/2 - 14, 'MiMI', {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    fontSize: '16px', fontStyle: 'bold', color: '#ffffff'
  }).setOrigin(0.5, 1).setDepth(10);
  const nameBg = this.add.rectangle(nameText.x, nameText.y-8, nameText.width+10, 18, 0x000000, 0.35).setOrigin(0.5,1).setDepth(9);
  nameText.bg = nameBg;

  // Bones to collect
  bones = this.physics.add.group();
  for(let i=0;i<24;i++){
    const x = 260 + i*130;
    const y = Phaser.Math.Between(220, 340);
    const c = bones.create(x, y, 'bone');
    c.body.allowGravity = false;
    c.setBounce(0.2);
  }
  this.physics.add.overlap(player, bones, (_, c) => {
    score += 1; scoreEl.textContent = `Os: ${score}`; c.destroy();
  });

  // Cats (enemies)
  cats = this.physics.add.group();
  for(let i=0;i<10;i++){
    const x = 700 + i*280;
    const e = cats.create(x, H-60, 'cat');
    e.setBounce(1,0); e.setCollideWorldBounds(true);
    e.setVelocityX(Phaser.Math.Between(-90,-60));
  }
  this.physics.add.collider(cats, platforms);
  this.physics.add.collider(cats, cats);
  this.physics.add.overlap(player, cats, (p, e)=>{
    // Stomp if falling, else lose
    if (p.body.velocity.y > 150) { e.destroy(); p.setVelocityY(-360); flashStatus(this, '🐾 Miaou !'); }
    else { gameOver(this); }
  });

  // Finish flag
  flag = this.physics.add.staticSprite(width-120, H-80, 'flag');
  this.physics.add.overlap(player, flag, ()=>{ statusEl.textContent = '✨ Gagné ! Mimi a tous ses os !'; });

  // Keyboard
  cursors = this.input.keyboard.createCursorKeys();

  // Camera follow
  this.cameras.main.startFollow(player, true, 0.1, 0.1);

  // Tip
  statusEl.textContent = '← → pour courir • bouton à droite pour sauter';
  setTimeout(()=>statusEl.textContent='',2200);
}

function update(){
  // Follow name label above player
  if (nameText){
    nameText.x = player.x;
    nameText.y = player.y - player.displayHeight/2 - 10;
    if (nameText.bg){
      nameText.bg.x = nameText.x;
      nameText.bg.y = nameText.y - 2;
      nameText.bg.width = nameText.width + 12;
    }
  }

  const onGround = player.body.blocked.down;
  const left  = (cursors?.left?.isDown)  || leftDown;
  const right = (cursors?.right?.isDown) || rightDown;

  if (left) { player.setVelocityX(-240); player.setFlipX(true); }
  else if (right) { player.setVelocityX(240); player.setFlipX(false); }
  else { player.setVelocityX(0); }

  const wantJump = Phaser.Input.Keyboard.JustDown(cursors.up) || jumpDown;
  if (wantJump && onGround){ player.setVelocityY(-430); }
}

function gameOver(scene){
  statusEl.textContent = '💀 Aïe ! Touchez pour recommencer';
  scene.physics.pause();
  scene.input.once('pointerdown', ()=>{
    scene.scene.restart(); score=0; scoreEl.textContent = 'Os: 0'; statusEl.textContent='';
  });
}

function flashStatus(scene, text){
  statusEl.textContent = text;
  scene.time.delayedCall(600, ()=> statusEl.textContent = '');
}
