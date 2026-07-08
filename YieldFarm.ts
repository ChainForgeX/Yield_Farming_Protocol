import {expect} from "chai";
import {network} from "hardhat";

let ethers : any;

let owner : any;
let user : any;

let rewardToken : any;
let lpToken : any;
let yieldFarm : any;

describe("YieldFarm", function (){
    beforeEach(async function(){
        ({ethers} = await network.getOrCreate());
        [owner, user] = await ethers.getSigners();

        const RewardToken = await ethers.getContractFactory("RewardToken");
        rewardToken = await RewardToken.deploy();
        await rewardToken.waitForDeployment();

        const LPToken = await ethers.getContractFactory("LPToken");
        lpToken = await LPToken.deploy();
        await lpToken.waitForDeployment();

        const YieldFarm = await ethers.getContractFactory("YieldFarm");
        yieldFarm = await YieldFarm.deploy(await lpToken.getAddress(), await rewardToken.getAddress(), ethers.parseEther("1"));
        await yieldFarm.waitForDeployment();

        await rewardToken.transfer(await yieldFarm.getAddress(), ethers.parseEther("500000"));
        await lpToken.transfer(await user.getAddress(), ethers.parseEther("1000"));
    });
    it("Should deploy Reward Token Successfully", async function(){
        expect(await rewardToken.name()).to.equal("Farm Reward Token");
        expect(await rewardToken.symbol()).to.equal("FARM");
    });
    it("Should deploy LPToken Successfully", async function(){
        expect(await lpToken.name()).to.equal("Liquidity Provider Token");
        expect(await lpToken.symbol()).to.equal("LPT");
    });
    it("Should fund the Yield Farm", async function(){
        const balance = await rewardToken.balanceOf(await yieldFarm.getAddress());
        expect(balance).to.equal(ethers.parseEther("500000"));
    });
    it("Should allow user to stake LP Tokens", async function(){
        await lpToken.connect(user).approve(await yieldFarm.getAddress(), ethers.parseEther("100"));
        await yieldFarm.connect(user).stake(ethers.parseEther("100"));
        const userInfo = await yieldFarm.users(await user.getAddress());
        expect(userInfo.amount).to.equal(ethers.parseEther("100"));
        const pool = await yieldFarm.pool();
        expect(pool.totalStaked).to.equal(ethers.parseEther("100"));
    });
    it("Should calculate pending rewards", async function(){
        await lpToken.connect(user).approve(await yieldFarm.getAddress(), ethers.parseEther("100"));
        await yieldFarm.connect(user).stake(ethers.parseEther("100"));
        for(let i = 0; i < 10; i++){
            await ethers.provider.send("evm_mine", []);
        }
        const pending = await yieldFarm.pendingRewards(await user.getAddress());
        expect(pending).to.be.gt(0);
    });
    it("Should harvest Rewards", async function(){
        await lpToken.connect(user).approve(await yieldFarm.getAddress(), ethers.parseEther("100"));
        await yieldFarm.connect(user).stake(ethers.parseEther("100"));
        for(let i = 0; i < 10; i++){
            await ethers.provider.send("evm_mine", []);        
        }
        const before = await rewardToken.balanceOf(await user.getAddress());
        await yieldFarm.connect(user).harvest();
        const after = await rewardToken.balanceOf(await user.getAddress());
        expect(after).to.be.gt(before);
    });
});