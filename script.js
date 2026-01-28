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

cardImages.forEach(filename => {
  const cardDiv = document.createElement("div");
  cardDiv.className = "card";

  const img = document.createElement("img");
  img.src = `cards/${filename}`;
  img.alt = filename;

  cardDiv.appendChild(img);
  library.appendChild(cardDiv);
});