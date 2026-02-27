// Check for death reboot cinematic (handled initially by head script + CSS)
const deathOverlay = document.getElementById('death-overlay');
if (localStorage.getItem('death_reboot') === 'true') {
  // Ensure the overlay is ready and stays black while we prep the transition
  deathOverlay.style.visibility = 'visible';
  deathOverlay.classList.add('blackout');

  window.addEventListener('load', () => {
    // Wait a brief moment after load for smoothness
    setTimeout(() => {
      // Remove the blocking class that was forcing the black screen in the head
      document.documentElement.classList.remove('is-rebooting');
      localStorage.removeItem('death_reboot');

      // Now trigger the transition to open by removing the blackout class
      deathOverlay.classList.remove('blackout');

      // Fully hide after the 2s transition completes
      setTimeout(() => {
        deathOverlay.style.visibility = 'hidden';
      }, 2100);
    }, 500);
  });
}

// Theme toggle
// Health System State
let playerHP = 500;
const maxPlayerHP = 500;
let bossHP = 9999;
const maxBossHP = 9999;

function updateHPUI() {
  const pFill = document.getElementById('player-hp-fill');
  const pText = document.getElementById('player-hp-text');
  const bFill = document.getElementById('boss-hp-fill');
  const bText = document.getElementById('boss-hp-text');

  if (pFill) pFill.style.width = (playerHP / maxPlayerHP * 100) + '%';
  if (pText) pText.textContent = `${Math.max(0, playerHP)} / ${maxPlayerHP}`;
  if (bFill) bFill.style.width = (bossHP / maxBossHP * 100) + '%';
  if (bText) bText.textContent = `${Math.max(0, bossHP)} / ${maxBossHP}`;
}

const toggleBtn = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', 'light');
  toggleBtn.textContent = '🌙 DARK';
}
toggleBtn.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    toggleBtn.textContent = '☀️ LIGHT';
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    toggleBtn.textContent = '🌙 DARK';
    localStorage.setItem('theme', 'light');
  }
});

// Skill tag → Google search on click
document.querySelectorAll('.skill-tag').forEach(tag => {
  tag.style.cursor = 'pointer';
  tag.addEventListener('click', () => {
    const query = encodeURIComponent(tag.textContent.trim());
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  });
});

// Footer character running animation
const footerChar = document.getElementById('footer-char');
const bossChar = document.getElementById('boss-char');
const charBubble = document.getElementById('char-bubble');
const bubbleText = document.getElementById('bubble-text');
const SPEED_PX_S = 100; // pixels per second
let runningRight = true;

// Boss state variables
let isBossActive = false;
let bossState = 'hidden'; // 'hidden', 'running_in', 'idle'
let bossLeft = 0;
let isCinematic = false; // blocks all player input
let projectiles = [];
let isDead = false;

function calcDuration(distancePx) {
  return Math.round(distancePx / SPEED_PX_S * 1000); // ms
}

function startRun() {
  const totalDist = window.innerWidth + 200; // -180px to 110vw ≈ screen + 200
  const duration = calcDuration(totalDist);
  footerChar.style.animation = 'none';
  footerChar.offsetHeight; // reflow
  if (runningRight) {
    footerChar.style.animation = `run-right ${duration}ms linear`;
  } else {
    footerChar.style.animation = `run-left ${duration}ms linear`;
  }
  runningRight = !runningRight;
}

footerChar.addEventListener('animationend', () => { if (!isIdle) startRun(); });
startRun(); // kick off

// Click to toggle idle / run
let isIdle = false;
let savedLeft = null;
let savedFacingLeft = false;
let isLocked = false;
let isQuoteShowing = false;    // true while running quote bubble is visible
let idleAutoDismissTimer = null;
let isCombatMode = false;

