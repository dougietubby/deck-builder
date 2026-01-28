const cardImages = [
  "angelic_totem.png",
  "arcane_barrier.png",
  "archelon_mount.png",
  "astral_halo.png",
  "backswing.png",
  "bash.png",
  "black_imp.png",
  "blood_pact.png",
  "bloodspike_plating.png",
  "bubbling_brew.png",
  "celestial_extraction.png",
  "cleave.png",
  "counter_spell.png",
  "creeping_miasma.png",
  "crescent_helm.png",
  "critical_strike.png",
  "crush.png",
  "devouring_urn.png",
  "dream_parasite.png",
  "druids_poise.png",
  "dwarvish_salve.png",
  "encumber.png",
  "execute.png",
  "faes_whisper.png",
  "fireball.png",
  "forgemasters_lie.png",
  "green_imp.png",
  "hasten.png",
  "heroic_chestplate.png",
  "liquid_courage.png",
  "living_wall.png",
  "looking_glass.png",
  "loyal_companion.png",
  "mana_surge.png",
  "mnemonic_shard.png",
  "mori_totem.png",
  "oracle_of_the_grove.png",
  "phantom_bolt.png",
  "pierce.png",
  "predestination.png",
  "puncture.png",
  "punisher.png",
  "purifying_flask.png",
  "reanimate.png",
  "red_imp.png",
  "reminisce.png",
  "saving_echo.png",
  "searing_gaze.png",
  "silencing_barrier.png",
  "soul_totem.png",
  "stupify.png",
  "summon_gemini.png",
  "thistle_wart.png",
  "thorned_crown.png",
  "trample.png",
  "vampyric_blood.png",
  "vindicta_totem.png",
  "vulnerog_totem.png",
  "wailing_curse.png",
  "aegis_aura.png"
  // add more here
];

const library = document.getElementById("card-library");
const overlay = document.getElementById("overlay");
//const overlayImg = document.getElementById("overlay-img");

// Load cards
cardImages.forEach(filename => {
  const cardDiv = document.createElement("div");
  cardDiv.className = "card";

  const img = document.createElement("img");
  img.src = `cards/${filename}`;
  img.alt = filename;

  // --- Mouse bend effect ---
  cardDiv.addEventListener("mousemove", (e) => {
    const rect = cardDiv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * 8;
    const rotateY = ((x - centerX) / centerX) * -8;

    img.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
  });

  cardDiv.addEventListener("mouseleave", () => {
    img.style.transform = "rotateX(0) rotateY(0) scale(1)";
  });

  // --- Click to focus ---
  cardDiv.addEventListener("click", () => {
    openCardPreview(filename);
  });

  cardDiv.appendChild(img);
  library.appendChild(cardDiv);
});

const overlayCard = overlay.querySelector(".overlay-card");
const glint = overlay.querySelector(".glint");
//  Tilt with Glint effect
function overlayTilt(e) {
  const rect = overlayCard.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const rotateX = ((y - centerY) / centerY) * 8;
  const rotateY = ((x - centerX) / centerX) * -8;

  // Rotate the whole card (image + glint together)
  overlayCard.style.transform =
    `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;

  // Move light across surface instead of moving the glint itself
  const bgX = 50 + rotateY * 5;
  const bgY = 50 + rotateX * 5;
  glint.style.backgroundPosition = `${bgX}% ${bgY}%`;
}

// --- Functions to show/hide overlay ---
function openCardPreview(filename) {
  overlayImg.src = `cards/${filename}`;
  overlay.classList.add("active");
  document.body.style.overflow = "hidden"; // disable scroll while overlay active

  // Reset rotation
  overlayImg.style.transform = "rotateX(0) rotateY(0) scale(1.05)";
  glint.style.backgroundPosition = "50% 50%";

  overlay.addEventListener("mousemove", overlayTilt);
}

function closeCardPreview() {
  overlay.classList.remove("active");
  document.body.style.overflow = "auto"; // restore scroll

  // Remove tilt listener
  overlay.removeEventListener("mousemove", overlayTilt);
}

// Close overlay when clicked anywhere
overlay.addEventListener("click", closeCardPreview);
overlayCard.addEventListener("click", e => e.stopPropagation());