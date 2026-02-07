const cards = [
  { file: "angelic_totem.webp", classes: [] },
  { file: "arcane_barrier.webp", classes: [] },
  { file: "archelon_mount.webp", classes: [] },
  { file: "astral_halo.webp", classes: [] },

  { file: "backswing.webp", classes: ["rogue"] },
  { file: "bash.webp", classes: [] },
  { file: "black_imp.webp", classes: [] },
  { file: "blood_pact.webp", classes: [] },
  { file: "bloodspike_plating.webp", classes: [] },
  { file: "bubbling_brew.webp", classes: [] },
  { file: "celestial_extraction.webp", classes: [] },

  { file: "cleave.webp", classes: ["knight", "mage"] },
  { file: "counter_spell.webp", classes: [] },
  { file: "creeping_miasma.webp", classes: [] },

  { file: "crescent_helm.webp", classes: ["knight"] },
  { file: "critical_strike.webp", classes: ["knight"] },
  { file: "crush.webp", classes: ["knight", "rogue"] },

  { file: "devouring_urn.webp", classes: [] },
  { file: "dream_parasite.webp", classes: [] },

  { file: "druids_poise.webp", classes: ["knight", "mage", "rogue"] },
  { file: "dwarvish_salve.webp", classes: [] },
  { file: "encumber.webp", classes: [] },

  { file: "execute.webp", classes: ["knight"] },
  { file: "faes_whisper.webp", classes: ["knight"] },
  { file: "fireball.webp", classes: ["mage"] },

  { file: "forgemasters_lie.webp", classes: [] },
  { file: "green_imp.webp", classes: [] },
  { file: "hasten.webp", classes: [] },

  { file: "heroic_chestplate.webp", classes: ["knight"] },
  { file: "liquid_courage.webp", classes: ["mage", "rogue"] },
  { file: "living_wall.webp", classes: [] },

  { file: "looking_glass.webp", classes: ["rogue"] },
  { file: "loyal_companion.webp", classes: [] },

  { file: "mana_surge.webp", classes: ["mage"] },
  { file: "mnemonic_shard.webp", classes: [] },
  { file: "mori_totem.webp", classes: [] },
  { file: "oracle_of_the_grove.webp", classes: [] },

  { file: "phantom_bolt.webp", classes: ["mage"] },
  { file: "pierce.webp", classes: ["rogue"] },
  { file: "predestination.webp", classes: [] },
  { file: "puncture.webp", classes: [] },
  { file: "punisher.webp", classes: [] },

  { file: "purifying_flask.webp", classes: ["knight"] },
  { file: "reanimate.webp", classes: [] },
  { file: "red_imp.webp", classes: [] },
  { file: "reminisce.webp", classes: [] },
  { file: "saving_echo.webp", classes: [] },
  { file: "searing_gaze.webp", classes: [] },
  { file: "silencing_barrier.webp", classes: [] },
  { file: "soul_totem.webp", classes: [] },

  { file: "stupify.webp", classes: ["rogue"] },
  { file: "summon_gemini.webp", classes: [] },

  { file: "thistle_wart.webp", classes: ["mage"] },
  { file: "thorned_crown.webp", classes: [] },

  { file: "trample.webp", classes: ["mage"] },
  { file: "vampyric_blood.webp", classes: [] },
  { file: "vindicta_totem.webp", classes: [] },
  { file: "vulnerog_totem.webp", classes: ["mage"] },

  { file: "wailing_curse.webp", classes: ["rogue"] },
  { file: "aegis_aura.webp", classes: ["rogue"] }
];

const library = document.getElementById("card-library");
const overlay = document.getElementById("overlay");
const overlayImg = document.getElementById("overlay-img");
const overlayCard = overlay.querySelector(".overlay-card");
const glint = overlay.querySelector(".glint");

let activeCards = [];
let orbitTime = 0;

let overlayIndex = 0;
let overlayCards = [];

const BASE_SCALE = 1.3;

/* =====================
   APP STATE
===================== */
const appState = {
  started: false,
  activeClass: null,
  layout: "hidden"
};

/* =====================
   CLASS BUTTON FLOAT
===================== */
const classButtons = [...document.querySelectorAll("#class-select .deck-btn")];

const buttonFloatState = classButtons.map(btn => ({
  el: btn,
  offsetX: randRange(-1, 1),
  offsetY: randRange(-1, 1),
  speed: randRange(0.4, 0.8),
  phase: randRange(0, Math.PI * 2)
}));

