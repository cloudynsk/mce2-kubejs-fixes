// Keep MineColonies citizens and supported player summons mutually neutral.
// MCE2 local compatibility patch for Cataclysm Spellbooks + Iron's Spells.

const $IColonyManager = Java.loadClass('com.minecolonies.api.colony.IColonyManager')
const $EntityListModule = Java.loadClass('com.minecolonies.core.colony.buildings.modules.EntityListModule')
const $ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')

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

ServerEvents.tags('entity_type', event => {
  MCE2_FRIENDLY_SUMMONS.forEach(entityType => {
    event.add('minecolonies:mob_attack_blacklist', entityType)
  })
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
