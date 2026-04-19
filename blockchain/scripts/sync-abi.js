const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "FreelanceEscrow.sol",
  "FreelanceEscrow.json"
);

const targets = [
  path.join(__dirname, "..", "..", "backend", "src", "blockchain", "abi", "FreelanceEscrow.json"),
  path.join(__dirname, "..", "..", "frontend", "src", "blockchain", "abi", "FreelanceEscrow.json"),
];

const main = () => {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi || artifact;

  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(abi, null, 2), "utf8");
    console.log(`ABI synced: ${target}`);
  }
};

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
