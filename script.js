/* document.body.classList.add("locked"); */

/* Onboarding Area */
//#region Onboarding
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

document.getElementById("installBtn").onclick = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
  } else {
    // iOS fallback
    document.getElementById("iosHint").style.display = "block";
  }
};

const GROVE_CODE = "Grove2026"; //  Move to supabase or edgefunciton later

document.getElementById("verifyBtn").onclick = () => {
  const input = document.getElementById("codeInput").value.trim();

  if (input === GROVE_CODE) {

    localStorage.setItem("grove_verified", "true");

    OneSignalDeferred.push(async function(OneSignal) {
      OneSignal.User.addTag("grove_member", "true");
    });

    alert("Welcome to the Grove 🌲");

  } else {
    alert("The forest does not recognize you...");
  }
};

if (localStorage.getItem("grove_verified") === "true") {
  OneSignalDeferred.push(async function(OneSignal) {
    OneSignal.User.addTag("grove_member", "true");
  });

  document.getElementById("onboarding").style.display = "none";
}

document.getElementById("notifyBtn").onclick = async () => {

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    console.log("Notifications enabled");
  } else {
    alert("Notifications are required for Grove alerts.");
  }
};

document.getElementById("enterBtn").onclick = () => {
  document.getElementById("onboarding").style.display = "none";
};

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

if (!isIOS) {
  document.getElementById("iosHint").style.display = "none";
}
//#endregion

//#region Card lib
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
//#endregion

//#region OLD supabase

/* const supabaseUrl = "https://vtgdwihretrnmjnalfxd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0Z2R3aWhyZXRybm1qbmFsZnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzI1NjAsImV4cCI6MjA4Njc0ODU2MH0.J5ClsAfN7F0bA5fAyT04Aege3amYPxloXBGprBvkH-Y";

if (!window._supabaseClient) {
  window._supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
  );
}

var supabase = window._supabaseClient;
 */
// ----------------------------
// PROFILE CREATION
// ----------------------------
/* async function ensureProfile(user) {

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error && error.code === "PGRST116") {

    await supabase.from("profiles").insert([
      {
        id: user.id,
        display_name: user.email.split("@")[0]
      }
    ]);

  }
}
 */
// ----------------------------
// AUTH STATE LISTENER
// ----------------------------
/* supabase.auth.onAuthStateChange(async (event, session) => {

  if (session?.user) {
    await ensureProfile(session.user);
    unlockApp();
  } else {
    lockApp();
  }

}); */

// ----------------------------
// LOGIN FUNCTION (Dev + Prod ready)
// ----------------------------
/* async function login(email) {
  if (!email) {
    alert("Enter an email.");
    return;
  }

  const normalizedEmail = email.trim().toLowerCase(); */

/*   // Determine Edge Function URL based on environment
  const EDGE_FUNCTION_URL =
  "https://vtgdwihretrnmjnalfxd.functions.supabase.co/validate_whitelist"; */

  // Call Edge Function using Supabase client
  /* const { data, error: functionError } =
    await supabase.functions.invoke("validate_whitelist", {
      body: { email: normalizedEmail }
    });

  if (functionError || !data?.ok) {
    alert("You are not approved for Grove access.");
    return;
  }

    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Magic link sent!");
    }
  } */

// ----------------------------
// UI LOCKING
// ----------------------------
/* function lockApp() {
  document.body.classList.add("locked");
}

function unlockApp() {
  document.body.classList.remove("locked");
} */

// ----------------------------
// LOGIN BUTTON
// ----------------------------
/* document.getElementById("login-btn")
  .addEventListener("click", () => {

    const email = document.getElementById("email-input").value;
    login(email);

}); */
//#endregion

/* =====================
   DOM CACHE
===================== */
const library = document.getElementById("card-library");
const overlay = document.getElementById("overlay");
const overlayImg = document.getElementById("overlay-img");
const overlayCard = overlay.querySelector(".overlay-card");
const glint = overlay.querySelector(".glint");

const classButtons = [...document.querySelectorAll(".deck-btn")];

/* =====================
   CONSTANTS
===================== */
const BASE_SCALE = 1.3;
const BASE_RADIUS = 0.25;

/* =====================
   STATE
===================== */
let activeCards = [];
let orbitTime = 0;

let overlayCards = [];
let overlayIndex = 0;

/* =====================
   HELPERS
===================== */
const randRange = (min, max) => Math.random() * (max - min) + min;

const getRadius = () =>
  Math.min(window.innerWidth, window.innerHeight) * BASE_RADIUS;

/* =====================
   BUTTON FLOAT
===================== */
const buttonFloatState = classButtons.map(btn => ({
  el: btn,
  speed: randRange(0.4, 0.8),
  phase: randRange(0, Math.PI * 2)
}));

function updateButtonFloat(dt) {
  if (document.body.classList.contains("started")) return;

  buttonFloatState.forEach(b => {
    b.phase += dt * b.speed;
    b.el.style.transform =
      `translate(${Math.sin(b.phase)*6}px, ${Math.cos(b.phase*0.9)*8}px)`;
  });
}

