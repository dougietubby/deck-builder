const cards = [
  { file: "angelic_totem.png", classes: [] },
  { file: "arcane_barrier.png", classes: [] },
  { file: "archelon_mount.png", classes: [] },
  { file: "astral_halo.png", classes: [] },

  { file: "backswing.png", classes: ["rogue"] },
  { file: "bash.png", classes: [] },
  { file: "black_imp.png", classes: [] },
  { file: "blood_pact.png", classes: [] },
  { file: "bloodspike_plating.png", classes: [] },
  { file: "bubbling_brew.png", classes: [] },
  { file: "celestial_extraction.png", classes: [] },

  { file: "cleave.png", classes: ["knight", "mage"] },
  { file: "counter_spell.png", classes: [] },
  { file: "creeping_miasma.png", classes: [] },

  { file: "crescent_helm.png", classes: ["knight"] },
  { file: "critical_strike.png", classes: ["knight"] },
  { file: "crush.png", classes: ["knight", "rogue"] },

  { file: "devouring_urn.png", classes: [] },
  { file: "dream_parasite.png", classes: [] },

  { file: "druids_poise.png", classes: ["knight", "mage", "rogue"] },
  { file: "dwarvish_salve.png", classes: [] },
  { file: "encumber.png", classes: [] },

  { file: "execute.png", classes: ["knight"] },
  { file: "faes_whisper.png", classes: ["knight"] },
  { file: "fireball.png", classes: ["mage"] },

  { file: "forgemasters_lie.png", classes: [] },
  { file: "green_imp.png", classes: [] },
  { file: "hasten.png", classes: [] },

  { file: "heroic_chestplate.png", classes: ["knight"] },
  { file: "liquid_courage.png", classes: ["mage", "rogue"] },
  { file: "living_wall.png", classes: [] },

  { file: "looking_glass.png", classes: ["rogue"] },
  { file: "loyal_companion.png", classes: [] },

  { file: "mana_surge.png", classes: ["mage"] },
  { file: "mnemonic_shard.png", classes: [] },
  { file: "mori_totem.png", classes: [] },
  { file: "oracle_of_the_grove.png", classes: [] },

  { file: "phantom_bolt.png", classes: ["mage"] },
  { file: "pierce.png", classes: ["rogue"] },
  { file: "predestination.png", classes: [] },
  { file: "puncture.png", classes: [] },
  { file: "punisher.png", classes: [] },

  { file: "purifying_flask.png", classes: ["knight"] },
  { file: "reanimate.png", classes: [] },
  { file: "red_imp.png", classes: [] },
  { file: "reminisce.png", classes: [] },
  { file: "saving_echo.png", classes: [] },
  { file: "searing_gaze.png", classes: [] },
  { file: "silencing_barrier.png", classes: [] },
  { file: "soul_totem.png", classes: [] },

  { file: "stupify.png", classes: ["rogue"] },
  { file: "summon_gemini.png", classes: [] },

  { file: "thistle_wart.png", classes: ["mage"] },
  { file: "thorned_crown.png", classes: [] },

  { file: "trample.png", classes: ["mage"] },
  { file: "vampyric_blood.png", classes: [] },
  { file: "vindicta_totem.png", classes: [] },
  { file: "vulnerog_totem.png", classes: ["mage"] },

  { file: "wailing_curse.png", classes: ["rogue"] },
  { file: "aegis_aura.png", classes: ["rogue"] }
];

const library = document.getElementById("card-library");
const overlay = document.getElementById("overlay");
const overlayImg = document.getElementById("overlay-img");
const overlayCard = overlay.querySelector(".overlay-card");
const glint = overlay.querySelector(".glint");

let activeCards = [];
let orbitTime = 0;

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
  activeCards = []; // ✅ RESET STATE

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
      cardDiv.style.filter = "brightness(1.25)";

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
  overlayImg.src = `cards/${file}`;
  overlay.classList.add("active");

  overlayCard.addEventListener("mousemove", overlayTilt);
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