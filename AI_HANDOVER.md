# AI Handover

## Project State: Project: STRANGEREAL - Ace Combat Tactical Flight Simulation & Command Radar Operational

### Completed
1. **Server Engine Upgrade (PaperMC & RCON Optimization):**
   - Cleanly migrated Minecraft server from vanilla 26.3 to latest PaperMC build (`paper.jar`, 26.3 build 7).
   - Preserved all world data via Paper's multi-dimension storage migration.
   - Allocated 5GB RAM (`-Xms5G -Xmx5G`) with Aikar's G1GC flags under systemd service `minecraft-ace.service` running inside screen session `minecraft`.
   - Enabled and secured RCON on port 25575 (`StrangerealAceCombat2026!`).
   - Tuned `server.properties` (`view-distance=16`, `simulation-distance=12`, `allow-flight=true`, `spawn-protection=0`, `online-mode=false`).
2. **Core Flight Physics & Vector Propulsion (`datapacks/strangereal_engine`):**
   - Continuous 20Hz vector propulsion loop applying forward directional thrust.
   - Sneak detection (`Shift`) for airbrake deceleration and throttle drop (35%).
   - Off-hand swap (`F` key) toggling supersonic afterburner (`sr_ab`), boosting speed to 480+ kts with sonic boom and flame exhaust particles.
   - Stall warning: Triggers `[ ! STALL WARNING ! ]` subtitle and note-block alarms below 12 m/s (< 180 kts) with downward gravity pull.
   - G-Force blackout: Calculates pitch/yaw deltas (1G - 9G) and applies darkness/vignette under sustained high-G turns.
3. **Weapons, Raycast Lock-On & Countermeasures:**
   - 3 Balanced Aircraft Classes:
     - **F-22A Raptor:** Stealth profile (reduced lock-on range), 6x AIM-120 AMRAAM, 2x QAAM, 20mm M61A2 Vulcan cannon.
     - **Su-57 Felon:** High-G tolerance, 3D thrust vectoring (blackout immune), Post-Stall Maneuver capability, 6x R-77 missiles, 20mm GSH-30-1 autocannon.
     - **A-10C Thunderbolt II:** Heavy armor (+10 Absorption Hearts, Resistance II), 4x AGM-65 Maverick heavy missiles, 30mm GAU-8/A Avenger Gatling cannon.
   - Raycast target acquisition scanning 120m look-vector forward cone.
   - Audio lock tones transitioning from pulsing beep to solid tone on lock.
   - Homing missile entities (`tag=homing_missile`) recalculating vector toward target every tick, with cloud trails and proximity detonation (4-block radius).
   - Infrared decoy flares (`Q` key drop) deploying 5 thermal flares diverting all incoming missiles within 30m with 12s cooldown.
4. **Tactical Cockpit HUD & AWACS Audio Engine:**
   - Actionbar Telemetry HUD updating every 2 ticks: `SPD: 480 kts | ALT: 185m | THR: 100% [AB] | G: 4.2 | MSL: 6 | FLR: 5`.
   - Dual Bossbars: Top Mission Bar (`strangereal:mission`) and AWACS Status Bar (`strangereal:awacs`).
   - AWACS "SkyEye" military radio broadcasts with sound cues.
5. **USS Andersen Aircraft Carrier Lobby (`0, 120, 0`):**
   - Streamlined, physical flight deck layout with zero floating hologram clutter.
   - Skyward cyan beacon beam at carrier center for visual orientation during aerial dogfights.
   - Large illuminated Gold Launchpad with pressure plates: walking forward automatically launches pilot into 40 m/s supersonic flight with active afterburners.
   - Physical step-on aircraft bays for F-22A Raptor, Su-57 Felon, and A-10C Warthog.
   - Automatic new player arming: immediately provides flight wings, helmet, 12x AMRAAM missiles, and flares upon joining.
   - Single clean mission bossbar (`🦅 ARSENAL BIRD RAID // DESTROY THE 8 ENGINES`) and automated `boss_victory` sequence.
6. **Persistent Rank Progression & Economy:**
   - Scoreboards tracking `ac_kills`, `ac_deaths`, `ac_sorties`, `ac_boss_dmg`, `ac_xp`, and `ac_credits` (MRP).
   - Dynamic promotions: Flight Cadet → 2nd Lt → Captain → Major → Squadron Leader → ACE OF ACES.
7. **STRANGEREAL Command - Tactical Web Dashboard (`dashboard/`):**
   - FastAPI + WebSocket application on port 8080 managed by `ace-dashboard.service`.
   - Ace Combat 7 / Palantir military dark-theme UI with CRT scanlines, neon glows, and phosphor typography.
   - 2D Live PPI Tactical Radar sweep canvas rendering real-time aircraft blips, heading vectors, carrier dock, and range rings.
   - Real-time Pilot Dossier & Top Aces leaderboard, live AWACS combat radio log, and Commander Control Panel for mission triggers and weather control.

8. **MMORPG Campaign Engine - Module 1 (Progression, Quest NPCs & Cinematic Engine):**
   - **Persistent RPG Scoreboards (`mmo_init` / `mmo_tick`):**
     - `ac_level`: Clearance Level [CL 1-100], dynamically calculated as `1 + (ac_xp / 1000)`.
     - `ac_story_stage`: Tracks campaign progression (0 = Unstarted, 1 = Act I M1, 2 = Act I M2 ... 8 = Act III Finale, 9 = Endgame Mercenary).
     - Boss Salvage Drops: `ac_salvage_stonehenge`, `ac_salvage_alicorn`, `ac_salvage_zoe`.
     - Display: `[CL <level>]` displayed in Tab list via `scoreboard objectives setdisplay list ac_level`, full MMORPG stats sidebar (`ac_mmo_hud`), and on-deck actionbar HUD.
   - **Interactive Carrier Briefing Room NPCs (`0, 120, 0`):**
     - Symmetrical Briefing Terrace at carrier center with War Table and 3 permanent, invulnerable quest terminals:
     - **Commander McKinsey:** Manages Act I: Penal Wing sorties (Mission 1 Penal Patrol & Mission 2 Low-Altitude Blind Spot).
     - **AWACS SkyEye Hologram:** Manages Act II & III Campaign Sorties (Missions 3 to 8 + Endgame Mercenary Free Dogfights).
     - **Chief Mechanic Avril "Scrap Queen":** Scrap forge allowing pilots to trade Boss Salvage drops + MRP to forge Tier-5 Superplanes (X-02S Strike Wyvern, CFA-44 Nosferatu, ADF-11F Raven) and purchase decoy flares.
   - **Reusable 15-Second Cinematic Cutscene & Dialogue Engine (`strangereal:cutscene`):**
     - Invisible camera marker (`tag=cutscene_cam`) that smoothly interpolates over carrier deck, climbs through clouds, and banks across target sector coordinates over 300 ticks (15s).
     - Locks participating pilots with panoramic cinema bossbar (`strangereal:cinema`), subtitles, and smooth view tracking.
     - Synchronized multi-line radio dialogue scripts with audio squelch, chat broadcasts, and console `say << Speaker: Dialogue >>`.
   - **Port 8080 Web Dashboard WebSocket TTS Engine:**
     - Real-time log tailer in `dashboard/app.py` watching `/root/minecraft-server/logs/latest.log` for military radio lines (`<< Speaker: Dialogue >>`).
     - WebSocket broadcasting `{"type": "tts_dialogue", "speaker": ..., "text": ...}`.
     - Web Audio squelch chirp + Web Speech API (`window.speechSynthesis`) in `dashboard/index.html` speaking story dialogue aloud in real time.
     - Live pilot dossier & leaderboard displaying `CL <level>` and `[Quest: Stage <stage>]`.
9. **MMORPG Campaign Engine - Module 2 (Playable Act I & Act II Campaign Missions 1–5):**
   - **M1: Operation Yinshi Ghosts (Req CL 1, Stage 1 -> 2):**
     - 3-Act Structure: Phase 1 (12 Jammer Buoys nestled in karst pillars) -> Phase 2 (<< MISSION UPDATE >> 6 Erusean MiG-29 drones) -> Phase 3 (Mini-Boss: Ace Viper 1, 150 HP).
     - Rewards: `+1,500 XP`, `+2,000 MRP`, `ac_story_stage = 2`.
   - **M2: Operation Carrier Defense (Req CL 3, Stage 2 -> 3):**
     - Carrier Hull Bar (`#carrier_hull ac_carrier_hull`, max 100 HP).
     - 3 Escalating Waves: Wave 1 (4 Cruise Missiles + 2 Tu-95 Bombers) -> Wave 2 (6 Supersonic Cruise Missiles + 3 Tu-95 Bombers) -> Wave 3 (8 Cruise Missiles + 4 Su-33 Flanker Escorts).
     - Direct hits damage carrier flight deck by 20 HP with catastrophic explosion particles.
     - Rewards: Strider Squadron promotion (`rank_strider`), `+2,500 XP`, `+3,500 MRP`, `ac_story_stage = 3`.
   - **M3: Operation Anchorhead Armada (Req CL 6, Stage 3 -> 4):**
     - Phase 1: 6 Aegis Destroyers with active VLS Surface-to-Air Missile (SAM) battery launches.
     - Phase 2: Flagship Battlecruiser Tanager (200 HP) commanded by Captain Matias Torres with dual Heavy VLS SAMs.
     - Missile hitboxes properly filtered (`tag=!m3_vls_sam`) to eliminate self-damage; SAMs climb at 24 m/s with smoke/flame trails and deal 8 HP damage on proxy detonation.
     - Rewards: `+3,500 XP`, `+4,500 MRP`, `ac_story_stage = 4`.
   - **M4: Operation First Contact (Mihaly / Sol 1) (Req CL 10, Stage 4 -> 5):**
     - Phase 1: Clear 4 Erusean Strike Fighters over Yinshi Valley.
     - Phase 2 Twist: Crimson dusk (`time set 12700`), heavy thunderstorm (`weather thunder`), cinematic radio quote (*"There are pilots like you in every generation. And I felled every last one of them."*).
     - Phase 3: Invincible Sol 1 Ace firing supersonic EML railgun beams (`sonic_boom` + `damage @s 10`) for 120 seconds.
     - Rewards: Clear sky restore, `+4,000 XP`, `+5,000 MRP`, `ac_story_stage = 5`.
   - **M5: Operation Stonehenge Raid (Req CL 15, Stage 5 -> 6):**
     - Stonehenge Crater Basin (`0, 1000`) with 8 mass-accelerator Railgun Cores.
     - 60-Second Electromagnetic Shockwave cycle with audible 10-second dive alarm and 3-2-1 countdown.
     - Map-wide EMP shockwave deals 12 damage + blindness to any aircraft flying above Y=150.
     - Rewards: `+1 ac_salvage_stonehenge` boss craft drop, `+5,000 XP`, `+6,000 MRP`, `ac_story_stage = 6`.
   - **State Machine Architecture & Tick Loop Integration:**
     - Centralized dispatcher `campaign/campaign_tick.mcfunction` executing 20Hz mission logic only when `ac_mission_id` is active (0 = idle, zero server overhead).
     - Automatic debounce protection (`matches 40..` = 2s) across all wave transitions to prevent instant 0-tick cascade before entities register.

10. **MMORPG Campaign Engine - Module 3 (Act III Campaign Missions 6–8 & Space Elevator Grand Finale):**
   - **M6: Operation Alicorn Hunt (Req CL 20, Stage 6 -> 7):**
     - Deep Ocean (`X: -600, Z: 600`).
     - Submarine hull with 4 CIWS defense turrets (`tag=m6_ciws`, 40 HP each).
     - Central 600mm Rail-Cannon Core (`tag=m6_alicorn_core`, 250 HP) invulnerable until all 4 CIWS are eliminated.
     - 3-Minute countdown Bossbar (`#m6_timer`, 3600 ticks) with automated loss condition if timer expires.
     - Radio quotes from Captain Matias Torres (*"Salvation! Deliver one million lives!"*).
     - Rewards: `+1 ac_salvage_alicorn`, `+6,000 XP`, `+7,000 MRP`, `ac_story_stage = 7`.
   - **M7: Operation King's Duel (Req CL 25, Stage 7 -> 8):**
     - Stonehenge Skies (`X: 0, Z: 1000`).
     - 4-Phase Boss Duel against Sol 1 (Mihaly A. Shilage) in his X-02S Strike Wyvern (800 HP, `tag=m7_sol1`):
       - Phase 1: High-speed orbital dogfight (800 HP -> 400 HP).
       - Phase 2: Spawns 4 MQ-99 shield drones (`tag=m7_shield_drone`). Sol 1 invulnerable while drones remain alive.
       - Phase 3: Rapid Kulbit pitch-reversals + continuous supersonic EML railgun beams.
       - Phase 4: Final stand to 0 HP.
     - Radio: Mihaly's final warning about the Lighthouse Z.O.E. AI drones.
     - Rewards: Unlocks X-02S Strike Wyvern in Avril's forge (`unlocked_x02`), `+8,000 XP`, `+10,000 MRP`, `ac_story_stage = 8`.
   - **M8: Operation Lighthouse — Grand Finale (Req CL 30, Stage 8 -> 9):**
     - International Space Elevator (`X: 0, Z: -1000`).
     - Act 1 (Arsenal Bird APS Shield Break): Arsenal Bird orbits the tower with APS active shield. 2 Shield Relay Drones (`tag=m8_shield_relay`) must be destroyed to collapse shield, exposing 8 Propellers (`tag=m8_propeller`). Destroying all 8 propellers brings down Arsenal Bird.
     - Act 2 (Hugin & Munin ADF-11F AI Twins): Two ultra-agile autonomous drones (`tag=m8_ai_twin`, 600 HP combined) coordinating Tactical Laser System (TLS) strikes.
     - Act 3 (The Space Elevator Vertical Tunnel Run): Base blast doors blast open at `(0, 65, -1000)`. 4 destructible Z.O.E. Data Repeaters (`tag=m8_repeater`) spawned inside the 12x12 vertical shaft at `Y=110, 170, 230, 290`. 90-second self-destruct timer (`#m8_shaft_timer`, 1800 ticks). Players must navigate inside the vertical shaft, destroy all 4 repeaters, and escape out the top at `Y=320`.
     - Grand Finale Victory: Map-wide dual celebratory fireworks across carrier and elevator, `+1 ac_salvage_zoe`, `+10,000 XP`, `+15,000 MRP`, unlocks `[ HERO OF STRANGEREAL ]` title (`rank_hero`), unlocks `ac_story_stage = 9` (Endgame Mercenary Mode).
   - **Audio & Dialogue Integration:**
     - Synchronized multi-line radio scripts in `cutscene/dialogue_m6.mcfunction`, `dialogue_m7.mcfunction`, `dialogue_m8.mcfunction` broadcast to in-game chat, server logs, and Port 8080 WebSocket TTS engine.
   - **Interactive Briefing & Dialogue Hub:**
     - AWACS SkyEye Hologram (`interact_skyeye.mcfunction`) interactive menu fully wired with clearance checks (CL 20, 25, 30) and direct sortie dispatchers.

