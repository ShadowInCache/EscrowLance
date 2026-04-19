// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FreelanceEscrow is Ownable, ReentrancyGuard {
    enum ProjectStatus {
        Created,
        Funded,
        InProgress,
        Submitted,
        Completed,
        Cancelled,
        Disputed
    }

    struct Milestone {
        uint256 id;
        string title;
        uint256 amount;
        bool submitted;
        bool approved;
        bool paid;
        string workHash;
        uint256 deadline;
    }

    struct Project {
        uint256 id;
        address client;
        address freelancer;
        uint256 totalBudget;
        uint256 remainingBalance;
        ProjectStatus status;
        bool funded;
    }

    mapping(uint256 => Project) public projects;
    mapping(uint256 => Milestone[]) private projectMilestones;
    mapping(uint256 => string) public projectTitles;
    mapping(uint256 => string) public projectDescriptions;

    uint256 public projectCount;

    event ProjectCreated(uint256 indexed projectId, address indexed client);
    event ProjectFunded(uint256 indexed projectId, uint256 amount);
    event FreelancerAssigned(uint256 indexed projectId, address indexed freelancer);
    event MilestoneSubmitted(uint256 indexed projectId, uint256 milestoneId, string workHash);
    event MilestoneApproved(uint256 indexed projectId, uint256 milestoneId);
    event PaymentReleased(uint256 indexed projectId, uint256 milestoneId, uint256 amount);
    event DisputeRaised(uint256 indexed projectId, string reason);
    event RefundIssued(uint256 indexed projectId, uint256 amount);

    modifier projectExists(uint256 projectId) {
        require(projectId > 0 && projectId <= projectCount, "Project missing");
        _;
    }

    modifier onlyClient(uint256 projectId) {
        require(msg.sender == projects[projectId].client, "Only client");
        _;
    }

    modifier onlyFreelancer(uint256 projectId) {
        require(msg.sender == projects[projectId].freelancer, "Only freelancer");
        _;
    }

    function createProject(
        string memory title,
        string memory description,
        uint256 totalBudget
    ) external returns (uint256 projectId) {
        require(totalBudget > 0, "Budget required");
        projectCount += 1;
        projectId = projectCount;
        projects[projectId] = Project({
            id: projectId,
            client: msg.sender,
            freelancer: address(0),
            totalBudget: totalBudget,
            remainingBalance: 0,
            status: ProjectStatus.Created,
            funded: false
        });
        projectTitles[projectId] = title;
        projectDescriptions[projectId] = description;
        emit ProjectCreated(projectId, msg.sender);
        return projectId;
    }

    function fundProject(uint256 projectId)
        external
        payable
        projectExists(projectId)
        onlyClient(projectId)
        nonReentrant
    {
        Project storage p = projects[projectId];
        require(msg.value > 0, "Funding required");
        require(
            p.status == ProjectStatus.Created || p.status == ProjectStatus.Funded,
            "Cannot fund"
        );
        require(p.remainingBalance + msg.value <= p.totalBudget, "Exceeds budget");
        p.remainingBalance += msg.value;
        p.funded = true;
        p.status = ProjectStatus.Funded;
        emit ProjectFunded(projectId, msg.value);
    }

    function assignFreelancer(uint256 projectId, address freelancer)
        external
        projectExists(projectId)
        onlyClient(projectId)
    {
        require(freelancer != address(0), "Freelancer required");
        Project storage p = projects[projectId];
        p.freelancer = freelancer;
        if (p.status == ProjectStatus.Funded) {
            p.status = ProjectStatus.InProgress;
        }
        emit FreelancerAssigned(projectId, freelancer);
    }

    function submitMilestone(
        uint256 projectId,
        uint256 milestoneId,
        string calldata workHash,
        uint256 amountWei,
        string calldata title,
        uint256 deadline
    ) external projectExists(projectId) onlyFreelancer(projectId) {
        Project storage p = projects[projectId];
        require(
            p.status == ProjectStatus.InProgress || p.status == ProjectStatus.Funded,
            "Not active"
        );
        require(amountWei > 0, "Amount required");
        require(p.remainingBalance >= amountWei, "Insufficient escrow");

        if (projectMilestones[projectId].length <= milestoneId) {
            projectMilestones[projectId].push(
                Milestone({
                    id: milestoneId,
                    title: title,
                    amount: amountWei,
                    submitted: true,
                    approved: false,
                    paid: false,
                    workHash: workHash,
                    deadline: deadline
                })
            );
        } else {
            Milestone storage m = projectMilestones[projectId][milestoneId];
            m.title = title;
            m.amount = amountWei;
            m.submitted = true;
            m.workHash = workHash;
            m.deadline = deadline;
        }

        p.status = ProjectStatus.Submitted;
        emit MilestoneSubmitted(projectId, milestoneId, workHash);
    }

    function approveMilestone(uint256 projectId, uint256 milestoneId)
        external
        projectExists(projectId)
        onlyClient(projectId)
    {
        Milestone storage m = projectMilestones[projectId][milestoneId];
        require(m.submitted, "Not submitted");
        require(!m.approved, "Already approved");
        m.approved = true;
        emit MilestoneApproved(projectId, milestoneId);
    }

    function releasePayment(uint256 projectId, uint256 milestoneId)
        external
        projectExists(projectId)
        onlyClient(projectId)
        nonReentrant
    {
        Project storage p = projects[projectId];
        Milestone storage m = projectMilestones[projectId][milestoneId];
        require(m.approved, "Not approved");
        require(!m.paid, "Already paid");
        require(p.remainingBalance >= m.amount, "Insufficient balance");

        m.paid = true;
        p.remainingBalance -= m.amount;
        (bool ok, ) = p.freelancer.call{value: m.amount}("");
        require(ok, "Transfer failed");
        if (p.remainingBalance == 0) {
            p.status = ProjectStatus.Completed;
        } else {
            p.status = ProjectStatus.InProgress;
        }
        emit PaymentReleased(projectId, milestoneId, m.amount);
    }

    function raiseDispute(uint256 projectId, string calldata reason)
        external
        projectExists(projectId)
    {
        Project storage p = projects[projectId];
        require(msg.sender == p.client || msg.sender == p.freelancer, "Unauthorized");
        require(p.status != ProjectStatus.Disputed, "Already disputed");
        p.status = ProjectStatus.Disputed;
        emit DisputeRaised(projectId, reason);
    }

    function resolveDispute(uint256 projectId, bool shouldRefundClient)
        external
        projectExists(projectId)
        onlyOwner
        nonReentrant
    {
        Project storage p = projects[projectId];
        require(p.status == ProjectStatus.Disputed, "No dispute");
        if (shouldRefundClient && p.remainingBalance > 0) {
            uint256 amount = p.remainingBalance;
            p.remainingBalance = 0;
            (bool ok, ) = p.client.call{value: amount}("");
            require(ok, "Refund failed");
            emit RefundIssued(projectId, amount);
        }
        p.status = shouldRefundClient ? ProjectStatus.Cancelled : ProjectStatus.Completed;
    }

    function cancelProject(uint256 projectId)
        external
        projectExists(projectId)
        onlyClient(projectId)
        nonReentrant
    {
        Project storage p = projects[projectId];
        require(
            p.status == ProjectStatus.Created || p.status == ProjectStatus.Funded,
            "Cannot cancel"
        );
        p.status = ProjectStatus.Cancelled;
        if (p.remainingBalance > 0) {
            uint256 amount = p.remainingBalance;
            p.remainingBalance = 0;
            (bool ok, ) = p.client.call{value: amount}("");
            require(ok, "Refund failed");
            emit RefundIssued(projectId, amount);
        }
    }

    function refundClient(uint256 projectId)
        external
        projectExists(projectId)
        onlyOwner
        nonReentrant
    {
        Project storage p = projects[projectId];
        require(p.remainingBalance > 0, "Nothing to refund");
        uint256 amount = p.remainingBalance;
        p.remainingBalance = 0;
        (bool ok, ) = p.client.call{value: amount}("");
        require(ok, "Refund failed");
        emit RefundIssued(projectId, amount);
    }

    function getProject(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (Project memory)
    {
        return projects[projectId];
    }

    function getMilestones(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (Milestone[] memory)
    {
        return projectMilestones[projectId];
    }
}
