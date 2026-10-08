// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Immutable, unanimously approved USDC net settlement rooms.
/// @dev Obligations use micro-USDC; msg.value and native payouts use 18 decimals.
contract ArcClear {
    uint256 public constant VERSION = 2;
    uint256 public constant NATIVE_SCALE = 1e12;
    uint256 public nextRoomId = 1;
    uint256 private locked = 1;
    struct Room {
        address[] members;
        int256[] net;
        bool[] approved;
        bool[] funded;
        uint8[] from;
        uint8[] to;
        uint256[] amounts;
        uint64 deadline;
        bool settled;
        bool cancelled;
        bytes32 obligationsHash;
    }
    mapping(uint256 => Room) private rooms;
    mapping(uint256 => mapping(address => uint256)) private memberIndex;
    event RoomCreated(uint256 indexed roomId, bytes32 obligationsHash, uint64 deadline);
    event ApprovalChanged(uint256 indexed roomId, address indexed member, bool approved);
    event Funded(uint256 indexed roomId, address indexed member, uint256 amount);
    event Settled(uint256 indexed roomId, uint256 netTransferred);
    event Cancelled(uint256 indexed roomId);
    event Refunded(uint256 indexed roomId, address indexed member, uint256 amount);
    error InvalidPlan(); error NotMember(); error Closed(); error NotReady(); error TransferFailed(); error WrongValue(); error UnsupportedNetwork();
    modifier nonReentrant() { require(locked == 1, "Reentrancy"); locked = 2; _; locked = 1; }
    constructor() { if (block.chainid != 5042 && block.chainid != 5042002) revert UnsupportedNetwork(); }

    function createRoom(address[] calldata members, uint8[] calldata from, uint8[] calldata to,
        uint256[] calldata amounts, uint64 deadline) external returns (uint256 id) {
        uint256 n = members.length;
        if (n < 2 || n > 10 || amounts.length == 0 || amounts.length > 64 ||
            from.length != amounts.length || to.length != amounts.length ||
            deadline <= block.timestamp || deadline > block.timestamp + 30 days) revert InvalidPlan();
        id = nextRoomId++;
        Room storage r = rooms[id];
        bool creatorIsMember;
        for (uint256 i; i < n; i++) {
            if (members[i] == address(0) || members[i] == address(this) || memberIndex[id][members[i]] != 0) revert InvalidPlan();
            memberIndex[id][members[i]] = i + 1;
            r.members.push(members[i]); r.net.push(0); r.approved.push(false); r.funded.push(false);
            if (members[i] == msg.sender) creatorIsMember = true;
        }
        if (!creatorIsMember) revert NotMember();
        for (uint256 k; k < amounts.length; k++) {
            if (from[k] >= n || to[k] >= n || from[k] == to[k] || amounts[k] == 0 || amounts[k] > 1e15) revert InvalidPlan();
            r.net[from[k]] -= int256(amounts[k]); r.net[to[k]] += int256(amounts[k]);
        }
        r.from = from; r.to = to; r.amounts = amounts; r.deadline = deadline;
        r.obligationsHash = keccak256(abi.encode(members, from, to, amounts, deadline));
        emit RoomCreated(id, r.obligationsHash, deadline);
    }
    function getRoom(uint256 id) external view returns (address[] memory members, int256[] memory net,
        bool[] memory approved, bool[] memory funded, uint64 deadline, bool settled, bool cancelled, bytes32 obligationsHash) {
        Room storage r = rooms[id];
        if (r.members.length == 0) revert InvalidPlan();
        return (r.members, r.net, r.approved, r.funded, r.deadline, r.settled, r.cancelled, r.obligationsHash);
    }
    function getObligations(uint256 id) external view returns (uint8[] memory from, uint8[] memory to, uint256[] memory amounts) {
        Room storage r = rooms[id];
        if (r.members.length == 0) revert InvalidPlan();
        return (r.from, r.to, r.amounts);
    }
    function approveRoom(uint256 id, bool approval) external {
        Room storage r = rooms[id]; _open(r);
        uint256 i = _index(id);
        // Approval becomes immutable once anyone funds, so a depositor's plan cannot change.
        for (uint256 k; k < r.members.length; k++) if (r.funded[k]) revert NotReady();
        r.approved[i] = approval; emit ApprovalChanged(id, msg.sender, approval);
    }
    function fund(uint256 id) external payable nonReentrant {
        Room storage r = rooms[id]; _open(r);
        uint256 i = _index(id);
        if (r.net[i] >= 0 || r.funded[i]) revert NotReady();
        for (uint256 k; k < r.members.length; k++) if (!r.approved[k]) revert NotReady();
        uint256 amount = uint256(-r.net[i]);
        if (msg.value != amount * NATIVE_SCALE) revert WrongValue();
        r.funded[i] = true;
        emit Funded(id, msg.sender, amount);
    }
    function settle(uint256 id) external nonReentrant {
        Room storage r = rooms[id]; _open(r);
        uint256 total;
        for (uint256 k; k < r.members.length; k++) {
            if (!r.approved[k] || (r.net[k] < 0 && !r.funded[k])) revert NotReady();
            if (r.net[k] > 0) total += uint256(r.net[k]);
        }
        r.settled = true;
        for (uint256 k; k < r.members.length; k++) {
            if (r.net[k] > 0) _send(r.members[k], uint256(r.net[k]) * NATIVE_SCALE);
        }
        emit Settled(id, total);
    }
    /// @notice Any member can cancel before settlement; each payer then reclaims their own deposit.
    function cancel(uint256 id) external {
        Room storage r = rooms[id]; _index(id);
        if (r.settled || r.cancelled) revert Closed();
        r.cancelled = true; emit Cancelled(id);
    }
    function refund(uint256 id) external nonReentrant {
        Room storage r = rooms[id]; uint256 i = _index(id);
        if (r.settled || (!r.cancelled && block.timestamp < r.deadline) || !r.funded[i] || r.net[i] >= 0) revert NotReady();
        if (!r.cancelled) { r.cancelled = true; emit Cancelled(id); }
        r.funded[i] = false;
        uint256 amount = uint256(-r.net[i]);
        _send(msg.sender, amount * NATIVE_SCALE);
        emit Refunded(id, msg.sender, amount);
    }
    function _send(address to, uint256 value) private {
        (bool ok,) = payable(to).call{value: value}("");
        if (!ok) revert TransferFailed();
    }
    function _open(Room storage r) private view {
        if (r.members.length == 0 || r.settled || r.cancelled || block.timestamp >= r.deadline) revert Closed();
    }
    function _index(uint256 id) private view returns (uint256) {
        uint256 idx = memberIndex[id][msg.sender]; if (idx == 0) revert NotMember(); return idx - 1;
    }
}