function toggleChar(e) {
  e.preventDefault();
  if (isLocked || isCombatMode) return;
  isIdle = !isIdle;
  if (isIdle) {
    // Freeze at current position
    savedLeft = footerChar.getBoundingClientRect().left;
    savedFacingLeft = !runningRight;
    footerChar.style.animation = 'none';
    footerChar.style.left = savedLeft + 'px';
    footerChar.style.transform = savedFacingLeft ? 'scaleX(-1)' : 'scaleX(1)';
    footerChar.src = 'animation1.gif';

    if (isQuoteShowing) {
      // Interrupted a running quote — show Yes/No
      stopBubbleTracking();
      isQuoteShowing = false;
      clearTimeout(quoteDismissTimer);
      clearTimeout(quoteTimer);
      bubbleText.innerHTML = "Hey! What's going on? I'm on a mission —<br>wanna join? ⚔️";
      document.getElementById('bubble-btns').style.display = 'flex';
      charBubble.style.left = savedLeft + 'px';
      charBubble.classList.add('visible');
    } else {
      // Normal idle — show Yes/No bubble
      bubbleText.innerHTML = "Hey! What's going on? I'm on a mission —<br>wanna join? ⚔️";
      document.getElementById('bubble-btns').style.display = 'flex';
      charBubble.style.left = savedLeft + 'px';
      charBubble.classList.add('visible');
    }
  } else {
    // Show "bored" message briefly then resume
    bubbleText.innerHTML = 'Ugh, you bore me. 😒<br>Stop bothering me!';
    document.getElementById('bubble-btns').style.display = 'none';
    charBubble.classList.add('visible');
    isLocked = true;
    setTimeout(() => {
      isLocked = false;
      charBubble.classList.remove('visible');
      // Resume from saved position in same direction
      footerChar.src = 'animation3.gif';
      const screenW = window.innerWidth;
      const target = savedFacingLeft ? -180 : screenW + 20;
      const dist = Math.abs(target - savedLeft);
      const fullDist = screenW + 200;
      const duration = calcDuration(dist);
      const scaleX = savedFacingLeft ? -1 : 1;

      // Inject one-shot keyframe
      const styleId = 'resume-kf';
      document.getElementById(styleId)?.remove();
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `@keyframes resume-run {
          from { left: ${savedLeft}px; transform: scaleX(${scaleX}); }
          to   { left: ${target}px;   transform: scaleX(${scaleX}); }
        }`;
      document.head.appendChild(s);

      footerChar.style.transform = '';
      footerChar.style.left = '';
      footerChar.style.animation = 'none';
      footerChar.offsetHeight; // reflow
      footerChar.style.animation = `resume-run ${duration}ms linear`;

      // After this one-shot, hand back to normal loop
      footerChar.addEventListener('animationend', function onResume() {
        footerChar.removeEventListener('animationend', onResume);
        if (!isIdle) startRun();
      }, { once: true });
    }, 2000); // locked for 2s
  }
}

footerChar.addEventListener('click', toggleChar);
footerChar.addEventListener('touchstart', toggleChar, { passive: false });

