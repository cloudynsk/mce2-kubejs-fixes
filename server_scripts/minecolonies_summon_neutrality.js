// Keep MineColonies citizens, player summons, and allied players mutually neutral.
// MCE2 local compatibility patch for Cataclysm Spellbooks + Iron's Spells.

const $IColonyManager = Java.loadClass('com.minecolonies.api.colony.IColonyManager')
const $EntityListModule = Java.loadClass('com.minecolonies.core.colony.buildings.modules.EntityListModule')
const $ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')

const MCE2_IMagicSummon = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon')
const MCE2_ServerPlayer = Java.loadClass('net.minecraft.server.level.ServerPlayer')
const MCE2_FTBTeamsAPI = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI')
const MCE2_LivingChangeTargetEvent = Java.loadClass('net.minecraftforge.event.entity.living.LivingChangeTargetEvent')
const MCE2_LivingAttackEvent = Java.loadClass('net.minecraftforge.event.entity.living.LivingAttackEvent')

const MCE2_FRIENDLY_SUMMONS = [
  'cataclysm_spellbooks:summoned_ignited_revenant',
  'cataclysm_spellbooks:summoned_ignited_berserker',
  'cataclysm_spellbooks:summoned_koboldiator',
  'cataclysm_spellbooks:summoned_koboleton',
  'cataclysm_spellbooks:summoned_draugur',
  'cataclysm_spellbooks:summoned_royal_draugur',
  'cataclysm_spellbooks:summoned_elite_draugur',
  'cataclysm_spellbooks:summoned_aptrgangr',
  'cataclysm_spellbooks:summoned_watcher',
  'cataclysm_spellbooks:summoned_prowler',
  'cataclysm_spellbooks:summoned_counterspell_watcher',
  'cataclysm_spellbooks:summoned_amethyst_crab',
  'cataclysm_spellbooks:summoned_coral_golem',
  'cataclysm_spellbooks:summoned_coralssus',
  'cataclysm_spellbooks:summoned_clawdian',
  'irons_spellbooks:summoned_vex',
  'irons_spellbooks:summoned_zombie',
  'irons_spellbooks:summoned_skeleton',
  'irons_spellbooks:summoned_polar_bear'
]

function mce2AreAlliedPlayers(owner, other) {
  if (!(owner instanceof MCE2_ServerPlayer) || !(other instanceof MCE2_ServerPlayer)) return false
  if (owner.getUUID().equals(other.getUUID())) return true
  if (owner.isAlliedTo(other) || other.isAlliedTo(owner)) return true

  try {
    const api = MCE2_FTBTeamsAPI.api()
    if (api != null && api.isManagerLoaded()) {
      return api.getManager().arePlayersInSameTeam(owner.getUUID(), other.getUUID())
    }
  } catch (ignored) {
    // Fail closed to vanilla alliance only if FTB Teams is temporarily unavailable.
  }

  return false
}

function mce2GetMagicSummonFromDamage(source) {
  const direct = source.getDirectEntity()
  if (direct instanceof MCE2_IMagicSummon) return direct

  const causing = source.getEntity()
  if (causing instanceof MCE2_IMagicSummon) return causing

  return null
}

// Stops hostile summons from receiving MineColonies' citizen-targeting AI.
ServerEvents.tags('entity_type', event => {
  MCE2_FRIENDLY_SUMMONS.forEach(entityType => {
    event.add('minecolonies:mob_attack_blacklist', entityType)
  })
})

// Cataclysm's summoned mobs can inherit hostile Player-target goals.
// Reject owner/team members before the target is accepted.
ForgeEvents.onEvent(MCE2_LivingChangeTargetEvent, event => {
  const summon = event.getEntity()
  const target = event.getNewTarget()

  if (!(summon instanceof MCE2_IMagicSummon)) return
  if (!(target instanceof MCE2_ServerPlayer)) return

  const owner = summon.getSummoner()
  if (mce2AreAlliedPlayers(owner, target)) {
    event.setNewTarget(null)
  }
})

// Safety net for attacks/beams/projectiles that were already committed before a target was cleared.
ForgeEvents.onEvent(MCE2_LivingAttackEvent, event => {
  const victim = event.getEntity()
  if (!(victim instanceof MCE2_ServerPlayer)) return

  const summon = mce2GetMagicSummonFromDamage(event.getSource())
  if (summon == null) return

  const owner = summon.getSummoner()
  if (mce2AreAlliedPlayers(owner, victim)) {
    event.setCanceled(true)
  }
})

function patchMineColoniesGuardTargets() {
  let changedBuildings = 0

  $IColonyManager.getInstance().getAllColonies().forEach(colony => {
    colony.getServerBuildingManager().getBuildings().values().forEach(building => {
      building.getModules($EntityListModule).forEach(module => {
        if (String(module.getId()) !== 'hostiles') return

        let changed = false
        MCE2_FRIENDLY_SUMMONS.forEach(entityType => {
          const id = new $ResourceLocation(entityType)
          if (!module.isEntityInList(id)) {
            module.addEntity(id)
            changed = true
          }
        })

        if (changed) changedBuildings++
      })
    })
  })

  if (changedBuildings > 0) {
    console.info('[MCE2] MineColonies summon neutrality applied to ' + changedBuildings + ' guard building(s).')
  }
}

// Apply immediately after /reload, then periodically cover newly-built guard buildings.
let mce2SummonNeutralityInitialPass = false
ServerEvents.tick(event => {
  if (!mce2SummonNeutralityInitialPass) {
    mce2SummonNeutralityInitialPass = true
    patchMineColoniesGuardTargets()
    return
  }

  if (event.server.tickCount % 1200 !== 0) return
  patchMineColoniesGuardTargets()
})
