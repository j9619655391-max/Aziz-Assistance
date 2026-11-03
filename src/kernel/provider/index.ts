import { ProviderManager } from "./ProviderManager";
import { GoogleSearchGroundingProvider } from "./GoogleSearchGroundingProvider";

const providerManager = ProviderManager.getInstance();

// Automatically register the default Google Search Grounding Engine
const groundingProvider = new GoogleSearchGroundingProvider();
providerManager.registerProvider(groundingProvider);

export { providerManager, ProviderManager };
export * from "./types";
export { GoogleSearchGroundingProvider };