// Yes / No button handlers
document.getElementById('btn-yes').addEventListener('click', (e) => {
  e.stopPropagation();
  clearTimeout(idleAutoDismissTimer);
  document.getElementById('bubble-btns').style.display = 'none';
  isLocked = true; // lock all clicks during countdown

  // Countdown 1 → 2 → 3
  bubbleText.innerHTML = '1...';
  setTimeout(() => { bubbleText.innerHTML = '2...'; }, 2000);
  setTimeout(() => {
    bubbleText.innerHTML = '3!! 💥';

    // After a brief pause trigger the fall
    setTimeout(() => {
      charBubble.classList.remove('visible');

      // Stagger-fall every section-box with random physics
      const sections = document.querySelectorAll('.section-box');
      sections.forEach((el, i) => {
        const rect = el.getBoundingClientRect();

        setTimeout(() => {
          el.style.position = 'fixed';
          el.style.top = rect.top + 'px';
          el.style.left = rect.left + 'px';
          el.style.width = rect.width + 'px';
          el.style.margin = '0';
          el.style.zIndex = '90'; // below footer (z-index 100)

          const dir = Math.random() < 0.5 ? 1 : -1;
          const driftX = (20 + Math.random() * 60) * dir;   // horizontal drift
          const rotMid = (5 + Math.random() * 10) * dir;
          const rotEnd = (15 + Math.random() * 25) * dir;
          const fallDist = window.innerHeight - rect.top + 80;

          el.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1, offset: 0 },
            { transform: `translate(${driftX * 0.4}px,${fallDist * 0.3}px) rotate(${rotMid}deg)`, opacity: 0.9, offset: 0.35 },
            { transform: `translate(${driftX}px,${fallDist}px) rotate(${rotEnd}deg)`, opacity: 0, offset: 1 },
          ], {
            duration: 1000 + Math.random() * 400 + i * 60,
            easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
            fill: 'forwards'
          }).onfinish = () => { el.style.visibility = 'hidden'; };
        }, i * 90);
      });

      // After all sections are done falling, rise the footer to half screen
      const lastDelay = sections.length * 90 + 1400;
      setTimeout(() => {
        const footer = document.querySelector('footer');
        const halfH = Math.round(window.innerHeight / 2);
        footer.animate([
          { bottom: '0px', height: '50px' },
          { bottom: '0px', height: halfH + 'px' },
        ], { duration: 800, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' });

        // After footer finishes rising, character enters Combat Mode
        setTimeout(() => {
          isCombatMode = true;

          // Show player HP bar
          const pHP = document.getElementById('player-hp-container');
          if (pHP) pHP.style.display = 'block';
          updateHPUI();

          footerChar.style.animation = 'none'; // freeze original animation
          const charRect = footerChar.getBoundingClientRect();
          footerChar.style.left = charRect.left + 'px';
          footerChar.src = 'animation1.gif'; // idle

          bubbleText.innerHTML = 'Use A and D to move! 🎮';
          document.getElementById('bubble-btns').style.display = 'none';
          charBubble.style.left = charRect.left + 'px';
          charBubble.classList.add('visible');

          // start combat movement loop
          lastCombatTime = 0;
          requestAnimationFrame(combatMovementLoop);
        }, 900);
      }, lastDelay);
    }, 800);
  }, 4000);
});

document.getElementById('btn-no').addEventListener('click', (e) => {
  e.stopPropagation();
  clearTimeout(idleAutoDismissTimer);
  bubbleText.innerHTML = 'Ugh, you bore me. 😒<br>Stop bothering me!';
  document.getElementById('bubble-btns').style.display = 'none';
  isLocked = true;
  setTimeout(() => {
    isLocked = false;
    charBubble.classList.remove('visible');
    isIdle = false;
    footerChar.src = 'animation3.gif';
    startRun();
    scheduleNextQuote();
  }, 2000);
});

// Random quotes while running
function getRunningQuotes() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return [
    "If I were a recruiter,<br>I'd hire this guy. Pretty solid. 👀",
    isLight
      ? "Switch to Dark Theme,<br>I wanna sleep already... 🌙"
      : "Switch to Light Theme!<br>It's daytime, ya cow! ☀️",
    "I'll fight until I drop. ⚔️",
    "Those goblins are absolutely<br>UNHINGED. 😤",
    "My legs never get tired.<br>I'm built different. 💪",
    "Have you checked out<br>his Google Play game? Go look! 🎮",
    "Unity? C#? He knows his stuff.<br>Trust me, I live here. 🏠",
    "I've been running for so long...<br>WHERE IS THE END?! 😭",
    "Someone give this dev a job.<br>Seriously. NOW. 👇",
    "I once defeated a dragon.<br>NBD. 🐉",
    "My sword is sharper than<br>my wit. ...barely. 😅",
    "Psst. Click the skill tags.<br>They open Google! 🔍",
    "Dark theme = pro mode.<br>Fight me. 😎",
    "Loading awesome content...<br>Oh wait, it's already here. ✅",
  ];
}

let quoteTimer = null;
let quoteDismissTimer = null;

function scheduleNextQuote() {
  clearTimeout(quoteTimer);
  const delay = 5000;
  quoteTimer = setTimeout(() => {
    if (!isIdle) showRunningQuote();
  }, delay);
}

let bubbleTrackRAF = null;

function trackBubbleToChar() {
  const charRect = footerChar.getBoundingClientRect();
  charBubble.style.left = charRect.left + 'px';
  bubbleTrackRAF = requestAnimationFrame(trackBubbleToChar);
}

function stopBubbleTracking() {
  if (bubbleTrackRAF) {
    cancelAnimationFrame(bubbleTrackRAF);
    bubbleTrackRAF = null;
  }
}

