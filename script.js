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

const glint = overlay.querySelector(".glint");

function renderCards(filterClass = "all") {
  library.innerHTML = "";

  cards.forEach(card => {
    if (
      filterClass !== "all" &&
      !card.classes.includes(filterClass)
    ) return;

    const cardDiv = document.createElement("div");
    cardDiv.className = "card";

    const img = document.createElement("img");
    img.src = `cards/${card.file}`;
    img.alt = card.file;

    cardDiv.addEventListener("mousemove", (e) => {
      const rect = cardDiv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * 8;
      const rotateY = ((x - centerX) / centerX) * -8;

      img.style.transform =
        `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
    });

    cardDiv.addEventListener("mouseleave", () => {
      img.style.transform = "rotateX(0) rotateY(0) scale(1)";
    });

    cardDiv.addEventListener("click", () => {
      openCardPreview(card.file);
    });

    cardDiv.appendChild(img);
    library.appendChild(cardDiv);
  });
}

document.querySelectorAll("#class-select button").forEach(btn => {
  btn.addEventListener("click", () => {
    const selectedClass = btn.dataset.class;

    document
      .querySelectorAll("#class-select button")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    renderCards(selectedClass);
  });
});

const overlayCard = overlay.querySelector(".overlay-card");
const MAX_TILT = 10;

//  Tilt with Glint effect
function overlayTilt(e) {
  const rect = overlayCard.getBoundingClientRect();

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const px = (x / rect.width) - 0.5;
  const py = (y / rect.height) - 0.5;

  const rotateY = clamp(px * MAX_TILT * 2, -MAX_TILT, MAX_TILT);
  const rotateX = clamp(-py * MAX_TILT * 2, -MAX_TILT, MAX_TILT);

  overlayCard.style.transform =
    `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;

  // Glint follows tilt, not raw mouse
  glint.style.backgroundPosition = `
    ${50 + rotateY * 4}% 
    ${50 - rotateX * 4}%
  `;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetOverlayTilt() {
  overlayCard.style.transition = "transform 0.3s ease";
  glint.style.transition = "background-position 0.3s ease";

  overlayCard.style.transform =
    "rotateX(0deg) rotateY(0deg) scale(1.05)";
  glint.style.backgroundPosition = "50% 50%";

  // Remove transition after it finishes so movement stays snappy
  setTimeout(() => {
    overlayCard.style.transition = "";
    glint.style.transition = "";
  }, 300);
}

// --- Functions to show/hide overlay ---
function openCardPreview(filename) {
  overlayImg.src = `cards/${filename}`;
  overlay.classList.add("active");
  document.body.style.overflow = "hidden"; // disable scroll while overlay active

  // Reset rotation
  overlayImg.style.transform = "rotateX(0) rotateY(0) scale(1.05)";
  glint.style.backgroundPosition = "50% 50%";
  

  overlayCard.addEventListener("mousemove", overlayTilt);
  overlayCard.addEventListener("mouseleave", resetOverlayTilt);
}

function closeCardPreview() {
  overlay.classList.remove("active");
  document.body.style.overflow = "auto"; // restore scroll

  // Remove tilt listener
  overlay.removeEventListener("mousemove", overlayTilt);
  overlayCard.removeEventListener("mouseleave", resetOverlayTilt);

  resetOverlayTilt();
}

renderCards();
// Close overlay when clicked anywhere
overlay.addEventListener("click", closeCardPreview);
overlayCard.addEventListener("click", e => e.stopPropagation());