/* =====================
   RENDER CARDS
===================== */
//#region Render Cards
function renderCircle(className) {

  library.innerHTML = "";
  library.className = "circle";
  activeCards = [];

  const filtered = cards.filter(c => c.classes.includes(className));
  const radius = getRadius();

  filtered.forEach((card, i) => {

    const depth = randRange(0.8, 1.2);

    const el = document.createElement("div");
    el.className = "card";

    const img = document.createElement("img");
    img.src = `cards/${card.file}`;

    el.appendChild(img);
    library.appendChild(el);

    const state = {
      el,
      img,
      depth,
      radius,
      angle: (i / filtered.length) * Math.PI * 2,
      orbitSpeed: randRange(0.15, 0.35),
      orbitOffset: randRange(0, Math.PI * 2),
      baseZ: Math.floor(depth * 100)
    };

    el.style.zIndex = state.baseZ;
    activeCards.push(state);

    // spawn animation
    el.style.left = "50%";
    el.style.top = "50%";
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, -50%) scale(0.8)";

    requestAnimationFrame(() => {
      const x = Math.cos(state.angle) * radius;
      const y = Math.sin(state.angle) * radius;

      el.style.transition =
        "transform 1s cubic-bezier(.16,1,.3,1), opacity 0.6s ease";

      el.style.transform =
        `translate(-50%, -50%) translate(${x}px,${y}px) scale(${BASE_SCALE*state.depth})`;

      el.style.opacity = "1";
    });

    /* Hover tilt */
    el.addEventListener("mousemove", e => {
      el.style.zIndex = 1000;
      el.style.filter = "brightness(1.1)";

      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;

      img.style.transform =
        `rotateX(${-dy*10}deg) rotateY(${dx*10}deg) scale(${BASE_SCALE})`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.filter = "";
      el.style.zIndex = state.baseZ;
      img.style.transform = "";
    });

    el.addEventListener("click", () => openOverlay(card.file));
  });
}
//#endregion


/* =====================
   CLASS BUTTONS
===================== */
//#region CLASS buttons
classButtons.forEach(btn => {
  btn.addEventListener("click", () => {

    document.body.classList.add("started", "class-locked");

    classButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    renderCircle(btn.dataset.class);
  });
});
//#endregion

/* =====================
   OVERLAY
===================== */
//#region Overlay
function openOverlay(file) {

  overlayCards = activeCards.map(c => c.img.src);
  overlayIndex = overlayCards.findIndex(src => src.includes(file));

  overlayImg.src = overlayCards[overlayIndex];
  overlay.classList.add("active");

  overlayCard.addEventListener("mousemove", overlayTilt);
  window.addEventListener("wheel", overlayScroll, { passive:false });
  window.addEventListener("keydown", overlayKeys);
}

function cycleOverlay(dir) {
  overlayIndex =
    (overlayIndex + dir + overlayCards.length) % overlayCards.length;

  overlayImg.src = overlayCards[overlayIndex];
}

function overlayScroll(e){
  e.preventDefault();
  cycleOverlay(e.deltaY > 0 ? 1 : -1);
}

function overlayKeys(e){
  if(e.key==="ArrowRight") cycleOverlay(1);
  if(e.key==="ArrowLeft") cycleOverlay(-1);
}

function overlayTilt(e){
  const r = overlayCard.getBoundingClientRect();

  // Normalized mouse position (0 → 1)
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;

  // Convert to -0.5 → +0.5 (centered)
  const cx = px - 0.5;
  const cy = py - 0.5;

  // ---- Rotation ----
  const rotY = cx * 12;   // left/right tilt
  const rotX = -cy * 12;  // up/down tilt

  // ---- Fake Depth Push ----
  const depth = (Math.abs(cx) + Math.abs(cy)) * 18;

  overlayCard.style.transform = `
    perspective(1200px)
    rotateX(${rotX}deg)
    rotateY(${rotY}deg)
    translateZ(${depth}px)
    scale(1.04)
  `;

  // ---- Glint follows mouse ----
  glint.style.backgroundPosition = `${px*100}% ${py*100}%`;

  // Slight glint drift = realism
  glint.style.transform = `
    translate(${cx*40}px, ${cy*40}px)
  `;
}

overlay.addEventListener("click", () => {
  overlay.classList.remove("active");
  overlayCard.style.transform = "";

  window.removeEventListener("wheel", overlayScroll);
  window.removeEventListener("keydown", overlayKeys);
});

overlayCard.addEventListener("click", e => e.stopPropagation());
//#endregion

/* =====================
   ORBIT LOOP
===================== */
function updateOrbit(dt){
  orbitTime += dt;

  activeCards.forEach(c=>{
    const orbit =
      Math.sin(orbitTime*c.orbitSpeed + c.orbitOffset)*24;

    const x = Math.cos(c.angle)*(c.radius+orbit);
    const y = Math.sin(c.angle)*(c.radius+orbit*0.6);

    c.el.style.transform =
      `translate(-50%,-50%) translate(${x}px,${y}px) scale(${BASE_SCALE*c.depth})`;
  });
}

/* =====================
   MAIN LOOP
===================== */
let last = performance.now();

function animate(t){
  const dt = (t-last)/1000;
  last = t;

  updateButtonFloat(dt);

  if(library.classList.contains("circle"))
    updateOrbit(dt);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

/* =====================
   RESIZE
===================== */
window.addEventListener("resize", ()=>{
  const r = getRadius();
  activeCards.forEach(c=> c.radius = r);
});

/* =====================
   PARALLAX
===================== */
window.addEventListener("mousemove", e => {

  if(!library.classList.contains("circle")) return;

  const cx = innerWidth/2;
  const cy = innerHeight/2;

  const dx = (e.clientX-cx)/cx;
  const dy = (e.clientY-cy)/cy;

  activeCards.forEach(c=>{
    c.el.style.marginLeft = dx*25*c.depth+"px";
    c.el.style.marginTop  = dy*20*c.depth+"px";
  });
});