function showRunningQuote() {
  const quotes = getRunningQuotes();
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  bubbleText.innerHTML = quote;
  document.getElementById('bubble-btns').style.display = 'none';
  charBubble.classList.add('visible');
  isQuoteShowing = true;
  trackBubbleToChar();

  quoteDismissTimer = setTimeout(() => {
    isQuoteShowing = false;
    charBubble.classList.remove('visible');
    stopBubbleTracking();
    if (!isIdle) scheduleNextQuote();
  }, 3600);
}

// Kick off the first quote after 6s
quoteTimer = setTimeout(() => { if (!isIdle) showRunningQuote(); }, 3600);

// Click bubble to dismiss running quote and reset timer
charBubble.addEventListener('click', (e) => {
  if (!isQuoteShowing) return; // only handle running quotes
  e.stopPropagation();
  isQuoteShowing = false;
  charBubble.classList.remove('visible');
  stopBubbleTracking();
  clearTimeout(quoteTimer);
  scheduleNextQuote(); // reset timer for next quote
});

// Strength card click toggle
document.querySelectorAll('.strength-card').forEach(card => {
  card.addEventListener('click', () => {
    const wasSelected = card.classList.contains('selected');
    document.querySelectorAll('.strength-card').forEach(c => c.classList.remove('selected'));
    if (!wasSelected) card.classList.add('selected');
  });
});

// Smooth scroll for nav — offset for sticky header + nav
document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const headerH = document.querySelector('header')?.offsetHeight || 70;
        const navH = document.querySelector('nav')?.offsetHeight || 35;
        const offset = headerH + navH + 8;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
  });
});

// --- Combat Mode Movement ---
const combatKeys = { a: false, d: false };
const COMBAT_SPEED = 300; // px/s
let combatRAF = null;
let lastCombatTime = 0;
let hasPressedMovementKeys = false;
let isAttacking = false;
let lastAttackTime = 0;
let isBlocking = false;
let lastBlockTime = 0;

window.addEventListener('click', (e) => {
  if (!isCombatMode || isCinematic) return;
  if (e.target.tagName.toLowerCase() === 'button') return; // ignore UI buttons if any exist

  // Can't attack if blocking
  if (isBlocking) return;

  // Can't attack if cooldown hasn't finished (700ms)
  if (performance.now() - lastAttackTime < 700) return;

  // Can't attack while moving (holding A or D)
  if (combatKeys.a || combatKeys.d) return;

  if (isAttacking) return;
  isAttacking = true;
  lastAttackTime = performance.now();
  // Bypass browser cache to restart the GIF animation from frame 0
  footerChar.src = 'animation4.gif?t=' + lastAttackTime;

  // Damage Boss if close enough
  if (isBossActive) {
    const charRect = footerChar.getBoundingClientRect();
    const bossRect = bossChar.getBoundingClientRect();
    const dist = Math.abs((charRect.left + charRect.width / 2) - (bossRect.left + bossRect.width / 2));

    if (dist < 250) { // Attack range
      bossHP -= 1000;
      updateHPUI();
      bossChar.classList.add('hp-flash');
      setTimeout(() => bossChar.classList.remove('hp-flash'), 200);
      console.info("Combat: Hit Boss! HP:", bossHP);

      if (bossHP <= 0) {
        // Victory!
        bossHP = 0;
        updateHPUI();
        triggerVictory();
      }
    }
  }

  // Animation duration is exactly 400ms. Revert sprite to idle so it won't loop twice.
  setTimeout(() => {
    if (isCombatMode) footerChar.src = 'animation1.gif';
  }, 400);

  // Locking for 700ms cooldown (movement and next attack)
  setTimeout(() => {
    isAttacking = false;
  }, 700);
});

window.addEventListener('keydown', (e) => {
  if (!isCombatMode || isCinematic) return;
  const k = e.key.toLowerCase();
  if (k === 'a') combatKeys.a = true;
  if (k === 'd') combatKeys.d = true;

  if (e.key === ' ' && !isAttacking && !isBlocking) {
    // If pressing space while moving, it overrides and stops movement
    e.preventDefault();

    isBlocking = true;
    lastBlockTime = performance.now();

    // Play block animation. It will loop or stay, depending on GIF.
    // We assume we leave it playing while space is held.
    footerChar.src = 'animation5.gif?t=' + lastBlockTime;
  }
});

