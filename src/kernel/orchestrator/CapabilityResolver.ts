import { ICapabilityResolver } from "./types";
import { ModuleManager } from "../module/ModuleManager";

export class CapabilityResolver implements ICapabilityResolver {
  private capabilityMap: Record<string, string[]> = {
    "JOB_SEARCH": ["employment"],
    "RESUME_ANALYSIS": ["employment", "identity"],
    "ATS_ANALYSIS": ["employment"],
    "EMAIL_GENERATION": ["communication"],
    "FOLLOWUP_AUTOMATION": ["automation"],
    "PROFILE_UPDATE": ["identity"],
    "SEARCH_HISTORY": ["knowledge"],
  };

  /**
   * Resolves a capability string down to an active module ID.
   * Gathers data dynamically from the ModuleManager to verify active registration.
   */
  public resolveCapability(capability: string): string | null {
    const manager = ModuleManager.getInstance();
    const activeCapabilities = manager.getCapabilitiesRegistry();

    // 1. Direct match on registered module capabilities
    for (const [cap, moduleIds] of Object.entries(activeCapabilities)) {
      if (cap.toUpperCase() === capability.toUpperCase()) {
        const activeModuleId = moduleIds.find(id => {
          const m = manager.getModule(id);
          return m && m.state === "RUNNING";
        });
        if (activeModuleId) return activeModuleId;
      }
    }

    // 2. Fallback to pre-mapped domain relationships if the tags differ slightly
    const targets = this.capabilityMap[capability.toUpperCase()];
    if (targets) {
      for (const targetId of targets) {
        const m = manager.getModule(targetId);
        if (m && m.state === "RUNNING") {
          return targetId;
        }
      }
    }

    // 3. Fallback to any active running module that lists a partial capability match
    const modules = manager.getModules();
    for (const m of modules) {
      if (m.state === "RUNNING") {
        const match = m.metadata.capabilities.some(cap => 
          cap.toUpperCase().includes(capability.toUpperCase()) || 
          capability.toUpperCase().includes(cap.toUpperCase())
        );
        if (match) return m.metadata.id;
      }
    }

    return null;
  }

  /**
   * Collects all platform capabilities across currently active modules.
   */
  public getSupportedCapabilities(): string[] {
    const manager = ModuleManager.getInstance();
    const registry = manager.getCapabilitiesRegistry();
    return Object.keys(registry);
  }
}
export default CapabilityResolver;
