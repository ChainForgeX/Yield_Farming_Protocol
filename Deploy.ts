import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("YieldFarmModule", (m) => {
    const rewardToken = m.contract("RewardToken");
    const lpToken = m.contract("LPToken");
    const rewardPerBlock = 1n * 10n ** 18n;
    const yieldFarm = m.contract("YieldFarm", [
        lpToken,
        rewardToken,
        rewardPerBlock
    ]);
    return {rewardToken, lpToken, yieldFarm};
});