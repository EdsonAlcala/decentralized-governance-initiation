import { expect } from 'chai';
import { ethers } from 'hardhat';
import { impersonateAccount, setBalance, time } from '@nomicfoundation/hardhat-network-helpers';
import { parseBalanceMapModified } from '../src/parse-balance-map-modified';

import USERS from '../config/treasury-unique-users.json'
import { CORA_TOKEN_EXPECTED_ADDRESS, TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS } from '../constants';
import { writeFileSync } from 'fs';
import path from 'path';

// @dev Forked test
describe('TreasuryBootstrapping', () => {

    it.only("compared call data", async () => {
        const treasuryBootstrappingInstance = await ethers.getContractAt("TreasuryBootstrapping", TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS)

        // generate merkle root
        const { claims: claimsForTreasury, merkleRoot: merkleRootForTreasury } = parseBalanceMapModified(USERS);
        const STABLECOIN_ADDRESS = "0x93b346b6bc2548da6a1e7d98e9a421b42541425b"

        const encodedData = treasuryBootstrappingInstance.interface.encodeFunctionData("approveAndSchedule", [
            "12000000000000000000000000", // 12M
            "1200000000000000000000000", // 1.2M
            864000, // 10 days
            432000, // 5 days
            "0x0f1dc44F866B9326426B15A784079ef5b39D341F",
            "1200000000000000000000", // 1.2k
            "24000000000000000000000", // 24k
            172800, // 2 days
            STABLECOIN_ADDRESS, // LUSD
            merkleRootForTreasury
        ]);
        console.log('Encoded Data:', encodedData);
        const result = "0x61c495b900000000000000000000000000000000000000000009ed194db19b238c00000000000000000000000000000000000000000000000000fe1c215e8f838e00000000000000000000000000000000000000000000000000000000000000000d2f0000000000000000000000000000000000000000000000000000000000000697800000000000000000000000000f1dc44f866b9326426b15a784079ef5b39d341f0000000000000000000000000000000000000000000000410d586a20a4c000000000000000000000000000000000000000000000000005150ae84a8cdf000000000000000000000000000000000000000000000000000000000000000002a30000000000000000000000000093b346b6bc2548da6a1e7d98e9a421b42541425bc994a2285fc9519538eff71768954b1e5f8fa5a1d7aa04bbee7d35d4a212aff1"

        expect(encodedData).to.equal(result);
    })
    it("should start and schedule, then bootstrap", async () => {
        const DAO_WALLET = "0xCebD5817EeD45e50a2D8341AB4Fe443E4d701d72"
        const impersonatedWallet = DAO_WALLET;
        await setBalance(
            impersonatedWallet,
            ethers.utils.parseEther("100.0")
        );
        await impersonateAccount(impersonatedWallet);
        const currentSigner = await ethers.getSigner(impersonatedWallet);

        const treasuryBootstrappingInstance = await ethers.getContractAt("TreasuryBootstrapping", TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS, currentSigner)

        // generate merkle root
        const { claims: claimsForTreasury, merkleRoot: merkleRootForTreasury } = parseBalanceMapModified(USERS);
        // const { claims, merkleRoot } = parseBalanceMap(config.airdrop.addresses)
        const claimsData = JSON.stringify(claimsForTreasury, null, 2);
        writeFileSync(path.join('files', `claims-treasury.json`), claimsData);

        // schedule
        const STABLECOIN_ADDRESS = "0x93b346b6bc2548da6a1e7d98e9a421b42541425b"
        const tx = await treasuryBootstrappingInstance.approveAndSchedule(
            "12000000000000000000000000", // 12M
            "1200000000000000000000000", // 1.2M
            864000, // 10 days
            432000, // 5 days
            "0x0f1dc44F866B9326426B15A784079ef5b39D341F",
            "1200000000000000000000", // 1.2k
            "24000000000000000000000", // 24k
            172800, // 2 days
            STABLECOIN_ADDRESS, // LUSD
            merkleRootForTreasury
        );

        console.log("merkleRootForTreasury", merkleRootForTreasury);

        await tx.wait();

        console.log("tx", tx);

        expect(await treasuryBootstrappingInstance.getStatus()).to.equal(1); // Approved

        // move time
        await time.increase(172800 + 1);

        // impersonate accounts and bootstrap
        // @dev impersonate big LUSD whale
        const lUSDWhale = "0x1e5b183b589a1d30ae5f6fdb8436f945989828ca";
        await impersonateAccount(lUSDWhale);
        const impersonatedLUSDWhale = await ethers.getSigner(lUSDWhale);
        await setBalance(
            impersonatedLUSDWhale.address,
            ethers.utils.parseEther("100.0")
        );
        const lUSDInstance = await ethers.getContractAt("IERC20", STABLECOIN_ADDRESS, impersonatedLUSDWhale);

        console.log("About to start bootstrapping the treasury");

        const keysArray = Object.keys(USERS);

        for (let i = 0; i < keysArray.length; i += 50) {
            const currentAddress = ethers.utils.getAddress(keysArray[i]);
            console.log("currentAddress: ", currentAddress)

            const amountToUseToBootstrap = ethers.utils.parseEther("2400") // 2.4k LUSD to bootstrap

            // we transfer to the contributor the amount of LUSD to bootstrap
            await lUSDInstance.transfer(currentAddress, amountToUseToBootstrap);

            await impersonateAccount(currentAddress);
            const impersonatedSigner = await ethers.getSigner(currentAddress);
            const coraTokenInstance = await ethers.getContractAt("CoraToken", CORA_TOKEN_EXPECTED_ADDRESS, impersonatedSigner)
            await setBalance(
                impersonatedSigner.address,
                ethers.utils.parseEther("100.0")
            );

            // check the balance of the user before the bootstrap
            const balanceBefore = await coraTokenInstance.balanceOf(currentAddress)
            console.log("BalanceBefore: ", ethers.utils.formatEther(balanceBefore.toString()).toString())

            // approve the treasury contract to spend the LUSD 
            const newLUSDInstance = await ethers.getContractAt("IERC20", STABLECOIN_ADDRESS, impersonatedSigner);
            await newLUSDInstance.approve(TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS, amountToUseToBootstrap);

            const newTreasuryInstance = await ethers.getContractAt("TreasuryBootstrapping", TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS, impersonatedSigner)
            await newTreasuryInstance.bootstrap(amountToUseToBootstrap, claimsForTreasury[currentAddress].index, claimsForTreasury[currentAddress].proof);

            // check the balance of the user after the bootstrap
            const balanceAfter = await coraTokenInstance.balanceOf(currentAddress)
            console.log("balanceAfter: ", ethers.utils.formatEther(balanceAfter.toString()).toString())

            expect(balanceAfter).to.be.gt(balanceBefore);
        }

    })
})