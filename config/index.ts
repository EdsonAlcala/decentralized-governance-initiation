import { DeploymentConfig } from "./types";

import { PRODUCTION_CONFIG } from "./production";

export class DeploymentConfiguration {
    private chainId: number;

    constructor(chainId: number) {
        this.chainId = chainId
    }

    public getDeploymentConfig(): DeploymentConfig {
        return PRODUCTION_CONFIG;
    }

    public getChainId(): number {
        return this.chainId;
    }
}