11. **MMORPG Campaign Engine - Module 4 (Endgame Loop, Co-Op Squadron Sync, Mercenary Modifiers & Web Story Tracker):**
   - **Drop-In / Drop-Out Co-Op Squadron Sync (`campaign/coop_join`, `campaign/scale_enemy_hp`):**
     - Briefing Table War Hologram (`0, 121, 4`): `[ ✈ CLICK TO JOIN ACTIVE SORTIE ]` allows any carrier pilot to scramble into the team's ongoing mission airspace.
     - Dynamic Enemy Scaling: Wave & Boss HP scaled by `+40%` per extra human wingman (`HP = Base * (1.0 + 0.4 * (N-1))`).
     - Shared Rewards: 100% of Mission XP, MRP credits, and Boss Salvage drops shared with every participating pilot in the sortie.
     - Drop-Out: Disengaging or landing back on the flight deck clears `in_sortie` cleanly.
   - **Mercenary Mode Replay Modifiers (3 Endgame Skulls on Hangar Briefing Table):**
     - `[ 💀 DOUBLE TIME ]`: Spawns 2x enemy aircraft per wave (`+100% MRP & XP`).
     - `[ 💀 GLASS CANNON ]`: Player and enemy missiles deal 3x damage (`+150% MRP & XP`).
     - `[ 💀 ACE OF ACES ]`: Guaranteed Superweapon Boss Salvage drops (`Stonehenge`, `Alicorn`, `Z.O.E.`) on every mission clear, feeding Avril's Superplane Forge (`CFA-44 Nosferatu`, `ADF-11F Raven`).
     - Pure scoreboard toggles (`#mod_double_time`, `#mod_glass_cannon`, `#mod_ace_of_aces`) with dynamic hologram updates.
   - **Seamless Free-Flight & 45-Minute World Boss Invasions (`worldboss/`):**
     - Whenever story missions are idle (`ac_mission_id = 0`), server runs Free Dogfight & 4-Sector Conquest mode with CAT-1/CAT-2 catapult launches.
     - 45-Minute Server Uptime Timer (`#world_boss_timer`, 54,000 ticks) triggers map-wide `[ ⚠️ WORLD BOSS INVASION ]`:
       - Cycle 1: Rogue Arsenal Bird (Sector North, 8 Propellers, 800 HP).
       - Cycle 2: Abyssal Alicorn (Sector West, 4 CIWS + 600mm Rail-Cannon, 1000 HP).
       - Cycle 3: Z.O.E. Autonomous Drone Squadron (Fleet Airspace, 3 ADF-11F AI Drones, 600 HP).
       - Defeating World Bosses awards `+20,000 MRP` + `+5,000 XP` payouts and advances the 3-boss cycle.
   - **Port 8080 Web Dashboard Campaign Map & Story Tracker (`dashboard/`):**
     - New **"📜 CAMPAIGN & RPG DOSSIER"** tab on `http://152.239.115.153:8080/`.
     - Live Pilot Dossier: Clearance Level (`CL`), Campaign Act/Mission Stage, Salvage Inventory (`[Stonehenge: X/1] [Alicorn: X/1] [Z.O.E.: X/1]`), MRP, XP progress bar.
     - 1-Click Story Mission Matrix (Missions 1 through 8) to launch any chapter from tablet/browser.
     - 1-Click Mercenary Skull Modifier toggles and World Boss Invasion trigger.

12. **MMORPG Campaign Engine - Module 5A (Aircraft Mastery Side-Quests: F-22A Stealth & A-10C CAS):**
    - **Flight Deck Contract Board NPC (`[ 📋 FLIGHT DECK CONTRACT BOARD ]` at `(6, 121, 3)`):**
      - Interactive terminal next to Chief Mechanic Avril with custom text display and interaction hitbox (`tag=act_contract_board`).
      - Interactive tellraw menu with status checks (`ac_mastery_f22` vs `ac_mastery_a10`), airframe requirement validation (`tag=airframe_f22` vs `tag=airframe_a10`), task briefs, reward summaries, and 1-click launch dispatches.
      - Quick-equip shortcuts for unlocked mastery liveries (`unlocked_livery_mobius` and `unlocked_livery_shark`).
    - **F-22A Raptor Mastery: "Operation Silent Night" (`sq_f22_stealth.mcfunction` & `sq_f22_tick.mcfunction`):**
      - Requires F-22A Raptor airframe (`tag=airframe_f22`); warns and aborts if missing.
      - Midnight canyon setting (`time set 18000`).
      - Act 1: Low-altitude river canyon infiltration (<135m radar ceiling & 6 pulsing red Radar Domes). Flying above 135m for >2s or inside domes triggers audible SAM launch alarm and fires 3 tracking surface-to-air missiles (`tag=sq_sam`). Real-time actionbar stealth HUD.
      - Act 2: C4I Command Bunker at `(1050, 95, 0)` with 4 flak AA guns and 200 HP bunker core.
      - Act 3: Ambush by 2 stealth Erusean Su-35S Night Hunters (180 HP each).
      - Rewards: `+3,500 XP`, `+5,000 MRP`, `ac_mastery_f22 = 1`, unlocks RAM Stealth Coating perk (`perk_ram_coating`) reducing enemy lock-on cone, and Mobius 1 Ribbon Livery (`unlocked_livery_mobius`, livery ID 5).
    - **A-10C Thunderbolt II Mastery: "Operation Hammer Anvil" (`sq_a10_cas.mcfunction` & `sq_a10_tick.mcfunction`):**
      - Requires A-10C Thunderbolt II airframe (`tag=airframe_a10`); warns and aborts if missing.
      - Midday desert setting (`time set 6000`).
      - Act 1: Escort 4 allied Osean M1A2 tanks with green bossbar tracking convoy integrity. Defend against 3 ground/air waves: 6x T-90 battle tanks, 4x ZSU-23 Shilka flak trucks, and 4x Ka-50 Black Shark attack helicopters.
      - GAU-8 Avenger diving attack mechanics: diving at pitch > 15° (`scores={ac_pitch=15..}`) triggers explosive kinetic splash damage across ground clusters.
      - Act 2: Super-Heavy Armored Siege Crawler "Aigaion-Land" at `(0, 75, 920)` (500 HP). Main core is protected by an active defense shield until all 4 203mm artillery turrets (60 HP each) are destroyed.
      - Rewards: `+3,500 XP`, `+5,000 MRP`, `ac_mastery_a10 = 1`, unlocks Depleted Uranium GAU-8 Shells (`perk_du_shells`) dealing +10 armor-piercing kinetic damage, and Flying Tigers Shark-Mouth Livery (`unlocked_livery_shark`, livery ID 6).
    - **Port 8080 Web Dashboard Mastery Cards & Real-Time Tracking:**
      - Sidequest status pill in Campaign panel tracking active sortie and phase.
      - 1-click scramble buttons for Operation Silent Night and Operation Hammer Anvil (`start_sq_f22` and `start_sq_a10`).
      - Live pilot dossier mastery badges (`[F-22A MASTERY]` vs `[A-10C MASTERY]`).
      - Verified 0 errors in `latest.log` upon `/reload` with 20.0 TPS.

13. **MMORPG Campaign Engine - Module 5B (Su-57 Felon & X-02S Strike Wyvern Mastery):**
    - **Su-57 Felon Mastery: "Operation Crimson Ring" (`sq_su57_arena.mcfunction` & `sq_su57_tick.mcfunction`):**
      - Requires Su-57 Felon airframe (`tag=aircraft_su57`).
      - Setting: Severe thunderstorm at Yinshi Valley Storm Core (`(1000, 180, 0)`). 150-block ECM Jamming hurricane vortex (`campfire_cosy_smoke` + `electric_spark`).
      - ECM Radar Jamming: Raycast missile locks strictly jammed beyond 60 meters. Knife-edge dogfight conditions.
      - Kulbit Lock 2X Override: Pulling sustained `> 7G` turns or PSM within 50m behind bandits awards a 4-second `[ ⚡ KULBIT LOCK OVERRIDE: 2X DAMAGE ]` buff.
      - 3 Escalating Rounds: Round 1 (2x Mirage 2000-5 "Rigel Squadron", 120 HP each) -> Round 2 (2x F-15 S/MTD "Sorcerer Squadron", 160 HP each) -> Round 3 (Boss Duel: Erusean Ace Yellow 13 in Su-37 Terminator, 350 HP, executing Cobra/Kulbit evasion flips & flares).
      - Rewards: `+6,000 MRP`, `+4,000 XP`, `ac_mastery_su57 = 1`, unlocks 3D Thrust-Vectoring Nozzles (`perk_3d_thrust`, +25% pitch agility, 100% blackout immunity), and Yellow 13 Desert Camo Livery (`unlocked_livery_yellow13`, livery ID 3).
    - **X-02S Strike Wyvern Mastery: "Operation Falling Star" (`sq_x02_stratosphere.mcfunction` & `sq_x02_tick.mcfunction`):**
      - Requires X-02S Strike Wyvern (or superplane) with EML Railgun.
      - Setting: High Stratosphere (Angels 28: `Y = 260–319`) at twilight.
      - Act 1 (Stratospheric Railgun Sniping): 6 hypersonic MIRV warheads (`tag=icbm_warhead`) arcing across the sky with plasma contrails (`end_rod` + `wax_off`). Missiles cannot track; pilot must hitscan snipe all 6 warheads with the EML Railgun before 120-second impact timer expires.
      - Act 2 (Orbital Drone Interceptor): Experimental Z.O.E. Darkstar Hypersonic Interceptor flying at Mach 3 with TLS laser strikes. Snipe 3 times with EML to splash.
      - Rewards: `+10,000 MRP`, `+5,000 XP`, `ac_mastery_x02 = 1`, unlocks Overcharged EML Capacitor (`perk_eml_overcharge`, cuts EML reload cooldown by 50% and doubles beam width to 7.0 blocks), and Sol 1 Experimental Orange Wing Livery (`unlocked_livery_sol1`, livery ID 7).
    - **Hangar Showcase Turntables (`0, 120, 0`):**
      - Pilots with any completed mastery (`ac_mastery_* == 1`) display gold `[ ★ CLASS MASTER ]` badge on their bay hologram and a glowing golden particle aura (`dust` + `wax_on`) beneath their parked 3D jet.
    - **Port 8080 Web Dashboard & Pilot License Generator:**
      - 4-card Airframe Mastery grid in Campaign Operations with real-time status badges and 1-click browser scrambles (`start_sq_f22`, `start_sq_a10`, `start_sq_su57`, `start_sq_x02`).
      - Live Pilot Dossier display with 4 mastery pills: `[F-22 Stealth]`, `[A-10 CAS]`, `[Su-57 Kulbit]`, `[X-02S Railgun]`.
      - Pilot Aviator License generator canvas stamps all 4 Airframe Mastery Certifications onto 1200x675 HD license cards.

14. **Operation Clean Cockpit (Cross-Platform UX, Control & Fly-By-Wire Overhaul):**
    - **Visual Purge & Minimalist HUD:**
      - Removed multi-line holographic text walls at `(0, 120, 0)`; enforced strict $\le 3$-word limit per label (`[ 💬 Instructor Viper ]`, `[ ✈️ Board F-22A ]`, `[ ▶️ Mission Table ]`).
      - Cleared sidebar scoreboards on foot and in flight (`scoreboard objectives setdisplay sidebar`).
      - Scoped bossbars strictly to `@a[tag=in_flight]`, completely hiding bossbars when players are on foot inside the Hangar.
      - Scoped AWACS combat radio spam away from the hangar zone.
      - Single-line mobile-friendly actionbar telemetry HUD: `⚡ <speed> km/h | 🎯 LOCKED/SEARCHING | 🚀 READY | [Slot 3: Boost | Slot 4: Flares]`.
    - **Enclosed Lower Hangar Bay Spawn (`(0, 112, 0)`):**
      - Built an enclosed, well-lit lower deck hangar at `(0, 112, 0)` (floor Y=111, ceiling Y=118) with deepslate bricks, quartz taxiway lines, recessed sea lanterns, and carrier wall styling.
      - Set exact world spawn to `0 112 0` looking North directly at Instructor Viper at `(0, 112, -6)`.
      - Touch-proof interaction triggers: right-click, left-click punch, or walking within 2.5m initiates interaction.
      - Parked 3D F-22A at `(8, 112, -12)` with green pad boarding trigger.
      - Mission Table at `(0, 112, -2)` unlocks after lesson graduation.
    - **Universal 4-Slot Hotbar & Smart Trigger:**
      - Slot 1 (`carrot_on_a_stick`): Smart Trigger firing 20mm Vulcan autocannon (3.5m radius) on click/hold, and auto-launching homing missiles every 2.0s when locked on a target.
      - Slot 2 (`firework_star`): Instant Special Weapon fire (EML/QAAM/AGM) with bounce-back to Slot 1 (`0b`).
      - Slot 3 (`feather`): Instant Afterburner supersonic toggle with bounce-back to Slot 1 (`0b`).
      - Slot 4 (`shield`): Instant Flares deployment with bounce-back to Slot 1 (`0b`).
      - Slots 5–9 empty to prevent accidental inventory misclicks on touchscreen.
    - **Bedrock Fly-By-Wire Assist & Horizon Auto-Leveling (`FlightTest.java`):**
      - Auto-detected for Bedrock/Floodgate UUIDs (`00000000-0000-0000-`) and toggled via `/trigger autolevel`.
      - Pitch magnetic deadzone ($\pm 12^\circ$) smoothly levels vertical velocity (`dir.setY(dir.getY() * 0.65)`).
      - Soft pitch limiter clamps maximum flight angle to $[-40^\circ, +40^\circ]$ to prevent disorienting death spirals.
      - Ground Proximity Warning System (Auto-GCAS): cushions aircraft upward when $Y < 72$ and diving ($pitch > 5^\circ$).
      - **CRITICAL:** Zero `/tp` camera pitch rotation applied in flight to completely eliminate GeyserMC mobile camera jitter.
    - **Interactive 4-Step In-Air Flight Lesson (`tutorial/`):**
      - Step 1: Basic flight and steering through 3 glowing gold rings.
      - Step 2: Afterburner boost and airbrake deceleration test.
      - Step 3: 20mm Vulcan cannon target practice destroying red blimp target.
      - Step 4: Smart Trigger auto-missile lock & splash on moving target drone.
      - Step 5: Graduation fanfare, `+1,000 XP`, `+2,500 MRP`, and safe carrier recovery to unlocked Mission Table.
    - **Server Health:** Verified 20.0 TPS, zero command function errors in `latest.log`.

15. **Operation Masterpiece Architecture & Aerospace Sculptures:**
    - **USS Andersen Supercarrier (CVN-77 Flagship Artwork):**
      - True-to-life naval architecture: 120-block flared hull, sponsons with Phalanx CIWS, Sea Sparrow, and RIM-116 RAM launchers.
      - Optical Landing System (FLOLS "Meatball") array on port sponson.
      - 3 Overhanging aircraft elevators with yellow hazard borders and vertical guide pylons.
      - Catwalk galleries with life-raft canisters, emergency ladders, and fire stations.
      - Angled landing runway with threshold piano keys, dashed foul lines, 4 heavy arrestor cables, and deck sheave housings.
      - Catapults 1 and 2 with recessed guide tracks, launch shuttles, and articulated yellow Jet Blast Deflectors (JBDs) with cooling piping.
      - Yellow Flight Deck Towing Tug Tractor and crash crane parked near island.
      - Modern faceted stealth island superstructure with Primary Flight Control (Pri-Fly) observation bridge, 4-face AN/SPY-1 radar arrays, and enclosed mast with TACAN radome.
      - Industrial Skunk Works Lower Hangar Bay: overhead yellow steel gantry crane with hoist, recessed lighting diffusers, Pratt & Whitney F119 engine test dolly, fuel manifolds, tool chests, and holographic war table projector.
    - **International Space Elevator (ISEV "Lighthouse" Megastructure):**
      - 80-block hexagonal offshore deepwater Earth Port marine platform with breakwaters, twin helipads, and 6 high-tension guy-wire anchor pylons radiating into the ocean.
      - Aerodynamic tapered carbon-nanotube tri-pylon exoskeleton (smooth quartz, chiseled quartz, dark prismarine).
      - 12x12 vertical flight corridor for Mission 8 tunnel run with structural ribs every 20 blocks, magnetic guide rails, and red obstruction beacons.
      - 3 Docked multi-deck Climber Cars ("Carina Alpha", "Beta") with articulated photovoltaic solar arrays at Y=120, 200, 280 stabilizer rings.
      - Stratospheric tether apex at Y=319 with quad beacon array piercing the clouds.
    - **Stonehenge Mass-Accelerator Railgun Network:**
      - 100-block desert excavation impact crater basin with tiered blast revetments and industrial access roads.
      - Central subterranean geodesic reactor dome with 4 hyperbolic cooling towers venting steam (`campfire` smoke) and high-voltage superconducting busbars.
      - 8 Colossal 30-meter-long armored railgun supercannons arranged in a circle, each featuring circular barbette gear rings, sloped gunhouses, twin mass-accelerator barrels inclined skyward at 45 degrees, electromagnetic induction coils, and cooling radiator fins.
    - **Submersible Aviation Cruiser << ALICORN >>:**
      - 110-meter menacing black anechoic warship hull with wave-piercing faceted bow, catamaran twin-hull stern, and dual shrouded pump-jet propulsors.
      - 45-block-long central 600mm heavy nuclear rail-cannon along dorsal spine with amethyst/crying obsidian magnetic accelerator rails, hydraulic rams, and capacitor banks.
      - Bridge sail with optronic periscope masts and 4 automated rotary CIWS Gatling turrets on armored sponsons.
    - **Airborne Fortress << ARSENAL BIRD >>:**
      - 100-meter swept flying-wing airframe with stepped wing panels, vertical aerodynamic winglets, and forward cockpit blister.
      - 8 High-output electric turboprop engine nacelles with contra-rotating propeller blades.
      - Underside drone deployment bays with illuminated guidance tracks and dorsal APS shield generator node with radiant cyan forcefield pulses.
    - **Anchorhead Bay Naval Fleet & Battlecruiser Tanager:**
      - 80-meter modern stealth Flagship Battlecruiser Tanager with wave-piercing tumblehome hull, 130mm deck guns, 32-cell VLS missile deck, AN/SPY-1 radar deckhouse, and stern helicopter landing deck.
      - 6 Aegis guided missile destroyers in tactical wedge escort formation.
    - **Super-Heavy Siege Crawler << AIGAION-LAND >>:**
      - 50-meter behemoth land fortress on 8 multi-bogey caterpillar track assemblies with road wheels, armored glacis ramming prow, 4 twin 203mm artillery turrets, and central shield generator reactor citadel.
    - **Yinshi Valley Karst Mountains:**
      - Naturally eroded, terraced limestone karst spires with hanging dripstone stalactites, fly-through natural stone sky-bridges, canyon waterfalls, and an excavated cliffside C4I command bunker with flak batteries.
    - **Vehicles & Targets:**
      - Distinct 3D fighter jet models across all 6 showcase bays (F-22A, Su-57, A-10C, X-02S, CFA-44, ADF-11F).
      - 3D sculpted red Zeppelin target airship with observation gondola and tail fins.
      - 3D delta-wing autonomous target drone.

