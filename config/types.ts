export interface DeploymentConfig {
    salt: string;
    timelockController: TimelockControllerConfig;
    axelar: AxelarConfig;
    deployer: string;
    airdrop: AirdropConfig;
    vesting: VestingConfig;
    treasuryBootstrapping: TreasuryBootstrappingConfig;
    totalSupply: string;
}

interface AxelarConfig {
    gateway: string;
    gasService: string;
}

export interface TimelockControllerConfig {
    minDelay: string;
    initialSignatures: string[];
    initialDelays: number[];
    shortDelay: number;
    defaultDelay: number;
    longDelay: number;
    initialVotingDelay: number;
    initialVotingPeriod: number;
    initialProposalThreshold: string;
    quorumNumeratorValue: number;
}

interface TreasuryBootstrappingConfig {
    total: string;
}

interface AirdropConfig {
    total: string;
    addresses: UserConfig;
}

interface VestingConfig {
    total: string;
    dao: AddressConfig;
    team: AddressConfig;
    advisors: AddressConfig[];
}

export interface UserConfig {
    [address: string]: string;
}

interface AddressConfig {
    address: string;
    amount: string;
    vestingPeriodInMonths: string;
    vestingCliffInMonths: string;
}

export interface Recipient {
    address: string;
    amount: string;
}

export interface CoraGovernorParams {
    token: string;
    timelock: string;
    messageRelayer: string;
    functionSignatures: string[];
    functionsDelays: number[];
    shortDelay: number;
    defaultDelay: number;
    longDelay: number;
    initialVotingDelay: number;
    initialVotingPeriod: number;
    initialProposalThreshold: string;
    quorumNumeratorValue: number;
}