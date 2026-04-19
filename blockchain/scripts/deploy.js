const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address, "on network:", networkName);

  const Escrow = await hre.ethers.getContractFactory("FreelanceEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  console.log("FreelanceEscrow deployed to:", address);

  const deployment = {
    contractName: "FreelanceEscrow",
    address,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    network: networkName,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${networkName}.json`),
    JSON.stringify(deployment, null, 2),
    "utf8"
  );

  console.log("Deployment artifact written to deployments/" + `${networkName}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
