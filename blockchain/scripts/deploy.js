const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Escrow = await hre.ethers.getContractFactory("FreelanceEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();

  console.log("FreelanceEscrow deployed to:", await escrow.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