15. **Hangar Wayfinding, Scramble Lift & Universal Touch/Click NPC Interaction Overhaul:**
    - **Pneumatic Scramble Lift (Lower Hangar <-> Flight Deck):**
      - Built vertical elevator shaft connecting Lower Hangar Bay `(11, 112, 8)` directly to Flight Deck Briefing Room `(8, 121, 8)` with illuminated sea lantern portals and floating holographic signage.
      - Stepping onto either pressure plate triggers instantaneous transition (`elevator_up` / `elevator_down`) with audio cues (`beacon.activate`, `iron_golem.repair`) and visual portal particles.
    - **Illuminated Runway Guidance Floor Markings:**
      - Installed embedded sea lantern taxiway centerline strips branching from spawn `(0, 112, 0)`:
        - North: `[ ⬆️ Instructor Viper ]`
        - East: `[ ➡️ F-22A Boarding Pad ]`
        - South-East: `[ ➡️ Flight Deck Lift & Briefing Room ]`
    - **Dynamic Context-Aware Actionbar HUD:**
      - Lower Hangar (`Y <= 117`): Dynamically directs players based on tutorial state (`Talk to Instructor Viper ahead` → `Board F-22A at Green Pad` → `Mission Table / Lift to Briefing Room`).
      - Flight Deck (`Y >= 118`): Dynamically directs players to active officers (`Cmdr. McKinsey` for Act I M1/M2, `AWACS SkyEye` for Act II/III M3-M8, `Avril` for Superplane Forge, or Catapults).
    - **Universal Multi-Channel NPC Interaction Engine (Touch, Click, Punch & Proximity):**
      - Fixed villager professions to `none` with empty trade recipes (`Offers:{Recipes:[]}`) across all NPCs (Instructor Viper, Cmdr. McKinsey, Avril), permanently disabling vanilla trading GUI interception.
      - Added attack NBT handling (`on attacker run ...` and `data remove entity @s attack`) across all interaction entities in `process_terminals.mcfunction`.
      - Added 2.5m proximity walk-up detection with 5-second debounce countdown (`ac_npc_cd`) for McKinsey, SkyEye, Avril, and Contract Board.
      - Implemented `PlayerInteractEntityEvent`, `PlayerInteractAtEntityEvent`, and `EntityDamageByEntityEvent` in Paper plugin (`FlightTest.java`) to intercept clicks, taps, and attacks on both Java and Bedrock clients, instantly triggering dialogues and commands.

16. **Autonomous NPC Artificial Intelligence & Living Spatial Gaze Engine:**
    - **Dual-Layer Conversational Intelligence Backend (`dashboard/app.py` - `/api/ai/chat`):**
      - Direct integration with Google Gemini Flash API (`gemini-2.5-flash` / `gemini-1.5-flash` / `gemini-3.8-flash`) with deep Ace Combat military persona system prompts:
        - **Instructor Viper:** Veteran flight instructor focused on flight controls, afterburners, stall recovery, and high-G combat maneuvers.
        - **Commander McKinsey:** Cynical, strict 444th Penal Wing commander treating pilots as expendable decoys, briefing Act I Sorties 1 & 2.
        - **AWACS SkyEye:** Analytical radar officer coordinating LRSSG campaign operations, tactical telemetry, and threat profiles (Mihaly, Alicorn, Arsenal Bird).
        - **Avril "Scrap Queen":** Tough aero-engineer managing salvage blueprints, titanium plating, railgun upgrades, and superplane forging.
      - Built-in zero-latency semantic intent matcher covering dozens of tactical subjects (dodging missiles, stalls, touch controls, boss tactics, superplane requirements, lore) ensuring immediate, accurate responses even when offline or rate-limited.
      - Dialogue automatically streams to Port 8080 Web Dashboard combat log and triggers real-time Web Speech TTS.
    - **Seamless In-Game Chat Routing & Commands (`FlightTest.java`):**
      - Registered `/ask <npc> <question>` and `/radio <npc> <question>` commands with async HTTP dispatch to `http://127.0.0.1:8080/api/ai/chat`.
      - Proximity & prefix chat listener (`AsyncPlayerChatEvent`):
        - Direct callsigns: `!viper`, `!mckinsey`, `!skyeye`, `!avril`, `@viper`, `@mckinsey`, etc.
        - Dynamic proximity chat: typing any message in chat while standing within 4.5 meters of an NPC automatically routes the question to that officer.
        - Responses broadcast via Ace Combat formatted military tellraw transmissions with authentic sound cues (`strangereal:singleton.radio.squelch` or `block.note_block.bit`) to nearby pilots within 15 blocks.
    - **Living Spatial Gaze & Ambient Physical AI (`ai_tick.mcfunction` & `ai_idle_pulse.mcfunction`):**
      - 20Hz dynamic head tracking: NPCs smoothly rotate to maintain eye contact with approaching players within 8 meters (`tp @s ~ ~ ~ facing entity @p[distance=..8] eyes`).
      - SkyEye Hologram continuously emits shimmering blue radar scan rings (`wax_on` + `electric_spark` particles).
      - Ambient soundscapes every 10 seconds: Avril hammer clangs and welding sparks, McKinsey radio static checks, SkyEye tactical sweeps.
    - **Touch-Friendly 1-Click Interactive Questions:**
      - Added clickable tellraw quick-questions to all NPC menus (e.g. `[ ❓ "How do I dodge missiles?" ]`, `[ ❓ "Why was I sent to the penal unit?" ]`, `[ ❓ "Airspace radar status?" ]`, `[ ❓ "How do I forge the Wyvern?" ]`) enabling effortless 1-tap inquiries for mobile Bedrock and console players.

17. **Studio Upgrade 1: Custom Bitmap UI, Character Portraits & Letterbox Cutscenes:**
    - **Custom Font HUD Glyphs & Avionics Graphical Display:**
      - Generated 16x16 and 32x32 pixel-art PNG sprites bound to Unicode Private Use Area characters (`\uE001` - `\uE020`) in `assets/minecraft/font/default.json` (Java) and Bedrock `font/glyph_E0.png` (512x512):
        - `\uE001`: **Missile Ready Icon** (bright neon green AIM-120 missile silhouette).
        - `\uE002`: **Missile Reloading Icon** (dim slate-grey cooldown outline).
        - `\uE003`: **Radar Lock Diamond** (glowing red Ace Combat HUD lock diamond with corner ticks).
        - `\uE004`: **Afterburner Flame Badge** (twin supersonic shock diamonds with electric cyan core).
        - `\uE005`: **Flare Countermeasure Shield** (defensive shield with radiating magnesium spark bursts).
        - `\uE006`: **Instructor Viper Portrait** (32x32 aviator sunglasses & military comms headset).
        - `\uE007`: **WSO "Prez" Portrait** (32x32 backseat flight helmet, racing stripe & comms mic).
        - `\uE008`: **AWACS SkyEye Portrait** (32x32 tactical cyan PPI radar scope emblem).
        - `\uE009`: **Sol 1 "Mihaly" Portrait** (32x32 reflective orange visor & pressurized oxygen mask).
        - `\uE010`: **Capt. Matias Torres Portrait** (32x32 peaked naval commander cap & officer tunic).
        - `\uE011` / `\uE012`: **Letterbox Cinema Bars**.
        - `\uE013` – `\uE015`: **3-Frame Animated Audio Waveforms** (live equalizers beside portraits).
        - `\uE016`: **Widescreen Cinematic Letterbox Frame Overlay** (256x144 / 2.39:1 anamorphic framing).
      - Eliminated all ASCII `[ || ]` HUD clutter from actionbar; replaced with clean graphical avionics telemetry:
        `\uE004 <speed> kts   \uE003 LOCKED   \uE001 READY   \uE005 FLARES`.
    - **Studio Dialogue Pop-Up Engine:**
      - Replaced raw chat broadcasts with styled two-line on-screen radio transmission banners in subtitles and tellraw:
        `\uE007 \uE014  WSO PREZ: "Missile lock confirmed! Fox Two—let it fly!"`
      - Accompanied by authentic `strangereal:singleton.radio.squelch` audio cues and animated equalizers.
      - Fully synchronized with Port 8080 Web Dashboard WebSocket TTS via console `say << Speaker: Dialogue >>`.
    - **Cinematic Letterbox Presenter (`strangereal:cinematic_play`):**
      - Camera rig upgraded to `minecraft:item_display` with `teleport_duration: 40`, generating continuous, buttery-smooth Catmull-Rom spline dollies along waypoints across the carrier flight deck, catapult ramp, and storm clouds.
      - Displays widescreen letterbox cinema bars (`\uE016`) while hiding hotbar clutter and conferring invulnerability.
      - Interactive **Sneak-to-Skip**: Tapping `Sneak` during co-op replays instantly skips dialogue to the catapult scramble.
    - **Pack Compilation & Deployment:**
      - Rebuilt `dashboard/strangereal_assets.zip` and `dashboard/strangereal_bedrock.mcpack`.
      - Updated SHA-1 hash in `server.properties` (`562b18f0b9dda89b6f1ae04fcf450eedbed29f16`).
      - Recompiled `StrangerealFlight.jar` and verified 0 errors in PaperMC `latest.log`.

18. **Studio Upgrade 2: Diegetic 3D Hangar Hub & Interactive War Table:**
    - **3D Holographic Diorama War Table (`0, 112, -16`):**
      - Built a physical 5x5 tactical command table featuring scaled miniature 3D models (`0.15x` - `0.35x` scale): USS Andersen Carrier, Yinshi Valley karst spires, Stonehenge Railgun Crater, Space Elevator needle, and Anchorhead Fleet.
      - 4 floating, rotating 3D sector tokens (`M1/M2 Yinshi Ghosts`, `M3/M6 Anchorhead Bay`, `M5/M7 Stonehenge Raid`, `M8 Lighthouse Finale`).
      - Real-time weather particle effects pulsing over the table: Yinshi rain clouds, Anchorhead ocean spray, Stonehenge EMP sparks, and Space Elevator ascending energy rings.
      - AWACS SkyEye voice, portrait glyph (`\uE008 \uE013`), and squelch sound cues upon sector selection.
      - Central `[ 🚀 LAUNCH SORTIE ]` action elevating participating squad to Catapult 1 and launching the chosen mission.
    - **Physical Aircraft Customization Hydraulic Lift (`8, 112, -12`):**
      - 5x5 industrial hydraulic elevator pit with yellow hazard caution borders and overhead steel gantry crane with spotlights.
      - Massive 3D parked jet display entity (`2.2x` scale) on the lift platform with smooth vertical translation (`teleport_duration: 15`).
      - 3 physical, touch-friendly control pedestals at `Z=-9`:
        - `[ ◀ CHANGE JET ▶ ]`: Hydraulic hiss and steam particles, lowering the lift, swapping between `F-22A`, `Su-57`, `A-10C`, and `X-02S`, and raising back into overhead spotlights.
        - `[ 🎨 CYCLE LIVERY ]`: Spray-paint mist and welding sparks, live-cycling liveries (`Osea`, `Razgriz`, `Cipher`, `Yellow 13`, `24K Gold`) on the parked jet and synchronizing with player loadout.
        - `[ ✈️ BOARD COCKPIT ]`: Canopy closure audio, afterburner spool, equips wings and loadout, and hoists pilot directly to Catapult 1 on the flight deck.
    - **Living Hangar Crew & Squadron Trophy Wall (`-10, 112, -12`):**
      - Chief Mechanic Avril stationed at `(-6, 112, -12)` with ambient welding sparks, hammer clangs, and spatial gaze tracking nearby pilots.
      - Automated yellow munitions cart on continuous, smooth 140-tick patrol along the hangar wall with mechanical hum audio.
      - 4-Pedestal Squadron Trophy Archive along `X=-13`:
        - Pedestal 1: **Viper 1 Wingtip** (Tutorial / M1)
        - Pedestal 2: **Stonehenge Railgun Fragment** (M5 / M7)
        - Pedestal 3: **Alicorn Reactor Core** (M6)
        - Pedestal 4: **Sol 1 / Z.O.E. Neural Core** (M7 / M8)
        - Dynamic state: locked cases indicate mission requirements; unlocked relics emit particle auras and play authentic character lore transmissions with portraits.
    - **Multi-Input Cross-Play & Performance:**
      - Registered all new interaction tags in `FlightTest.java` (`onPlayerInteractEntity`, `onPlayerInteractAtEntity`, `onEntityDamageByEntity`) guaranteeing instant responsiveness for Bedrock taps and Java clicks.
      - Fully verified with 0 errors in `latest.log` and locked 20.0 TPS.

