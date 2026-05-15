import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const network = hre.network.name;
    console.log("===========================================");
    console.log(`  Deploying School Management Contracts`);
    console.log(`  Network: ${network}`);
    console.log("===========================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`Account balance: ${hre.ethers.formatEther(balance)} ETH\n`);

    // ─── 1. Deploy HybitToken (ERC20) ──────────────────────────────────────────
    console.log(" Deploying HybitToken...");
    const HybitToken = await hre.ethers.getContractFactory("HybitToken");
    const hybitToken = await HybitToken.deploy();
    await hybitToken.waitForDeployment();
    const hybitTokenAddress = await hybitToken.getAddress();
    console.log(` HybitToken deployed to: ${hybitTokenAddress}\n`);

    // ─── 2. Deploy Teachers ─────────────────────────────────────────────────────
    console.log(" Deploying Teachers...");
    const Teachers = await hre.ethers.getContractFactory("Teachers");
    const teachers = await Teachers.deploy();
    await teachers.waitForDeployment();
    const teachersAddress = await teachers.getAddress();
    console.log(` Teachers deployed to: ${teachersAddress}\n`);

    // ─── 3. Deploy Students (with real token address) ───────────────────────────
    console.log(" Deploying Students...");
    const Students = await hre.ethers.getContractFactory("Students");
    const students = await Students.deploy(hybitTokenAddress);
    await students.waitForDeployment();
    const studentsAddress = await students.getAddress();
    console.log(` Students deployed to: ${studentsAddress}`);
    console.log(`   Payment Token: ${hybitTokenAddress}\n`);

    // ─── 4. Save addresses for verify script ───────────────────────────────────
    const deployedAddresses = {
        network,
        deployedAt: new Date().toISOString(),
        HybitToken: hybitTokenAddress,
        Teachers: teachersAddress,
        Students: studentsAddress,
        paymentToken: hybitTokenAddress,
    };

    const outPath = path.resolve(__dirname, "..", "deployed-addresses.json");
    fs.writeFileSync(outPath, JSON.stringify(deployedAddresses, null, 2));
    console.log(` Addresses saved to deployed-addresses.json`);

    // ─── 5. Verify on Etherscan (non-local networks) ───────────────────────────
    if (network !== "hardhat" && network !== "localhost") {
        console.log("\n⏳ Waiting 5 block confirmations before verifying...");
        await hybitToken.deploymentTransaction()?.wait(5);
        await teachers.deploymentTransaction()?.wait(5);
        await students.deploymentTransaction()?.wait(5);

        await verifyContract("HybitToken", hybitTokenAddress, []);
        await verifyContract("Teachers", teachersAddress, []);
        await verifyContract("Students", studentsAddress, [hybitTokenAddress]);
    }

    console.log("\n===========================================");
    console.log("   All contracts deployed successfully!");
    console.log("===========================================");
    console.log(`  HybitToken : ${hybitTokenAddress}`);
    console.log(`  Teachers   : ${teachersAddress}`);
    console.log(`  Students   : ${studentsAddress}`);
    console.log("===========================================\n");
}

async function verifyContract(name, address, constructorArgs) {
    console.log(`\n🔍 Verifying ${name} at ${address}...`);
    try {
        await hre.run("verify:verify", {
            address,
            constructorArguments: constructorArgs,
        });
        console.log(` ${name} verified!`);
    } catch (err) {
        if (err.message.toLowerCase().includes("already verified")) {
            console.log(`ℹ  ${name} is already verified.`);
        } else {
            console.error(` ${name} verification failed: ${err.message}`);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});