window.addEventListener('keyup', (e) => {
  if (!isCombatMode || isCinematic) return;
  const k = e.key.toLowerCase();
  if (k === 'a') combatKeys.a = false;
  if (k === 'd') combatKeys.d = false;

  if (e.key === ' ') {
    isBlocking = false;
    // Immediately return to idle if not moving
    if (footerChar.src.includes('animation5.gif')) {
      footerChar.src = 'animation1.gif';
    }
  }
});

function combatMovementLoop(timestamp) {
  if (!isCombatMode) return;
  if (!lastCombatTime) lastCombatTime = timestamp;
  const dt = (timestamp - lastCombatTime) / 1000;
  lastCombatTime = timestamp;

  let moved = false;
  let currentLeft = parseFloat(footerChar.style.left);
  if (isNaN(currentLeft)) {
    currentLeft = footerChar.getBoundingClientRect().left;
  }

  // Prevent moving while swinging the sword, blocking, or during cinematic
  if (!isAttacking && !isBlocking && !isCinematic) {
    if (combatKeys.a && !combatKeys.d) {
      currentLeft -= COMBAT_SPEED * dt;
      footerChar.style.transform = 'scaleX(-1)';
      moved = true;
    } else if (combatKeys.d && !combatKeys.a) {
      currentLeft += COMBAT_SPEED * dt;
      footerChar.style.transform = 'scaleX(1)';
      moved = true;
    }
  }

  // Projectile logic
  if (isCombatMode && !isDead) {
    projectiles.forEach((p, index) => {
      // Homing logic: move towards player center
      const charRect = footerChar.getBoundingClientRect();
      const pRect = p.el.getBoundingClientRect();
      const targetX = charRect.left + charRect.width / 2;
      const targetY = charRect.top + charRect.height / 2;
      const currentX = p.x;
      const currentY = p.y;

      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        // Homing with wavy (snaking) effect
        const angle = Math.atan2(dy, dx);
        // Oscillation: amplitude of 0.8 radians, frequency varied per projectile
        const wavyAngle = angle + Math.sin(timestamp * 0.005 * p.freq + p.offset) * p.amp;

        const speed = COMBAT_SPEED * 2.5;
        p.vx = Math.cos(wavyAngle) * speed;
        p.vy = Math.sin(wavyAngle) * speed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Rotate based on movement or just spin
      p.rotation += 360 * dt;

      p.el.style.left = p.x + 'px';
      p.el.style.top = p.y + 'px';
      p.el.style.transform = `rotate(${p.rotation}deg)`;

      // Collision detection
      const hitDist = 30; // proximity for hit
      if (dist < hitDist) {
        if (isBlocking) {
          // Deflect/Destroy projectile
          p.el.remove();
          projectiles.splice(index, 1);
          console.info("Combat: Projectile blocked!");

          // If all projectiles are gone, Boss attacks again
          if (projectiles.length === 0 && !isDead) {
            setTimeout(() => {
              if (isCombatMode && !isDead) startBossAttack();
            }, 1000);
          }
        } else {
          // Instead of instant death, take 50 damage
          p.el.remove();
          projectiles.splice(index, 1);
          playerHP -= 50;
          updateHPUI();
          footerChar.classList.add('hp-flash');
          setTimeout(() => footerChar.classList.remove('hp-flash'), 200);
          console.info("Combat: Hit by projectile! Player HP:", playerHP);

          if (playerHP <= 0) {
            playerHP = 0;
            updateHPUI();
            triggerDeath();
          } else {
            // If still alive but all projectiles cleared, boss attacks again
            if (projectiles.length === 0 && !isDead) {
              setTimeout(() => {
                if (isCombatMode && !isDead) startBossAttack();
              }, 1000);
            }
          }
        }
      }
    });
  }

  if (moved && !hasPressedMovementKeys) {
    hasPressedMovementKeys = true;
    console.info("Combat: First movement detected. Boss timer starting...");
    setTimeout(() => {
      if (isCombatMode) {
        console.info("Combat: Showing instructions.");
        bubbleText.innerHTML = 'Left click to attack! ⚔️<br>Space for block 🛡️';
        charBubble.classList.add('visible');

        // 2 seconds after showing instruction, spawn the boss (Shortened)
        setTimeout(() => {
          if (isCombatMode) {
            console.info("Combat: Spawning Boss!");
            // Teleport player to the left edge and reset state
            currentLeft = 20;
            footerChar.style.left = currentLeft + 'px';
            footerChar.src = 'animation1.gif';
            footerChar.style.transform = 'scaleX(1)';
            isBlocking = false;
            isAttacking = false;
            combatKeys.a = false;
            combatKeys.d = false;

            // Spawn Boss from the right edge
            isCinematic = true;
            isBossActive = true;
            bossState = 'running_in';
            bossChar.style.display = 'block';
            bossChar.style.zIndex = '300';

            // Show Boss HP Bar
            const bHP = document.getElementById('boss-hp-container');
            if (bHP) bHP.style.display = 'block';
            updateHPUI();

            bossLeft = window.innerWidth;
            bossChar.style.left = bossLeft + 'px';
            bossChar.src = './boss_run.gif'; // Explicit relative path

            // Hide player bubble to focus on boss
            charBubble.classList.remove('visible');
          }
        }, 2000);
      }
    }, 2000);
  }

  // keep within screen bounds
  const minLeft = 0;
  const maxLeft = window.innerWidth - footerChar.offsetWidth;
  currentLeft = Math.max(minLeft, Math.min(maxLeft, currentLeft));

  footerChar.style.left = currentLeft + 'px';
  // keep bubble and HP bar attached
  if (charBubble.classList.contains('visible')) {
    charBubble.style.left = currentLeft + 'px';
  }
  const playerHPBar = document.getElementById('player-hp-container');
  if (playerHPBar) {
    // 120px is the width of the HP bar defined in CSS
    playerHPBar.style.left = (currentLeft + (footerChar.offsetWidth / 2) - 60) + 'px';
  }

  // Boss logic
  if (isBossActive && bossState === 'running_in') {
    // Boss walks left - Increased speed (0.8x player speed)
    bossLeft -= (COMBAT_SPEED * 0.8) * dt;
    bossChar.style.left = bossLeft + 'px';

    // Target position: walk until it reaches 75% of the screen width from the left
    const bossWidth = bossChar.offsetWidth || 350;
    const targetLeft = window.innerWidth - bossWidth - 50;

    if (bossLeft <= targetLeft) {
      console.info("Combat: Boss reached target position. Standing idle.");
      bossLeft = targetLeft;
      bossState = 'idle';
      bossChar.src = './boss_idle.gif';
      bossChar.style.left = bossLeft + 'px';

      // Display boss name logic
      const bossName = document.getElementById('boss-name');
      if (bossName) {
        bossName.style.display = 'block';
        bossName.style.opacity = '1';
        bossName.textContent = '';
        const fullText = "Dark Wizard";

        requestAnimationFrame(() => {
          bossName.textContent = fullText;
          const finalWidth = bossName.offsetWidth;
          // Center name above boss, accounting for the flipped sprite
          const nameLeft = bossLeft + (bossWidth / 2) - (finalWidth / 2) + 40;
          bossName.style.left = nameLeft + 'px';
          bossName.textContent = '';

          // Small delay before typing begins
          setTimeout(() => {
            let i = 0;
            const typeInterval = setInterval(() => {
              bossName.textContent += fullText[i];
              i++;
              if (i >= fullText.length) {
                clearInterval(typeInterval);

                // Now start typing boss dialogue
                const bossBubble = document.getElementById('boss-bubble');
                if (bossBubble) {
                  bossBubble.style.display = 'block';

                  requestAnimationFrame(() => {
                    bossBubble.style.opacity = '1';
                    bossBubble.style.transform = 'translateY(0)';

                    const dialogueText = "You can't defeat me unless you hire this dev!";
                    bossBubble.textContent = '';

                    // Position bubble's right edge relatively close to the right edge of the boss image 
                    // (since the image is flipped and the head is near the right edge)
                    bossBubble.style.right = (bossChar.offsetWidth * 0.25) + 'px';

                    setTimeout(() => {
                      let j = 0;
                      const talkInterval = setInterval(() => {
                        bossBubble.textContent += dialogueText[j];
                        j++;
                        if (j >= dialogueText.length) {
                          clearInterval(talkInterval);
                          isCinematic = false; // Release input lock after the speech is fully typed

                          // Hide bubble after 4 seconds
                          setTimeout(() => {
                            bossBubble.style.opacity = '0';
                            setTimeout(() => { bossBubble.style.display = 'none'; }, 300);

                            // Immediately start Boss Attack Sequence
                            startBossAttack();
                          }, 1000);
                        }
                      }, 50); // fast typing for speech
                    }, 500); // Wait 0.5s after name finished typing
                  });
                } else {
                  isCinematic = false;
                }
              }
            }, 100); // 100ms per character
          }, 300);
        });
      }
    }
  }

  // swap Sprite based on movement (run vs idle)
  if (!isAttacking && !isBlocking && !isDead) {
    const isCurrentlyIdle = footerChar.src.includes('animation1.gif');
    if (moved && isCurrentlyIdle) {
      footerChar.src = 'animation3.gif';
    } else if (!moved && !isCurrentlyIdle) {
      footerChar.src = 'animation1.gif';
    }
  }

  combatRAF = requestAnimationFrame(combatMovementLoop);
}

