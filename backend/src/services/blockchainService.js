import { getContract } from "../blockchain/contractClient.js";

const withContract = async (action) => {
  const contract = getContract();
  return action(contract);
};

export const createProjectOnChain = async ({ title, description, budgetWei }) =>
  withContract((contract) => contract.createProject(title, description, budgetWei));

export const fundProjectOnChain = async ({ projectId, amountWei }) =>
  withContract((contract) => contract.fundProject(projectId, { value: amountWei }));

export const assignFreelancerOnChain = async ({ projectId, freelancer }) =>
  withContract((contract) => contract.assignFreelancer(projectId, freelancer));

export const submitMilestoneOnChain = async ({ projectId, milestoneId, workHash, amountWei, title, deadline }) =>
  withContract((contract) =>
    contract.submitMilestone(projectId, milestoneId, workHash, amountWei, title, deadline)
  );

export const approveMilestoneOnChain = async ({ projectId, milestoneId }) =>
  withContract((contract) => contract.approveMilestone(projectId, milestoneId));

export const releasePaymentOnChain = async ({ projectId, milestoneId }) =>
  withContract((contract) => contract.releasePayment(projectId, milestoneId));

export const raiseDisputeOnChain = async ({ projectId, reason }) =>
  withContract((contract) => contract.raiseDispute(projectId, reason));

export const resolveDisputeOnChain = async ({ projectId, refundClient }) =>
  withContract((contract) => contract.resolveDispute(projectId, refundClient));

export const cancelProjectOnChain = async ({ projectId }) =>
  withContract((contract) => contract.cancelProject(projectId));

export const refundClientOnChain = async ({ projectId }) =>
  withContract((contract) => contract.refundClient(projectId));
