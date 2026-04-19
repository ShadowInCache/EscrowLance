const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FreelanceEscrow", () => {
  let escrow;
  let client;
  let freelancer;
  let other;

  const createProjectAndGetId = async () => {
    const tx = await escrow.connect(client).createProject("Title", "Desc", ethers.parseEther("0.5"));
    const receipt = await tx.wait();
    for (const log of receipt.logs || []) {
      try {
        const parsed = escrow.interface.parseLog(log);
        if (parsed?.name === "ProjectCreated") {
          return parsed.args.projectId;
        }
      } catch (err) {
        // ignore non-contract logs
      }
    }
    throw new Error("ProjectCreated event not found");
  };

  beforeEach(async () => {
    [client, freelancer, other] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("FreelanceEscrow");
    escrow = await Escrow.connect(client).deploy();
  });

  it("creates projects", async () => {
    const tx = await escrow.connect(client).createProject("Title", "Desc", ethers.parseEther("0.5"));
    const receipt = await tx.wait();
    const projectId = receipt.logs[0].args.projectId;
    const project = await escrow.getProject(projectId);
    expect(project.client).to.equal(client.address);
  });

  it("funds escrow", async () => {
    const projectId = await createProjectAndGetId();
    await expect(
      escrow.connect(client).fundProject(projectId, { value: ethers.parseEther("0.2") })
    ).to.emit(escrow, "ProjectFunded");
    const project = await escrow.getProject(projectId);
    expect(project.remainingBalance).to.equal(ethers.parseEther("0.2"));
  });

  it("submits and approves milestones", async () => {
    const projectId = await createProjectAndGetId();
    await escrow.fundProject(projectId, { value: ethers.parseEther("0.5") });
    await escrow.assignFreelancer(projectId, freelancer.address);
    await escrow
      .connect(freelancer)
      .submitMilestone(projectId, 0, "workhash", ethers.parseEther("0.1"), "UI", 0);
    await escrow.approveMilestone(projectId, 0);
    await escrow.releasePayment(projectId, 0);
    const milestones = await escrow.getMilestones(projectId);
    expect(milestones[0].paid).to.equal(true);
  });

  it("returns to InProgress after partial release", async () => {
    const projectId = await createProjectAndGetId();
    await escrow.fundProject(projectId, { value: ethers.parseEther("0.5") });
    await escrow.assignFreelancer(projectId, freelancer.address);

    await escrow
      .connect(freelancer)
      .submitMilestone(projectId, 0, "workhash-1", ethers.parseEther("0.1"), "UI", 0);
    await escrow.approveMilestone(projectId, 0);
    await escrow.releasePayment(projectId, 0);

    const projectAfterRelease = await escrow.getProject(projectId);
    expect(projectAfterRelease.status).to.equal(2n); // InProgress

    await expect(
      escrow
        .connect(freelancer)
        .submitMilestone(projectId, 1, "workhash-2", ethers.parseEther("0.1"), "API", 0)
    ).to.emit(escrow, "MilestoneSubmitted");
  });

  it("prevents unauthorized submission", async () => {
    const projectId = await createProjectAndGetId();
    await escrow.assignFreelancer(projectId, freelancer.address);
    await expect(
      escrow
        .connect(other)
        .submitMilestone(projectId, 0, "hash", ethers.parseEther("0.1"), "UI", 0)
    ).to.be.revertedWith("Only freelancer");
  });

  it("handles disputes", async () => {
    const projectId = await createProjectAndGetId();
    await escrow.fundProject(projectId, { value: ethers.parseEther("0.1") });
    await escrow.assignFreelancer(projectId, freelancer.address);
    await escrow.raiseDispute(projectId, "scope");
    await expect(escrow.resolveDispute(projectId, true)).to.emit(escrow, "RefundIssued");
  });
});
