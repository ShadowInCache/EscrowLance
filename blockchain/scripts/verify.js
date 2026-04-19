const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  const deploymentPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}. Run deploy script first.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const address = deployment.address;

  if (!address) {
    throw new Error("Missing contract address in deployment file.");
  }

  console.log(`Verifying ${address} on ${networkName}...`);

  await hre.run("verify:verify", {
    address,
    constructorArguments: [],
  });

  console.log("Verification completed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    const text = String(error?.message || "").toLowerCase();
    if (text.includes("already verified") || text.includes("contract source code already verified")) {
      console.log("Contract is already verified.");
      process.exit(0);
    }

    console.error(error);
    process.exit(1);
  });