14. **Studio Upgrade 3: Visual Danger Telegraphing, Destructible Voxel Set-Pieces & Physical Loot Crates:**
    - **Visual Danger Telegraphing:**
      - **Sol 1 & Alicorn EML Railgun 2.0s Telegraph (`strangereal:telegraph/eml_*`):** 40-tick cycle tracking pilot look-vector with a 100-meter crimson targeting laser line (`minecraft:dust{color:[1.0,0.0,0.0],scale:0.6}`) and acoustic capacitor charge whine. At T-0.3s (tick 6), locks spatial heading by anchoring to `eml_laser_anchor` so pilots can barrel-roll out of the red beam before the white-hot sonic/rod blast fires. Features evasive praise dialogue from WSO Prez upon successful evasion. Wired into Mission 4 (Sol 1 Survival), Mission 6 (Alicorn 600mm Rail-Cannon), and Mission 7 (Sol 1 Kings Duel).
      - **Stonehenge Shockwave Ceiling Warning Grid (`strangereal:telegraph/stonehenge_ceiling`):** Renders a visible horizontal crimson warning grid and energy cloud sheet at safe ceiling altitude `Y=150` across the crater (`0, 150, 1000`) during the 10-second countdown in Mission 5, providing an unambiguous visual barrier pilots must dive beneath.
      - **3D Target Lead Brackets (`strangereal:telegraph/target_brackets`):** Frames currently locked bandit aircraft with a 3D luminous green reticle display (`[ ‹ ⬡ LOCKED ⬡ › ]`), 4 corner brackets, and dynamic lead-computing pipper in world space for crystal-clear tracking against clouds and deep ocean water.
    - **Destructible Voxel Set-Pieces (Self-Repairing):**
      - **Yinshi Valley Rockslides & Bunkers (`strangereal:setpieces/yinshi_*`):** Physical collapsing `falling_block` voxels (`cobblestone`, `cracked_stone_bricks`, `stone`, `gravel`, `iron_bars`), cascading shockwaves, and canyon debris bursts upon bunker core/radar tower collapse, with automatic battlefield restoration.
      - **Warship Turret Detonations (`strangereal:setpieces/warship_*`):** Destroyed CIWS/SAM mounts on Aegis Destroyers, Flagship Tanager, and Dreadnought Alicorn convert into charred blackstone and magma blocks with persistent billowing smoke plumes.
    - **Physical Military Parachute Supply Crates & Boss Loot Drops (`strangereal:loot/*`):**
      - 3D physical cargo crates with deployed yellow wool parachute canopy, webbing cords, and interaction hitbox dropping on boss defeats (M1-M8 and Sidequests) and directly onto the Carrier elevator pad (`0, 112, -4`).
      - Fanfare audio, fireworks burst, floating 3D magnetic reward drops (+7,500 MRP, +3,000 XP, Boss Salvage Cores), and dual-input support (Java right-click, Bedrock touch tap, proximity walk-up).

15. **Studio Upgrade 4: Adaptive In-Game Soundtrack & Music Director Engine:**
    - **6 Multi-Layered Ace Combat Style Instrumental OST Tracks (`scripts/synthesize_ost.py`):**
      - Generated 6 multi-layered, 44.1kHz stereo Vorbis audio tracks:
        1. `ost_hangar.ogg` (32.0s loop, 100 BPM): Atmospheric dark-synth pad progression (Dm -> Bb -> Gm -> A7), deep pulsing bassline, and periodic 8-second spatial sonar pings.
        2. `ost_scramble.ogg` (6.0s one-shot stinger): Rising orchestral brass swell and snare roll climaxing at T+3.0s with launch explosion and crash cymbal.
        3. `ost_act1_sky.ogg` (32.0s loop, 135 BPM): High-energy arcade flight-rock with driving 8th-note bass, punchy drums, and heroic synth lead.
        4. `ost_act2_update.ogg` (32.0s loop, 150 BPM): Urgent breakbeat percussion with tense minor-key staccato string/synth ostinato.
        5. `ost_boss_daredevil.ogg` (32.0s loop, 165 BPM): Spanish Phrygian acoustic plucked arpeggios ("Zero" motif), choir/brass swells ("Daredevil" motif), and double-time war drums.
        6. `ost_victory.ogg` (16.0s fanfare, 120 BPM): Triumphant major-key brass fanfare (D -> G -> A -> D) and shimmering synth resolution.
    - **Cross-Platform Audio Architecture & Vanilla Silence:**
      - Silenced vanilla piano music (`music.game`, `music.creative`, `music.under_water`, `music.menu`, and all biome tracks) in Java (`assets/minecraft/sounds.json`) and Bedrock (`sounds/sound_definitions.json`).
      - Sound event registration under `singleton.ost.<track>` with category `music` and full 2D non-positional stereo playback via `volume 10000.0, minVolume 1.0` (zero Doppler fadeout when flying at Mach 2).
      - Rebuilt `dashboard/strangereal_assets.zip` (SHA-1: `45ea735d52777c1f3a00628a1f765f78575546ea`) and `dashboard/strangereal_bedrock.mcpack`, auto-served by FastAPI port 8080.
    - **Deterministic Adaptive Music Director (`strangereal:music_director`):**
      - Scoreboard state machine (`ac_music_state`, `ac_music_desired`, `ac_music_timer`, `ac_music_mute`, `toggle_music`).
      - Scene detection (5-tick polling):
        - State 1: Hangar / Carrier deck on foot (`Y < 125`).
        - State 2: Catapult Launch (120-tick stinger synchronized with 60-tick steam spool and blast).
        - State 3: Airborne / Flight / Act 1.
        - State 4: Mission Act 2 Complications (`<< MISSION UPDATE >>`).
        - State 5: Boss Climax / Proximity within 350m of Sol 1, Arsenal Bird, Alicorn, or Stonehenge.
        - State 6: Mission Accomplished Debriefing Fanfare (320-tick fanfare flowing to Hangar).
      - Instant zero-overlap state switching (`stopsound @s music` ensures RWR/radio dialogue is never cut).
      - Sleek 2-second HUD toast banner (`🎵 NOW PLAYING: "..."`).
      - Player mute toggle via `/trigger toggle_music` and interactive Hangar Jukebox terminal.
      - 0 errors in `latest.log`, locked at 20.0 TPS.

14. **Colossal Aviation Hangar Museum Megastructure & 0.25m Parametric Voxel Engine (Part 1):**
    - **1 Block = 0.25m (4:1 Macro-Voxel Scale):**
      - Centered at `(0, 64, -1500)`, spanning 1,200 blocks long x 600 blocks wide x 180 blocks high ($Y=64$ floor to $Y=244$ vaulted skylight apex).
      - **Grand Rotunda Atrium (300 x 300):** Features an elevated obsidian and quartz podium with crying obsidian inlays, recessed sea lantern illumination, and 8 parabolic structural dome arches meeting at a 50-block skylight ring.
      - **3-Tier Viewing Architecture:**
        - Ground Exhibition Floor ($Y=64$): Smooth quartz with recessed border lights and information stanchions.
        - Cockpit Viewing Skybridges ($Y=82$): Boarding stairs and elevated tinted glass walkways eye-level with cockpits.
        - Upper Aerial Mezzanine ($Y=135$): 360-degree suspended glass observation ring hung by vertical iron suspension cables.
      - **5 Exhibition Concourses & Test Runway:**
        - Concourse A (West, $350 \times 250$): Cold War Supersonic Legends.
        - Concourse B (North-West, $350 \times 250$): 4th-Gen Air Superiority.
        - Concourse C (North-East, $350 \times 250$): European Delta-Canards & RNLAF Solo Display Team Showcase.
        - Concourse D (East, $350 \times 250$): Heavy Strike, Close Air Support & A-10C Warthog.
        - Concourse E (South, $300 \times 450$): 5th-Gen Stealth leading to 200-block wide industrial blast doors and active 500m Test-Flight Runway ($Z \in [-900, -400]$).
    - **Parametric 3D Voxel Aircraft Generator (`scripts/voxel_jet_engine_25cm.py`):**
      - Parametric CSG voxelization with run-length $Z$-axis compression generating 5 flagship macro aircraft:
        - **SR-71A Blackbird (131 blocks long x 68 span):** 10,927 voxels compressed into 681 commands.
        - **F-22A Raptor (76 blocks long x 54 span):** 4,571 voxels compressed into 393 commands.
        - **F-16C Fighting Falcon (60 blocks long x 40 span):** 1,839 voxels compressed into 216 commands.
        - **F-16A MLU RNLAF "Orange Lion" (60 blocks long x 40 span):** 1,839 voxels in iconic Dutch national aerobatic display livery.
        - **A-10C Thunderbolt II Warthog (65 blocks long x 70 span):** 4,291 voxels with twin turbofans and 30mm GAU-8 Avenger Gatling cannon.
    - **Cross-Platform Museum Traversal & Explorer Hotbar (`strangereal:museum/*`):**
      - **Slot 1: `[ 📖 AUDIO GUIDE & JET SCANNER ]`:** Proximity raycast scanner detecting nearby aircraft, displaying Ace Combat style Technical Dossiers in chat, HUD title toasts, and triggering console broadcasts (`say << Museum Audio Guide: ... >>`) streamed via WebSockets to Port 8080 Web Speech TTS.
      - **Slot 2: `[ 🚀 MUSEUM HOVER-JETPACK ]`:** Zero-gravity vertical hover physics (Levitation 255 vertical freeze), jump to climb, sneak to descend with thruster particles, and touch/PC slot toggle.
      - **Slot 3: `[ 🧭 JUMP TO MUSEUM WING ]`:** 1-tap clickable interactive chat menu using `/trigger ac_tp_wing` (cheat-free, non-op safe) teleporting across all 5 concourses, gantries, mezzanine, runway, and carrier lobby.
      - **Express Moving Walkways:** Automatic `Speed IV` boost whenever players step on cyan glazed chevron conveyors.
      - **Physical Hangar Rapid Transit Terminal:** Step-on pressure plate and interaction terminal in Carrier Lower Hangar Bay `(-10, 112, 2)` for instantaneous transit to the Museum Atrium.

15. **Colossal Aviation Hangar Museum — Part 2 (13 Macro-Scale Fighter Jets, Walk-In Cockpits & Gantries):**
    - **13 True-to-Scale Macro Aircraft (1 Block = 25 cm / 4 Blocks = 1 Meter):**
      - Parametric CSG voxelization generating over 63,000 macro voxels across 13 iconic fighter jets with landing gear, authentic squadron liveries, and walk-in cockpits (ejection seats, HUDs, MFDs, flight sticks):
        - #1: **Lockheed SR-71A Blackbird ("Habu")** (Atrium Centerpiece, 131x68x23 blocks, tandem walk-in cockpits, J58 shock cones, Skunk Works red tail stripes).
        - #2: **Mikoyan-Gurevich MiG-21bis "Fishbed"** (Wing A, 63x29x17 blocks, circular nose intake with emerald-green conical radar shock cone, 57° delta wing, turquoise cockpit interior).
        - #3: **McDonnell Douglas F-4E Phantom II** (Wing A, 77x47x20 blocks, Southeast Asia 3-tone camo, under-chin 20mm M61A1 Vulcan, 12° upturned outer wings, 23° downward anhedral tail).
        - #4: **Grumman F-14D Super Tomcat "Jolly Rogers"** (Wing A, 76x78x20 blocks wings extended, black twin tails with white skull-and-crossbones insignia, 4x 16-block AIM-54 Phoenix missiles).
        - #5: **Mikoyan MiG-31BM "Foxhound"** (Wing A, 90x54x25 blocks, Mach 2.83 heavy interceptor, wedge side intakes, tandem rough-runway bogies, 4x R-33 missiles).
        - #6: **SAAB JA 37 Viggen "Thunderbolt"** (Wing A, 66x42x24 blocks, Swedish 4-color splinter camo, canard-delta wings with flapped canards, tall folding tail, thrust reverser).
        - #7: **McDonnell Douglas F-15C Eagle** (Wing B, 78x52x23 blocks, USAF Compass Ghost Grey, 104-0 undefeated air combat record, boxy variable intakes, exposed titanium turkey feathers, 8 AAMs).
        - #8: **General Dynamics F-16C Fighting Falcon + RNLAF "Orange Lion"** (Wing B/C, 60x40x20 blocks, smiling oval chin intake, 360° bubble canopy, plus metallic Dutch Lion Demo Team livery).
        - #9: **Boeing F/A-18E Super Hornet "Top Gun Maverick"** (Wing B, 73x55x20 blocks, VX-9 black dorsal spine and blue striping, rhombic caret intakes, sweeping LERX strakes, tailhook).
        - #10: **Sukhoi Su-27SM "Flanker-B"** (Wing B, 88x59x24 blocks, Russian 3-tone blue splinter camo, drooping crane radome, offset IRST ball, stinger tailcone, AL-31F nacelles with ventral strakes).
        - #11: **Mikoyan MiG-29A "Fulcrum"** (Wing B, 69x45x19 blocks, blended wing-body, dorsal upper intake louvers for rough-field operations, helmet-mounted sight targeting).
        - #12: **Grumman F-14A Tomcat Banked in Atrium** (Grand Rotunda, suspended at Y=135 in 45° High-G bank, swept wings, glowing afterburners, steel suspension cables eye-level with Upper Aerial Mezzanine).
        - #13: **McDonnell Douglas F-15E Strike Eagle "Mudhen"** (Wing B, 78x52x23 blocks, Gunship Dark Grey, bulged Conformal Fuel Tanks with GBU-12 laser-guided bombs, tandem walk-in cockpit with 4 color CRTs).
    - **Industrial Boarding Gantries & Instant Elevator Pads:**
      - Uniform 7-block yellow steel boarding gantry staircase alongside each grounded jet.
      - Green Pad (`emerald_block` + `light_weighted_pressure_plate`): Stepping on it instantly teleports player up 7 blocks (`elevator_up.mcfunction`) onto the boarding platform (`Y=72`) to step directly inside the cockpit.
      - Red Pad (`redstone_block` + `heavy_weighted_pressure_plate`): Stepping on it instantly teleports player down (`elevator_down.mcfunction`) to the exhibition floor at the foot of the stairs.
    - **14 Technical Audio Guide Dossiers & Proximity Scanner:**
      - Full technical dossiers with dimensions, speed, service ceiling, powerplant, and armament for all 14 aircraft exhibits.
      - Concise `< 240` character audio guide broadcasts streamed to Port 8080 Web Speech TTS.
      - Upgraded `wing_teleport.mcfunction` and `process_teleport.mcfunction` with 12 interactive clickable fast-travel destinations across the museum.