/* =====================
   RENDER CARDS (CIRCLE)
===================== */
function renderCircle(className) {
  library.innerHTML = "";
  library.className = "circle";
  activeCards = []; // RESET STATE

  const filtered = cards.filter(c => c.classes.includes(className));
  const count = filtered.length;

  //  Radius size / scale
  
  const BASE_RADIUS = 0.25;
  const radius = Math.min(window.innerWidth, window.innerHeight) * BASE_RADIUS;

  //  Render cards
  filtered.forEach((card, i) => {
    const angle = (i / count) * Math.PI * 2;
    const depth = randRange(0.8, 1.2);

    const cardDiv = document.createElement("div");
    cardDiv.className = "card";

    const img = document.createElement("img");
    img.src = `cards/${card.file}`;

    cardDiv.appendChild(img);
    library.appendChild(cardDiv);

    // ----- Store orbital state -----
    const baseZ = Math.floor(depth * 100);

    const cardState = {
      el: cardDiv,
      img,
      angle,
      radius,
      depth,
      orbitSpeed: randRange(0.15, 0.35),
      orbitOffset: randRange(0, Math.PI * 2),
      baseZ
    };

    cardDiv.style.zIndex = baseZ;
    cardState.baseZ = baseZ;  

    activeCards.push(cardState);

    // ----- Initial collapsed state -----
    cardDiv.style.left = "50%";
    cardDiv.style.top = "50%";
    cardDiv.style.transform =
      "translate(-50%, -50%) scale(BASE_SCALE)";  //  Set scale of init cards here
    cardDiv.style.opacity = "0";

    // ----- Animate outward -----
    requestAnimationFrame(() => {
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      
      cardDiv.style.transition =
        "transform 1s cubic-bezier(.16,1,.3,1), opacity 0.6s ease";

      cardDiv.style.transform =
        `translate(-50%, -50%)
         translate(${x}px, ${y}px)
         scale(${BASE_SCALE * (0.85 + depth * 0.15)})`;

      cardDiv.style.opacity = "1";
    });

    // ----- Hover tilt -----
    cardDiv.addEventListener("mousemove", e => {
      cardDiv.style.zIndex = 1000; // brings to front
      cardDiv.style.filter = "brightness(1.1)";

      const r = cardDiv.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;

      img.style.transform =
        `rotateX(${-dy * 10}deg)
         rotateY(${dx * 10}deg)
         scale(${BASE_SCALE * 1.01})`;
    });

    cardDiv.addEventListener("mouseleave", () => {
    cardDiv.style.filter = "brightness(1.00)";

      img.style.transform = "";
      cardDiv.style.zIndex = cardState.baseZ;
    });

    cardDiv.addEventListener("click", () => openOverlay(card.file));
  });
}

window.addEventListener("resize", () => {
  if (!library.classList.contains("circle")) return;

  const BASE_RADIUS = 0.25;

  activeCards.forEach(card => {
    card.radius =
      Math.min(window.innerWidth, window.innerHeight) * BASE_RADIUS;
  });
});

/* =====================
   CLASS BUTTONS
===================== */
document.querySelectorAll("#class-select button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.body.classList.add("class-locked");
    const cls = btn.dataset.class;

    document.body.classList.add("started");
    appState.started = true;
    appState.activeClass = cls;
    appState.layout = "circle";

    renderCircle(cls);

    document
      .querySelectorAll("#class-select button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

/* =====================
   OVERLAY
===================== */
function openOverlay(file) {
  // Use currently active cards (already filtered by class)
  overlayCards = activeCards.map(c => c.img.src);
  overlayIndex = overlayCards.findIndex(src => src.includes(file));

  overlayImg.src = overlayCards[overlayIndex];
  overlay.classList.add("active");

  overlayCard.addEventListener("mousemove", overlayTilt);
  window.addEventListener("wheel", overlayScroll, { passive: false });
  window.addEventListener("keydown", overlayKeys);
}

function cycleOverlay(dir) {
  overlayIndex =
    (overlayIndex + dir + overlayCards.length) % overlayCards.length;

  overlayImg.src = overlayCards[overlayIndex];
}

function overlayScroll(e) {
  e.preventDefault();

  if (e.deltaY > 0) cycleOverlay(1);
  else cycleOverlay(-1);
}

function overlayKeys(e) {
  if (e.key === "ArrowRight") cycleOverlay(1);
  if (e.key === "ArrowLeft") cycleOverlay(-1);
}

function overlayTilt(e) {
  const r = overlayCard.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;

  overlayCard.style.transform =
    `rotateX(${-py * 12}deg) rotateY(${px * 12}deg) scale(1.05)`;

  glint.style.backgroundPosition =
    `${50 + px * 25}% ${50 + py * 25}%`;
}

overlay.addEventListener("click", () => {
  overlay.classList.remove("active");
  overlayCard.style.transform = "";

  window.removeEventListener("wheel", overlayScroll);
  window.removeEventListener("keydown", overlayKeys);
});

overlayCard.addEventListener("click", e => e.stopPropagation());

/* =====================
   HELPERS
===================== */
function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

function updateButtonFloat(dt) {
  if (appState.started) return; // stop floating once a class is chosen

  buttonFloatState.forEach(btn => {
    btn.phase += dt * btn.speed;

    const floatX = Math.sin(btn.phase) * 6;
    const floatY = Math.cos(btn.phase * 0.9) * 8;

    btn.el.style.transform =
      `translate(${floatX}px, ${floatY}px)`;
  });
}

/* =====================
   ORBITING IDLE ANIM
===================== */
function updateOrbit(dt) {
  orbitTime += dt;

  activeCards.forEach(card => {
    const orbit =
      Math.sin(orbitTime * card.orbitSpeed + card.orbitOffset) * 24;

    const x = Math.cos(card.angle) * (card.radius + orbit);
    const y = Math.sin(card.angle) * (card.radius + orbit * 0.6);

    card.el.style.transform =
      `translate(-50%, -50%)
       translate(${x}px, ${y}px)
       scale(${BASE_SCALE * card.depth})`;
  });
}

let lastTime = performance.now();
function animate(t) {
  const dt = (t - lastTime) / 1000;
  lastTime = t;

  updateButtonFloat(dt); // Make class buttons float

  if (library.classList.contains("circle")) {
    updateOrbit(dt);
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

/* =====================
   DEPTH PARALAX
===================== */
window.addEventListener("mousemove", e => {
  if (!library.classList.contains("circle")) return;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  const dx = (e.clientX - cx) / cx;
  const dy = (e.clientY - cy) / cy;

  activeCards.forEach(card => {
    const parallaxX = dx * 25 * card.depth;
    const parallaxY = dy * 20 * card.depth;

    card.el.style.marginLeft = `${parallaxX}px`;
    card.el.style.marginTop = `${parallaxY}px`;
  });
});