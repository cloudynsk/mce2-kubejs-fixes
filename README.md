# mce2-kubejs-fixes

KubeJS compatibility fixes for Minecraft Eternal 2 (Minecraft 1.20.1).

## Installation

Copy both files into the matching KubeJS folders:

```text
kubejs/server_scripts/minecolonies_summon_neutrality.js
kubejs/startup_scripts/summon_player_alliance.js
```

Then fully restart the server. The startup script registers a Forge target-change listener, so `/reload` alone is not sufficient for that part.

## What the fix covers

### MineColonies citizens and guards

- supported summon entity IDs are added to `minecolonies:mob_attack_blacklist`
- MineColonies guard buildings are patched to ignore those summon entity types
- any Iron's `IMagicSummon` is prevented from accepting an `AbstractEntityCitizen` as a target
- direct and collateral summon damage to MineColonies citizens is cancelled with KubeJS `EntityEvents.hurt`

### Allied players

- magic summons cannot accept their owner or same-FTB-team players as targets
- direct, projectile, and AoE summon damage to those allied players is cancelled
- FTB Teams is queried through `getTeamForPlayer(ServerPlayer)`, avoiding raw Minecraft UUID methods that are unsafe through Rhino in this runtime

## Cataclysm Spellbooks summon audit

All 15 Cataclysm Spellbooks mob summons implement Iron's `IMagicSummon`.

Every audited summon class uses the same suspicious pattern in `registerGoals()`: it removes hostile target-goal classes from `goalSelector`, adds its summon-owner goals to `targetSelector`, and then calls `super.registerGoals()`. The base Cataclysm mob can therefore re-add hostile target goals afterward.

Notable inherited/explicit targeting found in the base mobs:

- Prowler, Watcher, Coral Golem, Coralssus, Ignited Berserker, Ignited Revenant, Koboleton and others can inherit player targeting.
- Draugr, Elite Draugr, Royal Draugr and Aptrgangr base AI also targets golems and vanilla villagers.
- Counterspell Watcher explicitly adds `NearestAttackableTargetGoal<Mob>`, which can select MineColonies citizens because they are mob entities.
- several Cataclysm base mobs perform area attacks over nearby `LivingEntity` instances; some only exclude entities considered allied by vanilla/mod logic, while at least one Amethyst Crab area attack does not use the summon alliance check at all.

The compatibility scripts therefore block both target acquisition and resulting summon damage instead of trying to rewrite every individual AI goal list.

## Iron's built-in summon audit

The installed Iron's Spells 3.15.6 jar was checked directly.

Combat summons:
- summoned Vex
- summoned Zombie
- summoned Skeleton
- summoned Polar Bear

These use Iron's owner/protection/copy-target/retaliation goals and do not contain Cataclysm's broad autonomous nearest-target pattern.

The Spectral Steed is also an `IMagicSummon`, but it has no combat target goals.

Summoned weapon entities are spell entities rather than AI mob summons and are outside the MineColonies mob-targeting issue addressed here.

## Verified environment

- Minecraft 1.20.1
- Forge 47.4.2
- KubeJS 2001.6.5-build.16
- Rhino 2001.2.3-build.6
- FTB Teams 2001.3.2
- Iron's Spells 'n Spellbooks 3.15.6
- Cataclysm Spellbooks 1.2.8
- L_Ender's Cataclysm 3.16
- MineColonies 1.1.1240-snapshot

## Runtime-safety notes

The installed KubeJS jar maps JavaScript `DamageSource.getActual()` and `getImmediate()` to the runtime Minecraft methods. The damage hook uses those supported KubeJS names and has a fail-safe error boundary.

The older experimental use of `DamageSource.getDirectEntity()` and raw `ServerPlayer.getUUID()` was removed because those names are not exposed under those Mojang mappings in this Rhino runtime.

## License

MIT.
