import { Wallet, utils } from "zksync-ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { getWallet, deployContract } from "./utils";
import { generateFrontendFiles } from "./utils/generateFrontendFiles";

export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for FitFi contract`);

  // Initialize deployer
  const wallet = getWallet();
  const deployer = new Deployer(hre, wallet);

  // First deploy mock contracts for testing
  console.log("Deploying mock contracts...");
  
  const token = await deployContract("MockERC20", [], {
    wallet,
    silent: false,
  });
  console.log(`MockERC20 deployed to ${await token.getAddress()}`);

  const yieldProtocol = await deployContract("MockYieldProtocol", [], {
    wallet,
    silent: false,
  });
  console.log(`MockYieldProtocol deployed to ${await yieldProtocol.getAddress()}`);

  const activityValidator = await deployContract("MockActivityValidator", [], {
    wallet,
    silent: false,
  });
  console.log(`MockActivityValidator deployed to ${await activityValidator.getAddress()}`);

  // Deploy FitFi with the mock contracts
  console.log("Deploying FitFi...");
  const fitFi = await deployContract(
    "FitFi",
    [
      await token.getAddress(),
      await yieldProtocol.getAddress(),
      await activityValidator.getAddress(),
    ],
    {
      wallet,
      silent: false,
    }
  );

  console.log(`FitFi deployed to ${await fitFi.getAddress()}`);

  // Verify contract
  if (hre.network.name !== "localhost") {
    console.log("Verifying contract...");
    await hre.run("verify:verify", {
      address: await fitFi.getAddress(),
      constructorArguments: [
        await token.getAddress(),
        await yieldProtocol.getAddress(),
        await activityValidator.getAddress(),
      ],
    });
  }

   // Generate frontend files
   await generateFrontendFiles('FitFi', fitFi, hre.network.name);
   await generateFrontendFiles('ActivityValidator', activityValidator, hre.network.name);
   await generateFrontendFiles('FDollars', token, hre.network.name);


  console.log("Deployment completed!");
} 