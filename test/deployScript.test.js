import { expect } from "chai";
import { exec } from "child_process";
import util from "util";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

describe("Deployment Script (deploy.js)", function () {
    this.timeout(60000);

    it("deploys HybitToken, Teachers, and Students to local hardhat network", async function () {
        const { stdout } = await execPromise(
            "pnpm exec hardhat run scripts/deploy.js --network hardhat",
            { cwd: ROOT }
        );

        expect(stdout).to.match(/HybitToken deployed to:/);
        expect(stdout).to.match(/Teachers deployed to:/);
        expect(stdout).to.match(/Students deployed to:/);
        expect(stdout).to.match(/All contracts deployed successfully/);
    });

    it("writes deployed-addresses.json after successful deploy", async function () {
        await execPromise(
            "pnpm exec hardhat run scripts/deploy.js --network hardhat",
            { cwd: ROOT }
        );

        const addressFile = path.resolve(ROOT, "deployed-addresses.json");
        expect(fs.existsSync(addressFile)).to.be.true;

        const data = JSON.parse(fs.readFileSync(addressFile, "utf8"));
        expect(data).to.have.property("HybitToken").that.matches(/^0x/);
        expect(data).to.have.property("Teachers").that.matches(/^0x/);
        expect(data).to.have.property("Students").that.matches(/^0x/);
        expect(data).to.have.property("network");
        expect(data).to.have.property("deployedAt");
    });
});

describe("Verification Script (verify.js)", function () {
    this.timeout(20000);

    it("fails with clear error when contract addresses are missing", async function () {
        // Remove the address file if it exists so verify.js must rely on env vars
        const addressFile = path.resolve(ROOT, "deployed-addresses.json");
        let backup;
        if (fs.existsSync(addressFile)) {
            backup = fs.readFileSync(addressFile, "utf8");
            fs.unlinkSync(addressFile);
        }

        try {
            await execPromise(
                "pnpm exec hardhat run scripts/verify.js --network hardhat",
                { cwd: ROOT, env: { ...process.env, TEACHERS_ADDRESS: "", STUDENTS_ADDRESS: "" } }
            );
            throw new Error("Expected verify.js to throw when addresses are missing");
        } catch (error) {
            const output = error.stderr || error.stdout || error.message;
            expect(output).to.match(/TEACHERS_ADDRESS and STUDENTS_ADDRESS environment variables are required/);
        } finally {
            // Restore backup
            if (backup) fs.writeFileSync(addressFile, backup);
        }
    });
});
