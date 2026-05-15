import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const network = hre.network.name;
    console.log("===========================================");
    console.log(`  Verifying School Management Contracts`);
    console.log(`  Network: ${network}`);
    console.log("===========================================\n");

    // Load deployed addresses from file OR environment variables
    let hybitTokenAddress = process.env.HYBIT_TOKEN_ADDRESS;
    let teachersAddress = process.env.TEACHERS_ADDRESS;
    let studentsAddress = process.env.STUDENTS_ADDRESS;
    let paymentTokenAddress = process.env.PAYMENT_TOKEN_ADDRESS;

    const addressFile = path.resolve(__dirname, "..", "deployed-addresses.json");
    if (fs.existsSync(addressFile)) {
        const saved = JSON.parse(fs.readFileSync(addressFile, "utf8"));
        hybitTokenAddress = hybitTokenAddress || saved.HybitToken;
        teachersAddress = teachersAddress || saved.Teachers;
        studentsAddress = studentsAddress || saved.Students;
        paymentTokenAddress = paymentTokenAddress || saved.paymentToken;
        console.log(`📄 Loaded addresses from deployed-addresses.json (${saved.network} @ ${saved.deployedAt})`);
    }

    if (!teachersAddress || !studentsAddress) {
        throw new Error(
            "TEACHERS_ADDRESS and STUDENTS_ADDRESS environment variables are required " +
            "(or run deploy.js first to generate deployed-addresses.json)"
        );
    }

    paymentTokenAddress = paymentTokenAddress || hybitTokenAddress;

    console.log(`  HybitToken : ${hybitTokenAddress}`);
    console.log(`  Teachers   : ${teachersAddress}`);
    console.log(`  Students   : ${studentsAddress}\n`);

    await verifyContract("HybitToken", hybitTokenAddress, []);
    await verifyContract("Teachers", teachersAddress, []);
    await verifyContract("Students", studentsAddress, [paymentTokenAddress]);

    console.log("\n Verification complete.");
}

async function verifyContract(name, address, constructorArgs) {
    if (!address) {
        console.warn(`  Skipping ${name}: address not provided.`);
        return;
    }
    console.log(`🔍 Verifying ${name} at ${address}...`);
    try {
        await hre.run("verify:verify", {
            address,
            constructorArguments: constructorArgs,
        });
        console.log(` ${name} verified!\n`);
    } catch (err) {
        if (err.message.toLowerCase().includes("already verified")) {
            console.log(`ℹ ${name} is already verified.\n`);
        } else {
            console.error(` ${name} verification failed: ${err.message}\n`);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
