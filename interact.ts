import { network } from "hardhat";

async function main() {

    const { ethers } = await network.connect();

    const [owner] = await ethers.getSigners();
    const user = owner;

    const rewardToken = await ethers.getContractAt(
        "RewardToken",
        "0xDC298ca25C7e3170E1e3f845D9e9A4ac33B67b8e"
    );

    const lpToken = await ethers.getContractAt(
        "LPToken",
        "0x073e36c862C7cD433FdB404760C2250D02B9284e"
    );

    const yieldFarm = await ethers.getContractAt(
        "YieldFarm",
        "0x4f341b8CBa11A723190a1607D4dCC9f6eD73d180"
    );

    // ---------------- FUND THE FARM ----------------

    const fundTx = await rewardToken.transfer(
        await yieldFarm.getAddress(),
        ethers.parseEther("500000")
    );

    await fundTx.wait();

    console.log("✅ Yield Farm Funded");

    // ---------------- APPROVE ----------------

    const approveTx = await lpToken
        .connect(user)
        .approve(
            await yieldFarm.getAddress(),
            ethers.parseEther("100")
        );

    await approveTx.wait();

    console.log("✅ Approval Successful");

    // ---------------- STAKE ----------------

    const stakeTx = await yieldFarm
        .connect(user)
        .stake(
            ethers.parseEther("100")
        );

    await stakeTx.wait();

    console.log("✅ Stake Successful");

    // ---------------- USER INFO ----------------

    const userInfo = await yieldFarm.users(
        await user.getAddress()
    );

    console.log(
        "Staked:",
        ethers.formatEther(userInfo.amount),
        "LPT"
    );

    // ---------------- PENDING REWARDS ----------------

    const pending = await yieldFarm.pendingRewards(
        await user.getAddress()
    );

    console.log(
        "Pending Reward:",
        ethers.formatEther(pending),
        "FARM"
    );

    // ---------------- BALANCES ----------------

    const farmBalance = await rewardToken.balanceOf(
        await yieldFarm.getAddress()
    );

    console.log(
        "Reward Tokens in Farm:",
        ethers.formatEther(farmBalance),
        "FARM"
    );

    const lpBalance = await lpToken.balanceOf(
        await user.getAddress()
    );

    console.log(
        "User LP Balance:",
        ethers.formatEther(lpBalance),
        "LPT"
    );
}

main().catch(console.error);