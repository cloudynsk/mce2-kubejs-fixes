// Keep player-owned Iron's Spells / Cataclysm Spellbooks summons neutral to players
// and MineColonies citizens. Forge listeners must live in startup_scripts.

const MCE2_IMagicSummon = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon')
const MCE2_ServerPlayer = Java.loadClass('net.minecraft.server.level.ServerPlayer')
const MCE2_MineColoniesCitizen = Java.loadClass('com.minecolonies.api.entity.citizen.AbstractEntityCitizen')
const MCE2_DeathLaserBeam = Java.loadClass('com.github.L_Ender.cataclysm.entity.projectile.Death_Laser_Beam_Entity')

function mce2ResolveSummonDamageSource(source) {
  const actual = source.getActual()
  if (actual instanceof MCE2_IMagicSummon) return actual

  const immediate = source.getImmediate()
  if (immediate instanceof MCE2_IMagicSummon) return immediate

  // Cataclysm's Prowler death laser is a separate beam entity.
  if (immediate instanceof MCE2_DeathLaserBeam) {
    const caster = immediate.caster
    if (caster instanceof MCE2_IMagicSummon) return caster
  }

  return null
}

// Never allow a compatibility-hook failure to escape into an entity tick.
let mce2TargetNeutralityHookErrorLogged = false
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingChangeTargetEvent', event => {
  try {
    const summon = event.getEntity()
    const target = event.getNewTarget()

    if (!(summon instanceof MCE2_IMagicSummon)) return

    // Player-owned summons are non-PvP and must never target MineColonies citizens.
    if (target instanceof MCE2_ServerPlayer || target instanceof MCE2_MineColoniesCitizen) {
      event.setCanceled(true)
    }
  } catch (error) {
    if (!mce2TargetNeutralityHookErrorLogged) {
      mce2TargetNeutralityHookErrorLogged = true
      console.error('[MCE2] Summon target-neutrality hook failed safely: ' + error)
    }
  }
})

// Forge-level safety net. This runs before damage is applied and is independent
// of the reloadable EntityEvents.hurt protection in server_scripts.
let mce2AttackNeutralityHookErrorLogged = false
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingAttackEvent', event => {
  try {
    const victim = event.getEntity()
    if (!(victim instanceof MCE2_ServerPlayer) && !(victim instanceof MCE2_MineColoniesCitizen)) return

    if (mce2ResolveSummonDamageSource(event.getSource()) != null) {
      event.setCanceled(true)
    }
  } catch (error) {
    if (!mce2AttackNeutralityHookErrorLogged) {
      mce2AttackNeutralityHookErrorLogged = true
      console.error('[MCE2] Summon attack-neutrality hook failed safely: ' + error)
    }
  }
})

console.info('[MCE2] Summon target + attack neutrality Forge protection registered.')
