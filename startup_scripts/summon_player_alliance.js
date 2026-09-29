// Keep player-owned Iron's Spells / Cataclysm Spellbooks summons neutral to players
// and MineColonies citizens. Forge listeners must live in startup_scripts.

const MCE2_IMagicSummon = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon')
const MCE2_ServerPlayer = Java.loadClass('net.minecraft.server.level.ServerPlayer')
const MCE2_MineColoniesCitizen = Java.loadClass('com.minecolonies.api.entity.citizen.AbstractEntityCitizen')

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

console.info('[MCE2] Summon target-neutrality Forge protection registered.')