16. **Colossal Aviation Hangar Museum — Part 3 (Giants #14–#26, Interactive Kiosks, Live Engine Demos, Scavenger Hunt & Cockpit Test-Flights):**
    - **13 True-to-Scale Macro Aircraft (1 Block = 25 cm / 4 Blocks = 1 Meter):**
      - Parametric CSG voxelization generating over 45,000 macro voxels across 13 iconic fighter jets with landing gear, authentic squadron liveries, and walk-in cockpits:
        - #14: **Eurofighter Typhoon FGR4** (Wing C, 64x44x21 blocks, chin intake with splitter plate, nose canards, cropped delta wing).
        - #15: **Dassault Rafale M** (Wing C, 61x44x21 blocks, French Navy grey, semi-ventral intakes, active canards, refueling probe).
        - #16: **SAAB JAS 39E Gripen** (Wing C, 61x35x18 blocks, Nordic grey splinter camo, shoulder intakes, delta-canard).
        - #17: **Dassault Mirage 2000-5F** (Wing C, 57x36x21 blocks, French air-defense blue-grey camo, tail-less delta wing, semicircular shock cone intakes).
        - #18: **Panavia Tornado IDS** (Wing C, 67x56x24 blocks, NATO green/grey camo, massive single tailfin, variable-sweep wings, 2x Storm Shadow cruise missiles).
        - #19: **Fairchild Republic A-10C Thunderbolt II "Shark Mouth"** (Wing D, 65x70x18 blocks, Flying Tigers Shark-Mouth nose art, 8-block 30mm GAU-8/A Gatling cannon, twin TF34 turbofans, 11 weapon pylons).
        - #20: **Lockheed F-117A Nighthawk** (Wing D, 80x53x19 blocks, radar-absorbent faceted planes, V-tail, open belly bay with 2x 16-block GBU-27 Paveway III laser bombs).
        - #21: **McDonnell Douglas AV-8B Harrier II Plus** (Wing D, 56x37x14 blocks, **Live Mid-Air VTOL Hover** 16 blocks above floor over circular VTOL helipad with continuous downward Pegasus nozzle steam/smoke downwash).
        - #22: **Sukhoi Su-34 "Fullback"** (Wing D, 93x59x20 blocks, platypus duckbill nose, side-by-side 2-seat armored cockpit, rear stinger radar).
        - #23: **Lockheed Martin F-22A Raptor Macro** (Wing E, 76x54x20 blocks, metallic sheen, open main and side weapons bays with 6 AMRAAM + 2 Sidewinder missiles).
        - #24: **Lockheed Martin F-35A/C Lightning II** (Wing E, 63x52x18 blocks, anthracite RAM tape, DSI bumps, single serrated F135 nozzle).
        - #25: **Sukhoi Su-57 "Felon" Macro** (Wing E, 80x56x19 blocks, procedural digital pixel shark camo, wide blended body, 3D nozzles).
        - #26: **Sukhoi Su-47 "Berkut" & X-02S Strike Wyvern** (Wing E, 90x67x20 blocks, forward-swept wings, open ventral EML Railgun).
    - **Interactive Exhibit Kiosks & Demonstrations (`setup_kiosks.mcfunction`):**
      - 27 interactive 3D holographic pedestals (`text_display` + `interaction`) with 1-tap options:
        - `[ 📖 Read Full Aircraft Dossier ]`: Displays rich Ace Combat technical specs and gives custom illustrated written book ("Aviation Encyclopedia" by Chief Curator Viper) via 1.21+ `written_book_content` component format.
        - `[ 🔥 Ignite Afterburners & Weapon Demo ]`: Triggers 5-second live spectacle with exhaust shock diamonds, engine roar, A-10 30mm GAU-8 BRRRT audio/sparks, and X-02S EML discharge.
        - `[ ✈️ Sit in Cockpit & Launch Test Flight! ]`: Saves origin exhibit ID, teleports to runway (`0, 65, -890`), equips flight wings/helmet/weapons, and provides Slot 9 `[ 🏛️ Return to Exhibit ]` (`compass`) to return directly to the aircraft bay.
    - **Chief Curator Viper & 10-Stage Scavenger Hunt:**
      - World spawn permanently set to Grand Rotunda (`0, 65, -1460`) facing the 131-block SR-71 Blackbird and Chief Curator Viper (`0, 65, -1470`).
      - 10-stage guided scavenger hunt requiring pilots to climb inside 10 specific cockpits across all 5 wings, culminating in `[ ★ MASTER AVIATOR ]` title and unlocking all war table sorties.
      - Modernized all gear replacements to Minecraft 1.21+ component syntax (`elytra[...] 1`, `carrot_on_a_stick[...] 1`).
      - Verified 0 errors in `latest.log` and locked 20.0 TPS.

17. **Colossal Aviation Hangar Museum — Final Integration (X-Ray Cutaway Inspector & Aero-Engineering Suite):**
    - **The `[ 🔬 X-Ray Cutaway Inspector ]` Engine (`scripts/xray_cutaway.py`):**
      - Parametric chunk-safe block replacement suite generating 59 modular mcfunctions in `datapacks/strangereal_engine/data/strangereal/function/museum/`.
      - Automatically slices bounding boxes to strictly abide by Minecraft's 32,768 block `/fill` limit.
      - Converts opaque airframe plating (concrete, terracotta, blackstone) into transparent `tinted_glass` and `cyan_stained_glass`.
      - Renders internal aero-systems at true 25cm scale:
        - **AESA Radar & Avionics:** Sea-lantern HUD projectors, AESA radar antenna dish arrays, and crying obsidian mission processors.
        - **Fuel & Hydraulic Pipelines:** Yellow JP-7/Jet-A1 fuel conduits along the fuselage spine branching to wings, paired with blue high-pressure hydraulic lines.
        - **Turbine Engine Cores:** Dual intake ducts leading to dark prismarine compressor fan stages, glowing magma combustor cans, and afterburner spray rings.
        - **Ventral Stealth Weapon Bays:** Open ventral weapon bays with trapeze ejector launchers and unspooled missiles ready to drop (F-22, F-35, Su-57, J-20, Su-47, F-117).
      - Pneumatic hydraulic hiss sound (`block.piston.contract`), electric scanline particle FX, and actionbar status HUD (`[ 🔬 X-RAY CUTAWAY: ACTIVE ]`).
      - Scoreboard snapshot architecture (`#xray_state ac_kiosk_act`) preventing toggle fallthrough races.
      - CLI suite: `python3 scripts/xray_cutaway.py --list`, `--toggle <eid>`, `--on <eid>`, `--off <eid>`.
    - **Chengdu J-20 "Mighty Dragon" (5th-Gen Stealth Canard-Delta Fighter):**
      - Constructed at Wing E Center `(0, 65, -1060)` spanning 85 blocks long x 52 blocks wide x 18 blocks high (`scripts/build_j20.py`).
      - Features chined faceted lifting body, all-moving forward canards, DSI intakes, clipped delta wings, outward-canted V-tails, ventral strakes, internal PL-15 missile bay, and twin WS-10C/15 nozzles.
      - Integrated with dedicated technical dossier (`dossier_j20.mcfunction`), kiosk pedestal, and walk-in cockpit.
    - **Universal 3-Button Interactive Kiosks & Touch Scramble:**
      - Button 1: `[ 📖 READ DOSSIER & AUDIO GUIDE ]` (Illustrated book + Port 8080 TTS).
      - Button 2: `[ 🔬 X-RAY CUTAWAY INSPECTOR ]` (Toggles transparent glass to inspect internal aero-systems).
      - Button 3: `[ 🔥 IGNITE AFTERBURNERS & ENGINE SOUND ]` (5-second live engine spectacle).
      - Button 4: `[ ✈️ SIT IN COCKPIT & LAUNCH TEST FLIGHT! ]` (Runway scramble launch).
      - Direct Cockpit Click: Walking up boarding gantries and clicking the pilot seat directly triggers the test flight scramble.
    - **World Spawn & Junior Ace Scavenger Hunt Finalization:**
      - World spawn anchored at `(0, 65, -1460)` facing the 131-block SR-71 Blackbird and Chief Curator Viper.
      - Verified locked 20.0 TPS with zero errors in `latest.log`.

18. **Colossal Aviation Museum — Spawn Fix, Guided Onboarding & Rotunda War Table / Relic Integration:**
    - **Player Spawn Fix & Playerdata Disk Patch:**
      - Resolved player spawn override where existing players loaded old coordinates from `world/playerdata/<uuid>.dat` (e.g. $Y=209$).
      - Patched playerdata files on disk and created `force_museum_spawn.mcfunction` invoked every tick checking `unless score @s ac_museum_spawned matches 1..`.
      - Teleports all new and returning players directly onto the Grand Rotunda Welcome Carpet at `(0.5, 66.0, -1460.0)` facing North (`180.0 0.0`) towards Chief Curator Viper and the 131-block SR-71 Blackbird.
      - Set `/setworldspawn 0 66 -1460` and `/gamerule spawnRadius 0`.
      - Equips museum explorer gear with Slot 9 `[ 🏛️ RETURN TO MUSEUM ]` compass.
    - **Universal Return System:**
      - Added cheat-safe `/trigger museum` command accessible to all adventure/survival non-op players.
      - Slot 8/9 held compass trigger in `museum_tick.mcfunction` and `tick.mcfunction` enabling 1-tap return from anywhere in the world or mid-flight.
    - **"First 60 Seconds" Guided Museum Onboarding (`ac_tutorial_step` 0 -> 5):**
      - **Step 0:** Welcome Carpet with sea lantern underlay, pulsing gold floor particles (`minecraft:end_rod` + `wax_on`), title `NATIONAL FIGHTER JET MUSEUM`, and actionbar guidance to meet Curator Viper.
      - **Step 1:** Automatic proximity greeting within 3.5m of Viper (`onboarding_step1.mcfunction`), voice/portrait transmission (`\uE006`), and continuous glowing green particle trail (`happy_villager` + glowing lime particles) to the showcase exhibit pedestal.
      - **Step 2:** Interactive pedestal testing 25cm X-Ray Cutaway and 3-second live afterburner roar demo, advancing to Step 3.
      - **Step 3:** Green particle trail leading up yellow gantry stairs (with instant elevator pad) into the cockpit seat. Prompt: `[ ✈️ Walk up the Yellow Stairs into the Cockpit & Tap the Pilot Seat! ]`.
      - **Step 4:** Guided First Flight scrambled out the 200m open Museum blast doors along outdoor test runway (`tp @s 0 75 -890 0 0`): 3 Gold Rings, Boost/Brake check, 20mm Vulcan Red Blimp target, and Smart Trigger homing missile lock against Target Drone (`guided_flight_tick.mcfunction`).
      - **Step 5:** `onboarding_graduate.mcfunction` awards `[ 🎖️ FLIGHT QUALIFIED: HERITAGE WING PILOT ]`, plays Victory Fanfare, teleports player back to Museum Rotunda, and unlocks the Central Rotunda 3D War Table.
    - **Museum Rotunda 3D Holographic War Table (`build_museum_war_table.mcfunction` at `(-6, 66, -1470)`):**
      - Spawns 23 diorama entities: 5x5 tactical command table, miniature terrain models (Carrier, Yinshi Valley, Stonehenge, Space Elevator, Anchorhead Fleet), and floating glowing mission tokens launching Acts I-IV Campaign sorties.
      - Universal cockpit scramble: climbing up the stairs of ANY of the 26 macro-scale jets launches directly into active story missions or test flights.
    - **Museum Rotunda Relic Trophy Wall (`update_museum_trophies.mcfunction` at `(6, 66, -1470)`):**
      - Spawns 8 trophy display entities: Viper 1 Wingtip, Stonehenge Mass-Accelerator Core, Alicorn Reactor Core, and Z.O.E. Neural Core with lore audio guide.
    - **PaperMC Datapack Symlink Compliance:**
      - Updated `scripts/sync.sh` to automatically mirror `datapacks/` to `world/datapacks/` via `rsync -a`, resolving PaperMC 1.20+/1.21+ forbidden symlink restrictions.

19. **Operation Double Canopy — 2-Seater Co-Op Flight & Weapons Engine (Pilot + WSO/RIO):**
    - **Dual Boarding Walk-In Cockpits & Gantry Platforms (`coop/setup_coop_cockpits`):**
      - Upgraded 4 iconic 2-seater macro-jets at 25cm scale with distinct `[ 🕹️ BOARD SEAT 1: PILOT ]` and `[ 🎯 BOARD SEAT 2: WSO / RIO ]` interaction pads:
        * **Grumman F-14D Super Tomcat:** Tandem front/rear ejection seats (`-190, 69, -1492` & `-190, 69, -1486`) + yellow gantry platform.
        * **McDonnell Douglas F-15E Strike Eagle:** Tandem front/rear ejection seats (`-190, 69, -1672` & `-190, 69, -1666`) + yellow gantry platform.
        * **Sukhoi Su-34 "Fullback":** Authentic side-by-side shoulder-to-shoulder cockpit (`298.5, 69, -1438` Pilot Left & `301.5, 69, -1438` WSO Right) + yellow gantry platform.
        * **Lockheed SR-71A Blackbird:** Tandem pilot & RSO cockpits (`0, 69, -1547` & `0, 69, -1541`) + rotunda gantry platform.
    - **Zero-Jitter Multi-Passenger Mounting Engine (`FlightTest.java` & `coop_tick`):**
      - Mounted WSO to Pilot via native `/ride` passenger linking and 20Hz velocity vector synchronization with zero `/tp` camera rubberbanding.
      - Pilot controls full 3D flight vector, supersonic afterburners, and Bedrock auto-leveling.
      - WSO enjoys 100% independent 360-degree camera yaw and pitch freedom to acquire targets and fire weapons in any direction.
    - **Mid-Flight Cockpit Boarding:**
      - Slot 7 `[ 🤝 JOIN WINGMAN COCKPIT ]` item in Museum explorer hotbar and universal `/trigger join_cockpit` command allowing players to hop into an airborne wingman's backseat anytime.
    - **Dedicated 4-Button WSO Hotbar Suite:**
      * **Slot 1 (`carrot_on_a_stick`):** `[ 🎯 360° OMNIDIRECTIONAL SMART TRIGGER ]` — 360° turret auto-cannon pulse burst + off-boresight homing missile lock.
      * **Slot 2 (Instant Bounce-Back):** Signature 2-seater super-weapon (12s cooldown):
        - **F-14D Tomcat:** `[ 🚀 AWG-9 6X PHOENIX VOLLEY ]` ripples 6 long-range AIM-54 missiles against up to 6 targets.
        - **F-15E Strike Eagle:** `[ ☄️ LANTIRN LASER BUNKER-BUSTER ]` projects green targeting laser and drops guided GBU-28 bomb for 500 damage.
        - **Su-34 Fullback:** `[ ⚡ REAR-TAIL STINGER & KH-31 SALVO ]` dual supersonic Kh-31 ahead + backward-firing defensive R-73.
        - **SR-71A Blackbird:** `[ 📡 ORBITAL EMP & TACTICAL RECON ]` 300-block cyan EMP shockwave, highlights targets for 8s, accelerates to Mach 3.3.
      * **Slot 3 (Instant Bounce-Back):** `[ 🔧 R2-REPAIR & OVERDRIVE ]` restores +30% hull, extinguishes engine fire, grants pilot 5s Overdrive (580 km/h).
      * **Slot 4 (Instant Bounce-Back):** `[ 🛡️ 360° ECM & FLARES ]` 16-point radial angel-wing flare ring breaking all incoming locks.
      * **Slot 8 (Instant Bounce-Back):** `[ 🔄 SWAP PILOT / WSO SEATS ]` swaps flight controls and weapons instantly mid-air with audio cue `<< Cockpit: "You have the flight controls!" >>`.
    - **Shared Co-Op HUD, Intercom & Double Rewards:**
      - Synchronized dual-crew actionbars showing speed, hull %, radar lock, and partner status.
      - Real-time crew transmissions with `\uE007` WSO glyph and pilot responses.
      - Double progression with `[ 🤝 WINGMAN SYNERGY: +50% BONUS MRP ]` multiplier on all bandit and boss kills.

20. **Operation Top Gun Laser-Tag — Non-Lethal 1v1 & FFA Dogfight Sparring Engine:**
    - **Rotunda Command Pedestal & Universal Hotbar Entry (`sparring/setup_pedestal`):**
      - Built interactive 3D command pedestal at `(-3, 65, -1470)` with crossed sword holograms, interactive hitboxes, and Rotunda Championship Leaderboard.
      - Added cheat-safe `/trigger lasertag` command accessible to all adventure/survival players.
      - Added 1-tap `[ ⚔️ SPARRING MODE ]` trigger item in Hotbar Slot 6 (`hotbar.5`) in Museum explorer gear.
      - Added Button 5 to all 27 museum exhibit kiosks: `[ ⚔️ 5. DUEL IN THIS JET ]` (`/trigger ac_kiosk_act set 5`) allowing pilots to lock any exhibit jet and scramble directly into sparring.
      - Quick-Select Dogfight Presets:
        * **Preset 1:** F-14D vs. Su-57 (Top Gun Maverick Dogfight).
        * **Preset 2:** F-22A vs. Su-35/Su-57 (5th Gen Stealth vs. Super-Maneuverability).
        * **Preset 3:** Mirrors (Identical airframes for pure pilot skill dueling).
    - **3 Distinct Tactical Arenas (`sparring/select_arena`):**
      - **Arena 1:** Carrier & Museum Bay Airspace (`Y = 180` over open ocean).
      - **Arena 2:** Yinshi Valley Karst Spire Pillars (`X: 1000, Z: 0` canyon-weaving obstacle combat).
      - **Arena 3:** Nighttime Neon Cyberpunk Sky Dome (`X: 2000, Z: 2000` midnight arena with neon perimeter rings).
    - **Color-Coded Laser Cannons & Paint-Burst Missiles (`fire_laser` & `fire_paint_missile`):**
      - **Blue Wing (Pilot 1):** Cyan laser beam particles (`dust{color:[0.0,0.85,1.0],scale:1.0}` + `soul_fire_flame`), blue smoke missile trails, and cyan firework bursts.
      - **Gold Wing (Pilot 2):** Golden laser beam particles (`dust{color:[1.0,0.7,0.0],scale:1.0}` + `flame`), golden smoke missile trails, and gold firework bursts.
      - **Color-Coded Glowing Outlines & Wingtip Trails:** Scoreboard teams `blue_wing` (aqua) and `gold_wing` (gold) with Glowing aura and 20Hz continuous wingtip ribbon trails.
      - **3-Bar Laser Shield System (`ac_laser_shield = 300`):**
        * Laser cannon hit: note-block bell chime, colored sparks, drains 15 shield.
        * Paint missile hit: direct paint splat audio + firework blast, drains 100 shield (1 full bar).
        * Absolute Damage Immunity: Pilots have Saturation and Resistance V (plus plugin-level event cancellation in `FlightTest.java`) guaranteeing zero real health loss and zero player death screens.
    - **Non-Lethal "Splash!" & 3-Second Mid-Air Reset (`sparring/tag_scored`):**
      - Upon shield depletion (`ac_laser_shield <= 0`), never kills, dismounts, or shows a death screen.
      - Increments attacker score (`ac_sparring_score + 1`), plays stadium victory fanfare (`ui.toast.challenge_complete`), and broadcasts AWACS radio:
        `<< AWACS: "TAG SCORED! Splash one training target! Good hit, Pilot!" >>`
      - Target receives 3-second golden invulnerability bubble (`totem_of_undying` + smoke), weapons pause for 3s (`[ ⏱️ NEXT ROUND IN 3... 2... 1... FIGHT! ]`).
      - Auto-levels aircraft at `Y = 180`, refills shields to 300 (or 500), refills flares, and resumes mid-air combat seamlessly!
    - **100% Crash-Proof Energy Bounce Deflector Engine (`sparring/deflector_bounce` & `FlightTest.java`):**
      - Active 20Hz monitoring for $Y \le 75$ or solid terrain within 6 blocks.
      - Automatically boosts aircraft upward (`Motion[1] = 0.85`), pitches nose up (-20° above horizon), plays trident riptide sound, and renders electric sparks.
      - Actionbar notice: `[ ⚡ AUTO-DEFLECTOR BOUNCE! ALTITUDE RESTORED ⚡ ]`.
    - **Junior Ace Boost Handicap Mode (`/trigger junior_boost`):**
      - Toggles 5-bar shield (500 HP), wider 25° missile lock cone, and 1.2s rapid missile reload.
    - **Live Scoreboard Bossbar & First-to-5 Celebration (`sparring/victory`):**
      - Dynamic top-screen bossbar: `🏆 TOP GUN | 🟦 BLUE: <Score>/5 vs 🟨 GOLD: <Score>/5 | SHIELDS: [ 🟦🟦🟦 ]`.
      - First pilot to reach 5 points triggers grand fireworks volley, fanfare OST, title `🏆 VICTORY! <PILOT> WINS THE TOP GUN TROPHY! 🏆`.
      - Grants `+5,000 MRP` and `+3,000 XP` to both pilots, updates the Rotunda Championship Board, and presents interactive clickable buttons for `[ 🔄 REMATCH IN MID-AIR ]` or `[ 🏛️ RETURN TO MUSEUM ]`.
    - **Solo Practice Mode (`sparring/spawn_solo_drone`):**
      - Automatically summons an AI maneuvering target drone on Gold Wing if a pilot initiates sparring solo.
21. **Colossal Museum Spawn Hijack & Ocean Rescue Fix (True Museum Experience):**
    - **Diagnosis of Missing Jets / Spawn Issue:**
      - Players logging in were intercepted by legacy Spigot code in `FlightTest.java` `onJoin` (`if (loc.getY() < 110.0 ...)`), which forcefully teleported players to the old Carrier Lower Hangar at `(0.5, 112.0, 0.5)` where zero macro-scale aircraft exist.
      - In `tick.mcfunction` line 31, an unconditional check `execute as @a[scores={ac_altitude=..66}] run function strangereal:hangar/recover_to_carrier` continuously evaluated to true for any player standing on the Museum floor ($Y=66.0$), immediately sucking them back to `(0, 112, 0)` every tick.
      - Saved Bedrock playerdata (`00000000-0000-0000-0009-000007156fe8.dat`) had saved `.Rhufuzz` coordinates at `(5.21, 112.0, -1.35)`.
    - **Engine-Level Fixes Applied:**
      - **`FlightTest.java` `onJoin` Overhaul:** Strips lingering flight/vehicle tags and routes any player connecting outside the museum bounds ($Z \le -300$) or on the carrier straight to the Grand Rotunda Welcome Carpet at `(0.5, 66.0, -1460.0)` facing North ($Yaw: 180^\circ$) looking directly at Chief Curator Viper and the 131-block SR-71 Blackbird centerpiece. Equips Museum Explorer gear automatically after 5 ticks.
      - **`FlightTest.java` Flight Physics Loop:** Added `!in_museum` guard and lowered crash threshold to $Y \le 62.0$ (true ocean sea level).
      - **`tick.mcfunction` Ocean Crash Filter:** Added `tag=!in_museum` and adjusted altitude threshold to $Y \le 62$, completely protecting museum visitors from being intercepted.
      - **`museum_tick.mcfunction` & `mmo_tick.mcfunction` Carrier Transit Warps:** Stepping anywhere near carrier center `(0, 112, 0)` immediately warps players to the Grand Rotunda. Any player with tutorial step 0 in the carrier is instantly redirected to the museum.
      - **Direct NBT Correction:** Updated saved `Pos` in both `/root/minecraft-server/world/players/data/` files to `(0.5, 66.0, -1460.0)`.
      - **Scoreboard Reset:** Reset `ac_museum_spawned` and `ac_tutorial_step` for all entities via RCON so onboarding starts fresh in the museum.
22. **Grand Rotunda Promenade Relocation & Ceiling Suffocation Fix:**
    - **Diagnosis of "Stuck on Carpet / Low Ceiling" Bug:**
      - The SR-71 Blackbird centerpiece extends 131 blocks along $X=0$ from $Z = -1565$ to $Z = -1445$.
      - The original welcome carpet and Curator Viper coordinates were set at $Z = -1460$ to $-1470$.
      - At $Z = -1460$, the SR-71's rear fuselage and wing spine (`black_concrete`) descend from $Y = 71$ down to $Y = 67$.
      - When players spawned at $Y = 66.0$, their heads ($Y = 67.6$) and torsos were directly embedded inside solid `black_concrete`, creating the sensation of an impassable low ceiling / being unable to move off the carpet.
    - **Architectural Relocation to Open Vaulted Promenade:**
      - **Spawn Point Relocated:** Moved from inside the jet at $Z = -1460$ to the wide-open southern entrance promenade at `(0.5, 65.0, -1408.0)` facing North ($Yaw: 180^\circ, Pitch: 0^\circ$).
      - **100% Unobstructed Vertical Clearance:** At $Z = -1408$, verified $Y = 66$ through $Y = 244$ is 100% open air (178 blocks of vaulted glass dome ceiling above the player).
      - **Welcome Carpet Runway:** Laid across $X=0$, from $Z = -1405$ to $Z = -1422$ with red carpet bordered by gold/yellow carpet and recessed sea lantern underlay.
      - **Chief Curator Viper:** Stationed at `(0.5, 66.0, -1420.0)` on an illuminated golden podium facing South ($Yaw: 0^\circ$), welcoming pilots as they walk forward along the carpet.
      - **Flanking Amenities:**
        * **Holographic 3D War Table:** Relocated to the West flank at `(-6, 64, -1418)` with full miniature carrier, spires, and mission token holograms.
        * **Top Gun Sparring Pedestal:** Relocated to `(3, 64, -1420)` with spinning golden sword and Rotunda Championship Board.
        * **Trophy Relics:** Relocated to the East flank at `(6, 64, -1418)`.
      - **Podium Cleanup:** Removed misplaced carpet from under the SR-71 at $Z = -1468..-1458$ and restored the smooth quartz podium deck.
      - **Codebase Synchronization:** Updated all functions (`setup_welcome_carpet`, `force_museum_spawn`, `teleport_to_rotunda`, `process_teleport`, `return_to_exhibit`, `onboarding_graduate`, `museum_onboarding`, `init_museum`), `FlightTest.java`, and player NBT data files to the new coordinates.
23. **SR-71 Panoramic Skybridge, Dorsal Skywalk, Observation Balconies & Concourse Fast-Travel Hub:**
    - **Addressed User Feedback:**
      * "I only see the blackbird, also I cant see it from above, i want to be able to see it nicely and not just from underneath it."
      * Resolved dorsal viewing limitation by constructing elevated viewing skywalks passing above the aircraft.
      * Resolved concourse visibility limitation (mobile render distance hiding Wings A–E located 150m–300m away) by establishing an illuminated Concourse Wayfinding Highway and Instant Wing Fast-Travel Portals in the Rotunda promenade.
    - **Elevated Architecture (`scripts/build_sr71_skybridge.py` & `build_sr71_skybridge.mcfunction`):**
      * **Level 1 Cantilevered South Balcony (`X: -16..16, Y: 82, Z: -1405..-1425`):** 32-block wide quartz and tinted glass overlook suspended 17 blocks above the promenade, giving an expansive forward perspective of the 131-block SR-71 Habu.
      * **145-Block Dorsal Spine Glass Skybridge (`X: -3..3, Y: 82, Z: -1425..-1570`):** Runs the full length directly over the aircraft centerline ($Y=82..84$), suspended 10 blocks above the titanium spine with `tinted_glass` floor panels so players can look down into the fuselage contours, Pratt & Whitney J58 nacelles, and twin rudders.
      * **Cockpit Canopy Sky-Pod (`X: -8..8, Y: 81, Z: -1542..-1522`):** Expanded circular glass observation pod with 100% transparent crystal floor windows looking directly down into the Pilot cockpit ($Z=-1535$) and RSO station ($Z=-1522$).
      * **Twin J58 Nacelle & Afterburner Catwalks (`X: \pm 18, Y: 84, Z: -1485..-1445`):** Cross-bridges connecting the skybridge to platforms positioned directly over the axisymmetric shock cones and afterburner nozzles.
      * **Level 2 Panoramic Sky Deck (`X: -10..10, Y: 96, Z: -1425..-1410`):** High-altitude balcony 32 blocks in the air suspended by ceiling cable trusses, providing an amphitheater view of the entire Rotunda and banked F-14A Tomcat overhead.
    - **Seamless Vertical & Horizontal Traversal:**
      * **Instant Pneumatic Bubble Lifts:**
        - Ground West Lift (`-3, 65, -1406`) -> Teleports pilot directly to Level 1 Skybridge Balcony (`Y=82`).
        - Ground East Lift (`3, 65, -1406`) -> Teleports pilot directly to Level 2 Panoramic Sky Deck (`Y=96`).
        - Return Lifts on Skybridge (`-3, 82, -1410`) & Sky Deck (`3, 96, -1414`) -> Safely warps back to Ground Promenade (`0.5, 65, -1408`).
      * **Dual Grand Sweeping Quartz Staircases:** Rising from $Y=65$ up to $Y=82$ along the West and East flanks (`X: -14` and `X: 14`) for players who prefer architectural stair walking.
      * **Hover-Jetpack 3D Flight (Hotbar Slot 2):** Floating reminder display explaining vertical climb (`[Space]`), descent (`[Shift]`), and stationary zero-G hovering for free-flight viewing at any angle.
    - **Concourse Wayfinding & Wing Fast-Travel Hub:**
      * **5 Grand Fast-Travel Floor Pads in the Rotunda Promenade (`Z = -1414..-1398`):**
        - **Wing A (Cold War Legends: MiG-21, F-4E, F-14D, MiG-31, Viggen):** Blue Pad (`-8, 66, -1414`).
        - **Wing B (4th-Gen Air Superiority: F-15C, F-16C, F/A-18E, Su-27, MiG-29, F-15E):** Green Pad (`-4, 66, -1416`).
        - **Wing C (European Deltas: Typhoon, Rafale, Gripen, Mirage 2000, Tornado, Orange Lion):** Gold Pad (`4, 66, -1416`).
        - **Wing D (Heavy Strike & VTOL: A-10C Warthog, F-117A, Harrier II, Su-34 Fullback):** Copper Pad (`8, 66, -1414`).
        - **Wing E (5th-Gen Stealth & Runway: F-22A, F-35A, Su-57, J-20, Su-47, X-02S):** Purple Pad (`0, 66, -1398`).
      * **Overhead Concourse Highway Wayfinding Signs (`Y = 74`):** Large-scale glowing airport-style signs at the entrance of each concourse displaying full aircraft rosters.
      * **Interactive Entity Displays & Touch Hitboxes:** 42 persistent text displays (`tag=skybridge_display`) plus 14 dedicated invisible `interaction` entities (`act_portal_*`, `act_lift_*`, `act_ret_*`) enabling 1-tap touch activation on iPhone/Bedrock and right-click in Java.
    - **Pad Trigger Resolution (Addressing "The pads don't do anything"):**
      * **Diagnosis:** PaperMC 26.3 with global tick execution failed to match negative coordinate floating-point bounding boxes using `x=-4, y=64, z=-1407, dx=2, dy=2, dz=2`.
      * **Fix 1: Distance-Based Proximity:** Replaced `dx, dy, dz` with `x=X, y=Y, z=Z, distance=..2.0` which tested 100% PASS on all 14 pads.
      * **Fix 2: Physical Pressure Plate Listeners:** Added direct block-state checking (`if block ~ ~ ~ #minecraft:pressure_plates if block ~ ~-1 ~ <type>`) so standing on the plate triggers regardless of coordinate decimals.
      * **Fix 3: Mobile Touch Hitboxes:** Added 14 `interaction` entities (`width=1.8f, height=2.2f`) over all lift and wing pads so Bedrock mobile players can tap the pad or sign directly from up to 3 blocks away.
      * **Fix 4: Instant Portal Functions:** Created `portal_wing_a` through `portal_wing_e` and `portal_return_rotunda` that execute `process_teleport` immediately with zero tick latency.
      * **Interactive Entity Displays:** 28 persistent text displays (`tag=skybridge_display`) rendering cockpit callouts, engineering specs, telescope telemetry, and elevator instructions.
24. **Operation Living Hangar: AAA Smithsonian Udvar-Hazy 3-Level Vaulted Megastructure (`220 x 140 x 75 blocks`):**
    - **Addressed User Problem:** Demolished the old "empty desert" layout where vast barren floor separated aircraft, replacing it with an intimate, awe-inspiring Udvar-Hazy aeronautical cathedral centered directly around spawn (`0, 65, -1475`).
    - **Zero Barren Floor Policy:**
      * Maximum 4–8 blocks between aircraft wingtips.
      * 85% of every camera angle filled with macro-scale 25cm jets, deepslate arches, warm amber froglight chandeliers, and hanging fabric banners.
    - **Warm AAA Palette & Architecture:**
      * Dark `polished_deepslate` and `polished_basalt` tarmac floor ($Y=64$).
      * Crisp `yellow_concrete` taxiway stripes and red/white safety borders around every aircraft bay.
      * 11 heavy cathedral vaulted arches spanning $75\text{m}$ high every 20 blocks with hanging iron cable chandeliers and warm `ochre_froglight` clusters.
      * 30-meter suspended fabric banners (Osea, RNLAF, Jolly Rogers, Erusea, Strangereal, Skunk Works) dropping from rafters.
    - **3-Tier Vertical Aircraft Stacking (All 26 Macro-Scale Jets):**
      * **Level 1 (Main Tarmac, Y = 64..65):** 16 colossal jets packed in angled chevrons around the 131-block SR-71 Blackbird centerpiece ($X: 0, Z: -1498..-1628$). Immediate spawn vicinity ($Z = -1475$) features F-22A Raptor (metallic sheen, open weapons bays, $X = -28$) and RNLAF F-16C Orange Lion ($X = +28$) within 15–18 blocks, backed by F-14D Super Tomcat, A-10C Warthog Sharkmouth, Su-57 Felon, Su-34 Fullback, F-15E Strike Eagle, F-117A Nighthawk, MiG-21bis, F-4E Phantom II, MiG-31 Foxhound, JA 37 Viggen, F/A-18E Super Hornet, Su-27 Flanker, and F-35A Lightning II.
      * **Level 2 (Cockpit Mezzanine, Y = 80):** Wrap-around spruce balcony ($X = \pm 54..62$) with amber safety lights, iron railings, support pillars, and yellow boarding bridges connecting directly into walk-in cockpit canopies.
      * **Level 3 (Ceiling-Suspended "Frozen Dogfight" Diorama, Y = 104..122):** 10 jets suspended in dynamic combat attitudes: F-14A Tomcat (45° high-G bank), F-15C Eagle (tactical weave), MiG-29 Fulcrum (split-S roll), Eurofighter Typhoon FGR4 (climb), Dassault Rafale M (banked intercept), SAAB JAS 39E Gripen (splinter roll), Dassault Mirage 2000-5F (delta pitch), Panavia Tornado IDS (swept-wing cruise), AV-8B Harrier II (live VTOL hover downwash with steam), and X-02S Strike Wyvern (diving switchblade).
    - **Authentic Hangar Greebling:**
      * P&W F119 turbofan engine cradles on yellow dollies with intake fans, glowing afterburner cans, and overhead chain hoists.
      * Red munitions carts stacked with dual AIM-120 AMRAAM missiles and safety cradles.
      * 30mm GAU-8 raw gold brass drum pallets stacked beside the A-10C Warthog.
      * Telemetry diagnostic consoles with calibrated sculk sensors and red toolboxes.
      * Yellow fuel hoses snaking from under-floor fuel pits to aircraft replenishment valves.
    - **Living MMORPG Hub Engine (`hub_life_tick.mcfunction`):**
      * 3 moving yellow tow tractors (`hangar_tug`): Munitions Tug Alpha (West loop), Flight Deck Tug Bravo (East loop), Charlie (South cross-taxiway) patrolling yellow lines with amber beacons and engine hums.
      * 26 named mechanics, avionics specialists, and cadets stationed across the floor with live welding spark particles (`electric_spark`, `wax_on`) and metallic anvil clinks.
      * Interactive proximity chatter: visiting pilots greet players with audible chime cues and dynamic pilot voicelines when within 4.5 meters.
      * Live AI Scramble Airshow outside South Blast Window: 25-second automated cycle featuring engine spool-up, afterburner rumble, high-speed runway acceleration, sonic boom shockwaves, and Mach 1.2 climbing breakout.
    - **Hub Stations at Spawn (`0, 65, -1475`):**
      * Chief Curator Viper stationed under a gold spotlight canopy at `(0.5, 66.0, -1492.0)` with guided scavenger hunt quests.
      * 3D Holographic War Table at `(0, 65, -1482)` with miniature carrier hull and 1-tap sortie launch tokens.
      * Chief Mechanic Avril's "Scrap Queen" Forge & Livery Booth at `(-18, 65, -1488)`.
      * SkyEye Officers Club & Pilot Cantina with Bartender Duke and Top Gun Laser-Tag Arcade Cabinet at `(+18, 65, -1488)`.
      * 1-Step cockpit boarding lifts and 3-button kiosks situated right beside every tarmac jet.
25. **Operation Air Boss: Airshow Control Tower & Live Aerobatics Engine:**
    - **Architecture & Panoramic Sightlines (`Y = 102`, `Z = -1425`):**
      * 360-degree glass-and-steel VIP Observation Deck and Air Boss bridge centered at `(0, 102, -1425)`.
      * Looking North: unobstructed birds-eye perspective down onto the 131-block SR-71 Blackbird Habu and the ceiling-suspended dogfight diorama (Harrier II at $Z=-1445$, F-14A Tomcat at $Z=-1460$).
      * Looking South: South Panoramic Window extended to $Y=108$ across $X \in [-16..16]$, giving a seamless view of the outdoor tarmac and active scramble runway ($Z = -1380$).
      * Angled Flight Director Console built of polished deepslate, observers, calibrated sculk sensors, lightning rod antennas, and amber froglight clusters.
      * Staffed by animated ATC villagers: Air Boss Eagle-1 (weaponsmith), Tower Marshall Cross (armorer), and Telemetry Officer Kelly (toolsmith).
    - **1-Tap Express Elevator Network:**
      * Ground Express Lift at `(6, 65, -1495)` right beside the Welcome Carpet with gold-and-cyan interactive display and pressure plate: smoothly elevates pilots up to Level 3 (`0.5, 102.0, -1423.0`).
      * Tower Return Lift at `(0, 102, -1428)` returning safely to the spawn promenade (`0.5, 65.0, -1475.0`).
      * Universal `/trigger tower` command listener operating server-wide.
    - **5-Button Interactive Airshow Director Console (`(0, 102, -1420)`):**
      * **Button 1 (`/trigger airshow set 1`):** RNLAF F-16C Orange Lion eye-level pass at 40 blk/s, 30-flare "Angel Wing" pyrotechnic cascade, and 9G vertical climbing roll with sonic boom shockwave.
      * **Button 2 (`/trigger airshow set 2`):** 6-Jet Diamond Formation delta pass with synchronized red, white, blue, and orange smoke ribbons, transitioning into an explosive 6-way Starburst loop break.
      * **Button 3 (`/trigger airshow set 3`):** Mach 2 Supersonic Sprint at 65 blk/s outside tower window with a dynamic 18m 3D Prandtl-Glauert vapor cone and double sonic boom shockwave.
      * **Button 4 (`/trigger airshow set 4`):** Dual A-10C Warthogs performing low-angle dive runs with 3-second 30mm GAU-8 Gatling cannon BRRRT sound barrage and a 120-block rolling explosion wave.
      * **Button 5 (`/trigger airshow set 5`):** Twilight Afterburner & Fireworks Finale (`time set 12700`), 4-jet missing-man flyover with fiery afterburners, 50-rocket fireworks barrage, and victory fanfare.
      * **Daylight Reset Pad (`[ ☀️ RESET DAYLIGHT ]` / `/trigger airshow set 6`):** Restores clear daylight (`time set 6000`, `weather clear`).
    - **Player Airshow Lead Flight & Wingtip Smoke Controller:**
      * **Launch Pad (`[ ✈️ FLY AS AIRSHOW LEADER ]`):** Catapults pilot outside the tower window directly into the runway airspace at $Y=115$ with active flight gear.
      * **1-Tap Wingtip Smoke Controller (Hotbar Slot 5 or `/trigger smoke`):** Cycles 5 authentic smoke trail modes with live local-coordinate emitters (`^-3.5 ^0 ^-2` and `^3.5 ^0 ^-2`):
        1. Dutch Orange (Mode 1)
        2. Red, White & Blue Tri-Color Ribbon (Mode 2)
        3. Neon Cyan & Gold (Mode 3)
        4. Rainbow Starlight (Mode 4)
        5. OFF (Mode 0)
      * Full cross-platform support with 23 interactive `text_display` and `interaction` entities supporting Bedrock touch taps and Java right-clicks.


12. **Living Museum Audio Atmosphere, Avril's Gift Shop & V-Formation Flight:**
   - **Task 1: Background Ambient Soundscape & Echoing Hangar Reverb (`ambient_soundscape.mcfunction`):**
     - Layered vanilla audio cues scoped to the 220x140x75m Udvar-Hazy interior (`X: -70..70, Y: 64..138, Z: -1625..-1405`).
     - Deep hangar reverb breaths (`ambient.cave` at 0.35 vol / 0.55 pitch every 30s) creating cavernous steel acoustics.
     - 4-quadrant ceiling ventilation drone plus concrete sub-floor rumble (`block.beacon.ambient` at 0.28-0.40 vol, staggered).
     - Muffled tarmac turbine idles and high-tier engine whines (`entity.minecart.riding`).
     - Distant AWACS squelch beeps on the control tower mast (`block.note_block.bit`) and compressed-air torch hisses.
     - Fully windowed against `#hub_master ac_hub_timer` (1200 ticks / 60s); zero sound entities summoned, locked anti-spam.
   - **Task 2: Avril's Museum Gift Shop & Cosmetic Flight Gear (`build_gift_shop.mcfunction`, `equip_gift_*.mcfunction`):**
     - Located inside Avril's Shop at `(-18, 65, -1485)`, Grand Rotunda West.
     - 4 interactive display pedestals with floating, slowly spinning 3D preview models (`gift_display`, `gift_label`):
       - Pedestal 1 (`-21, 65, -1481`): High-G JHMCS Tactical Helmet (Netherite helmet, Protection IV, Respiration III, HUD online toast).
       - Pedestal 2 (`-21, 65, -1483`): Top Gun Jolly Rogers Flight Suit (VF-84 matte-black leather set, `dyed_color=16711677`).
       - Pedestal 3 (`-21, 65, -1487`): Osea Blue Flight Suit (OADF 118th ceremonial blue leather set, `dyed_color=1986495`).
       - Pedestal 4 (`-21, 65, -1489`): Orange Lion Leather Bomber Jacket (Avril's hand-stitched gold leather jacket, `dyed_color=14708768`).
     - 1-tap touch and click compatibility via `interaction` entities with custom equipping sounds and Avril radio chatter.
   - **Task 3: Expanding Multi-Aircraft Formation Test Flights (`runway_launch.mcfunction`, `formation_tick.mcfunction`):**
     - New flight launch mode accessible via `/trigger runway_launch` or runway catapult.
     - Spawns two AI wingman display jets (VIPER 2: left wingtip `^3.5 ^-0.6 ^-2.5`, VIPER 3: right wingtip `^-3.5 ^-0.6 ^-2.5`).
     - Continuous 20Hz V-echelon position sync with animated turbofan flame, smoke trails, and proximity turbine hums.
     - In-flight wingman radio banter from Viper 2 and 3.
     - `/trigger formation` allows pilots to toggle wingmen on and off mid-flight with atomic state handling.
     - Automatic despawn cleanup the instant the leader lands, crashes, bails out, or uses Slot 9 return.
   - **Infrastructure Stability & Entity Leak Patch (`purge_leaked_entities.mcfunction`, `start_smuggler_event.mcfunction`):**
     - Discovered and resolved an un-capped boat accumulation in `start_smuggler_event` (over 500 orphaned boats ticking).
     - Added preventive pre-kill in the smuggler event and an automated orphan purge in `init_museum`.
     - Server TPS stabilized back to **18.6-20.0 TPS** on OpenJDK Java 25.

### Current URLs & Connectivity

- **Minecraft Java Direct IP:** `152.239.115.153:25565` (TCP)
- **Minecraft Bedrock / iOS Direct IP:** `152.239.115.153` | **Port:** `19132` (UDP) *(iptables also forwards 25565 UDP to 19132)*
- **Tailscale Minecraft Endpoint:** `<tailscale-ip>:25565`
- **Tactical Radar Web Dashboard:** `http://152.239.115.153:8080/`
- **RCON Port:** `127.0.0.1:25575` (Password in `.env`)

### Completed
- Full AAA Smithsonian Udvar-Hazy 3-Level Vaulted Megastructure (`220 x 140 x 75 blocks`, $X: -70..70, Z: -1625..-1405, Y: 64..138$) generated and deployed live.
- Zero barren floor: all 26 macro-scale jets (16 tarmac, 10 ceiling suspended) arranged in intimate, ultra-dense 3-tier layout.
- Floor greebling: spare F119 turbofans on dollies, AIM-120 munitions carts, 30mm brass drums, diagnostic consoles, toolboxes, and fuel hoses.
- Living Hub engine (`hub_life_tick.mcfunction`): 3 autonomous moving yellow tow tugs, 26 named mechanics with live welding sparks, proximity pilot chatter, and 25s live AI scramble airshow outside South Blast Window.
- Spawn relocation to `(0.5, 65.0, -1475.0, 180f, 0f)` with War Table, Curator Viper canopy, Avril's Shop, SkyEye Cantina, and 1-step cockpit boarding lifts.
- Operation Air Boss: 3rd-Floor Airshow Control Tower (`Y=102`), 1-tap Express Elevator, 5-button airshow director console, Daylight Reset, Airshow Leader Launch, and 5-mode Wingtip Smoke controller.
- Comprehensive GitHub Documentation Overhaul: README.md rewritten to full AAA production standard reflecting all live gameplay features (Museum, 2-Seater Co-op, Top Gun Sparring, Air Boss, Campaign, Web Radar, commands).
- 100% verified on live VPS with locked 20.0 TPS and 0 errors in `latest.log`.
- **Infrastructure / Tooling: Google Antigravity CLI & Remote Control Deployment:**
  - Installed Google Antigravity CLI (`agy` v1.4.12) to `/usr/local/bin/agy` on `152.239.115.153`.
  - Configured profile paths in `/root/.bashrc` and `/root/.profile`.
  - Initialized `/root/.gemini/GEMINI.md` establishing the Global Multi-AI Collaboration Protocol on the VPS.
  - Authenticated and registered remote-control daemon under instance name `vps-srv1993078` for account `renjinadji@gmail.com` (Google AI Pro).
  - Enabled user linger via systemd (`antigravity-cli-daemon.service`) for persistent auto-start on boot.
  - Verified daemon status active, authenticated as `renjinadji@gmail.com`, and live on https://antigravity.google.com.

### Pending / Next Up
- **Production Polish & Soundscape Expansion:**
  - Background ambient museum music & echoing hangar reverb.
  - Adding player cosmetic flight suits & helmets in the museum gift shop.
  - Expanding multi-aircraft formation test-flights from the Museum runway.

### Notes / Warnings
- Both `minecraft-ace.service` and `ace-dashboard.service` are enabled and start automatically on boot.
- Geyser-Spigot and Floodgate-Spigot are active, allowing Bedrock (iOS/Android/Console) clients to join seamlessly on UDP `19132` (and `25565`).
- Museum chunks are forceloaded in segmented chunk-safe blocks (`forceload add -70 -1625 70 -1405`), ensuring zero chunk-load lag on teleportation.
- Datapack symlinks are forbidden in Minecraft 1.20+ / 1.21+ / Paper 26.3; `sync.sh push` now mirrors `datapacks/` into `world/datapacks/` automatically.
- Ground floor in Living Hangar is `polished_deepslate` at $Y=64$ with `red_carpet` on `sea_lantern` at $Y=65$; player spawn coordinate is `(0.5, 65.0, -1475.0, 180f, 0f)`.
- Server TPS remains locked at 20.0 with 0 errors in `latest.log`.

---

## Project: Sunset Squadron: Crown Chase (Standalone Browser Dogfight Game)

### Completed
- **Cloned Repository:** Successfully cloned `https://github.com/Rhufuzz/Sunset-Squadron` into `/root/.gemini/antigravity-cli/scratch/Sunset-Squadron` with full history (v1.0.0 through v1.9.0).
- **Environment & Runtime Setup:**
  - Installed Node.js (v22.22.1) and npm (9.2.0) via system packages.
  - Installed project dependencies (`express`, `socket.io`, `three`, `qrcode`).
  - Executed test suite (`npm test`): 34/34 passing unit and integration tests.
- **Service Deployment & Firewall:**
  - Configured and allowed TCP port `3000` in UFW firewall.
  - Created and enabled systemd daemon `sunset-squadron.service` auto-restarting on port 3000.
  - Verified live HTTP response (`200 OK`) and `/api/host-info` endpoint at `http://152.239.115.153:3000`.
- **Target Repository Sync Complete:**
  - Configured SSH deploy key (`~/.ssh/id_ed25519_sunset_squadron`) and host alias `github-renjinadji`.
  - Pushed all branches (`main`) and all release tags (`v1.0.0` through `v1.9.0`) to `https://github.com/renjinadji/Sunset-Squadron`.
  - Configured local remotes: `origin` points to `renjinadji/Sunset-Squadron.git`, `upstream` points to `Rhufuzz/Sunset-Squadron.git`.
- **Missile & Firework Radar Warning System (RWR) Deployed:**
  - **Server Logic & Threat Assessment (`server/logic.js`):** Added deterministic `assessRocketThreat` computing vector alignment, distance, closing speed, time-to-impact, and critical proximity. Verified with dedicated test in `test/logic.test.js` (35/35 passing).
  - **Authoritative Lock Tracking (`server.js`):** `stepRockets` emits instant `'missileLock'` events to target player sockets upon homing lock acquisition. 20Hz snapshot now packs target IDs (`tg`) and team flags (`tm`).
  - **Synthesized Audio RWR (`public/js/audio.js`):** Implemented dual-stage procedural Web Audio alarms: 940Hz pulsing square wave on inbound threat, escalating to 1380Hz frantic sawtooth bursts on critical danger (<45m), plus a triumphant chime (`deflectChime`) on successful evasion.
  - **Directional Threat HUD & Vignette (`public/index.html` & `public/style.css`):**
    - 360° rotating threat chevron (`#missile-arrow`) dynamically tracking and pointing at incoming rockets relative to the camera with relative labels (`BEHIND!`, `LEFT!`, `RIGHT!`, `AHEAD!`).
    - Cockpit alert badge (`#hud-missile-warning`) displaying real-time distance and actionable advice (`⚠️ EVADE NOW! · DOUBLE-TAP ROLL / [Q]`).
    - Screen-edge radial threat vignette (`#threat-vignette`) pulsing red on incoming threat, deepening in critical proximity.
    - Deflection feedback: executing a barrel roll deflects rockets and flashes green (`MISSILE DEFLECTED! · THREAT CLEARED`).
  - **Live Service Reload & Version Control:** Cleanly restarted `sunset-squadron.service` and pushed commit `893e625` to `renjinadji/Sunset-Squadron`.
- **Sky Credits (★ CR) & In-Game Cosmetic Shop Engine — Phase 1 (Catalog & Persistence):**
  - **Shared Shop Catalog (`shared/shop.js`):** Built CommonJS/ESM dual-export module mirroring `shared/pilots.js`. Defined 6 cosmetic categories (`wing`, `finish`, `trail`, `firework`, `voice`, `visor`), default equipment mapping (`DEFAULT_EQUIPPED`), procedural catalog of 26 items (priced 0-2500 CR), and 3 communal Round Sponsors (`sponsor_double_event`, `sponsor_crate_rain`, `sponsor_golden_skies`).
  - **Server Route (`server.js`):** Exposed `/js/shop-data.js` via `SHOP_DATA.toEsModuleSource()` for browser consumption, along with REST endpoints `GET /api/shop`, `GET /api/wallet`, and `POST /api/wallet/{purchase,equip,sponsor}`. Added socket handlers `shopBuy`, `shopEquip`, and `shopSponsor`.
  - **Atomic Wallet Persistence (`leaderboard.js`):** Extended `data/leaderboard.json` storage to maintain a top-level `wallets` object keyed by normalized player name. Added atomic methods: `getOrCreateWallet`, `awardCredits`, `purchaseItem`, `equipItem`, and `spendCreditsForSponsor`.
  - **Automated Tests:** Added `test/shop.test.js` and expanded `test/leaderboard.test.js`. All 41 unit/integration tests passing (100%). Pushed commit `b1d3fb0` to `renjinadji/Sunset-Squadron`.
- **Sky Credits (★ CR) & In-Game Cosmetic Shop Engine — Phase 2 (Server Economy & Sponsors):**
  - **Player Wallet & Cosmetic Sync (`server.js`):** Connected player objects to persistent wallets on join and pilot change, loading `credits`, `unlocked`, and `equipped`.
  - **Bot Cosmetic Variety (`server.js`):** Implemented `randomBotEquipped()` equipping AI bots with randomized shop items across all 6 categories on spawn, creating visual diversity in the skies.
  - **Lean 20Hz Telemetry:** Cosmetic arrays (`unlocked`, full `equipped` maps) are kept strictly out of the 50ms physics tick packet and broadcast solely on lobby, join, round start/end, and equip events.
  - **Socket.io Handlers (`server.js`):** Implemented bidirectional handlers supporting both colon and camelCase event names:
    - `shop:get` (`shopGet`): returns caller wallet (`credits`, `unlocked`, `equipped`, `lifetimeCredits`) and active `roundSponsor`.
    - `shop:buy` (`shopBuy`): executes atomic purchase via `leaderboard.purchaseItem()`, updates live player wallet, broadcasts updated lobby, and emits `playerEquip`.
    - `shop:equip` (`shopEquip`): updates equipment via `leaderboard.equipItem()`, updates live player, broadcasts lobby, and emits `playerEquip`.
    - `shop:sponsor` (`shopSponsor`): enforces lobby-only activation and single-sponsor lock, deducts credits, sets `state.roundSponsor`, broadcasts lobby, and broadcasts `sponsorAnnouncement` celebration message to all clients.
  - **Communal Round Sponsor Modifiers (`server.js`):**
    - `sponsor_crate_rain`: doubles active power-up orb count (`PICKUP_COUNT * 2` = 24 orbs).
    - `sponsor_double_event`: schedules two sequential seeded mid-round events at 1/3 and 2/3 round marks (`state.eventPlans`).
    - `sponsor_golden_skies`: forces lighting preset to `'sunset'` and applies 1.25x credit multiplier at round end.
    - Automatic sponsor state reset upon round return to lobby.
  - **Deterministic End-of-Round Payout Calculation (`server/logic.js` & `server.js`):**
    - Implemented `computeCreditPayout` calculating structured breakdown:
      * `baseFinish`: 50 CR
      * `scoreBonus`: 1.0x score for Crown/Race, 0.5x for Blitz/Teams (capped at 250 CR)
      * `styleBonus`: `Math.floor(stylePoints * 1.5)`
      * `eventBonus`: +40 CR for mid-round event scoring/participation (blimp hit/down, gold balloon hit/pop, dodging 3 meteors, or scoring in frenzy)
      * `pbBonus`: +75 CR for achieving a new personal best this round
      * `underdogBonus`: +25 CR for finishing in the bottom half of players
      * `sponsorMultiplier`: 1.25x if `sponsor_golden_skies` was active
    - Automatically awards credits via `leaderboard.awardCredits` and attaches `creditBreakdown` to round results.
  - **Automated Tests:** Added `test/economy.test.js` and expanded `test/logic.test.js`. 50/50 unit and integration tests passing (100%). Pushed commit `13be89b` to `renjinadji/Sunset-Squadron`. Live systemd service `sunset-squadron.service` restarted and operational.
- **Sky Credits (★ CR) & In-Game Cosmetic Shop Engine — Phase 3 (Client Procedural Cosmetics & Synthesis):**
  - **Jet Airframe Kits & Finishes (`public/js/entities.js`):**
    - Procedurally generates all 5 wing kit variants: Standard Delta (`wing_default`), Forward X-Sweep with canards (`wing_xwing`), Baron Tri-Deck with 3 stacked wing decks & connecting cylinder struts (`wing_triplane`), Twin-Boom Interceptor with dual tail booms & high bridging stabilizer (`wing_twinboom`), and Area-51 Disc with flattened TorusGeometry saucer ring & 6 glowing rim node segments (`wing_saucer`).
    - Procedurally generates all 5 material finish styles: Factory Gloss (`finish_default`), Liquid Chrome (`finish_chrome`, 0.95 metalness / 0.08 roughness), Synthwave Wireframe (`finish_synth`, dark matte base hull with cloned glowing accent wireframe overlay mesh), Hard-Light Hologram (`finish_holo`, transparent pulsing emissive hard-light projection), and 24K Gold Bullion (`finish_gold`, metallic 24K gold override with sparkle particle emitter).
    - Added `jet.setEquipped(equipped)` for dynamic airframe and material rebuilding on equipment changes.
  - **Contrail & Ribbon Visual Styles (`public/js/entities.js`):**
    - Vapor Ribbon (`trail_default`): standard exhaust puff particles.
    - 8-Bit Cubes (`trail_voxel`): emits and animates spinning 3D cubes along the flight path.
    - Plasma Donut Rings (`trail_rings`): emits expanding neon `TorusGeometry` rings when boosting.
    - Prismatic Rainbow (`trail_rainbow`): continuously cycles HSL hue along exhaust puffs over time.
    - Afterburner Lightning (`trail_lightning`): renders flickering jagged electric line-segment arcs crackling behind the wingtips.
  - **Warhead Detonation FX (`public/js/graphics.js` & `public/js/main.js`):**
    - Implemented `fireworkBurst(center, count, speed, style, opts)` in `ParticleSystem`:
      * `fw_default`: standard spherical burst.
      * `fw_saturn`: core burst + dual perpendicular planar rings (equatorial + 65° tilt).
      * `fw_spiral`: 3-arm outward logarithmic helical corkscrew trajectory.
      * `fw_hearts`: 3D parametric heart curve expansion ($x=16\sin^3 t, y=13\cos t - 5\cos 2t - 2\cos 3t - \cos 4t$).
    - Connected shooter/popper's `equipped.firework` in `onHit` and `onPop` in `public/js/main.js`.
  - **Canvas Pilot Portrait Visor Flair (`public/js/portraits.js`):**
    - Procedural visor overlays drawn onto 2D canvas pilot portraits:
      * Aviator Mirror Shades (`visor_shades`): dual teardrop mirror lenses with golden brow bar, bridge, and diagonal specular glint.
      * Cyberpunk LED Matrix (`visor_led`): glowing neon pixel matrix display with cyber facial expression (`^_~`) and blush dots.
      * Golden Ace Laurels (`visor_laurel`): arching golden olive branches with dual leaves and golden ace star clasp.
    - Integrated with cache key `${pilot.id}@${size}:${visorStyle}` and wired to roster, in-flight HUD, and scoreboard.
  - **Web Audio Emote Voices & Horns (`public/js/audio.js`):**
    - Updated `pilotChatter(pilotIndex, volume, voiceStyle)`:
      * 8-Bit Arpeggio (`voice_chiptune`): 4-note ascending/descending square-wave arpeggio scaled by pilot pitch.
      * Sub-Bass Dreadnought Horn (`voice_dreadnought`): deep detuned dual-sawtooth brass horn blast (65-95 Hz) with low-pass filter swell.
      * Dolphin Sonar Ping (`voice_sonar`): high-frequency resonant sine ping with rapid FM pitch sweep.
    - Added UI audio synthesis methods: `playShopBuy()`, `playShopEquip()`, `playCreditTick()`.
  - **Testing & Deployment:**
    - 51/51 automated unit/integration tests passing (`npm test`). Syntax validated via `npm run check`.
    - Restarted `sunset-squadron.service` and pushed commit `95c8df2` to `renjinadji/Sunset-Squadron`.
- **Sky Credits (★ CR) & In-Game Cosmetic Shop Engine — Phase 4 (Hangar UI, 3D Turntable Preview, Sponsors & Credit Receipt):**
  - **Lobby Header & Roster Badges (`public/index.html`, `public/style.css`, `public/js/main.js`):**
    - Displayed gold pill for player's current Sky Credits (`★ 0 CR`) next to touch-friendly `🛠️ HANGAR SHOP` button in the lobby top row.
    - Animated `NEW` badge on Hangar button when player balance can afford locked cosmetic items (`checkAffordableNewItems`).
    - Lobby roster cards render player portraits with procedural visor flair, cosmetic airframe tags (`WING`, `FINISH`), and party sponsor badge (`🎉 SPONSOR`).
    - Added top lobby sponsor banner and quick-action sponsor strip in roster panel.
  - **Split-Screen iPad Hangar & Shop Modal (`public/index.html`, `public/style.css`, `public/js/main.js`):**
    - Left Column (Interactive 3D Turntable & Live Portrait Card):
      * Integrated dedicated Three.js WebGL turntable viewport (`#hangar-turntable-canvas`) with auto-rotation, smooth touch/pointer drag interaction for pitch/yaw, and live reactive cosmetic mesh and material rebuilding.
      * Dynamic visual effect previews: trail selection triggers animated booster contrail/wake simulation; firework warheads trigger live in-viewport particle detonations; voice selections trigger procedural Web Audio synthesis (`sound.pilotChatter`).
      * Live 2D pilot portrait canvas (`#hangar-portrait-canvas`) dynamically updating with previewed visor flair and pilot callsign.
      * Real-time loadout chips showing currently equipped and previewed items across all categories.
    - Right Column (Category Tabs & Procedural Catalog Grid):
      * 7 Category Tabs: `Wings`, `Paint`, `Trails`, `Fireworks`, `Voices`, `Visors`, and `🎉 Sponsors`.
      * Procedural item cards with prices, descriptions, and state-aware action buttons:
        - `EQUIPPED ✓` (green/gold, disabled)
        - `EQUIP` (cyan highlight, equips unlocked item via `shop:equip` and plays `playShopEquip()`)
        - `BUY ★ [Price]` (gold gradient, purchases via `shop:buy`, unlocks and equips immediately, plays `playShopBuy()`)
        - `NEED ★ [Amount] MORE` (dimmed, displays exact credits needed)
    - Responsive layout optimized for iPad landscape viewports and mobile screens.
  - **Round Sponsor System Integration (`public/js/main.js`):**
    - Allows players to activate communal modifiers (`ROUND_SPONSORS`) from the `🎉 Sponsors` tab or the lobby quick-action strip.
    - Emits `shop:sponsor`, announces party sponsor across the lobby with fanfare and banner notifications, and displays sponsor details at round start (`⚡ ROUND SPONSORED BY [NAME]: [SPONSOR]!`).
  - **Round-End Sky Credits Receipt & Roll-Up Animation (`public/index.html`, `public/style.css`, `public/js/main.js`):**
    - Post-match breakdown card on results screen displaying itemized credit earnings: `Base Finish`, `Score Bonus`, `Style & Stunts`, `Mid-Round Event`, `Personal Best`, `Underdog Rally`, and `Golden Skies Multiplier`.
    - Smooth count-up animation rolling from previous balance to new wallet balance with procedural `playCreditTick()` audio synthesis.
    - Refreshes wallet displays and updates affordable item alerts.
  - **Testing & Deployment:**
    - 51/51 automated unit/integration tests passing (`npm test`). Syntax validated across client and server via `npm run check`.
    - Restarted `sunset-squadron.service` and confirmed HTTP 200 on all endpoints and clean systemd logs.
- **Procedural Cockpit Canopy Cosmetics Engine (`shared/shop.js`, `public/js/entities.js`, `public/index.html`, `public/style.css`, `public/js/main.js`):**
  - **Canopy Category & Equipment Sync:** Added `canopy` as a first-class cosmetic category in `SHOP_CATEGORIES` and `DEFAULT_EQUIPPED` (`canopy_default`).
  - **Procedural Canopy Catalog (6 Styles):**
    * Standard Aero Bubble (`canopy_default`, 0 CR): factory aerodynamic teardrop glass matching paint finish profile.
    * Solar Gold Amber (`canopy_amber`, 300 CR): high-contrast polarized solar gold glass with metallic specular brow rim (`0xffb326` tint, 0.88 metalness).
    * Stealth Chisel (`canopy_stealth`, 500 CR): angular 4-sided chiseled diamond canopy with smoked radar-absorbent obsidian hue (`0x1a1626`) and faceted top spine.
    * Panoramic Bubble Dome (`canopy_bubble`, 750 CR): blown panoramic teardrop bubble providing seamless 360° visibility with translucent azure glass (`0x40e0d0`) and circular base collar.
    * Baron Birdcage Greenhouse (`canopy_cage`, 950 CR): retro interceptor greenhouse with 3 metallic arch frame ribs and structural top spine bar over emerald glass (`0x2aff88`).
    * Cyberpunk Neon HUD (`canopy_holo`, 1400 CR): translucent magenta hard-light canopy (`0xff2a9d`) with floating digital HUD reticle ring and crosshair bracket projected inside the cockpit.
  - **Hangar UI Integration:**
    * Added dedicated `Canopy` touch tab in `#hangar-tabs`.
    * Selecting canopy cosmetics dynamically updates the 3D turntable jet with optimal cockpit camera angle and audio chime.
    * Added `.canopy-tag` badge on lobby roster cards.
  - **Automated Tests:** Expanded `test/shop.test.js` to assert the 7 categories and all procedural canopy items and parameters. 51/51 tests pass.

### Pending / Next Up
- All four phases of the Sky Credits & Procedural Cosmetic Shop engine are complete!
- Optional future enhancements:
  * Additional procedural finish shaders or animated particle styles.
  * Additional party sponsor modifiers (e.g. low-gravity floating isles, mirror course).
  * Optional reverse proxy or custom domain via Caddy if external HTTPS domain mapping is desired.

### Notes / Warnings
- Game server runs as systemd service `sunset-squadron.service` on port 3000. Logs accessible via `journalctl -u sunset-squadron.service -f`.
- Data persistence: leaderboard records to `/root/.gemini/antigravity-cli/scratch/Sunset-Squadron/data/leaderboard.json`.