function startBossAttack() {
  bossChar.src = './boss_attack.gif';

  // Spawn 5 projectiles after a short animation wind-up
  setTimeout(() => {
    const bRect = bossChar.getBoundingClientRect();
    const spawnX = bRect.left + bRect.width / 2;
    const spawnY = bRect.top + 50; // top of boss

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'boss-projectile';
        document.body.appendChild(el);

        const p = {
          el: el,
          x: spawnX,
          y: spawnY,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50,
          rotation: Math.random() * 360,
          // Wavy parameters
          offset: Math.random() * Math.PI * 2,
          freq: 0.8 + Math.random() * 1.5, // Frequency of oscillation
          amp: 0.5 + Math.random() * 0.5   // Amplitude in radians
        };
        projectiles.push(p);
      }, i * 300); // staggered spawn
    }
  }, 800);

  // Return to idle after animation finishes (approx 2s)
  setTimeout(() => {
    if (!isDead) {
      bossChar.src = 'boss_idle.gif';
    }
  }, 2000);
}

function triggerDeath() {
  if (isDead) return;
  isDead = true;
  isCinematic = true; // Final lock

  // Set flag for persistent death screen on reload
  localStorage.setItem('death_reboot', 'true');

  // Player death visuals (stop animation)
  footerChar.src = 'animation1.gif';
  footerChar.style.filter = 'grayscale(1) brightness(0.5) blur(1px)';

  const overlay = document.getElementById('death-overlay');
  overlay.style.visibility = 'visible';
  requestAnimationFrame(() => {
    overlay.classList.add('blackout');
  });

  // Reload after cinematic ends
  setTimeout(() => {
    window.location.reload();
  }, 2500);
}

function triggerVictory() {
  if (isDead) return;
  isCinematic = true;
  isBossActive = false;

  // Boss death visuals
  bossChar.style.filter = 'brightness(2) contrast(2) grayscale(1)';
  bossChar.style.transition = 'opacity 2s, transform 2s';
  bossChar.style.transform += ' scale(0)';
  bossChar.style.opacity = '0';

  const bossName = document.getElementById('boss-name');
  if (bossName) bossName.style.display = 'none';
  const bossHPContainer = document.getElementById('boss-hp-container');
  if (bossHPContainer) bossHPContainer.style.display = 'none';

  console.info("Combat: VICTORY!");

  // Victory dialogue from char
  setTimeout(() => {
    bubbleText.innerHTML = "I did it! The Wizard is gone! 🎉<br>Time to see the portfolio...";
    charBubble.classList.add('visible');

    setTimeout(() => {
      charBubble.classList.remove('visible');
      isCinematic = false;
      isCombatMode = false;
      // Optionally hide player hp bar
      const pHP = document.getElementById('player-hp-container');
      if (pHP) pHP.style.display = 'none';
    }, 5000);
  }, 2500);
}